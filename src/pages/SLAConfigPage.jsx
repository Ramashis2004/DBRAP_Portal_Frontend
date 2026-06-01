import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { fetchSlaStages, saveSlaStage } from "../api/api";
import "./SLAConfigPage.css";

const UNIT_OPTIONS = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
];

const toPositiveIntOrEmpty = (value) => {
  if (value === "") return "";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "";
  const intValue = Math.trunc(numberValue);
  return intValue > 0 ? String(intValue) : "";
};

function SLAConfigPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [stages, setStages] = useState([]);
  const [selectedStageName, setSelectedStageName] = useState("");

  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("hours");
  const [isSaving, setIsSaving] = useState(false);

  const selectedStage = useMemo(() => {
    return stages.find((item) => item.stageName === selectedStageName) || null;
  }, [stages, selectedStageName]);

  const selectedStageIndex = useMemo(() => {
    const index = stages.findIndex((item) => item.stageName === selectedStageName);
    return index >= 0 ? index : 0;
  }, [stages, selectedStageName]);

  const computedHours = useMemo(() => {
    const raw = Number(durationValue);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return durationUnit === "days" ? raw * 24 : raw;
  }, [durationValue, durationUnit]);

  const loadStages = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchSlaStages();
      const rows = Array.isArray(response.data) ? response.data : [];
      setStages(rows);
      if (!selectedStageName && rows.length > 0) {
        setSelectedStageName(rows[0].stageName);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error || "Unable to load SLA stages.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, []);

  useEffect(() => {
    if (!selectedStage) {
      setDurationValue("");
      setDurationUnit("hours");
      return;
    }

    if (!selectedStage.sla) {
      setDurationValue("");
      setDurationUnit("hours");
      return;
    }

    const hours = Number(selectedStage.sla.durationHours);
    if (Number.isFinite(hours) && hours > 0 && hours % 24 === 0) {
      setDurationUnit("days");
      setDurationValue(String(hours / 24));
      return;
    }

    setDurationUnit("hours");
    setDurationValue(Number.isFinite(hours) && hours > 0 ? String(hours) : "");
  }, [selectedStage]);

  const isFormValid = computedHours > 0 && Boolean(selectedStage);
  const isConfigured = Boolean(selectedStage?.sla);

  const handleSave = async () => {
    if (!selectedStage) return;

    if (!isFormValid) {
      Swal.fire({
        title: "Invalid input",
        text: "Please enter a valid duration.",
        icon: "warning",
      });
      return;
    }

    setIsSaving(true);

    try {
      await saveSlaStage({
        stageName: selectedStage.stageName,
        durationHours: computedHours,
      });

      await loadStages();

      Swal.fire({
        title: "Saved",
        text: "SLA saved successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        title: "Save failed",
        text: error.response?.data?.error || "Unable to save SLA.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="sla-config-page">
        <div className="sla-config-loading">Loading SLA config...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="sla-config-page">
        <div className="sla-config-error">
          <h2>SLA config unavailable</h2>
          <p>{errorMessage}</p>
          <button type="button" className="sla-config-back" onClick={() => navigate("/dashboard")}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sla-config-page">
      <header className="sla-config-header">
        <button type="button" className="sla-config-header__back" onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h1>SLA Config</h1>
      </header>

      <div className="sla-config-shell">
        <section className="sla-config-stage-list">
          <div className="sla-config-stage-list__header">
            <h2>Manage SLA for {stages.length} Stages</h2>
            <p>Define SLA duration for each stage. If you select Days, it will be converted to Hours automatically.</p>
          </div>

          <div className="sla-config-stage-list__table">
            <div className="sla-config-stage-list__row sla-config-stage-list__row--head">
              <div>Stages ({stages.length})</div>
              <div>SLA Status</div>
              <div className="sla-config-stage-list__action">Action</div>
            </div>

            {stages.map((item, idx) => {
              const active = item.stageName === selectedStageName;
              const configured = Boolean(item.sla);
              return (
                <button
                  key={item.stageName}
                  type="button"
                  className={`sla-config-stage-list__row${active ? " is-active" : ""}`}
                  onClick={() => setSelectedStageName(item.stageName)}
                >
                  <div className="sla-config-stage-list__stage">
                    <span className="sla-config-stage-list__index">{idx + 1}</span>
                    <span className="sla-config-stage-list__name">{item.stageDescription || item.stageName}</span>
                  </div>

                  <div className="sla-config-stage-list__status">
                    {configured ? (
                      <span className="sla-badge sla-badge--success">SLA Configured</span>
                    ) : (
                      <span className="sla-badge sla-badge--warning">Not Configured</span>
                    )}
                    {configured ? (
                      <div className="sla-config-stage-list__duration">{item.sla.durationHours} Hours</div>
                    ) : (
                      <div className="sla-config-stage-list__duration">-</div>
                    )}
                  </div>

                  <div className="sla-config-stage-list__action">
                    {configured ? (
                      <span className="sla-action">
                        <Pencil size={16} />
                        Edit
                      </span>
                    ) : (
                      <span className="sla-action sla-action--primary">
                        <Plus size={16} />
                        Add SLA
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="sla-config-panel">
          <div className="sla-config-panel__header">
            <h2>Configure SLA</h2>
            <span className="sla-config-panel__meta">Stage {selectedStageIndex + 1} of {stages.length}</span>
            <p>{isConfigured ? "Edit SLA for the selected stage." : "Add SLA for the selected stage."}</p>
          </div>

          <div className="sla-config-panel__form">
            <label className="sla-field">
              <span>Stage</span>
              <input
                type="text"
                value={selectedStage?.stageDescription || selectedStage?.stageName || ""}
                readOnly
                disabled
              />
            </label>

            <label className="sla-field">
              <span>SLA Duration</span>
              <input
                type="number"
                min="1"
                step="1"
                value={durationValue}
                onChange={(e) => setDurationValue(toPositiveIntOrEmpty(e.target.value))}
                placeholder="Enter duration"
              />
            </label>

            <label className="sla-field">
              <span>Unit</span>
              <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)}>
                {UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="sla-calculated">
              <div className="sla-calculated__label">Calculated SLA (in Hours)</div>
              <div className="sla-calculated__value">{computedHours || 0} Hours</div>
            </div>

            <div className="sla-config-panel__actions">
              <button
                type="button"
                className="sla-btn sla-btn--ghost"
                onClick={() => {
                  if (!selectedStage) return;
                  if (selectedStage.sla) {
                    const hours = Number(selectedStage.sla.durationHours);
                    if (Number.isFinite(hours) && hours > 0 && hours % 24 === 0) {
                      setDurationUnit("days");
                      setDurationValue(String(hours / 24));
                    } else {
                      setDurationUnit("hours");
                      setDurationValue(Number.isFinite(hours) && hours > 0 ? String(hours) : "");
                    }
                  } else {
                    setDurationUnit("hours");
                    setDurationValue("");
                  }
                }}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="sla-btn sla-btn--primary"
                onClick={handleSave}
                disabled={!isFormValid || isSaving}
              >
                {isSaving ? "Saving..." : "Save SLA"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default SLAConfigPage;
