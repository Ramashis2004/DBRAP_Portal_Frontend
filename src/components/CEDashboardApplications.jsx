import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, LoaderCircle, Search,Download,
  X, } from "lucide-react";
import {
  fetchCEDashboardApplicationSummary,
  fetchCEDashboardApplications,
  fetchCEDashboardBlocks,
  fetchCEDashboardCircles,
  fetchCEDashboardDivisions,
  getOrganisationDocumentUrl,
  getSiteVisitReportUrl,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
  formatDayProgress,
} from "../utils/applicationStatus";
import "./CEDashboardApplications.css";

const reportColumns = [
  "Total Application",
  "Application Approve",
  "Application Reject",
  "Application Pending",
];

const APPROVED_STATUSES = ["CONNECTION_DETAILS_UPDATED"];
const REJECTED_STATUSES = ["APPLICATION_REJECTED"];
const PENDING_STATUSES = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_FORWARDED_TO_JE",
  "JE_VERIFIED_REPORT_UPLOADED",
  "APPLICATION_APPROVED",
  "PAYMENT_RECEIPT_UPLOADED",
  "PAYMENT_RECEIPT_VERIFIED",
];

const applicationColumns = [
  { label: "Application ID", width: 130 },
  { label: "Organisation Name", width: 190 },
  { label: "Block", width: 120 },
  { label: "Village", width: 130 },
  { label: "Applicant Name", width: 190 },
  { label: "Connection Type", width: 140 },
  { label: "Application Status", width: 180 },
  { label: "Application Received", width: 160 },
  { label: "Action Status", width: 190 },
    { label: "Pending With",         width: 180 }, // ← ADD

];

const DEFAULT_CE_FETCHERS = {
  circles: fetchCEDashboardCircles,
  divisions: fetchCEDashboardDivisions,
  blocks: fetchCEDashboardBlocks,
  applications: fetchCEDashboardApplications,
};

const DOCUMENT_ROWS = [
  ["Property Proof", "property_proof"],
  ["Registration Proof", "registration_proof"],
  ["Ownership Proof", "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof", "identity_proof"],
];

const getReceivedDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (status === "APPLICATION_SUBMITTED") {
    return app.created_at || null;
  }
  return app.update_on || app.created_at || null;
};
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

const getActionStatusMeta = (app) => {
  const status = String(app.application_status || "").toUpperCase();

  // ── Terminal / completed → "Action taken in X days" (frozen, created_at → update_on) ──
  if (status === "CONNECTION_DETAILS_UPDATED") {
    return {
      background: "#dcfce7",
      color: "#166534",
      text: formatDayProgress("Action taken in", app.update_on, app.update_on),
    };
  }

  if (status === "APPLICATION_REJECTED") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      text: formatDayProgress("Action taken in", app.update_on, app.update_on),
    };
  }

  // ── All pending statuses → "Pending since X days" (update_on → today) ──
  // Covers: APPLICATION_SUBMITTED, APPLICATION_FORWARDED_TO_JE,
  //         JE_VERIFIED_REPORT_UPLOADED, APPLICATION_APPROVED,
  //         PAYMENT_RECEIPT_UPLOADED, PAYMENT_RECEIPT_VERIFIED
  return {
    background: "#fef3c7",
    color: "#92400e",
    text: formatDayProgress("Pending since", app.update_on || app.created_at),
  };
};

const getPendingWith = (app) => {
  const status = String(app.application_status || "").toUpperCase();

  switch (status) {
    // Pending with SE
    case "APPLICATION_SUBMITTED":
    case "JE_VERIFIED_REPORT_UPLOADED":
      return app.division_name
        ? `${app.division_name} : SE`
        : "SE";

    // Pending with JE
    case "APPLICATION_FORWARDED_TO_JE":
    case "PAYMENT_RECEIPT_UPLOADED":
          case "PAYMENT_RECEIPT_VERIFIED":
      return app.block
        ? `${app.block} : JE`
        : "JE";

    // Pending with Applicant
    case "APPLICATION_APPROVED":
      return app.applicant_user_id
        ? `${app.applicant_user_id} : Applicant`
        : "Applicant";

    // No pending — terminal statuses
    case "CONNECTION_DETAILS_UPDATED":
    case "APPLICATION_REJECTED":
    default:
      return null;
  }
};
const toNumber = (value) => Number(value || 0);



