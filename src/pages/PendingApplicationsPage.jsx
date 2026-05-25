import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ChevronDown, ChevronRight, Droplet, FileText,
  LoaderCircle, LogOut, Search, Send, Users,
  Download, X,
} from "lucide-react";
import {
  fetchPendingForwardToJE,
  fetchPendingApproval,
  fetchOfficerDashboardConfig,
  getOrganisationDocumentUrl,
  getSiteVisitReportUrl,
  logoutOfficer,
  updateOrganisationStatusWithRemarks,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
} from "../utils/applicationStatus";
import "./OfficerDashboardPage.css";
import "./PaymentVerificationPage.css";

// ─── Helpers (same as ApplicationReceivedPage) ────────────────────────────────

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

const getApplicationStatusStyle = (status) => {
  switch (status) {
    case "APPLICATION_SUBMITTED":       return { background: "#dbeafe", color: "#1d4ed8" };
    case "APPLICATION_RETURNED_TO_APPLICANT": return { background: "#fee2e2", color: "#991b1b" };
    case "APPLICATION_FORWARDED_TO_JE": return { background: "#fef3c7", color: "#92400e" };
    case "JE_VERIFIED_REPORT_UPLOADED": return { background: "#ede9fe", color: "#6d28d9" };
    case "APPLICATION_APPROVED":        return { background: "#dcfce7", color: "#166534" };
    default:                            return { background: "#e2e8f0", color: "#475569" };
  }
};

// const getActionStatusMeta = (app) => {
//   const status = String(app.application_status || "").toUpperCase();
//   if (status === "APPLICATION_SUBMITTED")
//     return { background: "#fef3c7", color: "#92400e",
//       text: buildDayLabel("Pending since", app.created_at) };
//   if (status === "APPLICATION_FORWARDED_TO_JE")
//     return { background: "#dcfce7", color: "#166534",
//       text: buildDayLabel("Action taken in", app.created_at, app.forward_on) };
//   if (status === "JE_VERIFIED_REPORT_UPLOADED")
//     return { background: "#fef3c7", color: "#92400e",
//       text: buildDayLabel("Pending since", app.site_visit_report_upload_on) };
//   if (status === "APPLICATION_APPROVED")
//     return { background: "#dcfce7", color: "#166534",
//       text: buildDayLabel("Action taken in", app.site_visit_report_upload_on, app.approved_on) };
//   return { background: "#e2e8f0", color: "#475569", text: "—" };
// };

const getActionStatusMeta = (app) => {
  const status = String(app.application_status || "").toUpperCase();

  if (status === "CONNECTION_DETAILS_UPDATED") {
    return {
      background: "#dcfce7",
      color: "#166534",
      text: buildDayLabel("Action taken in", app.created_at, app.update_on),
    };
  }

  if (status === "APPLICATION_REJECTED") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      text: buildDayLabel("Action taken in", app.created_at, app.rejected_on),
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

const getActionTakenDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (status === "APPLICATION_FORWARDED_TO_JE") return app.forward_on ?? null;
  if (status === "APPLICATION_APPROVED")        return app.approved_on ?? null;
  return null;
};

const DOCUMENT_ROWS = [
  ["Property Proof",      "property_proof"],
  ["Registration Proof",  "registration_proof"],
  ["Ownership Proof",     "ownership_proof"],
  ["Owner Indemnity Bond","owner_indemnity_bond"],
  ["Identity Proof",      "identity_proof"],
];

const getActionModalTitle = (action, isApprovalMode) => ({
  APPLICATION_APPROVED: "Approve Application",
  APPLICATION_REJECTED: "Reject Application",
  APPLICATION_FORWARDED_TO_JE: isApprovalMode ? "Return to JE" : "Forward to JE",
  APPLICATION_RETURNED_TO_APPLICANT: "Return to Applicant",
}[action] || "Confirm Action");

