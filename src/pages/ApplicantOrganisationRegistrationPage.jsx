
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Download, X } from "lucide-react";
import {
  fetchApplicantProfile,
  fetchApplicantApplication,
  fetchBlocks,
  fetchDistricts,
  fetchPanchayats,
  registerApplicantOrganisation,
  updateReturnedApplicantOrganisation,
  getOrganisationDocumentUrl,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
} from "../utils/applicationStatus";
import "./ApplicantOrganisationRegistrationPage.css";

const STEPS = ["Applicant Details", "Organisation Details", "Documents", "Connection"];

const swalWarning = (title, text) =>
  Swal.fire({ icon: "warning", title, text, confirmButtonColor: "#3d1f0f" });

const swalError = (title, text) =>
  Swal.fire({ icon: "error", title, text, confirmButtonColor: "#3d1f0f" });

const RequiredLabel = ({ children }) => (
  <span>
    {children} <b className="applicant-org-required">*</b>
  </span>
);

const DOCUMENT_ROWS = [
  ["Property Proof",       "property_proof"],
  ["Registration Proof",   "registration_proof"],
  ["Ownership Proof",      "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof",       "identity_proof"],
];

// ── Section helpers (same pattern as CEDashboardApplications) ─────────────────
function SectionBox({ title, children }) {
  return (
    <div className="ce-dashboard-app-section">
      <div className="ce-dashboard-app-section__title">{title}</div>
      <div className="ce-dashboard-app-section__body">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="ce-dashboard-app-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

// ── PDF Preview overlay (identical to CEDashboardApplications) ────────────────
function PdfPreviewOverlay({ preview, onClose }) {
  if (!preview) return null;
  return (
    <div className="pv-preview-overlay">
      <div className="pv-preview-card">
        <div className="pv-preview-header">
          <h2 className="pv-preview-header__title">{preview.title}</h2>
          <div className="pv-preview-header__actions">
            <a
              href={preview.url}
              download
              className="pv-preview-btn-download"
              target="_blank"
              rel="noreferrer"
            >
              <Download size={14} />
              Download PDF
            </a>
            <button
              className="pv-preview-btn-close"
              onClick={onClose}
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="pv-preview-content">
          <iframe
            src={`${preview.url}#toolbar=0`}
            className="pv-preview-frame"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  );
}

// ── Existing Application — CE-style detail layout ─────────────────────────────
function ExistingApplicationCard({ application, onBack }) {
  const [pdfPreview, setPdfPreview] = useState(null);

  const renderDocumentLink = (documentType, label = "View File") => {
    if (!application?.[documentType]) return "NA";
    const url = getOrganisationDocumentUrl(application.application_id, documentType);
    return (
      <button
        type="button"
        onClick={() => setPdfPreview({ url, title: label })}
        style={{
          background: "none",
          border: "none",
          color: "#2563eb",
          textDecoration: "underline",
          cursor: "pointer",
          padding: 0,
          fontSize: "inherit",
          fontWeight: "inherit",
        }}
      >
        View File
      </button>
    );
  };

  return (
    <div className="applicant-org-embedded">
      <div className="applicant-org-card">
        <button type="button" className="applicant-org-back" onClick={onBack}>
          &larr; Back to Dashboard
        </button>

        <h2 style={{ marginTop: 0 }}>Organisation Registration</h2>

        {/* ── Already submitted banner ── */}
        <div className="aor-existing-banner">
          <div className="aor-existing-banner-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <div>
            <div className="aor-existing-banner-title">Application Already Submitted</div>
            <div className="aor-existing-banner-sub">
              You have already applied for a water connection. Only one application is allowed per account.
            </div>
          </div>
        </div>

        {/* ── CE-style 2-column section grid ── */}
        <div className="ce-dashboard-app-detail" style={{ padding: "0 24px 8px" }}>
          <div className="ce-dashboard-app-section-grid">

            <SectionBox title="Application Details">
              <Row label="Application ID"       value={application.application_id} />
              <Row label="Application Received" value={formatDisplayDate(application.created_at)} />
              <Row label="Application Status"   value={formatApplicationStatus(application.application_status)} />
            </SectionBox>

            <SectionBox title="Applicant Details">
              <Row label="Name"          value={application.name} />
              <Row label="Gender"        value={application.gender} />
              <Row label="Email"         value={application.email} />
              <Row label="Mobile Number" value={application.mobile_number} />
            </SectionBox>

            <SectionBox title="Organisation Details">
              <Row label="Organisation Name"  value={application.organisation_name} />
              <Row label="Establishment Type" value={application.establishment_type} />
              <Row label="District"           value={application.district} />
              <Row label="Block"              value={application.block} />
              <Row label="Gram Panchayat"     value={application.gram_panchayat} />
              <Row label="Village"            value={application.village} />
              <Row label="Habitation"         value={application.habitation} />
            </SectionBox>

            <SectionBox title="Connection Details">
              <Row label="Connection Type"               value={application.type_of_connection} />
              <Row label="Water Requirement (Litre/Day)" value={
                application.water_requirement ? `${application.water_requirement} L/Day` : null
              } />
            </SectionBox>

            <SectionBox title="Documents">
              {DOCUMENT_ROWS.map(([label, documentType]) => (
                <Row
                  key={documentType}
                  label={label}
                  value={renderDocumentLink(documentType, label)}
                />
              ))}
            </SectionBox>

          </div>
        </div>

        
      </div>

      {/* PDF preview overlay — same as CEDashboardApplications */}
      <PdfPreviewOverlay preview={pdfPreview} onClose={() => setPdfPreview(null)} />
    </div>
  );
}

// ── Initial state ─────────────────────────────────────────────────────────────
const initialFormData = {
  applicant_user_id: "",
  name: "",
  gender: "",
  email: "",
  mobile_number: "",
  organisation_name: "",
  establishment_type: "",
  district_code: "",
  district: "",
  block_code: "",
  block: "",
  gram_panchayat_code: "",
  gram_panchayat: "",
  village: "",
  habitation: "",
  type_of_connection: "",
  water_requirement: "",
};

const initialFiles = {
  property_proof: null,
  registration_proof: null,
  ownership_proof: null,
  owner_indemnity_bond: null,
  identity_proof: null,
};

// ── Main component ────────────────────────────────────────────────────────────
function ApplicantOrganisationRegistrationPage({ embedded = false, onBack }) {
  const navigate = useNavigate();
  const [formData, setFormData]                       = useState(initialFormData);
  const [files, setFiles]                             = useState(initialFiles);
  const [step, setStep]                               = useState(0);
  const [isPreview, setIsPreview]                     = useState(false);
  const [districts, setDistricts]                     = useState([]);
  const [blocks, setBlocks]                           = useState([]);
  const [panchayats, setPanchayats]                   = useState([]);
  const [existingApplication, setExistingApplication] = useState(null);
  const [returnedApplication, setReturnedApplication] = useState(null);
  const [loading, setLoading]                         = useState(true);
const [pdfPreview, setPdfPreview] = useState(null);
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("applicantSession") || "null");
    if (!session?.id) {
      navigate("/applicant-login", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const [profileResponse, districtResponse, applicationResponse] = await Promise.all([
          fetchApplicantProfile(session.id),
          fetchDistricts(),
          fetchApplicantApplication(session.id).catch(() => null),
        ]);

        const applicant = profileResponse.data.applicant;
        const application = applicationResponse?.data?.application || null;
        const isReturnedApplication =
          String(application?.application_status || "").toUpperCase() === "APPLICATION_RETURNED_TO_APPLICANT";

        if (application && !isReturnedApplication) {
          setExistingApplication(application);
          setLoading(false);
          return;
        }

        setFormData((current) => ({
          ...current,
          applicant_user_id: applicant.id,
          name:              applicant.name              || "",
          organisation_name: application?.organisation_name || applicant.organisation_name || "",
          gender:            applicant.gender            || "",
          email:             applicant.email             || "",
          mobile_number:     applicant.mobile_number     || "",
          establishment_type: application?.establishment_type || "",
          district_code: application?.district_code || "",
          district: application?.district || "",
          block_code: application?.block_code || "",
          block: application?.block || "",
          gram_panchayat_code: application?.gram_panchayat_code || "",
          gram_panchayat: application?.gram_panchayat || "",
          village: application?.village || "",
          habitation: application?.habitation || "",
          type_of_connection: application?.type_of_connection || "",
          water_requirement: application?.water_requirement || "",
        }));
        setDistricts(districtResponse.data || []);

        if (isReturnedApplication) {
          setReturnedApplication(application);
          if (application.district_code) {
            const blockResponse = await fetchBlocks(application.district_code);
            setBlocks(blockResponse.data || []);
          }
          if (application.block_code) {
            const panchayatResponse = await fetchPanchayats(application.block_code);
            setPanchayats(panchayatResponse.data || []);
          }
        }
      } catch (error) {
        console.error("Applicant organisation form load failed:", error);
        await swalError(
          "Unable to Load",
          error.response?.data?.error || "Unable to load applicant details."
        );
        navigate("/applicant-dashboard", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const handleBack = () => {
    if (embedded && onBack) onBack();
    else navigate("/applicant-dashboard");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleDistrictChange = async (event) => {
    const districtCode = event.target.value;
    const districtName =
      districts.find((d) => String(d.district_code) === String(districtCode))?.district_name || "";
    setFormData((current) => ({
      ...current,
      district_code:  districtCode,
      district:       districtName,
      block_code:     "",
      block:          "",
      gram_panchayat_code: "",
      gram_panchayat: "",
    }));
    setBlocks([]);
    setPanchayats([]);
    if (!districtCode) return;
    const response = await fetchBlocks(districtCode);
    setBlocks(response.data || []);
  };

  const handleBlockChange = async (event) => {
    const blockCode = event.target.value;
    const blockName =
      blocks.find((b) => String(b.block_code) === String(blockCode))?.block_name || "";
    setFormData((current) => ({
      ...current,
      block_code:     blockCode,
      block:          blockName,
      gram_panchayat_code: "",
      gram_panchayat: "",
    }));
    setPanchayats([]);
    if (!blockCode) return;
    const response = await fetchPanchayats(blockCode);
    setPanchayats(response.data || []);
  };

  const handleFileChange = (event) => {
    const { name, files: fileList } = event.target;
    const file = fileList[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      swalError("File Too Large", "File size must be less than 2MB.");
      event.target.value = "";
      return;
    }
    if (file.type !== "application/pdf") {
      swalError("Invalid File Type", "Only PDF files are allowed.");
      event.target.value = "";
      return;
    }
    setFiles((current) => ({ ...current, [name]: file }));
  };

  const validateStep = (index) => {
    if (index === 0) return ["name", "gender", "email", "mobile_number"].every((f) => formData[f]);
    if (index === 1) return ["organisation_name", "establishment_type", "district_code", "block_code", "gram_panchayat", "village"].every((f) => formData[f]);
    if (index === 2) {
      return DOCUMENT_ROWS.every(([, key]) => Boolean(files[key] || returnedApplication?.[key]));
    }
    if (index === 3) return Boolean(formData.type_of_connection && formData.water_requirement);
    return true;
  };

  const validateAll = () => STEPS.every((_, i) => validateStep(i));

  const nextStep = async () => {
    if (!validateStep(step)) {
      await swalWarning("Incomplete Fields", "Please complete all mandatory fields marked with *.");
      return;
    }
    setStep((c) => Math.min(c + 1, STEPS.length - 1));
  };

  const openPreview = async () => {
    if (!validateAll()) {
      await swalWarning("Incomplete Fields", "Please complete all mandatory fields marked with *.");
      return;
    }
    setIsPreview(true);
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!validateAll()) {
      await swalWarning("Incomplete Fields", "Please complete all mandatory fields marked with *.");
      return;
    }

    const payload = new FormData();
    ["applicant_user_id", "organisation_name", "establishment_type",
      "district_code", "block_code", "district", "block",
      "gram_panchayat_code", "gram_panchayat", "village", "habitation",
      "type_of_connection", "water_requirement",
    ].forEach((key) => payload.append(key, formData[key]));
    Object.entries(files).forEach(([key, file]) => payload.append(key, file));

    Swal.fire({
      title: "Submitting...",
      text: "Please wait while we submit your application.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = returnedApplication?.application_id
        ? await updateReturnedApplicantOrganisation(returnedApplication.application_id, payload)
        : await registerApplicantOrganisation(payload);
      const applicationId = response.data?.data?.application_id;
      await Swal.fire({
        icon: "success",
        title: returnedApplication ? "Application Resubmitted" : "Application Submitted",
        html: `Application ID:<br/><b style="font-family:monospace;font-size:1.2rem;">${applicationId}</b>`,
        confirmButtonColor: "#3d1f0f",
      });
      handleBack();
    } catch (error) {
      await swalError("Submission Failed", error.response?.data?.error || "Something went wrong.");
    } finally {
      Swal.close();
    }
  };

  const previewSections = [
    ["Applicant Details", [["Name", formData.name], ["Gender", formData.gender], ["Email", formData.email], ["Mobile Number", formData.mobile_number]]],
    ["Organisation Details", [["Organisation Name", formData.organisation_name], ["Establishment Type", formData.establishment_type], ["District", formData.district], ["Block", formData.block], ["Gram Panchayat", formData.gram_panchayat], ["Village", formData.village], ["Habitation", formData.habitation]]],
    ["Documents", Object.entries(files).map(([key, file]) => [key, file?.name || "-"])],
    ["Connection", [["Connection Type", formData.type_of_connection], ["Water Requirement", formData.water_requirement]]],
  ];

  // ── Loading ──
  if (loading) {
    return (
      <div className="applicant-org-embedded">
        <div className="applicant-org-card" style={{ padding: "40px", textAlign: "center", color: "#7f6658" }}>
          Loading…
        </div>
      </div>
    );
  }

  // ── Existing application → CE-style detail view ──
  if (existingApplication) {
    return <ExistingApplicationCard application={existingApplication} onBack={handleBack} />;
  }

  // ── New application registration form ──
  return (
    <div className="applicant-org-embedded">
      <form className="applicant-org-card" onSubmit={submitApplication}>
        <button type="button" className="applicant-org-back" onClick={handleBack}>
          &larr; Back to Dashboard
        </button>
        <h2>Organisation Registration</h2>
        {returnedApplication ? (
          <div className="aor-existing-banner" style={{ marginBottom: "18px" }}>
            <div className="aor-existing-banner-icon">!</div>
            <div>
              <div className="aor-existing-banner-title">Application Returned to Applicant</div>
              <div className="aor-existing-banner-sub">
                Please update the details and resubmit the same application ID: {returnedApplication.application_id}
              </div>
            </div>
          </div>
        ) : null}

        {!isPreview ? (
          <>
            <div className="applicant-org-steps">
              {STEPS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={index === step ? "active" : ""}
                  onClick={() => index <= step && setStep(index)}
                >
                  <span>{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>

            {step === 0 && (
              <div className="applicant-org-panel">
                <Field label="Name" required><input value={formData.name} disabled /></Field>
                <Field label="Gender" required><input value={formData.gender} disabled /></Field>
                <Field label="Email" required><input value={formData.email} disabled /></Field>
                <Field label="Mobile Number" required><input value={formData.mobile_number} disabled /></Field>
              </div>
            )}

            {step === 1 && (
              <div className="applicant-org-panel">
                <Field label="Name of the Organisation" required>
                  <input value={formData.organisation_name} disabled />
                </Field>
                <Field label="Type of Establishment/Business" required>
                  <input name="establishment_type" value={formData.establishment_type} onChange={handleChange} />
                </Field>
                <Field label="District" required>
                  <select value={formData.district_code} onChange={handleDistrictChange}>
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d.district_code} value={d.district_code}>{d.district_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Block" required>
                  <select value={formData.block_code} onChange={handleBlockChange} disabled={!formData.district_code}>
                    <option value="">Select Block</option>
                    {blocks.map((b) => (
                      <option key={b.block_code} value={b.block_code}>{b.block_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Gram Panchayat" required>
                  <select
                    value={formData.gram_panchayat_code}
                    onChange={(e) => {
                      const selectedPanchayat = panchayats.find((p) => String(p.panchayat_code) === String(e.target.value));
                      setFormData((c) => ({
                        ...c,
                        gram_panchayat_code: e.target.value,
                        gram_panchayat: selectedPanchayat?.panchayat_name || "",
                      }));
                    }}
                    disabled={!formData.block_code}
                  >
                    <option value="">Select Panchayat</option>
                    {panchayats.map((p) => (
                      <option key={p.panchayat_code} value={p.panchayat_code}>{p.panchayat_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Village" required>
                  <input name="village" value={formData.village} onChange={handleChange} />
                </Field>
                <Field label="Habitation">
                  <input name="habitation" value={formData.habitation} onChange={handleChange} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="applicant-org-panel">
                <FileField name="property_proof"       label="Property Proof"       onChange={handleFileChange} existing={returnedApplication?.property_proof} />
                <FileField name="registration_proof"   label="Registration Proof"   onChange={handleFileChange} existing={returnedApplication?.registration_proof} />
                <FileField name="ownership_proof"      label="Ownership Proof"      onChange={handleFileChange} existing={returnedApplication?.ownership_proof} />
                <FileField name="owner_indemnity_bond" label="Owner Indemnity Bond" onChange={handleFileChange} existing={returnedApplication?.owner_indemnity_bond} />
                <FileField name="identity_proof"       label="Identity Proof"       onChange={handleFileChange} existing={returnedApplication?.identity_proof} />
              </div>
            )}

            {step === 3 && (
              <div className="applicant-org-panel">
                <Field label="Connection Type" required>
                  <select name="type_of_connection" value={formData.type_of_connection} onChange={handleChange}>
                    <option value="">Type of Connection</option>
                    <option value="Single Tap">Single Tap</option>
                    <option value="More than one tap">More than one tap</option>
                  </select>
                </Field>
                <Field label="Water Requirement (Litre/Day)" required>
                  <input name="water_requirement" value={formData.water_requirement} onChange={handleChange} />
                </Field>
              </div>
            )}

            <div className="applicant-org-actions">
              <button type="button" className="secondary" onClick={() => setStep((c) => Math.max(c - 1, 0))} disabled={step === 0}>
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={nextStep}>Next</button>
              ) : (
                <button type="button" onClick={openPreview}>Preview</button>
              )}
            </div>
          </>
        ) : (
          <div className="applicant-org-preview">
            <h3>Preview Application</h3>
            <div className="applicant-org-preview-grid">
              {previewSections.map(([title, items]) => (
                <section key={title}>
                  <h4>{title}</h4>
                  {items.map(([label, value]) => {
                    const displayLabel =
                      title === "Documents"
                        ? label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : label;
                    return (
                      <div key={label}>
                        <span>{displayLabel}</span>
                        {title === "Documents" && files[label] ? (
  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <button
      type="button"
      onClick={() => {
        const url = URL.createObjectURL(files[label]);  // ✅ local File object
        setPdfPreview({
          url,
          title: label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          fileName: files[label].name,
        });
      }}
      style={{
        padding: "2px 10px", fontSize: "0.75rem",
        background: "#3d1f0f", color: "#fff",
        border: "none", borderRadius: "4px",
        cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      View File
    </button>
  </div>
) : (
                          <strong>{value || "-"}</strong>
                        )}
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
            <div className="applicant-org-actions">
              <button type="button" className="secondary" onClick={() => setIsPreview(false)}>Edit</button>
              <button type="submit">Submit</button>
            </div>
          </div>
        )}
          {/* ── PDF Preview Overlay ── */}
        {pdfPreview && (
          <div className="pv-preview-overlay">
            <div className="pv-preview-card">
              <div className="pv-preview-header">
                <h2 className="pv-preview-header__title">{pdfPreview.title}</h2>
                <div className="pv-preview-header__actions">
                  
                   <a href={pdfPreview.url}
                    download={pdfPreview.fileName}
                    className="pv-preview-btn-download"
                  >
                    <Download size={14} />
                    Download PDF
                  </a>
                  <button
                    type="button"
                    className="pv-preview-btn-close"
                    onClick={() => {
                      URL.revokeObjectURL(pdfPreview.url); // ✅ cleanup
                      setPdfPreview(null);
                    }}
                    title="Close Preview"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="pv-preview-content">
                <iframe
                  src={`${pdfPreview.url}#toolbar=0`}
                  className="pv-preview-frame"
                  title="PDF Preview"
                />
              </div>
            </div>
            </div>
          )}
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="applicant-org-field">
      {required ? <RequiredLabel>{label}</RequiredLabel> : <span>{label}</span>}
      {children}
    </label>
  );
}

function FileField({ name, label, onChange, existing }) {
  return (
    <label className="applicant-org-field">
      <RequiredLabel>{label}</RequiredLabel>
      <input type="file" name={name} accept=".pdf" onChange={onChange} />
      <small>{existing ? "Existing file will be kept if you do not upload a new PDF." : "Max size: 2MB. Only PDF files are allowed."}</small>
    </label>
  );
}

export default ApplicantOrganisationRegistrationPage;