export function CEDashboardApplicationCountCard({
  userId,
  onOpen,
  summaryFetcher = fetchCEDashboardApplicationSummary,
}) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const response = await summaryFetcher(userId);
        setCount(Number(response.data?.totalApplications || 0));
      } catch (error) {
        console.error("CE dashboard application summary failed:", error);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [userId, summaryFetcher]);

  return (
    <button type="button" className="ce-dashboard-app-card" onClick={onOpen}>
      <div className="ce-dashboard-app-card__icon">
        <FileText size={22} />
      </div>
      <div>
        <strong>{isLoading ? "..." : count}</strong>
        <span>Total No. of Application</span>
      </div>
    </button>
  );
}

export function CEDashboardApplicationsDrilldown({
  userId,
  onClose,
  titlePrefix = "CE",
  fetchers = DEFAULT_CE_FETCHERS,
}) {
  const [level, setLevel] = useState("circle");
  const [rows, setRows] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedStatusLabel, setSelectedStatusLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [detailView, setDetailView] = useState(null);
  const [pdfPreview,      setPdfPreview]      = useState(null);

  const loadCircleReport = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchers.circles(userId);
      setRows(Array.isArray(response.data) ? response.data : []);
      setLevel("circle");
      setSelectedCircle(null);
      setSelectedDivision(null);
      setSelectedBlock(null);
      setSelectedStatusLabel("");
      setApplications([]);
    } catch (err) {
      console.error("CE circle report failed:", err);
      setError(err.response?.data?.error || "Failed to load circle report.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchers, userId]);

  useEffect(() => {
    if (!userId) return;
    loadCircleReport();
  }, [loadCircleReport, userId]);

  const openCircle = async (row) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchers.divisions(userId, row.circle_code);
      setRows(Array.isArray(response.data) ? response.data : []);
      setSelectedCircle(row);
      setSelectedDivision(null);
      setSelectedBlock(null);
      setSelectedStatusLabel("");
      setApplications([]);
      setLevel("division");
    } catch (err) {
      console.error("CE division report failed:", err);
      setError(err.response?.data?.error || "Failed to load division report.");
    } finally {
      setIsLoading(false);
    }
  };

  const openDivision = async (row) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchers.blocks(userId, row.division_code);
      setRows(Array.isArray(response.data) ? response.data : []);
      setSelectedDivision(row);
      setSelectedBlock(null);
      setSelectedStatusLabel("");
      setApplications([]);
      setLevel("block");
    } catch (err) {
      console.error("CE block report failed:", err);
      setError(err.response?.data?.error || "Failed to load block report.");
    } finally {
      setIsLoading(false);
    }
  };

  const openBlock = async (row, statuses = [], statusLabel = "") => {
    setIsLoading(true);
    setError("");
    setSearch("");
    try {
      const response = await fetchers.applications(userId, row.block_code, statuses.join(","));
      setApplications(Array.isArray(response.data) ? response.data : []);
      setSelectedBlock(row);
      setSelectedStatusLabel(statusLabel);
      setLevel("applications");
    } catch (err) {
      console.error("CE applications failed:", err);
      setError(err.response?.data?.error || "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (detailView) {
      setDetailView(null);
      return;
    }
    if (level === "circle") {
      onClose();
      return;
    }
    if (level === "division") {
      loadCircleReport();
      return;
    }
    if (level === "block" && selectedCircle) {
      openCircle(selectedCircle);
      return;
    }
    if (level === "applications" && selectedDivision) {
      openDivision(selectedDivision);
    }
  };

  const title =
    level === "circle"
      ? `${titlePrefix} Circle Wise Application Report`
      : level === "division"
        ? `Division Wise Report - ${selectedCircle?.circle_name || ""}`
        : level === "block"
          ? `Block Wise Report - ${selectedDivision?.division_name || ""}`
          : `Applications - ${selectedBlock?.block_name || ""}${selectedStatusLabel ? ` (${selectedStatusLabel})` : ""}`;

  const firstColumn =
    level === "circle" ? "Circle" : level === "division" ? "Division" : level === "block" ? "Block" : "";

  const filteredApplications = applications.filter((app) => {
    const q = search.toLowerCase();
    return (
      app.application_id?.toLowerCase().includes(q) ||
      app.organisation_name?.toLowerCase().includes(q) ||
      app.block?.toLowerCase().includes(q) ||
      app.village?.toLowerCase().includes(q) ||
      app.name?.toLowerCase().includes(q)
    );
  });

  return (
    <section className="ce-dashboard-report">
      <div className="ce-dashboard-report__top">
        <button type="button" className="ce-dashboard-report__back" onClick={handleBack}>
          <ArrowLeft size={16} />
          Back
        </button>
        <div>
          <h2>{title}</h2>
          <p>Approved, rejected, and pending applications mapped to this CE hierarchy.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="ce-dashboard-report__state">
          <LoaderCircle size={20} className="ce-dashboard-report__spin" />
          Loading report...
        </div>
      ) : error ? (
        <div className="ce-dashboard-report__error">{error}</div>
      ) : level === "applications" ? (
        detailView ? (
          <ApplicationDetail app={detailView} />
        ) : (
          <ApplicationTable
applications={applications}
filteredApplications={filteredApplications}
            search={search}
            setSearch={setSearch}
            onOpenApplication={setDetailView}
          />
        )
      ) : (
        <ReportTable level={level} firstColumn={firstColumn} rows={rows} onOpenCircle={openCircle} onOpenDivision={openDivision} onOpenBlock={openBlock} />
      )}
    </section>
  );
}

