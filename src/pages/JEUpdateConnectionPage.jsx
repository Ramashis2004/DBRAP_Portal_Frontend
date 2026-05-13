import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  fetchOfficerDashboardConfig,
  logoutOfficer,
  fetchJEPaymentBlocks,fetchConnectionApplications,
  submitConnectionDetails
} from "../api/api";

import axios from "axios";

import "./OfficerDashboardPage.css";
import "./JEUpdateConnectionPage.css";


// ─── Initial form state ───────────────────────────────────────────────────────
const initialForm = {
  block_code: "",
  application_id: "",
  typeOfConnectionRwss: "",
  nameOfProject: "",
  tappingPoint: "",
  meterId: "",
  initialMeterReading: "",
  meterMake: "",
};

function JEUpdateConnectionPage() {
  const navigate = useNavigate();

  const [session, setSession]           = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [blocks, setBlocks]             = useState([]);
  const [activeMenuKey, setActiveMenuKey]     = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");

  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps]   = useState(false);
  const [selectedApp, setSelectedApp]   = useState(null);
  const [submitting, setSubmitting]     = useState(false);

  const [form, setForm] = useState(initialForm);

  const user  = dashboardData?.user;
  const menus = dashboardData?.dashboard?.navigation?.menus || [];

  // ─── Derived helpers ─────────────────────────────────────────────────────────
  const assignedBlock = blocks[0] || null;

  /**
   * Normalise the connection_type field coming from the DB.
   * Treat anything that is NOT "single tap" (case-insensitive) as "multiple".
   */
  const connectionType = String(selectedApp?.type_of_connection || "").toLowerCase().trim();
  const isSingleTap    = connectionType === "single tap";

  // ─── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw    = localStorage.getItem("officerSession");
    const parsed = raw ? JSON.parse(raw) : null;

    if (!parsed?.id) {
      navigate("/login");
      return;
    }

    setSession(parsed);

    const init = async () => {
      try {
        const [dashboardRes, blocksRes] = await Promise.all([
          fetchOfficerDashboardConfig(parsed.id),
          fetchJEPaymentBlocks(parsed.id),
        ]);

        const loadedBlocks = blocksRes.data || [];
        setDashboardData(dashboardRes.data);
        setBlocks(loadedBlocks);

        if (!loadedBlocks.length) return;

        // ✅ Keep block_code as the raw value from DB (string or number — don't coerce)
        const blockCode = loadedBlocks[0].block_code;

        setForm((prev) => ({ ...prev, block_code: blockCode }));

        // ✅ Fetch applications for this block
        await loadApplications(blockCode);
      } catch (err) {
        console.error("INIT ERROR:", err);
        Swal.fire("Error", "Failed to load page data. Please refresh.", "error");
      }
    };

    init();
  }, [navigate]);

  // ─── Load applications for a given blockCode ─────────────────────────────────
const loadApplications = async (blockCode) => {
  setLoadingApps(true);
  try {
    const appRes = await fetchConnectionApplications(blockCode);
    console.log("API response:", appRes.data); // should show { data: [...] }

    // ✅ appRes.data.data because backend sends { data: rows }
    const list = Array.isArray(appRes.data?.data) ? appRes.data.data : [];
    console.log("Applications list:", list); // should show array with CA369700007

    setApplications(list);
  } catch (err) {
    console.error("Failed to load applications:", err);
    setApplications([]);
  } finally {
    setLoadingApps(false);
  }
};
  // ─── Sidebar handlers ─────────────────────────────────────────────────────────
  const handleMenuClick = (menuKey) => {
    setActiveMenuKey(menuKey === activeMenuKey ? "" : menuKey);
    setActiveOptionKey("");
  };

  const handleOptionClick = (option) => {
    const label = option.label.toLowerCase();
    if (label.includes("application")) navigate("/je-application-received");
     if (label.includes("payment verification")) navigate("/je-payment-verification");
    if (label.includes("connection"))  navigate("/je-update-connection");
    setActiveOptionKey(option.key);
  };

  // ─── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
