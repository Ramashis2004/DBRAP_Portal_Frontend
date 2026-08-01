import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Users,
  Eye,
  Search,
  FileText,
  Download,
  FileCheck,
Settings2,  X,
} from "lucide-react";
import {
  createOfficerUser,
  fetchBlocksByDivision,
  fetchCircles,
  fetchDistrictsByCircle,
  fetchDivisionsByDistrict,
  fetchApplicationReceivedApplications,
  getSiteVisitReportUrl,
  getOrganisationDocumentUrl,
  fetchOfficerDashboardConfig,
  getOfficerUsers,
  logoutOfficer,
  uploadSiteVisitReport,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
  formatDayProgress,
} from "../utils/applicationStatus";
import "./OfficerDashboardPage.css";
import  UserManualButton from "../components/UserManualButton";

const initialCreateUserForm = {
  userTypeId: "",
  circleCode: "",
  districtCode: "",
  divisionCode: "",
  blockCode: "",
  userName: "",
  designation: "",
  mobileNo: "",
  emailId: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const USER_NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/;
const DESIGNATION_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s().,&/-]{1,79}$/;
const SITE_VISIT_REPORT_MAX_BYTES = 2 * 1024 * 1024;

const validateCreateUserForm = (formData) => {
  const errors = {};

  if (!formData.userTypeId) {
    errors.userTypeId = "Please select a user type.";
  }

  if (!formData.circleCode) {
    errors.circleCode = "Please select a circle.";
  }

  if (!formData.districtCode) {
    errors.districtCode = "Please select a district.";
  }

  if (formData.isCeUserType) {
    if (!formData.divisionCode) {
      errors.divisionCode = "Division mapping is unavailable for the selected CE subtype.";
    }
  } else if (!formData.divisionCode) {
    errors.divisionCode = "Please select a division.";
  }

  if (formData.requiresBlockSelection && !formData.blockCode) {
    errors.blockCode = "Please select a block.";
  }

  if (!formData.userName.trim()) {
    errors.userName = "Please enter the user's name.";
  } else if (!USER_NAME_REGEX.test(formData.userName.trim())) {
    errors.userName = "Name must be 2-80 characters and contain valid letters only.";
  }

  if (!formData.designation.trim()) {
    errors.designation = "Please enter a designation.";
  } else if (!DESIGNATION_REGEX.test(formData.designation.trim())) {
    errors.designation = "Designation must be 2-80 characters and contain valid text.";
  }

  if (!formData.mobileNo.trim()) {
    errors.mobileNo = "Please enter a mobile number.";
  } else if (!MOBILE_REGEX.test(formData.mobileNo.trim())) {
    errors.mobileNo = "Mobile number must be a valid 10-digit Indian mobile number.";
  }

  if (formData.emailId.trim() && !EMAIL_REGEX.test(formData.emailId.trim())) {
    errors.emailId = "Please enter a valid email address.";
  }

  return errors;
};

// ─── ADD THESE TWO RIGHT HERE ─────────────────────────────────────────────────

const DOCUMENT_ROWS = [
  ["Property Proof", "property_proof"],
  ["Registration Proof", "registration_proof"],
  ["Ownership Proof", "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof", "identity_proof"],
];