function ReportTable({ level, firstColumn, rows, onOpenCircle, onOpenDivision, onOpenBlock }) {
  const getName = (row) =>
    level === "circle" ? row.circle_name : level === "division" ? row.division_name : row.block_name;

  const handleOpen = (row) => {
    if (level === "circle") onOpenCircle(row);
    if (level === "division") onOpenDivision(row);
    if (level === "block") onOpenBlock(row);
  };

  const handleBlockStatusOpen = (row, statuses, label) => {
    if (level === "block") {
      onOpenBlock(row, statuses, label);
    }
  };

  return (
    <div className="ce-dashboard-report__table-wrap">
      <table>
        <thead>
          <tr>
            <th>{firstColumn}</th>
            {reportColumns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="ce-dashboard-report__empty">No data found.</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.circle_code || row.division_code || row.block_code}>
                <td>
                  <button type="button" className="ce-dashboard-report__link" onClick={() => handleOpen(row)}>
                    {getName(row) || "-"}
                  </button>
                </td>
                <td>{toNumber(row.total_application)}</td>
                <td>
                  {level === "block" ? (
                    <button type="button" className="ce-dashboard-report__pill is-approved is-clickable" onClick={() => handleBlockStatusOpen(row, APPROVED_STATUSES, "Application Approve")}>
                      {toNumber(row.application_approve)}
                    </button>
                  ) : (
                    <span className="ce-dashboard-report__pill is-approved">{toNumber(row.application_approve)}</span>
                  )}
                </td>
                <td>
                  {level === "block" ? (
                    <button type="button" className="ce-dashboard-report__pill is-rejected is-clickable" onClick={() => handleBlockStatusOpen(row, REJECTED_STATUSES, "Application Reject")}>
                      {toNumber(row.application_reject)}
                    </button>
                  ) : (
                    <span className="ce-dashboard-report__pill is-rejected">{toNumber(row.application_reject)}</span>
                  )}
                </td>
                <td>
                  {level === "block" ? (
                    <button type="button" className="ce-dashboard-report__pill is-pending is-clickable" onClick={() => handleBlockStatusOpen(row, PENDING_STATUSES, "Application Pending")}>
                      {toNumber(row.application_pending)}
                    </button>
                  ) : (
                    <span className="ce-dashboard-report__pill is-pending">{toNumber(row.application_pending)}</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationTable({
  applications,
  search,
  setSearch,
  onOpenApplication,
  filteredApplications,
}) {    
  const [statusFilter, setStatusFilter] = useState("all");

const finalFilteredApplications = applications.filter((app) => {
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

  return (
    <>
    <div className="ce-table-controls">
                <select className="se-status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
  <option value="all">All Status</option>
  <option value="APPLICATION_SUBMITTED">Application Pending</option>
  <option value="APPLICATION_FORWARDED_TO_JE">Application Forwarded To JE</option>
  <option value="JE_VERIFIED_REPORT_UPLOADED">Verify JE Upload Report</option>
  <option value="APPLICATION_APPROVED">Application Approved</option>
  <option value="APPLICATION_REJECTED">Application Rejected</option>
  <option value="PAYMENT_RECEIPT_UPLOADED">Payment Receipt Uploaded</option>
  <option value="PAYMENT_RECEIPT_VERIFIED">Payment Receipt Verified</option>
  <option value="CONNECTION_DETAILS_UPDATED">Connection Details Updated</option>
</select>
      <div className="ce-dashboard-report__search">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search applications..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
</div>
      <div className="ce-dashboard-report__table-wrap">
        <table className="ce-dashboard-report__applications">
          <thead>
            <tr>
              {applicationColumns.map((column) => (
                <th key={column.label} style={{ width: `${column.width}px`, maxWidth: `${column.width}px` }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
{finalFilteredApplications.length === 0 ? (
                <tr><td colSpan={10} className="ce-dashboard-report__empty">No applications found.</td></tr>
            ) : (
              finalFilteredApplications.map((app) => (
                <tr key={app.application_id}>
                  <td>
                    <button
                      type="button"
                      className="ce-dashboard-report__app-id"
                      onClick={() => onOpenApplication(app)}
                    >
                      {app.application_id}
                    </button>
                  </td>
                  <td>{app.organisation_name || "-"}</td>
                  <td>{app.block || "-"}</td>
                  <td>{app.village || "-"}</td>
                  <td>{app.name || "-"}</td>
                  <td><span className="ce-dashboard-report__pill is-connection">{app.type_of_connection || "-"}</span></td>
                  <td><span className="ce-dashboard-report__pill" style={getApplicationStatusStyle(app.application_status)}>{formatApplicationStatus(app.application_status)}</span></td>
                  <td>{formatDisplayDate(getReceivedDate(app))}</td>
                  <td><span className="ce-dashboard-report__pill" style={getActionStatusMeta(app)}>{getActionStatusMeta(app).text}</span></td>
                  <td>
      {getPendingWith(app)
        ? <span className="ce-dashboard-report__pill"
            style={{ background: "#eff6ff", color: "#1e40af", fontSize: "0.75rem", fontWeight: 600 }}>
            {getPendingWith(app)}
          </span>
        : <span style={{ color: "#94a3b8" }}>—</span>
      }
    </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ApplicationDetail({ app }) {
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
  return (
    <div className="ce-dashboard-app-detail">
      <div className="ce-dashboard-app-detail-head">
        <div>
          <p>Application Details</p>
          <span>{app.application_id}</span>
        </div>
      </div>

      <div className="ce-dashboard-app-section-grid">
        <SectionBox title="Application Details">
          <Row label="Application ID" value={app.application_id} />
          <Row label="Application Received" value={formatDisplayDate(getReceivedDate(app))} />
          <Row label="Application Status" value={formatApplicationStatus(app.application_status)} />
        </SectionBox>

        <SectionBox title="Applicant Details">
          <Row label="Name" value={app.name} />
          <Row label="Gender" value={app.gender} />
          <Row label="Email" value={app.email} />
          <Row label="Mobile Number" value={app.mobile_number} />
        </SectionBox>

        <SectionBox title="Organisation Details">
          <Row label="Organisation Name" value={app.organisation_name} />
          <Row label="Establishment Type" value={app.establishment_type} />
          <Row label="District" value={app.district} />
          <Row label="Block" value={app.block} />
          <Row label="Gram Panchayat" value={app.gram_panchayat} />
          <Row label="Village" value={app.village} />
          <Row label="Habitation" value={app.habitation} />
        </SectionBox>

        <SectionBox title="Connection Details">
          <Row label="Connection Type" value={app.type_of_connection} />
          <Row
            label="Water Requirement (Litre/Day)"
            value={app.water_requirement ? `${app.water_requirement} L/Day` : null}
          />
        </SectionBox>

        <SectionBox title="Site Visit Report">
          <Row label="Site Visit Report" value={
            app.site_visit_report
              ? <button
                  onClick={() => setPdfPreview({
                    url: getSiteVisitReportUrl(app.application_id),
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
            <Row key={documentType} label={label} value={renderDocumentLink(app, documentType)} />
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
