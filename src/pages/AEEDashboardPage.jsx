import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Download,
  Droplet,
  FileText,
  LoaderCircle,
  LogOut,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  fetchAEEDashboardApplications,
  getOrganisationDocumentUrl,
  getSiteVisitReportUrl,
  logoutOfficer,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
} from "../utils/applicationStatus";
import "./OfficerDashboardPage.css";
import "../components/SEDashboardApplications.css";
import "./AEEDashboardPage.css";
import "./PaymentVerificationPage.css";
import AEEStatusCards from "../components/AEEStatusCards";

// ─── Table columns ────────────────────────────────────────────────────────────
const tableColumns = [
  { label: "Application ID",       width: 130 },
  { label: "Organisation Name",    width: 190 },
  { label: "Block",                width: 120 },
  { label: "Village",              width: 130 },
  { label: "Applicant Name",       width: 180 },
  { label: "Connection Type",      width: 135 },
  { label: "Application Status",   width: 170 },
  { label: "Application Received", width: 155 },
  { label: "Action Status",        width: 185 },
];

const DOCUMENT_ROWS = [
  ["Property Proof",       "property_proof"],
  ["Registration Proof",   "registration_proof"],
  ["Ownership Proof",      "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof",       "identity_proof"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusStyle = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "APPLICATION_SUBMITTED":       return { background: "#dbeafe", color: "#1d4ed8" };
    case "APPLICATION_FORWARDED_TO_JE": return { background: "#fef3c7", color: "#92400e" };
    case "JE_VERIFIED_REPORT_UPLOADED": return { background: "#ede9fe", color: "#6d28d9" };
    case "APPLICATION_APPROVED":        return { background: "#dcfce7", color: "#166534" };
    case "APPLICATION_REJECTED":        return { background: "#fee2e2", color: "#b91c1c" };
    case "PAYMENT_RECEIPT_UPLOADED":    return { background: "#fef3c7", color: "#92400e" };
    case "PAYMENT_RECEIPT_VERIFIED":    return { background: "#dcfce7", color: "#166534" };
    case "CONNECTION_DETAILS_UPDATED":  return { background: "#dcfce7", color: "#166534" };
    default:                            return { background: "#e2e8f0", color: "#475569" };
  }
};

const getReceivedDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  return status === "APPLICATION_SUBMITTED" ? app.created_at || null : app.update_on || app.created_at || null;
};

const daysBetween = (from) => {
  if (!from) return 0;
  const s = new Date(from); s.setHours(0, 0, 0, 0);
  const e = new Date();     e.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((e - s) / (1000 * 60 * 60 * 24)));
};

const buildDayLabel = (prefix, from) => {
  const d = daysBetween(from);
  return `${prefix} ${d} ${d === 1 ? "day" : "days"}`;
};

const getActionStatusMeta = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (status === "CONNECTION_DETAILS_UPDATED") return { background: "#dcfce7", color: "#166534", text: buildDayLabel("Action taken in", app.update_on) };
  if (status === "APPLICATION_REJECTED")       return { background: "#fee2e2", color: "#991b1b", text: buildDayLabel("Action taken in", app.update_on) };
  return { background: "#fef3c7", color: "#92400e", text: buildDayLabel("Pending since", app.update_on || app.created_at) };
};