export function ForwardedApplicationsTable({
  userId,
  applicationStatus = "APPLICATION_FORWARDED_TO_JE",
  actionMode = "view",
}) {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [detailView, setDetailView] = useState(null);
  const [uploadTargetApp, setUploadTargetApp] = useState(null);
  const [selectedReportFile, setSelectedReportFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pdfPreview,      setPdfPreview]      = useState(null);
const [inspectionDate, setInspectionDate] = useState("");
const [inspectionTime, setInspectionTime] = useState("");
const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }

    const load = async () => {
      try {
        const response = await fetchApplicationReceivedApplications(userId, applicationStatus);
        setApplications(response.data);
      } catch (err) {
        //console.error(err);
        setError("Failed to load forwarded applications.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, applicationStatus]);

  const filtered = applications.filter((app) => {
    const q = search.toLowerCase();
    return (
      app.application_id?.toLowerCase().includes(q) ||
      app.organisation_name?.toLowerCase().includes(q) ||
      app.block?.toLowerCase().includes(q) ||
      app.village?.toLowerCase().includes(q) ||
      app.name?.toLowerCase().includes(q)
    );
  });

  const tableColumns = [
    { label: "Application ID", width: 130 },
    { label: "Organisation Name", width: 180 },
    { label: "Block", width: 105 },
    { label: "Village", width: 120 },
    { label: "Applicant Name", width: 190 },
    { label: "Connection Type", width: 130 },
    { label: "Application Status", width: 165 },
    { label: "Application Received", width: 150 },
    { label: "Action Status", width: 185 },
    { label: "Action", width: 120 },
  ];

  const getActionStatusMeta = (app) => {
    const status = String(app.application_status || "").toUpperCase();
    const referenceDate =
      status === "APPLICATION_FORWARDED_TO_JE"
        ? app.forward_on || app.forwardOn || app.created_at || app.createdAt
        : app.site_visit_report_upload_on || app.siteVisitReportUploadOn || app.created_at || app.createdAt;

    if (status === "APPLICATION_FORWARDED_TO_JE") {
      return {
        background: "#fef3c7",
        color: "#92400e",
        text: formatDayProgress("Pending since", referenceDate),
      };
    }

    if (status === "JE_VERIFIED_REPORT_UPLOADED") {
      return {
        background: "#dcfce7",
        color: "#166534",
        text: formatDayProgress("Action taken in", referenceDate),
      };
    }

    return {
      background: "#e2e8f0",
      color: "#475569",
      text: "—",
    };
  };

  const renderDetailValue = (label, value, app) => {
    if (label === "Site Visit Report" && value) {
      // getSiteVisitReportUrl() returns null when the URL fails the
      // same-origin / allow-listed-path validation performed in api.js
      // (Fortify: Open Redirect remediation) — never hand a null/invalid
      // value to href.
      const reportUrl = getSiteVisitReportUrl(app.application_id);
     
      const validatedReportUrl =
    reportUrl &&
    isSafeManualUrl(reportUrl)
        ? reportUrl
        : null;

return validatedReportUrl ? (

<a
    href={validatedReportUrl}
    target="_blank"
    rel="noopener noreferrer"
      style={{
            color: "#1d4ed8",
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            wordBreak: "break-word",
          }}
>

View File

</a>

) : (
    "Unavailable"
);
    }

    if (label === "Site Visit Report") {
      return "NA";
    }

    return value || "—";
  };

  const getReceivedDate = (app) => app.forward_on || app.forwardOn || app.created_at || app.createdAt;

  const handleActionClick = async (app) => {
    if (actionMode !== "upload") {
      setDetailView(app);
      return;
    }

    setUploadTargetApp(app);
    setSelectedReportFile(null);
    setUploadError("");
  };
const renderDocumentLink = (app, documentType, label = "View File") => {
    if (!app?.[documentType]) return "NA";
    // getOrganisationDocumentUrl() returns null if it fails the allow-list
    // check in api.js — fall back to "NA" instead of opening a broken
    // preview with an invalid src.
    const url = getOrganisationDocumentUrl(app.application_id, documentType);
    if (!url) return "NA";
    return (
      <button
        onClick={() => setPdfPreview({ url, title: label })}
        style={{
          background: "none", border: "none", color: "#2563eb",
          textDecoration: "underline", cursor: "pointer", padding: 0,
          fontSize: "inherit", fontWeight: "inherit"
        }}
      >
        {label}
      </button>
    );
  };
  const handleUploadSubmit = async (event) => {
    event.preventDefault();

    if (!uploadTargetApp) {
      return;
    }

    if (!selectedReportFile) {
      setUploadError("Please choose a site visit report file.");
      return;
    }

    const isPdfFile =
      selectedReportFile.type === "application/pdf" ||
      selectedReportFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdfFile) {
      setUploadError("Only PDF files are allowed.");
      return;
    }

    if (selectedReportFile.size > SITE_VISIT_REPORT_MAX_BYTES) {
      setUploadError("File size must be 2MB or less.");
      return;
    }
if (!inspectionDate) {
  setUploadError("Please select a date of inspection.");
  return;
}
if (!inspectionTime) {
  setUploadError("Please select a time of inspection.");
  return;
}
    const confirmation = await Swal.fire({
      title: "Upload report?",
      text: `Do you want to upload site visit report for this "${uploadTargetApp.application_id}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const uploadResponse = await uploadSiteVisitReport(uploadTargetApp.application_id, selectedReportFile, inspectionDate,
  inspectionTime,
  remarks,userId);
      const forwardedDivisionName =
        uploadTargetApp.division_name ||
        uploadResponse.data?.data?.division_name ||
        "";
      const successMessage = forwardedDivisionName
        ? "Site visit report uploaded successfully. Application forwarded to " +
          forwardedDivisionName +
          " SE for approval"
        : "Site visit report uploaded successfully. Application forwarded to SE for approval";

      setApplications((current) => current.filter((item) => item.application_id !== uploadTargetApp.application_id));
      setUploadTargetApp(null);
      setSelectedReportFile(null);
      setInspectionDate("");      
      setInspectionTime("");     
      setRemarks("");
      await Swal.fire({
        title: "Success",
        text: successMessage,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      //console.error("Site visit upload failed:", err);
      setUploadError(err.response?.data?.error || "Unable to upload site visit report.");
    } finally {
      setIsUploading(false);
    }
  };

  if (detailView) {
    const app = detailView;
    const fields = [
      ["Application ID", app.application_id],
      ["Organisation Name", app.organisation_name],
      ["Establishment Type", app.establishment_type],
      ["Site Visit Report", app.site_visit_report],
      ["Applicant Name", app.name],
      ["Gender", app.gender],
      ["Email", app.email],
      ["Mobile", app.mobile_number],
      ["District", app.district],
      ["Block", app.block],
      ["Gram Panchayat", app.gram_panchayat],
      ["Village", app.village],
      ["Habitation", app.habitation],
      ["Connection Type", app.type_of_connection],
      ["Water Requirement", app.water_requirement ? `${app.water_requirement} L/Day` : null],
      ["Application Received", formatDisplayDate(getReceivedDate(app))],
      ["Application Status", formatApplicationStatus(app.application_status)],
    ];

    return (
<>
<div style={{width:"100%"}}>

<button
 onClick={()=>setDetailView(null)}
 style={{
   display:"inline-flex",
   gap:"6px",
   padding:"8px 14px",
   border:"1px solid #d6d3d1",
   borderRadius:"8px",
   background:"#fff",
   fontWeight:"600",
   marginBottom:"20px",
   cursor:"pointer"
 }}
>
← Back to Applications
</button>


<div style={{
 background:"#1e293b",
 borderRadius:"12px",
 padding:"24px 28px",
 marginBottom:"20px"
}}>
<p style={{
margin:"0 0 6px",
fontSize:"12px",
color:"#94a3b8",
fontWeight:"600"
}}>
APPLICATION DETAILS
</p>

<span style={{
background:"#fff4c2",
padding:"5px 14px",
borderRadius:"6px",
fontWeight:"700",
color:"#92400e"
}}>
{app.application_id}
</span>
</div>



<div
style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"14px"
}}
>

<SectionBox title="Application Details">
<Row label="Application ID" value={app.application_id}/>
<Row
label="Application Received"
value={formatDisplayDate(getReceivedDate(app))}
/>
<Row
label="Application Status"
value={formatApplicationStatus(app.application_status)}
/>
</SectionBox>
<SectionBox title="Applicant Details">
<Row label="Name" value={app.name}/>
<Row label="Gender" value={app.gender}/>
<Row label="Email" value={app.email}/>
<Row label="Mobile Number" value={app.mobile_number}/>
</SectionBox>


<SectionBox title="Organisation Details">
<Row label="Organisation Name" value={app.organisation_name}/>
<Row label="Establishment Type" value={app.establishment_type}/>
<Row label="District" value={app.district}/>
<Row label="Block" value={app.block}/>
<Row label="Gram Panchayat" value={app.gram_panchayat}/>
<Row label="Village" value={app.village}/>
<Row label="Habitation" value={app.habitation}/>
</SectionBox>


<SectionBox title="Connection Details">
<Row label="Connection Type" value={app.type_of_connection}/>
<Row
label="Water Requirement (Litre/Day)"
value={`${app.water_requirement} L/Day`}
/>
</SectionBox>



 <SectionBox title="Site Visit Report">
          <Row label="Site Visit Report" value={
            detailView.site_visit_report
              ? (() => {
                  // getSiteVisitReportUrl() returns null when validation
                  // in api.js rejects the URL — don't wire a preview
                  // button to a null href.
                  const reportUrl = getSiteVisitReportUrl(detailView.application_id);
                  if (!reportUrl) return "Unavailable";
                  return (
                    <button
                      onClick={() => setPdfPreview({
                        url: reportUrl,
                        title: "Site Visit Report"
                      })}
                      style={{
                        background: "none", border: "none", color: "#2563eb",
                        textDecoration: "underline", cursor: "pointer", padding: 0,
                        fontSize: "inherit", fontWeight: "inherit"
                      }}
                    >
                      View File
                    </button>
                  );
                })()
              : "NA"
          } />
        </SectionBox>


{/* REPLACE WITH — clean loop only */}
<SectionBox title="Documents">
  {DOCUMENT_ROWS.map(([label, documentType]) => (
    <Row
      key={documentType}
      label={label}
      value={renderDocumentLink(app, documentType)}
    />
  ))}
</SectionBox>

</div>

</div>
 {pdfPreview && (
        <div className="pv-preview-overlay">
          <div className="pv-preview-card">
            <div className="pv-preview-header">
              <h2 className="pv-preview-header__title">{pdfPreview.title}</h2>
              <div className="pv-preview-header__actions">
                {pdfPreview.url && (
                  <a
                    href={pdfPreview.url}
                    download
                    className="pv-preview-btn-download"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={14} />
                    Download PDF
                  </a>
                )}
                <button
                  className="pv-preview-btn-close"
                  onClick={() => setPdfPreview(null)}
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="pv-preview-content">
              {pdfPreview.url ? (
                <iframe
                  src={`${pdfPreview.url}#toolbar=0`}
                  className="pv-preview-frame"
                  title="PDF Preview"
                />
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  Preview unavailable.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
</>
);

  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "40px", color: "#666" }}>
        <LoaderCircle size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span>Loading forwarded applications...</span>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: "24px", color: "#c0392b" }}>{error}</div>;
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={20} style={{ color: "#b45309" }} />
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
            Applications Forwarded to JE
          </h2>
          <span style={{
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: "999px",
            padding: "2px 10px",
            fontSize: "0.78rem",
            fontWeight: 600,
          }}>
            {filtered.length}
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: "32px",
              paddingRight: "12px",
              paddingTop: "8px",
              paddingBottom: "8px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "0.85rem",
              outline: "none",
              width: "220px",
              background: "#fff",
              color: "#1e293b",
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fff" }}>
        <table
          style={{
            width: "100%",
            minWidth: "1280px",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr style={{ background: "#1e293b", color: "#fff" }}>
            {tableColumns.map((col) => (
                <th key={col.label} style={{
                  width: `${col.width}px`,
                  maxWidth: `${col.width}px`,
                  padding: "12px 14px",
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  No forwarded applications found.
                </td>
              </tr>
            ) : (
              filtered.map((app, index) => (
                <tr
                  key={app.application_id}
                  style={{
                    background: index % 2 === 0 ? "#fff" : "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fef9f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? "#fff" : "#f8fafc")}
                >
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    <span
                      onClick={() => setDetailView(app)}
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        fontFamily: "monospace",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                        textUnderlineOffset: "2px",
                      }}
                    >
                      {app.application_id}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#1e293b" }}>
                    {app.organisation_name || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>{app.block || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>{app.village || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>{app.name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      background: app.type_of_connection === "Single Tap" ? "#dcfce7" : "#dbeafe",
                      color: app.type_of_connection === "Single Tap" ? "#166534" : "#1e40af",
                      borderRadius: "999px",
                      padding: "3px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}>
                      {app.type_of_connection || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      borderRadius: "999px",
                      padding: "3px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}>
                      APPLICATION FORWARDED TO JE
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
                    {formatDisplayDate(getReceivedDate(app))}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        ...getActionStatusMeta(app),
                        borderRadius: "999px",
                        padding: "3px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getActionStatusMeta(app).text}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => handleActionClick(app)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#1e293b",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {actionMode === "upload" ? null : <Eye size={13} />}
                      {actionMode === "upload" ? "Upload" : "View"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {uploadTargetApp ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
              padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", color: "#1e293b" }}>
              Upload Site Visit Report
            </h3>
            <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: "0.9rem" }}>
              Application ID: <strong>{uploadTargetApp.application_id}</strong>
            </p>

            <form onSubmit={handleUploadSubmit}>

  {/* ── Date of Inspection ── */}
  <label style={{ display:"block", fontWeight:600, fontSize:"0.85rem",
                  color:"#334155", marginBottom:"6px" }}>
    Date of Inspection <span style={{ color:"#dc2626" }}>*</span>
  </label>
  <input
  type="date"
  value={inspectionDate}
  min={(() => {

  const raw = uploadTargetApp?.update_on;

  if (!raw) return undefined;

  // Handle DD-MM-YYYY format (e.g. "21-05-2026")
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Handle ISO / other formats (e.g. "2026-05-21T..." from DB timestamps)
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split("T")[0];
})()}
  max={new Date().toISOString().split("T")[0]}
  onChange={(e) => { setInspectionDate(e.target.value); setUploadError(""); }}
  />

  {/* ── Time of Inspection ── */}
  <label style={{ display:"block", fontWeight:600, fontSize:"0.85rem",
                  color:"#334155", marginBottom:"6px" }}>
    Time of Inspection <span style={{ color:"#dc2626" }}>*</span>
  </label>
  <input
    type="time"
    value={inspectionTime}
    onChange={(e) => { setInspectionTime(e.target.value); setUploadError(""); }}
    style={{
      width:"100%", border:"1px solid #cbd5e1", borderRadius:"8px",
      padding:"10px 12px", marginBottom:"14px", fontSize:"0.9rem",
      background:"#fff", color:"#1e293b", boxSizing:"border-box",
    }}
  />

  {/* ── Choose File ── */}
  <label style={{ display:"block", fontWeight:600, fontSize:"0.85rem",
                  color:"#334155", marginBottom:"6px" }}>
    Site Visit Report <span style={{ color:"#dc2626" }}>*</span>
  </label>
  <input
    type="file"
    accept=".pdf,application/pdf"
    onChange={(e) => { setSelectedReportFile(e.target.files?.[0] || null); setUploadError(""); }}
    style={{
      width:"100%", border:"1px solid #cbd5e1", borderRadius:"10px",
      padding:"12px", marginBottom:"6px", background:"#fff",
      boxSizing:"border-box",
    }}
  />
  <p style={{ margin:"0 0 14px", fontSize:"0.8rem", color:"#64748b" }}>
    (Max size: 2 MB — PDF only)
  </p>

  {/* ── Remarks ── */}
  <label style={{ display:"block", fontWeight:600, fontSize:"0.85rem",
                  color:"#334155", marginBottom:"6px" }}>
    Remarks
  </label>
  <textarea
    value={remarks}
    onChange={(e) => setRemarks(e.target.value)}
    placeholder="Enter any remarks (optional)..."
    rows={3}
    style={{
      width:"100%", border:"1px solid #cbd5e1", borderRadius:"8px",
      padding:"10px 12px", marginBottom:"14px", fontSize:"0.9rem",
      background:"#fff", color:"#1e293b", resize:"vertical",
      boxSizing:"border-box", fontFamily:"inherit",
    }}
  />

  {uploadError && (
    <div style={{ color:"#b91c1c", marginBottom:"12px", fontSize:"0.85rem" }}>
      {uploadError}
    </div>
  )}

  <div style={{ display:"flex", justifyContent:"flex-end", gap:"10px" }}>
    <button
      type="button"
      onClick={() => {
        setUploadTargetApp(null);
        setSelectedReportFile(null);
        setUploadError("");
        setInspectionDate("");
        setInspectionTime("");
        setRemarks("");
      }}
      style={{
        border:"1px solid #cbd5e1", background:"#fff", color:"#334155",
        borderRadius:"8px", padding:"9px 16px", fontWeight:600, cursor:"pointer",
      }}
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={isUploading}
      style={{
        border:"none",
        background: isUploading ? "#94a3b8" : "#1d4ed8",
        color:"#fff", borderRadius:"8px", padding:"9px 16px",
        fontWeight:600, cursor: isUploading ? "not-allowed" : "pointer",
      }}
    >
      {isUploading ? "Uploading..." : "Submit"}
    </button>
  </div>
</form>
          </div>
        </div>
      ) : null}
     
    </div>
    
  );
  
}

function JEDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [showDashboardHome, setShowDashboardHome] = useState(true);
  const [activeMenuKey, setActiveMenuKey] = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState(initialCreateUserForm);
  const [circles, setCircles] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const loadDashboard = async (userId, preserveMenuState = false) => {
    const response = await fetchOfficerDashboardConfig(userId);
    setDashboardData(response.data);

    if (!preserveMenuState) {
      setActiveMenuKey("");
      setActiveOptionKey("");
    }

    return response.data;
  };
const handleDashboardHomeClick = () => {
  setShowDashboardHome(true);
  setActiveMenuKey("");
  setActiveOptionKey("");
};
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await getOfficerUsers();
      setUsers(response.data.users);
    } catch (error) {
      //console.error("Failed to load users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    const rawSession = localStorage.getItem("officerSession");
    const parsedSession = rawSession ? JSON.parse(rawSession) : null;

    if (!parsedSession?.id) {
      navigate("/login", { replace: true });
      return;
    }

    setSession(parsedSession);

    const initializeDashboard = async () => {
      try {
        await loadDashboard(parsedSession.id);
      } catch (error) {
        //console.error("Dashboard config load failed:", error);
        setErrorMessage(error.response?.data?.error || "Unable to load dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [navigate]);

  useEffect(() => {
    const loadCircles = async () => {
      try {
        const response = await fetchCircles();
        setCircles(response.data);
      } catch (error) {
       // console.error("Circle load failed:", error);
      } finally {
        setIsLoadingCircles(false);
      }
    };

    loadCircles();
  }, []);

  useEffect(() => {
    if (showUserManagement && users.length === 0) {
      loadUsers();
    }
  }, [showUserManagement, users.length]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Do you want to logout from this account?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      if (session?.id) {
        await logoutOfficer({ userId: session.id });
      }
    } catch (error) {
      //console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("officerSession");
      navigate("/login");
    }
  };

  if (isLoading) {
    return (
      <div className="officer-dashboard-page">
        <div className="officer-dashboard-loading">
          <LoaderCircle size={28} className="officer-dashboard-loading__icon" />
          <span>Loading officer dashboard...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !dashboardData) {
    return (
      <div className="officer-dashboard-page">
        <div className="officer-dashboard-error">
          <h2>Dashboard unavailable</h2>
          <p>{errorMessage || "Unable to load dashboard data."}</p>
          <button type="button" className="officer-dashboard-logout" onClick={handleLogout}>
            <LogOut size={18} />
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const { user, dashboard } = dashboardData;
  const menus = dashboard.navigation?.menus || [];
  const userTypes = dashboard.masterData?.userTypes || [];
  const activeMenu = menus.find((item) => item.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((item) => item.key === activeOptionKey) || null;
  const shouldShowCreateUserForm =
    activeOption?.url?.toLowerCase() === "/createuser" || activeOption?.label?.toLowerCase() === "create user";
  const selectedUserType = userTypes.find((userType) => String(userType.id) === String(createUserForm.userTypeId)) || null;
  const isCeUserType = selectedUserType?.type_name?.toUpperCase() === "CE";
  const requiresBlockSelection = selectedUserType?.type_name?.toUpperCase() === "JE";

  const handleMenuClick = (menuKey) => {

  // When Application Management clicked,
  // do NOT go back to dashboard
 // setShowDashboardHome(false);

  if (menuKey === activeMenuKey) {
    setActiveMenuKey("");
    setActiveOptionKey("");
    return;
  }

  setActiveMenuKey(menuKey);
  setActiveOptionKey("");
};

  const handleOptionClick = (option) => {
    const optionUrl = String(option.url || "").toLowerCase();
    const optionLabel = String(option.label || "").toLowerCase();

    setActiveOptionKey(option.key);
    
    if (optionUrl === "/createuser" || optionLabel === "create user") {
      navigate("/je-dashboard");
      return;
    }

    if (optionUrl === "/applicationreceived" || optionLabel === "application received") {
      navigate("/je-application-received");
      return;
    }

    // if (optionUrl.includes("payment") || optionLabel === "payment details") {
    //   navigate("/je-payment-details");
    // }

    if (
    optionUrl.includes("paymentverification") ||
    optionLabel.includes("payment verification")
  ) {
    navigate("/je-payment-verification");
    return;
  }

  if (
    optionUrl.includes("updateconnectiondetails") ||
    optionLabel.includes("update connection details")
  ) {
    navigate("/je-update-connection");
    return;
  }
  };

  const handleCreateUserFormChange = (event) => {
    const { name, value } = event.target;
    const isChangingUserType = name === "userTypeId";
    const nextUserType = isChangingUserType
      ? userTypes.find((userType) => String(userType.id) === String(value))
      : selectedUserType;
    const nextRequiresBlockSelection = nextUserType?.type_name?.toUpperCase() === "JE";
    setFormMessage("");
    setFormErrors((current) => ({
      ...current,
      [name]: "",
      ...(isChangingUserType && !nextRequiresBlockSelection
        ? {
            blockCode: "",
          }
        : {}),
    }));
    setCreateUserForm((current) => ({
      ...current,
      [name]: value,
      ...(isChangingUserType && !nextRequiresBlockSelection
        ? {
            blockCode: "",
          }
        : {}),
    }));

    if (isChangingUserType && !nextRequiresBlockSelection) {
      setBlocks([]);
    }
  };

  const handleCreateUserCircleChange = async (event) => {
    const { value } = event.target;
    setFormMessage("");
    setFormErrors((current) => ({
      ...current,
      circleCode: "",
      districtCode: "",
      divisionCode: "",
      blockCode: "",
    }));
    setCreateUserForm((current) => ({
      ...current,
      circleCode: value,
      districtCode: "",
      divisionCode: "",
      blockCode: "",
    }));
    setDistricts([]);
    setDivisions([]);
    setBlocks([]);

    if (!value) {
      return;
    }

    setIsLoadingDistricts(true);

    try {
      const response = await fetchDistrictsByCircle(value);
      setDistricts(response.data);
    } catch (error) {
      //console.error("District load failed:", error);
      setFormMessage("Unable to load districts for the selected circle.");
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const handleCreateUserDistrictChange = async (event) => {
    const { value } = event.target;
    setFormMessage("");
    setFormErrors((current) => ({
      ...current,
      districtCode: "",
      divisionCode: "",
      blockCode: "",
    }));
    setCreateUserForm((current) => ({
      ...current,
      districtCode: value,
      divisionCode: "",
      blockCode: "",
    }));
    setDivisions([]);
    setBlocks([]);

    if (!value) {
      return;
    }

    setIsLoadingDivisions(true);

    try {
      const response = await fetchDivisionsByDistrict(value);
      setDivisions(response.data);
    } catch (error) {
      //console.error("Division load failed:", error);
      setFormMessage("Unable to load divisions for the selected district.");
    } finally {
      setIsLoadingDivisions(false);
    }
  };

  const handleCreateUserDivisionChange = async (event) => {
    const { value } = event.target;
    setFormMessage("");
    setFormErrors((current) => ({
      ...current,
      divisionCode: "",
      blockCode: "",
    }));
    setCreateUserForm((current) => ({
      ...current,
      divisionCode: value,
      blockCode: "",
    }));
    setBlocks([]);

    if (!value || !requiresBlockSelection) {
      return;
    }

    setIsLoadingBlocks(true);

    try {
      const response = await fetchBlocksByDivision(value);
      setBlocks(response.data);
    } catch (error) {
      //console.error("Block load failed:", error);
      setFormMessage("Unable to load blocks for the selected division.");
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const handleCreateUserSubmit = async (event) => {
    event.preventDefault();
    setFormMessage("");
    const validationErrors = validateCreateUserForm({
      ...createUserForm,
      isCeUserType,
      requiresBlockSelection,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setCreatedCredentials(null);
      setFormMessage("Please correct the highlighted fields.");
      return;
    }

    setIsSubmittingUser(true);

    try {
      const response = await createOfficerUser({
        ...createUserForm,
        createdBy: session?.loginId || session?.id || null,
      });

      await loadDashboard(session.id, true);
      setFormErrors({});
      const responseMessage = response.data?.message || "User created successfully.";
      const smsFailureReason =
        response.data?.smsSent === false && response.data?.smsGatewayResponse
          ? ` SMS gateway response: ${response.data.smsGatewayResponse}`
          : "";
      setFormMessage(`${responseMessage}${smsFailureReason}`);
      setCreatedCredentials(response.data?.generatedCredentials || null);
      setCreateUserForm(initialCreateUserForm);
      setDistricts([]);
      setDivisions([]);
      setBlocks([]);
    } catch (error) {
      setCreatedCredentials(null);
      setFormMessage(error.response?.data?.error || "Failed to create user.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-shell">
        <aside className="officer-dashboard-sidebar">
          <div className="officer-dashboard-sidebar__brand">
            <div className="officer-dashboard-brand__icon">
              <Droplet size={22} />
            </div>
            <div>
              <span>DBRAP Portal</span>
              <strong>{user.roleName || "Officer"} Workspace</strong>
            </div>
          </div>

          <nav className="officer-dashboard-nav">
            <div className="officer-dashboard-nav__group">
  <button
    type="button"
    className={`officer-dashboard-nav__item ${showDashboardHome ? "is-active" : ""}`}
    onClick={handleDashboardHomeClick}
  >
    <div className="officer-dashboard-nav__item-copy">
      <ShieldCheck size={18} />
      <span>Dashboard</span>
    </div>
  </button>
</div>
            {menus.map((item) => {
              const isActive = item.key === activeMenuKey;

              return (
                <div key={item.key} className="officer-dashboard-nav__group">
                  <button
                    type="button"
                    className={`officer-dashboard-nav__item${isActive ? " is-active" : ""}`}
                    onClick={() => handleMenuClick(item.key)}
                  >
                    <div className="officer-dashboard-nav__item-copy">
                      <Users size={18} />
                      <span>{item.label}</span>
                    </div>
                    {isActive ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {isActive && item.options.length > 0 ? (
                    <div className="officer-dashboard-nav__options">
                      {item.options.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={`officer-dashboard-nav__option${
                            option.key === activeOption?.key ? " is-active" : ""
                          }`}
                          onClick={() => handleOptionClick(option)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="officer-dashboard-sidebar__footer">
            <p>Logged in as</p>
            <button
              type="button"
              className="officer-dashboard-sidebar__user-button"
              onClick={() => setIsUserMenuOpen((current) => !current)}
            >
              <strong>{user.name || user.loginId}</strong>
              {isUserMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isUserMenuOpen ? (
              <button
                type="button"
                className="officer-dashboard-sidebar__user-option"
                onClick={() => navigate("/change-password")}
              >
                Change Password
              </button>
            ) : null}
            <span>{user.roleName || "Officer Access"}</span>
          </div>
        </aside>

        <main className="officer-dashboard-main">
          <header className="officer-dashboard-header">
            <div className="officer-dashboard-header__copy">
              <h1>JE Dashboard</h1>
            </div>

            <div className="officer-dashboard-user">
                            <UserManualButton /> 

              <div>
                <span>Logged in as</span>
                <strong>{user.loginId}</strong>
              </div>
              <button type="button" className="officer-dashboard-logout" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </header>

{showDashboardHome && !shouldShowCreateUserForm ? (
<section className="je-dashboard-cards"> 
  <div
  className="je-dashboard-card"
  onClick={() => navigate("/je-application-received")}
>
  <div className="je-dashboard-card__icon je-dashboard-card__icon--blue">
    <FileText size={30} />
  </div>

  <h3 className="je-dashboard-card__title">
    Application Received
  </h3>

  <p className="je-dashboard-card__description">
    View applications forwarded from SE and upload site visit reports.
  </p>
</div>

<div
  className="je-dashboard-card"
  onClick={() => navigate("/je-payment-verification")}
>
  <div className="je-dashboard-card__icon je-dashboard-card__icon--green">
<FileCheck size={30} />
  </div>

  <h3 className="je-dashboard-card__title">
    Payment Verification
  </h3>

  <p className="je-dashboard-card__description">
    Verify uploaded payment receipts and review payment details.
  </p>
</div>

<div
  className="je-dashboard-card"
  onClick={() => navigate("/je-update-connection")}
>
  <div className="je-dashboard-card__icon je-dashboard-card__icon--purple">
<Settings2 size={30} />
  </div>

  <h3 className="je-dashboard-card__title">
    Update Connection Details
  </h3>

  <p className="je-dashboard-card__description">
    Update tapping and connection details after payment verification.
  </p>
</div>             
            </section>
          ) : null}

          {shouldShowCreateUserForm ? (
            <section className="officer-dashboard-form-section officer-dashboard-form-section--full">
             
            </section>
          ) : null}

          
        </main>
        
      </div>
       
    </div>
    
  );
 
}
function SectionBox({title,children}){

return(
<div style={{
background:"#fff",
border:"1px solid #ddd6ce",
borderRadius:"12px",
overflow:"hidden"
}}>
<div style={{
padding:"14px 16px",
fontWeight:"700",
background:"#fafaf9",
borderBottom:"1px solid #ddd6ce"
}}>
{title}
</div>

<div style={{padding:"12px 16px"}}>
{children}
</div>
</div>
)

}



function Row({label,value}){

return(
<div style={{
display:"flex",
justifyContent:"space-between",
padding:"10px 0",
borderBottom:"1px dashed #e7e5e4"
}}>
<span style={{fontWeight:"600"}}>
{label}
</span>

<span>
{value || "—"}
</span>

</div>
)

}

export default JEDashboardPage;
