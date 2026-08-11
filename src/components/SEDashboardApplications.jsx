import { useEffect, useState } from "react";
import { ArrowLeft, FileText, LoaderCircle, Search,Download,X } from "lucide-react";
import {
  fetchSEDashboardApplicationSummary,
  fetchSEDashboardApplications,
  getOrganisationDocumentUrl,
  getSiteVisitReportUrl,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
  formatDayProgress,
} from "../utils/applicationStatus";
import "./SEDashboardApplications.css";
import "../pages/officerDashboardPage.css";


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
];

const DOCUMENT_ROWS = [
  ["Property Proof", "property_proof"],
  ["Registration Proof", "registration_proof"],
  ["Ownership Proof", "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof", "identity_proof"],
];
const daysBetween = (from, to) => {
  if (!from) return 0;
  const s = new Date(from); s.setHours(0, 0, 0, 0);
  const e = to ? new Date(to) : new Date(); e.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((e - s) / (1000 * 60 * 60 * 24)));
};

const buildDayLabel = (prefix, from, to) => {
  const d = daysBetween(from, to);
  return `${prefix} ${d} ${d === 1 ? "day" : "days"}`;
};
// const getApplicationStatusStyle = (applicationStatus) => {
//   switch (String(applicationStatus || "").toUpperCase()) {
//     case "APPLICATION_SUBMITTED":
//       return { background: "#dbeafe", color: "#1d4ed8" };
//     case "APPLICATION_FORWARDED_TO_JE":
//       return { background: "#fef3c7", color: "#92400e" };
//     case "JE_VERIFIED_REPORT_UPLOADED":
//       return { background: "#ede9fe", color: "#6d28d9" };
//     case "APPLICATION_APPROVED":
//       return { background: "#dcfce7", color: "#166534" };
//     default:
//       return { background: "#e2e8f0", color: "#475569" };
//   }
// };
const getApplicationStatusStyle = (applicationStatus) => {
  switch (String(applicationStatus || "").toUpperCase()) {
    case "APPLICATION_SUBMITTED":       return { background: "#dbeafe", color: "#1d4ed8" };
    case "APPLICATION_FORWARDED_TO_JE": return { background: "#fef3c7", color: "#92400e" };
    case "JE_VERIFIED_REPORT_UPLOADED": return { background: "#ede9fe", color: "#6d28d9" };
    case "APPLICATION_APPROVED":        return { background: "#dcfce7", color: "#166534" };
    case "APPLICATION_REJECTED":        return { background: "#fee2e2", color: "#b91c1c" };
    case "PAYMENT_RECEIPT_UPLOADED":    return { background: "#fef3c7", color: "#92400e" };
    case "PAYMENT_RECEIPT_VERIFIED":    return { background: "#dcfce7", color: "#166534" };
    case "CONNECTION_DETAILS_UPDATED":  return { background: "#fef3c7", color: "#166534" };
    default:                            return { background: "#e2e8f0", color: "#475569" };
  }
};
// const getActionStatusMeta = (app) => {
//   const status = String(app.application_status || "").toUpperCase();
//   const referenceDate =
//     status === "APPLICATION_FORWARDED_TO_JE"
//       ? app.forward_on || app.created_at
//       : status === "JE_VERIFIED_REPORT_UPLOADED"
//         ? app.site_visit_report_upload_on || app.created_at
//         : status === "APPLICATION_APPROVED"
//           ? app.approved_on || app.created_at
//           : app.created_at;

//   if (status === "APPLICATION_APPROVED") {
//     return {
//       background: "#dcfce7",
//       color: "#166534",
//       text: formatDayProgress("Action taken in", referenceDate),
//     };
//   }

//   if (["APPLICATION_SUBMITTED", "APPLICATION_FORWARDED_TO_JE", "JE_VERIFIED_REPORT_UPLOADED"].includes(status)) {
//     return {
//       background: "#fef3c7",
//       color: "#92400e",
//       text: formatDayProgress("Pending since", referenceDate),
//     };
//   }

//   return { background: "#e2e8f0", color: "#475569", text: "-" };
// };
const getActionStatusMeta = (app) => {
  const status = String(app.application_status || "").toUpperCase();

  if (status === "CONNECTION_DETAILS_UPDATED") {
    return {
      background: "#dcfce7",
      color: "#166534",
      text: buildDayLabel("Action taken in", app.update_on, app.update_on),
    };
  }

  if (status === "APPLICATION_REJECTED") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      text: buildDayLabel("Action taken in", app.update_on, app.update_on),
    };
  }

  // All pending statuses — Pending since update_on, fallback to created_at
  return {
    background: "#fef3c7",
    color: "#92400e",
    text: buildDayLabel("Pending since", app.update_on || app.created_at),
  };
};
const getReceivedDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (status === "APPLICATION_SUBMITTED") {
    return app.created_at || null;
  }
  return app.update_on || app.created_at || null;
};