// ─── Main component ───────────────────────────────────────────────────────────
function AEEDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession]               = useState(null);
  const [applications, setApplications]     = useState([]);
  const [isLoadingApps, setIsLoadingApps]   = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [statusFilter, setStatusFilter]     = useState("all");
  const [search, setSearch]                 = useState("");
  const [error, setError]                   = useState("");
  const [detailView, setDetailView]         = useState(null);
  const [pdfPreview, setPdfPreview]         = useState(null);
  const [lockStatusFilter, setLockStatusFilter] = useState(false);

  // ── Session ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw    = localStorage.getItem("officerSession");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.id) { navigate("/login", { replace: true }); return; }
    setSession(parsed);
  }, [navigate]);

  // ── Load all applications once when table is first opened ───────────────
  useEffect(() => {
    if (!session?.id || !showApplications || applications.length > 0) return;
    setIsLoadingApps(true);
    setError("");
    fetchAEEDashboardApplications(session.id)
      .then((res) => setApplications(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        //console.error("AEE dashboard applications failed:", err);
        setError(err.response?.data?.error || "Failed to load applications.");
      })
      .finally(() => setIsLoadingApps(false));
  }, [session?.id, showApplications, applications.length]);

  const handleLogout = async () => {
    const result = await Swal.fire({ title: "Logout?", text: "Do you want to logout from this account?", icon: "warning", showCancelButton: true, confirmButtonText: "OK", cancelButtonText: "Cancel", reverseButtons: true });
    if (!result.isConfirmed) return;
    try { if (session?.id) await logoutOfficer({ userId: session.id }); } catch (e) { console.error(e); }
    finally { localStorage.removeItem("officerSession"); navigate("/login"); }
  };

  // ── Open table pre-filtered to a specific status ────────────────────────
  const openWithFilter = (filter) => {
  setStatusFilter(filter);
  setLockStatusFilter(filter !== "all");
  setShowApplications(true);
  setDetailView(null);
};

  const filteredApplications = applications.filter((app) => {
    const q = search.toLowerCase();
    const matchesSearch =
      app.application_id?.toLowerCase().includes(q) ||
      app.organisation_name?.toLowerCase().includes(q) ||
      app.block?.toLowerCase().includes(q) ||
      app.village?.toLowerCase().includes(q) ||
      app.name?.toLowerCase().includes(q);
    return matchesSearch && (statusFilter === "all" || app.application_status === statusFilter);
  });

  const renderDocumentLink = (app, documentType, label = "View File") => {
    if (!app?.[documentType]) return "NA";
    return (
      <button type="button" className="se-dashboard-app-link"
        onClick={() => setPdfPreview({ url: getOrganisationDocumentUrl(app.application_id, documentType), title: label })}>
        {label}
      </button>
    );
  };

  // ── What to show in <main> ───────────────────────────────────────────────
  const showStats = !showApplications && !detailView;

  const mainContent = detailView ? (
    // ── Detail view ────────────────────────────────────────────────────────
    <section className="se-dashboard-app-detail">
      <button type="button" className="se-dashboard-app-back" onClick={() => setDetailView(null)}>
        <ArrowLeft size={16} /> Back to Applications
      </button>
      <div className="se-dashboard-app-detail-head">
        <p>Application Details</p>
        <span>{detailView.application_id}</span>
      </div>
      <div className="se-dashboard-app-section-grid">
        <SectionBox title="Application Details">
          <Row label="Application ID"       value={detailView.application_id} />
          <Row label="Application Received" value={formatDisplayDate(getReceivedDate(detailView))} />
          <Row label="Application Status"   value={formatApplicationStatus(detailView.application_status)} />
        </SectionBox>
        <SectionBox title="Applicant Details">
          <Row label="Name"          value={detailView.name} />
          <Row label="Gender"        value={detailView.gender} />
          <Row label="Email"         value={detailView.email} />
          <Row label="Mobile Number" value={detailView.mobile_number} />
        </SectionBox>
        <SectionBox title="Organisation Details">
          <Row label="Organisation Name"  value={detailView.organisation_name} />
          <Row label="Establishment Type" value={detailView.establishment_type} />
          <Row label="District"           value={detailView.district} />
          <Row label="Block"              value={detailView.block} />
          <Row label="Gram Panchayat"     value={detailView.gram_panchayat} />
          <Row label="Village"            value={detailView.village} />
          <Row label="Habitation"         value={detailView.habitation} />
        </SectionBox>
        <SectionBox title="Connection Details">
          <Row label="Connection Type"   value={detailView.type_of_connection} />
          <Row label="Water Requirement" value={detailView.water_requirement ? `${detailView.water_requirement} L/Day` : null} />
        </SectionBox>
        <SectionBox title="Site Visit Report">
          <Row label="Site Visit Report" value={
            detailView.site_visit_report
              ? <button type="button" className="se-dashboard-app-link"
                  onClick={() => setPdfPreview({ url: getSiteVisitReportUrl(detailView.application_id), title: "Site Visit Report" })}>
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
    </section>

  ) : showApplications ? (
    // ── Applications table ─────────────────────────────────────────────────
    <section className="se-dashboard-app-table">
      <div className="se-dashboard-app-table__top">
        <button type="button" className="se-dashboard-app-back"
                onClick={() => { setShowApplications(false); setStatusFilter("all"); setLockStatusFilter(false); }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
      <div className="se-table-header">
        <div className="se-dashboard-app-table__title">
          <FileText size={18} />
          <h2>Applications Received</h2>
          <span>{filteredApplications.length}</span>
        </div>
        <div className="se-dashboard-app-table-controls">
{!lockStatusFilter ? (
    <select
    className="se-status-select"
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
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
      minWidth: "220px",
    }}
  >
    {formatApplicationStatus(statusFilter)}
  </div>
)}
          <label className="se-dashboard-app-search">
            <Search size={15} />
            <input type="text" placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
      </div>

      {isLoadingApps ? (
        <div className="se-dashboard-app-state"><LoaderCircle size={20} className="se-dashboard-app-spin" /> Loading applications...</div>
      ) : error ? (
        <div className="se-dashboard-app-error">{error}</div>
      ) : (
        <div className="se-dashboard-app-table-wrap">
          <table>
            <thead>
              <tr>{tableColumns.map((col) => <th key={col.label} style={{ width: `${col.width}px` }}>{col.label}</th>)}</tr>
            </thead>
            <tbody>
              {filteredApplications.length === 0 ? (
                <tr><td colSpan={9} className="se-dashboard-app-empty">No applications found.</td></tr>
              ) : filteredApplications.map((app, idx) => (
                <tr key={app.application_id} className={idx % 2 === 0 ? "" : "is-alt"}>
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
                  <td><span className="se-dashboard-app-pill" style={getStatusStyle(app.application_status)}>{formatApplicationStatus(app.application_status)}</span></td>
                  <td>{formatDisplayDate(getReceivedDate(app))}</td>
                  <td><span className="se-dashboard-app-pill" style={getActionStatusMeta(app)}>{getActionStatusMeta(app).text}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>

  ) : (
    // ── Status cards (home view) ───────────────────────────────────────────
    <section className="officer-dashboard-stats se-dashboard-stats"
      style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
      <AEEStatusCards
        userId={session?.id}
        onCardClick={(item) => openWithFilter(item.status)}
        onTotalClick={() => openWithFilter("all")}
      />
    </section>
  );

  return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-shell">
        {/* ── Sidebar ── */}
        <aside className="officer-dashboard-sidebar">
          <div className="officer-dashboard-sidebar__brand">
            <div className="officer-dashboard-brand__icon"><Droplet size={22} /></div>
            <div><span>DBRAP Portal</span><strong>AEE Workspace</strong></div>
          </div>
          <nav className="officer-dashboard-nav">
            <div className="officer-dashboard-nav__group">
              <button type="button"
                className={`officer-dashboard-nav__item ${showStats ? "is-active" : ""}`}
                onClick={() => { setShowApplications(false); setDetailView(null); setStatusFilter("all"); }}>
                <div className="officer-dashboard-nav__item-copy"><ShieldCheck size={18} /><span>Dashboard</span></div>
              </button>
            </div>
          </nav>
          <div className="officer-dashboard-sidebar__footer">
            <p>Logged in as</p>
            <strong>{session?.name || session?.loginId || session?.username}</strong>
            <span>{session?.roleName || "AEE Access"}</span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="officer-dashboard-main">
          <header className="officer-dashboard-header">
            <div className="officer-dashboard-header__copy">
              <h1>AEE Dashboard</h1>
              <span>Division-wise application overview</span>
            </div>
            <div className="officer-dashboard-user">
              <div><span>Logged in as</span><strong>{session?.loginId || session?.username}</strong></div>
              <button type="button" className="officer-dashboard-logout" onClick={handleLogout}>
                <LogOut size={18} /> Logout
              </button>
            </div>
          </header>
          {mainContent}
        </main>
      </div>

      {/* ── PDF preview modal ── */}
      {pdfPreview && (
        <div className="pv-preview-overlay">
          <div className="pv-preview-card">
            <div className="pv-preview-header">
              <h2 className="pv-preview-header__title">{pdfPreview.title}</h2>
              <div className="pv-preview-header__actions">
                <a href={pdfPreview.url} download className="pv-preview-btn-download" target="_blank" rel="noreferrer">
                  <Download size={14} /> Download PDF
                </a>
                <button className="pv-preview-btn-close" onClick={() => setPdfPreview(null)} title="Close Preview">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="pv-preview-content">
              <iframe src={`${pdfPreview.url}#toolbar=0`} className="pv-preview-frame" title="PDF Preview" />
            </div>
          </div>
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

export default AEEDashboardPage;