const getActionModalMessage = (action, isApprovalMode) => ({
  APPLICATION_APPROVED: "This application will be marked as Approved.",
  APPLICATION_REJECTED: "This application will be marked as Rejected.",
  APPLICATION_FORWARDED_TO_JE: isApprovalMode
    ? "This application will be returned to JE for review."
    : "This application will be forwarded to JE for site visit.",
  APPLICATION_RETURNED_TO_APPLICANT: "This application will be returned to the applicant for correction.",
}[action] || "Please confirm this action.");

// ─── Page config per mode ─────────────────────────────────────────────────────

const PAGE_CONFIG = {
  "forward-to-je": {
    title: "Application Pending for Forward to JE",
    h1: "Pending Forward to JE",
    fetchFn: fetchPendingForwardToJE,
    showSendButton: true,
    showApproveButton: false,
    emptyText: "No applications pending for forward to JE.",
  },
  "pending-approval": {
    title: "Application Pending for Approval",
    h1: "Pending Approval",
    fetchFn: fetchPendingApproval,
    showSendButton: false,
    showApproveButton: true,
    emptyText: "No applications pending for approval.",
  },
};

function PendingApplicationsPage({ mode }) {
  const navigate   = useNavigate();
  const config     = PAGE_CONFIG[mode];

  const [session,         setSession]         = useState(null);
  const [dashboardData,   setDashboardData]   = useState(null);
  const [applications,    setApplications]    = useState([]);
  const [activeMenuKey,   setActiveMenuKey]   = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");
  const [isLoadingShell,  setIsLoadingShell]  = useState(true);
  const [isLoadingApps,   setIsLoadingApps]   = useState(true);
  const [errorMessage,    setErrorMessage]    = useState("");
  const [appError,        setAppError]        = useState("");
  const [search,          setSearch]          = useState("");
  const [detailView,      setDetailView]      = useState(null);
  const [sendingAppId,    setSendingAppId]    = useState("");
  const [actionModal,     setActionModal]     = useState(null);
  const [remarkInput,     setRemarkInput]     = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [pdfPreview,      setPdfPreview]      = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("officerSession");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.id) { navigate("/login", { replace: true }); return; }
    setSession(parsed);

    fetchOfficerDashboardConfig(parsed.id)
      .then((r) => setDashboardData(r.data))
      .catch((e) => setErrorMessage(e.response?.data?.error || "Unable to load dashboard."))
      .finally(() => setIsLoadingShell(false));
  }, [navigate]);

  useEffect(() => {
    if (!session?.id) return;
    setIsLoadingApps(true);
    setAppError("");
    setApplications([]);
    setDetailView(null);

    config.fetchFn(session.id)
      .then((r) => setApplications(r.data))
      .catch((e) => { console.error(e); setAppError("Failed to load applications."); })
      .finally(() => setIsLoadingApps(false));
  }, [session?.id, mode]);

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
    if (!result.isConfirmed) return;
    try { if (session?.id) await logoutOfficer({ userId: session.id }); } catch {}
    localStorage.removeItem("officerSession");
    navigate("/login");
  };

  const handleMenuClick = (menuKey) => {
    if (menuKey === activeMenuKey) { setActiveMenuKey(""); setActiveOptionKey(""); return; }
    setActiveMenuKey(menuKey); setActiveOptionKey("");
  };

  const handleOptionClick = (option) => {
    const url   = String(option.url   || "").toLowerCase();
    const label = String(option.label || "").toLowerCase();
    setActiveOptionKey(option.key);
    setDetailView(null);

    if (url === "/createuser"          || label === "create user")                   { navigate("/se-dashboard"); return; }
    if (url === "/applicationreceived" || label === "application received")          { navigate("/se-application-received"); return; }
    if (url.includes("pendingforwardtoje") || label.includes("pending for forward")) { navigate("/se-pending-forward-to-je"); return; }
    if (url.includes("pendingapproval")    || label.includes("pending for approval")){ navigate("/se-pending-approval"); return; }
    if (url.includes("payment")            || label === "payment details")           { navigate("/se-payment-details"); return; }
  };

  const handleSendToJe = async (app) => {
    const conf = await Swal.fire({
      title: "Forward application?",
      text: `Forward to ${app.block} JE for site visit?`,
      icon: "question", showCancelButton: true,
      confirmButtonText: "OK", cancelButtonText: "Cancel", reverseButtons: true,
    });
    if (!conf.isConfirmed) return;

    setSendingAppId(app.application_id);
    try {
      await updateOrganisationStatusWithRemarks(
        app.application_id,
        "APPLICATION_FORWARDED_TO_JE",
        "Forwarded to JE for site visit",
        false
      );
      setApplications((prev) => prev.filter((a) => a.application_id !== app.application_id));
      if (detailView?.application_id === app.application_id) setDetailView(null);
      await Swal.fire({ title: "Forwarded", icon: "success", confirmButtonText: "OK",
        text: "Application forwarded to " + app.block + " JE for site visit." });
    } catch (e) {
      await Swal.fire({ title: "Failed", icon: "error", confirmButtonText: "OK",
        text: e.response?.data?.error || "Unable to forward application." });
    } finally { setSendingAppId(""); }
  };

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

  const renderActionButton = (app) => {
    if (!config.showApproveButton) {
      return (
        <select
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;
            setActionModal({ app, action: e.target.value });
            setRemarkInput("");
            e.target.value = "";
          }}
          style={selectActionStyle}
        >
          <option value="">Select Action</option>
          <option value="APPLICATION_FORWARDED_TO_JE">Forward to JE</option>
          <option value="APPLICATION_RETURNED_TO_APPLICANT">Return to Applicant</option>
        </select>
      );
    }

    if (!config.showApproveButton) {
      const isActioning = sendingAppId === app.application_id;
      return (
        <button onClick={() => handleSendToJe(app)} disabled={isActioning}
          style={btnStyle(isActioning ? "#94a3b8" : "#166634", isActioning)}>
          <Send size={13} /> {isActioning ? "Sending…" : "Forward to JE"}
        </button>
      );
    }

    return (
      <select
        defaultValue=""
        onChange={(e) => {
          if (!e.target.value) return;
          setActionModal({ app, action: e.target.value });
          setRemarkInput("");
          e.target.value = "";
        }}
        style={{
          padding: "6px 10px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          fontSize: "0.78rem",
          fontWeight: 600,
          background: "#fff",
          color: "#1e293b",
          cursor: "pointer",
          outline: "none",
          minWidth: "130px",
        }}
      >
        <option value="">Select Action</option>
        <option value="APPLICATION_APPROVED">Approve</option>
        <option value="APPLICATION_REJECTED">Reject</option>
        <option value="APPLICATION_FORWARDED_TO_JE">Return to JE</option>
      </select>
    );
  };

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { app, action } = actionModal;

    if (!remarkInput.trim()) {
      await Swal.fire({ title: "Remark Required", text: "Please enter a remark before submitting.", icon: "warning", confirmButtonText: "OK" });
      return;
    }

    setIsSubmittingAction(true);
    try {
      const isReturnToJE = action === "APPLICATION_FORWARDED_TO_JE";
      await updateOrganisationStatusWithRemarks(
        app.application_id,
        action,
        remarkInput.trim(),
        isReturnToJE,
        session?.id || null
      );

      setApplications((prev) => prev.filter((a) => a.application_id !== app.application_id));
      setActionModal(null);
      setRemarkInput("");

      const applicantName = app.name || "applicant";
      const labels = {
        APPLICATION_APPROVED:        "Application approved successfully. Application forwarded to applicant:  " + applicantName + " for money receipt upload.",
        APPLICATION_REJECTED:        "Application rejected.",
        APPLICATION_FORWARDED_TO_JE: config.showApproveButton ? "Application returned to JE." : "Application forwarded to "+app.block+" JE for site visit.",
        APPLICATION_RETURNED_TO_APPLICANT: "Application returned to applicant: " + applicantName + ".",
      };
      await Swal.fire({ title: "Done", text: labels[action], icon: "success", confirmButtonText: "OK" });
    } catch (e) {
      await Swal.fire({ title: "Failed", text: e.response?.data?.error || "Action failed.", icon: "error", confirmButtonText: "OK" });
    } finally {
      setIsSubmittingAction(false);
    }
  };

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
    { label: "Application ID",       width: 130 },
    { label: "Organisation Name",    width: 180 },
    { label: "Block",                width: 105 },
    { label: "Village",              width: 120 },
    { label: "Applicant Name",       width: 190 },
    { label: "Connection Type",      width: 130 },
    { label: "Application Status",   width: 165 },
    { label: "Application Received", width: 150 },
    { label: "Action Taken On",      width: 135 },
    { label: "Action Status",        width: 185 },
    { label: "Action",               width: 120 },
  ];

  if (isLoadingShell) {
    return (
      <div className="officer-dashboard-page">
        <div className="officer-dashboard-loading">
          <LoaderCircle size={28} className="officer-dashboard-loading__icon" />
          <span>Loading dashboard...</span>
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
            <LogOut size={18} /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  const { user, dashboard } = dashboardData;
  const menus = dashboard.navigation?.menus || [];
  const activeMenu = menus.find((m) => m.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((o) => o.key === activeOptionKey) || null;

  const mainContent = detailView ? (
    <section style={{ padding: "24px" }}>
      <button onClick={() => setDetailView(null)} style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        border: "1px solid #d6d3d1", borderRadius: "8px", padding: "8px 14px",
        background: "#fff", fontWeight: "600", cursor: "pointer", marginBottom: "20px",
      }}>
        ← Back to Applications
      </button>

      <div style={{
        background: "#1e2f4d", borderRadius: "12px",
        padding: "22px 28px", marginBottom: "18px",
      }}>
        <div style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600", letterSpacing: "1px" }}>
          APPLICATION DETAILS
        </div>
        <span style={{
          marginTop: "8px", display: "inline-block",
          background: "#fff4c2", color: "#92400e",
          padding: "6px 14px", borderRadius: "6px", fontWeight: "700",
        }}>
          {detailView.application_id}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
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
          <Row label="Organisation Name"  value={detailView.organisation_name} />
          <Row label="Establishment Type" value={detailView.establishment_type} />
          <Row label="District"           value={detailView.district} />
          <Row label="Block"              value={detailView.block} />
          <Row label="Gram Panchayat"     value={detailView.gram_panchayat} />
          <Row label="Village"            value={detailView.village} />
          <Row label="Habitation"         value={detailView.habitation} />
        </SectionBox>
        <SectionBox title="Connection Details">
          <Row label="Connection Type"            value={detailView.type_of_connection} />
          <Row label="Water Requirement (L/Day)"  value={`${detailView.water_requirement} L/Day`} />
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
          {DOCUMENT_ROWS.map(([label, docType]) => (
            <Row key={docType} label={label} value={renderDocumentLink(detailView, docType)} />
          ))}
        </SectionBox>
      </div>
    </section>
  ) : (
    <section style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={20} style={{ color: "#b45309" }} />
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
            {config.title}
          </h2>
          <span style={{
            background: "#fef3c7", color: "#92400e", borderRadius: "999px",
            padding: "2px 10px", fontSize: "0.78rem", fontWeight: 600,
          }}>
            {filtered.length}
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: "10px",
            top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Search applications..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px",
              border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem",
              width: "220px", background: "#fff", color: "#1e293b", outline: "none",
            }}
          />
        </div>
      </div>

      {isLoadingApps ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "40px", color: "#666" }}>
          <LoaderCircle size={20} style={{ animation: "spin 1s linear infinite" }} />
          <span>Loading applications...</span>
        </div>
      ) : appError ? (
        <div style={{ padding: "24px", color: "#c0392b" }}>{appError}</div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fff" }}>
          <table style={{
            width: "100%", minWidth: "1280px", borderCollapse: "collapse",
            fontSize: "0.85rem", tableLayout: "fixed",
          }}>
            <thead>
              <tr style={{ background: "#1e293b", color: "#fff" }}>
                {tableColumns.map((col) => (
                  <th key={col.label} style={{
                    width: `${col.width}px`, maxWidth: `${col.width}px`,
                    padding: "12px 14px", textAlign: "left", fontWeight: 600,
                    fontSize: "0.78rem", letterSpacing: "0.04em", whiteSpace: "nowrap",
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    {config.emptyText}
                  </td>
                </tr>
              ) : filtered.map((app, index) => {
                const actionMeta = getActionStatusMeta(app);
                return (
                  <tr key={app.application_id}
                    style={{
                      background: index % 2 === 0 ? "#fff" : "#f8fafc",
                      borderBottom: "1px solid #f1f5f9", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef9f0")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? "#fff" : "#f8fafc")}
                  >
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span onClick={() => setDetailView(app)} style={{
                        background: "#fef3c7", color: "#92400e", borderRadius: "6px",
                        padding: "3px 8px", fontWeight: 600, fontSize: "0.78rem",
                        fontFamily: "monospace", cursor: "pointer",
                        textDecoration: "underline", textDecorationStyle: "dotted",
                        textUnderlineOffset: "2px",
                      }}>
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
                        color:      app.type_of_connection === "Single Tap" ? "#166534" : "#1e40af",
                        borderRadius: "999px", padding: "3px 10px",
                        fontSize: "0.75rem", fontWeight: 600,
                      }}>
                        {app.type_of_connection || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        ...getApplicationStatusStyle(app.application_status),
                        borderRadius: "999px", padding: "3px 10px",
                        fontSize: "0.75rem", fontWeight: 600,
                      }}>
                        {formatApplicationStatus(app.application_status)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
                      {formatDisplayDate(getReceivedDate(app))}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
                      {formatDisplayDate(getActionTakenDate(app)) || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        ...actionMeta, borderRadius: "999px",
                        padding: "3px 10px", fontSize: "0.75rem",
                        fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        {actionMeta.text}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {renderActionButton(app)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-shell">
        <aside className="officer-dashboard-sidebar">
          <div className="officer-dashboard-sidebar__brand">
            <div className="officer-dashboard-brand__icon"><Droplet size={22} /></div>
            <div>
              <span>DBRAP Portal</span>
              <strong>{user.roleName || "Officer"} Workspace</strong>
            </div>
          </div>

          <nav className="officer-dashboard-nav">
            <div className="officer-dashboard-nav__group">
              <button type="button" className="officer-dashboard-nav__item"
                onClick={() => navigate("/se-dashboard")}>
                <div className="officer-dashboard-nav__item-copy">
                  <Users size={18} /><span>Dashboard</span>
                </div>
              </button>
            </div>

            {menus.map((item) => {
              const isActive = item.key === activeMenuKey;
              return (
                <div key={item.key} className="officer-dashboard-nav__group">
                  <button type="button"
                    className={`officer-dashboard-nav__item${isActive ? " is-active" : ""}`}
                    onClick={() => handleMenuClick(item.key)}>
                    <div className="officer-dashboard-nav__item-copy">
                      <Users size={18} /><span>{item.label}</span>
                    </div>
                    {isActive ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  {isActive && item.options.length > 0 && (
                    <div className="officer-dashboard-nav__options">
                      {item.options.map((option) => (
                        <button key={option.key} type="button"
                          className={`officer-dashboard-nav__option${option.key === activeOption?.key ? " is-active" : ""}`}
                          onClick={() => handleOptionClick(option)}>
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
            <strong>{user.name || user.loginId}</strong>
            <span>{user.roleName || "Officer Access"}</span>
          </div>
        </aside>

        <main className="officer-dashboard-main">
          <header className="officer-dashboard-header">
            <div className="officer-dashboard-header__copy">
              <h1>{config.h1}</h1>
            </div>
            <div className="officer-dashboard-user">
              <div><span>Logged in as</span><strong>{user.loginId}</strong></div>
              <button type="button" className="officer-dashboard-logout" onClick={handleLogout}>
                <LogOut size={18} /> Logout
              </button>
            </div>
          </header>
          {mainContent}
        </main>
      </div>

      {actionModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#fff", borderRadius: "14px", padding: "28px 32px",
            width: "100%", maxWidth: "460px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 700,
                color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Confirm Action
              </p>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                {getActionModalTitle(actionModal.action, config.showApproveButton)}
              </h3>
              <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Application ID:{" "}
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#92400e",
                  background: "#fef3c7", padding: "2px 8px", borderRadius: "4px" }}>
                  {actionModal.app.application_id}
                </span>
              </p>
            </div>

            <div style={{
              padding: "10px 14px", borderRadius: "8px", marginBottom: "18px",
              fontSize: "0.82rem", fontWeight: 600,
              ...(actionModal.action === "APPLICATION_APPROVED"
                ? { background: "#dcfce7", color: "#166534" }
                : actionModal.action === "APPLICATION_REJECTED" || actionModal.action === "APPLICATION_RETURNED_TO_APPLICANT"
                ? { background: "#fee2e2", color: "#991b1b" }
                : { background: "#fef3c7", color: "#92400e" }),
            }}>
              {getActionModalMessage(actionModal.action, config.showApproveButton)}
            </div>

            <label style={{ display: "block", marginBottom: "18px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151",
                display: "block", marginBottom: "6px" }}>
                Remark <span style={{ color: "#c0392b" }}>*</span>
              </span>
              <textarea
                rows={3}
                value={remarkInput}
                onChange={(e) => setRemarkInput(e.target.value)}
                placeholder="Enter your remark..."
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px", borderRadius: "8px",
                  border: "1.5px solid #d1d5db", fontSize: "0.88rem",
                  resize: "vertical", outline: "none", fontFamily: "inherit",
                }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => { setActionModal(null); setRemarkInput(""); }}
                disabled={isSubmittingAction}
                style={{
                  padding: "9px 20px", borderRadius: "8px",
                  border: "1px solid #d1d5db", background: "#f9fafb",
                  color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={isSubmittingAction || !remarkInput.trim()}
                style={{
                  padding: "9px 20px", borderRadius: "8px", border: "none",
                  fontWeight: 700, fontSize: "0.88rem", cursor: isSubmittingAction ? "not-allowed" : "pointer",
                  color: "#fff",
                  background: isSubmittingAction || !remarkInput.trim()
                    ? "#94a3b8"
                    : actionModal.action === "APPLICATION_APPROVED"
                    ? "#166534"
                    : actionModal.action === "APPLICATION_REJECTED" || actionModal.action === "APPLICATION_RETURNED_TO_APPLICANT"
                    ? "#dc2626"
                    : "#92400e",
                }}
              >
                {isSubmittingAction ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default PendingApplicationsPage;

function btnStyle(bg, disabled) {
  return {
    display: "inline-flex", alignItems: "center", gap: "5px",
    background: bg, color: "#fff", border: "none",
    borderRadius: "6px", padding: "6px 12px",
    fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const selectActionStyle = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontSize: "0.78rem",
  fontWeight: 600,
  background: "#fff",
  color: "#1e293b",
  cursor: "pointer",
  outline: "none",
  minWidth: "145px",
};

function SectionBox({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ddd6ce", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", fontWeight: "700", borderBottom: "1px solid #ddd6ce", background: "#fafaf9" }}>
        {title}
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #e7e5e4" }}>
      <span style={{ fontWeight: "600" }}>{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