export function SEDashboardApplicationCountCard({ userId, onOpen }) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const response = await fetchSEDashboardApplicationSummary(userId);
        setCount(Number(response.data?.totalApplications || 0));
      } catch (error) {
        //console.error("SE dashboard application summary failed:", error);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [userId]);

  return (
    <button type="button" className="se-dashboard-app-card" onClick={onOpen}>
      <div className="se-dashboard-app-card__icon">
        <FileText size={22} />
      </div>
      <div>
        <strong>{isLoading ? "..." : count}</strong>
        <span>Total No. of Application</span>
      </div>
    </button>
  );
}

export function SEDashboardApplicationsTable({ userId, onBack , initialStatusFilter = "all"}) {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  //const [statusFilter, setStatusFilter] = useState("all");    
  const [detailView, setDetailView] = useState(null);
const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

const [lockStatusFilter, setLockStatusFilter] = useState(
  initialStatusFilter !== "all"
);
  const [pdfPreview,      setPdfPreview]      = useState(null);
  
const renderDocumentLink = (app, documentType, label = "View File") => {
    if (!app?.[documentType]) return "NA";
    const url = getOrganisationDocumentUrl(app.application_id, documentType);
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
  
  useEffect(() => {
    if (!userId) return;

    const loadApplications = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetchSEDashboardApplications(userId);
        setApplications(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
       // console.error("SE dashboard applications failed:", err);
        setError(err.response?.data?.error || "Failed to load applications.");
      } finally {
        setIsLoading(false);
      }
    };

    loadApplications();
  }, [userId]);

  // const filtered = applications.filter((app) => {
  //   const q = search.toLowerCase();
  //   return (
  //     app.application_id?.toLowerCase().includes(q) ||
  //     app.organisation_name?.toLowerCase().includes(q) ||
  //     app.block?.toLowerCase().includes(q) ||
  //     app.village?.toLowerCase().includes(q) ||
  //     app.name?.toLowerCase().includes(q)
  //   );
  // });
const filtered = applications.filter((app) => {
  const q = search.toLowerCase();

  const matchesSearch =
    app.application_id?.toLowerCase().includes(q) ||
    app.organisation_name?.toLowerCase().includes(q) ||
    app.block?.toLowerCase().includes(q) ||
    app.village?.toLowerCase().includes(q) ||
    app.name?.toLowerCase().includes(q);

  const matchesStatus =
    statusFilter === "all" ||
    app.application_status === statusFilter;

  return matchesSearch && matchesStatus;
});
  if (detailView) {
    return (
      <div className="se-dashboard-app-detail">
        <button type="button" className="se-dashboard-app-back" onClick={() => setDetailView(null)}>
          <ArrowLeft size={16} />
          Back to Applications
        </button>

        <div className="se-dashboard-app-detail-head">
          <div>
            <p>Application Details</p>
            <span>{detailView.application_id}</span>
          </div>
        </div>

        <div className="se-dashboard-app-section-grid">
          <SectionBox title="Application Details">
            <Row label="Application ID" value={detailView.application_id} />
            <Row label="Application Received" value={formatDisplayDate(getReceivedDate(detailView))} />
            <Row label="Application Status" value={formatApplicationStatus(detailView.application_status)} />
          </SectionBox>

          <SectionBox title="Applicant Details">
            <Row label="Name" value={detailView.name} />
            <Row label="Gender" value={detailView.gender} />
            <Row label="Email" value={detailView.email} />
            <Row label="Mobile Number" value={detailView.mobile_number} />
          </SectionBox>

          <SectionBox title="Organisation Details">
            <Row label="Organisation Name" value={detailView.organisation_name} />
            <Row label="Establishment Type" value={detailView.establishment_type} />
            <Row label="District" value={detailView.district} />
            <Row label="Block" value={detailView.block} />
            <Row label="Gram Panchayat" value={detailView.gram_panchayat} />
            <Row label="Village" value={detailView.village} />
            <Row label="Habitation" value={detailView.habitation} />
          </SectionBox>

          <SectionBox title="Connection Details">
            <Row label="Connection Type" value={detailView.type_of_connection} />
            <Row
              label="Water Requirement (Litre/Day)"
              value={detailView.water_requirement ? `${detailView.water_requirement} L/Day` : null}
            />
          </SectionBox>

          <SectionBox title="Site Visit Report">
                    <Row label="Site Visit Report" value={
                      detailView.site_visit_report
                        ? <button
                            onClick={() => setPdfPreview({
                              url: getSiteVisitReportUrl(detailView.application_id),
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
                        : "NA"
                    } />
                  </SectionBox>

          <SectionBox title="Documents">
            {DOCUMENT_ROWS.map(([label, documentType]) => (
              <Row key={documentType} label={label} value={renderDocumentLink(detailView, documentType)} />
            ))}
          </SectionBox>
        </div>
        {pdfPreview && (
        <div className="pv-preview-overlay">
          <div className="pv-preview-card">
            <div className="pv-preview-header">
              <h2 className="pv-preview-header__title">{pdfPreview.title}</h2>
              <div className="pv-preview-header__actions">
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
              <iframe
                src={`${pdfPreview.url}#toolbar=0`}
                className="pv-preview-frame"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  return (
    <div className="se-dashboard-app-table">
      <div className="se-dashboard-app-table__top">
        <button type="button" className="se-dashboard-app-back" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
                     
      </div>
            <div className="se-table-header">

      <div className="se-dashboard-app-table__title">
        <FileText size={16} />
        <h2>Applications Received</h2>
        <span>{filtered.length}</span>

        
      </div>
 <div className="se-dashboard-app-table-controls">
{!lockStatusFilter ? (
  <select
  className="se-status-select"
  value={statusFilter}
  onChange={(e) => {
    setStatusFilter(e.target.value);
  }}
>
    <option value="all">All Status</option>
    <option value="APPLICATION_SUBMITTED">Application Submitted</option>
    <option value="APPLICATION_FORWARDED_TO_JE">Application Forwarded To JE</option>
    <option value="JE_VERIFIED_REPORT_UPLOADED">Verify JE Upload Report</option>
    <option value="APPLICATION_APPROVED">Application Approved</option>
    <option value="APPLICATION_REJECTED">Application Rejected</option>
    <option value="PAYMENT_RECEIPT_UPLOADED">Payment Receipt Uploaded</option>
    <option value="PAYMENT_RECEIPT_VERIFIED">Payment Receipt Verified</option>
    <option value="CONNECTION_DETAILS_UPDATED">Connection Details Updated</option>
  </select>
) : (
  <div
    className="se-status-select"
    style={{
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      background: "#f8fafc",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      fontWeight: 600,
      color: "#334155",
      minWidth: "240px",
      height: "42px",
    }}
  >
    {formatApplicationStatus(statusFilter)}
  </div>
)}
        <div className="se-dashboard-app-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search applications..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        </div>
        </div>
      {isLoading ? (
        <div className="se-dashboard-app-state">
          <LoaderCircle size={20} className="se-dashboard-app-spin" />
          Loading applications...
        </div>
      ) : error ? (
        <div className="se-dashboard-app-error">{error}</div>
      ) : (
        <div className="se-dashboard-app-table-wrap">
          <table>
            <thead>
              <tr>
                {tableColumns.map((col) => (
                  <th key={col.label} style={{ width: `${col.width}px`, maxWidth: `${col.width}px` }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="se-dashboard-app-empty">No applications found.</td>
                </tr>
              ) : (
                filtered.map((app, index) => (
                  <tr key={app.application_id} className={index % 2 === 0 ? "" : "is-alt"}>
                    <td>
                      <button type="button" className="se-dashboard-app-id" onClick={() => setDetailView(app)}>
                        {app.application_id}
                      </button>
                    </td>
                    <td>{app.organisation_name || "-"}</td>
                    <td>{app.block || "-"}</td>
                    <td>{app.village || "-"}</td>
                    <td>{app.name || "-"}</td>
                    <td><span className="se-dashboard-app-pill se-dashboard-app-pill--connection">{app.type_of_connection || "-"}</span></td>
                    <td><span className="se-dashboard-app-pill" style={getApplicationStatusStyle(app.application_status)}>{formatApplicationStatus(app.application_status)}</span></td>
                    <td>{formatDisplayDate(getReceivedDate(app))}</td>
                    <td><span className="se-dashboard-app-pill" style={getActionStatusMeta(app)}>{getActionStatusMeta(app).text}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionBox({ title, children }) {
  return (
    <div className="se-dashboard-app-section">
      <div className="se-dashboard-app-section__title">{title}</div>
      <div className="se-dashboard-app-section__body">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="se-dashboard-app-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