const res = await Swal.fire({
      title: "Logout?",
      text: "Do you want to logout from this account?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });    if (!res.isConfirmed) return;
    await logoutOfficer({ userId: session.id });
    localStorage.removeItem("officerSession");
    navigate("/login");
  };

  // ─── Application selection ────────────────────────────────────────────────────
  const handleApplicationChange = (e) => {
    const applicationId = e.target.value;

    const app = applications.find(
      (a) => String(a.application_id) === String(applicationId)
    );

    setSelectedApp(app || null);

    // Reset connection-specific fields when switching application
    setForm((prev) => ({
      ...prev,
      application_id:       applicationId,
      typeOfConnectionRwss: "",
      nameOfProject:        "",
      tappingPoint:         "",
      meterId:              "",
      initialMeterReading:  "",
      meterMake:            "",
    }));
  };

  // ─── Form field change ────────────────────────────────────────────────────────
  const handleFieldChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedApp) return;

    // ── Validation ──
    if (isSingleTap) {
      if (!form.nameOfProject.trim() || !form.tappingPoint.trim()) {
        Swal.fire("Validation", "Please fill in Name of Project and Tapping Point.", "warning");
        return;
      }
    } else {
      if (!form.typeOfConnectionRwss) {
        Swal.fire("Validation", "Please select Type of Connection.", "warning");
        return;
      }
      if (form.typeOfConnectionRwss === "Metered") {
        if (!form.meterId.trim() || !form.initialMeterReading || !form.meterMake.trim()) {
          Swal.fire("Validation", "Please fill in all Meter details.", "warning");
          return;
        }
      }
      if (form.typeOfConnectionRwss === "Unmetered") {
        if (!form.nameOfProject.trim() || !form.tappingPoint.trim()) {
          Swal.fire("Validation", "Please fill in Name of Project and Tapping Point.", "warning");
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        applicationId:        selectedApp.application_id,
        // Single tap is always Unmetered
        typeOfConnectionRwss: isSingleTap ? "Unmetered" : form.typeOfConnectionRwss,
        nameOfProject:        form.nameOfProject   || null,
        tappingPoint:         form.tappingPoint    || null,
        meterId:              form.meterId         || null,
        initialMeterReading:  form.initialMeterReading || null,
        meterMake:            form.meterMake       || null,
        /*
         * ✅ Tell the backend to:
         *   • set application_status = 'CONNECTION_DETAILS_UPDATED'
         *   • set connection_details_updated_on = NOW()
         * in the organisation table
         */
        applicationStatus:    "CONNECTION_DETAILS_UPDATED",
      };

      console.log("Submitting payload:", payload);

      await submitConnectionDetails(payload);

      await Swal.fire("Success", "Connection details updated successfully!", "success");

      // Reset form after success
      setSelectedApp(null);
      setForm((prev) => ({
        ...initialForm,
        block_code: prev.block_code,
      }));

      // Reload applications list (the submitted one should no longer appear
      // once your backend filters by PAYMENT_RECEIPT_VERIFIED)
      await loadApplications(form.block_code);
    } catch (err) {
      console.error("Submit error:", err);
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to update. Please try again.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-shell">

        {/* ── SIDEBAR ── */}
        <aside className="officer-dashboard-sidebar">
          <div className="officer-dashboard-sidebar__brand">
            <div className="officer-dashboard-brand__icon">
              <Droplet size={22} />
            </div>
            <div>
              <span>DBRAP Portal</span>
              <strong>{user?.roleName || "JE"} Workspace</strong>
            </div>
          </div>

          <nav className="officer-dashboard-nav">
            {/* Dashboard link */}
            <div className="officer-dashboard-nav__group">
              <button
                type="button"
                className="officer-dashboard-nav__item"
                onClick={() => navigate("/je-dashboard")}
              >
                <div className="officer-dashboard-nav__item-copy">
                  <ShieldCheck size={18} />
                  <span>Dashboard</span>
                </div>
              </button>
            </div>

            {/* Dynamic menus */}
            {menus.map((item) => {
              const isActive = item.key === activeMenuKey;
              return (
                <div key={item.key} className="officer-dashboard-nav__group">
                  <button
                    type="button"
                    className={`officer-dashboard-nav__item ${isActive ? "is-active" : ""}`}
                    onClick={() => handleMenuClick(item.key)}
                  >
                    <div className="officer-dashboard-nav__item-copy">
                      <Users size={18} />
                      <span>{item.label}</span>
                    </div>
                    {isActive ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {isActive && item.options.length > 0 && (
                    <div className="officer-dashboard-nav__options">
                      {item.options.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={`officer-dashboard-nav__option ${
                            option.key === activeOptionKey ? "is-active" : ""
                          }`}
                          onClick={() => handleOptionClick(option)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="officer-dashboard-sidebar__footer">
            <p>Logged in as</p>
            <strong>{user?.name || user?.loginId}</strong>
            <span>{user?.roleName}</span>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="officer-dashboard-main je-update-conn-main">

          {/* HEADER */}
          <header className="officer-dashboard-header">
            <div className="officer-dashboard-header__copy">
              <h1>Update Connection Details</h1>
            </div>
            <div className="officer-dashboard-user">
              <div>
                <span>Logged in as</span>
                <strong>{user?.loginId}</strong>
              </div>
              <button
                type="button"
                className="officer-dashboard-logout"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </header>

          {/* CONTENT */}
          <section className="payment-card je-update-conn-panel">
            <div className="payment-card__header je-update-conn-panel__header">
              <div className="je-update-conn-panel__icon">
                <Settings size={22} />
              </div>
              <div>
                <h2>Connection Details</h2>
                <p>Select application and update connection</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="je-update-conn-form-grid">

              {/* ── Block (auto-assigned, read-only) ── */}
              <div className="je-update-conn-field">
                <label>
                  <span>Block</span>
                  <select value={form.block_code} disabled>
                    <option value={form.block_code}>
                      {assignedBlock?.block_name || form.block_code || "Assigned block"}
                    </option>
                  </select>
                </label>
              </div>

              {/* ── Application ID ── */}
              <div className="je-update-conn-field">
                <label>
                  <span>Application ID</span>
                  <select
                    value={form.application_id}
                    onChange={handleApplicationChange}
                    disabled={!form.block_code || loadingApps}
                  >
                    <option value="">
                      {loadingApps
                        ? "Loading…"
                        : applications.length === 0
                        ? "No applications found"
                        : "Select Application ID"}
                    </option>

                    {applications.map((app) => (
                      <option key={app.application_id} value={app.application_id}>
                        {app.application_id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* ── Step 2: show fields only after an application is selected ── */}
              {selectedApp && (
                <>
                  {/* ════════════════════════════════════════
                      SINGLE TAP  →  always Unmetered
                  ════════════════════════════════════════ */}
                  {isSingleTap && (
                    <>
                      {/* Type of Connection — auto "Unmetered", read-only */}
                      <div className="je-update-conn-field">
                        <label>
                          <span>Type of Connection (RWSS)</span>
                          <input
                            value="Unmetered"
                            readOnly
                            className="je-update-conn-input--readonly"
                          />
                        </label>
                      </div>

                      {/* Name of Project */}
                      <div className="je-update-conn-field">
                        <label>
                          <span>Name of Project</span>
                          <input
                            className="je-update-conn-input"
                            placeholder="Enter project name"
                            value={form.nameOfProject}
                            onChange={handleFieldChange("nameOfProject")}
                            required
                          />
                        </label>
                      </div>

                      {/* Tapping Point */}
                      <div className="je-update-conn-field">
                        <label>
                          <span>Tapping Point</span>
                          <input
                            className="je-update-conn-input"
                            placeholder="Enter tapping point"
                            value={form.tappingPoint}
                            onChange={handleFieldChange("tappingPoint")}
                            required
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════
                      MORE THAN ONE TAP  →  Metered or Unmetered
                  ════════════════════════════════════════ */}
                  {!isSingleTap && (
                    <>
                      {/* Type of Connection dropdown */}
                      <div className="je-update-conn-field">
                        <label>
                          <span>Type of Connection (RWSS)</span>
                          <select
                            className="je-update-conn-select"
                            value={form.typeOfConnectionRwss}
                            onChange={handleFieldChange("typeOfConnectionRwss")}
                            required
                          >
                            <option value="">— Select —</option>
                            <option value="Metered">Metered</option>
                            <option value="Unmetered">Unmetered</option>
                          </select>
                        </label>
                      </div>

                      {/* ── Metered fields ── */}
                      {form.typeOfConnectionRwss === "Metered" && (
                        <>
                          <div className="je-update-conn-field">
                            <label>
                              <span>Meter ID</span>
                              <input
                                className="je-update-conn-input"
                                placeholder="Enter meter ID"
                                value={form.meterId}
                                onChange={handleFieldChange("meterId")}
                                required
                              />
                            </label>
                          </div>

                          <div className="je-update-conn-field">
                            <label>
                              <span>Initial Meter Reading</span>
                              <input
                                type="number"
                                min="0"
                                className="je-update-conn-input"
                                placeholder="Enter initial reading"
                                value={form.initialMeterReading}
                                onChange={handleFieldChange("initialMeterReading")}
                                required
                              />
                            </label>
                          </div>

                          <div className="je-update-conn-field">
                            <label>
                              <span>Meter Make</span>
                              <input
                                className="je-update-conn-input"
                                placeholder="Enter meter make / brand"
                                value={form.meterMake}
                                onChange={handleFieldChange("meterMake")}
                                required
                              />
                            </label>
                          </div>
                        </>
                      )}

                      {/* ── Unmetered fields ── */}
                      {form.typeOfConnectionRwss === "Unmetered" && (
                        <>
                          <div className="je-update-conn-field">
                            <label>
                              <span>Name of Project</span>
                              <input
                                className="je-update-conn-input"
                                placeholder="Enter project name"
                                value={form.nameOfProject}
                                onChange={handleFieldChange("nameOfProject")}
                                required
                              />
                            </label>
                          </div>

                          <div className="je-update-conn-field">
                            <label>
                              <span>Tapping Point</span>
                              <input
                                className="je-update-conn-input"
                                placeholder="Enter tapping point"
                                value={form.tappingPoint}
                                onChange={handleFieldChange("tappingPoint")}
                                required
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* ── Submit button ── */}
                  <div className="je-update-conn-actions">
                    <button
                      type="submit"
                      className="je-update-conn-btn je-update-conn-btn--primary"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting…" : "Submit Connection Details"}
                    </button>
                  </div>
                </>
              )}

            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default JEUpdateConnectionPage;
