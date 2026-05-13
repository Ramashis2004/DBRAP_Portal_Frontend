import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  FileText,
  LoaderCircle,
  LogOut,
  Search,
  Send,
  Users,
    Download, X,
} from "lucide-react";
import {
  fetchApplicationReceivedApplications,
  getOrganisationDocumentUrl,
  getSiteVisitReportUrl,
  fetchOfficerDashboardConfig,
  logoutOfficer,
  updateOrganisationStatus,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
} from "../utils/applicationStatus";
import "./OfficerDashboardPage.css";

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Calendar days between two timestamps.
 * When `to` is omitted, today is used as the end date.
 */
const daysBetween = (from, to) => {
  if (!from) return 0;
  const start = new Date(from);
  const end   = to ? new Date(to) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
};

/**
 * Builds a human-readable day-count label.
 *
 * @param {string} prefix — "Action taken in" | "Pending since"
 * @param {string} from   — ISO timestamp (start date)
 * @param {string} [to]   — ISO timestamp (end date); defaults to today
 *
 * Examples:
 *   buildDayLabel("Pending since", "2026-04-20")           → "Pending since 2 days"
 *   buildDayLabel("Action taken in", "2026-04-19", "2026-04-21") → "Action taken in 2 days"
 */
const buildDayLabel = (prefix, from, to) => {
  const days = daysBetween(from, to);
  return `${prefix} ${days} ${days === 1 ? "day" : "days"}`;
};

// ─── Status style helpers ─────────────────────────────────────────────────────

const getApplicationStatusStyle = (applicationStatus) => {
  switch (applicationStatus) {
    case "APPLICATION_SUBMITTED":
      return { background: "#dbeafe", color: "#1d4ed8" };
    case "APPLICATION_FORWARDED_TO_JE":
      return { background: "#fef3c7", color: "#92400e" };
    case "JE_VERIFIED_REPORT_UPLOADED":
      return { background: "#ede9fe", color: "#6d28d9" };
    case "APPLICATION_APPROVED":
      return { background: "#dcfce7", color: "#166534" };
    default:
      return { background: "#e2e8f0", color: "#475569" };
  }
};

/**
 * Action Status pill — colour + text — keyed on application_status.
 *
 * APPLICATION_SUBMITTED        → "Pending since X days"
 *                                 days: created_at → today
 *
 * APPLICATION_FORWARDED_TO_JE  → "Action taken in X days"
 *                                 days: created_at → today
 *
 * JE_VERIFIED_REPORT_UPLOADED  → "Pending since X days"
 *                                 days: site_visit_report_upload_on → today
 *
 * APPLICATION_APPROVED         → "Action taken in X days"
 *                                 days: site_visit_report_upload_on → approved_on
 *                                 (both timestamps from the DB — NOT today)
 */
const getActionStatusMeta = (app) => {
  const status = String(app.application_status || "").toUpperCase();

  if (status === "APPLICATION_SUBMITTED") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      text: buildDayLabel("Pending since", app.created_at),
    };
  }

  if (status === "APPLICATION_FORWARDED_TO_JE") {
  return {
    background: "#dcfce7",
    color: "#166534",
    text: buildDayLabel("Action taken in", app.created_at, app.forward_on),  // ← from created_at to forward_on
  };
}

  if (status === "JE_VERIFIED_REPORT_UPLOADED") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      text: buildDayLabel("Pending since", app.site_visit_report_upload_on),
    };
  }

  if (status === "APPLICATION_APPROVED") {
    // ← Key change: end date is approved_on, NOT today
    return {
      background: "#dcfce7",
      color: "#166534",
      text: buildDayLabel(
        "Action taken in",
        app.site_visit_report_upload_on,
        app.approved_on
      ),
    };
  }

  return {
    background: "#e2e8f0",
    color: "#475569",
    text: "—",
  };
};

/**
 * "Application Received" column date — per status for SE view.
 *
 * APPLICATION_SUBMITTED        → created_at
 * APPLICATION_FORWARDED_TO_JE  → created_at
 * JE_VERIFIED_REPORT_UPLOADED  → site_visit_report_upload_on
 * APPLICATION_APPROVED         → site_visit_report_upload_on
 */
const getReceivedDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (
    status === "JE_VERIFIED_REPORT_UPLOADED" ||
    status === "APPLICATION_APPROVED"
  ) {
    return app.site_visit_report_upload_on ?? app.created_at ?? null;
  }
  return app.created_at ?? null;
};

const getActionTakenDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (status === "APPLICATION_FORWARDED_TO_JE") return app.forward_on ?? null;
  if (status === "APPLICATION_APPROVED") return app.approved_on ?? null;
  return null;
};
const DOCUMENT_ROWS = [
  ["Property Proof", "property_proof"],
  ["Registration Proof", "registration_proof"],
  ["Ownership Proof", "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof", "identity_proof"],
];



// ─── Page component ───────────────────────────────────────────────────────────

function ApplicationReceivedPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activeMenuKey, setActiveMenuKey] = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");
  const [isLoadingShell, setIsLoadingShell] = useState(true);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailView, setDetailView] = useState(null);
  const [sendingAppId, setSendingAppId] = useState("");
  const [pdfPreview,      setPdfPreview]      = useState(null);

  // ── Session + dashboard config ──────────────────────────────────────────────
  useEffect(() => {
    const rawSession = localStorage.getItem("officerSession");
    const parsedSession = rawSession ? JSON.parse(rawSession) : null;

    if (!parsedSession?.id) {
      navigate("/login", { replace: true });
      return;
    }

    setSession(parsedSession);

    const initialize = async () => {
      try {
        const response = await fetchOfficerDashboardConfig(parsedSession.id);
        setDashboardData(response.data);
      } catch (error) {
        console.error("Dashboard config load failed:", error);
        setErrorMessage(error.response?.data?.error || "Unable to load dashboard.");
      } finally {
        setIsLoadingShell(false);
      }
    };

    initialize();
  }, [navigate]);

  // ── Applications fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.id) return;

    const loadApplications = async () => {
      try {
        const response = await fetchApplicationReceivedApplications(
          session.id,
          "APPLICATION_SUBMITTED,APPLICATION_FORWARDED_TO_JE,JE_VERIFIED_REPORT_UPLOADED,APPLICATION_APPROVED"
        );
        setApplications(response.data);
      } catch (error) {
        console.error("Application load failed:", error);
        setApplicationError("Failed to load applications.");
      } finally {
        setIsLoadingApplications(false);
      }
    };

    loadApplications();
  }, [session?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

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
    try {
      if (session?.id) await logoutOfficer({ userId: session.id });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("officerSession");
      navigate("/login");
    }
  };

  const handleMenuClick = (menuKey) => {
  //setDetailView(null);
  if (menuKey === activeMenuKey) {
    setActiveMenuKey("");
    setActiveOptionKey("");
    return;
  }

  setActiveMenuKey(menuKey);
  setActiveOptionKey("");
};

  // const handleOptionClick = (option) => {
  //   const optionUrl   = String(option.url   || "").toLowerCase();
  //   const optionLabel = String(option.label || "").toLowerCase();
  //   setActiveOptionKey(option.key);
  //     setDetailView(null);
  //   if (optionUrl === "/createuser" || optionLabel === "create user") {
  //     navigate("/se-dashboard");
  //     return;
  //   }
  //   if (optionUrl === "/applicationreceived" || optionLabel === "application received") {
  //     navigate("/se-application-received");
  //   }
  //    //THIS — handles Payment Details click
  // if (optionUrl.includes("payment") || optionLabel === "payment details") {
  //   navigate("/se-payment-details");
  //   return;
  // }
  // };
const handleOptionClick = (option) => {
  const url   = String(option.url   || "").toLowerCase();
  const label = String(option.label || "").toLowerCase();
  setActiveOptionKey(option.key);
  setDetailView(null);

  if (url === "/createuser"          || label === "create user")                    { navigate("/se-dashboard"); return; }
  if (url === "/applicationreceived" || label === "application received")           { navigate("/se-application-received"); return; }
  if (url.includes("pendingforwardtoje") || label.includes("pending for forward"))  { navigate("/se-pending-forward-to-je"); return; }  // ← ADD
  if (url.includes("pendingapproval")    || label.includes("pending for approval")) { navigate("/se-pending-approval"); return; }       // ← ADD
  if (url.includes("payment")            || label === "payment details")            { navigate("/se-payment-details"); return; }
};
  const handleSendToJe = async (app) => {
    const confirmation = await Swal.fire({
      title: "Forward application?",
      text: `Do you want to forward application  to ${app.block} JE for site visit?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    setSendingAppId(app.application_id);
    try {
      await updateOrganisationStatus(app.application_id, "APPLICATION_FORWARDED_TO_JE");
      setApplications((current) =>
        current.map((item) =>
          item.application_id === app.application_id
            ? { ...item, application_status: "APPLICATION_FORWARDED_TO_JE" }
            : item
        )
      );
      if (detailView?.application_id === app.application_id) setDetailView(null);
      await Swal.fire({
        title: "Forwarded",
        text: "Application has been forwarded to JE for site visit.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Forward to JE failed:", error);
      await Swal.fire({
        title: "Failed",
        text: error.response?.data?.error || "Unable to forward application.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setSendingAppId("");
    }
  };

  const handleApproveApplication = async (app) => {
    const confirmation = await Swal.fire({
      title: "Approve application?",
      text: `Do you want to approve this application "${app.application_id}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    setSendingAppId(app.application_id);
    try {
      const response = await updateOrganisationStatus(app.application_id, "APPLICATION_APPROVED");
      // Use approved_on returned by the API so the action-status label is immediately accurate
      const approvedOn = response.data?.data?.approved_on ?? new Date().toISOString();
      setApplications((current) =>
        current.map((item) =>
          item.application_id === app.application_id
            ? { ...item, application_status: "APPLICATION_APPROVED", approved_on: approvedOn }
            : item
        )
      );
      await Swal.fire({
        title: "Approved",
        text: "Application has been approved successfully.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Approval failed:", error);
      await Swal.fire({
        title: "Failed",
        text: error.response?.data?.error || "Unable to approve application.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setSendingAppId("");
    }
  };

  // ── Filtered rows ───────────────────────────────────────────────────────────

  const filtered = applications.filter((app) => {

  const q = search.toLowerCase();

  const matchesSearch =
      app.application_id?.toLowerCase().includes(q) ||
      app.organisation_name?.toLowerCase().includes(q) ||
      app.block?.toLowerCase().includes(q) ||
      app.village?.toLowerCase().includes(q) ||
      app.name?.toLowerCase().includes(q);

  const status = String(app.application_status || "").toUpperCase();

  const matchesStatus =
      statusFilter === "all" ||
      status === statusFilter;

  return matchesSearch && matchesStatus;

});

  // ── Table columns ───────────────────────────────────────────────────────────

  const tableColumns = [
    { label: "Application ID",       width: 130 },
    { label: "Organisation Name",    width: 180 },
    { label: "Block",                width: 105 },
    { label: "Village",              width: 120 },
    { label: "Applicant Name",       width: 190 },
    { label: "Connection Type",      width: 130 },
    { label: "Application Status",   width: 165 },
    { label: "Application Received", width: 150 },
    { label: "Action Taken On", width: 135 },
    { label: "Action Status",        width: 185 },
    { label: "Action",               width: 120 },
  ];

  // ── Detail panel fields ─────────────────────────────────────────────────────

  const fieldsFor = (app) => [
    ["Application ID",       app.application_id],
    ["Organisation Name",    app.organisation_name],
    ["Establishment Type",   app.establishment_type],
    ["Site Visit Report",    app.site_visit_report],
    ["Applicant Name",       app.name],
    ["Gender",               app.gender],
    ["Email",                app.email],
    ["Mobile",               app.mobile_number],
    ["District",             app.district],
    ["Block",                app.block],
    ["Gram Panchayat",       app.gram_panchayat],
    ["Village",              app.village],
    ["Habitation",           app.habitation],
    ["Connection Type",      app.type_of_connection],
    ["Water Requirement",    app.water_requirement ? `${app.water_requirement} L/Day` : null],
    ["Application Received", formatDisplayDate(getReceivedDate(app))],
    ["Action Taken On", formatDisplayDate(getActionTakenDate(app))],
    ["Application Status",   formatApplicationStatus(app.application_status)],
  ];

  const renderDetailValue = (label, value, app) => {
    if (label === "Site Visit Report" && value) {
      return (
        <a
          href={getSiteVisitReportUrl(app.application_id)}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#1d4ed8", textDecoration: "underline",
            textDecorationStyle: "dotted", wordBreak: "break-word" }}
        >
          View File
        </a>
      );
    }
    if (label === "Site Visit Report") return "NA";
    return value || "—";
  };

  // ── Action button per row ───────────────────────────────────────────────────

  const renderActionButton = (app) => {
    const status      = String(app.application_status || "").toUpperCase();
    const isActioning = sendingAppId === app.application_id;

    if (status === "APPLICATION_SUBMITTED") {
      return (
        <button
          onClick={() => handleSendToJe(app)}
          disabled={isActioning}
          style={actionBtnStyle(isActioning ? "#94a3b8" : "#166534", isActioning)}
        >
          <Send size={13} />
          {isActioning ? "Sending…" : "Forward to JE"}
        </button>
      );
    }

    if (status === "APPLICATION_FORWARDED_TO_JE") {
      return <span style={actionBadgeStyle("#fef3c7", "#92400e")}>Forwarded</span>;
    }

    if (status === "JE_VERIFIED_REPORT_UPLOADED") {
      return (
        <button
          onClick={() => handleApproveApplication(app)}
          disabled={isActioning}
          style={actionBtnStyle(isActioning ? "#94a3b8" : "#1d4ed8", isActioning)}
        >
          {isActioning ? "Approving…" : "Approve"}
        </button>
      );
    }

    if (status === "APPLICATION_APPROVED") {
      return <span style={actionBadgeStyle("#dcfce7", "#166534")}>Approved</span>;
    }

    return <span style={actionBadgeStyle("#ede9fe", "#6d28d9")}>Uploaded</span>;
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
  // ── Shell guards ────────────────────────────────────────────────────────────

  if (isLoadingShell) {
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
  const menus        = dashboard.navigation?.menus || [];
  const activeMenu   = menus.find((item) => item.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((item) => item.key === activeOptionKey) || null;

  const shouldShowCreateUserForm =
    activeOption?.url?.toLowerCase()   === "/createuser" ||
    activeOption?.label?.toLowerCase() === "create user";

  // ── Detail view ─────────────────────────────────────────────────────────────

  const shellContent = detailView ? (
<section style={{padding:"24px"}}>

{/* Back Button */}
<button
 onClick={() => setDetailView(null)}
 style={{
   display:"inline-flex",
   alignItems:"center",
   gap:"6px",
   border:"1px solid #d6d3d1",
   borderRadius:"8px",
   padding:"8px 14px",
   background:"#fff",
   fontWeight:"600",
   cursor:"pointer",
   marginBottom:"20px"
 }}
>
← Back to Applications
</button>


{/* Application Header */}
<div style={{
 background:"#1e2f4d",
 borderRadius:"12px",
 padding:"22px 28px",
 marginBottom:"18px"
}}>
 <div style={{
   color:"#94a3b8",
   fontSize:"12px",
   fontWeight:"600",
   letterSpacing:"1px"
 }}>
 APPLICATION DETAILS
 </div>

 <span style={{
   marginTop:"8px",
   display:"inline-block",
   background:"#fff4c2",
   color:"#92400e",
   padding:"6px 14px",
   borderRadius:"6px",
   fontWeight:"700"
 }}>
   {detailView.application_id}
 </span>
</div>


{/* 2-column section layout */}
<div
style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"14px"
}}
>
{/* Application */}
<SectionBox title="Application Details">
<Row label="Application ID" value={detailView.application_id}/>
<Row
 label="Application Received"
 value={formatDisplayDate(getReceivedDate(detailView))}
/>
<Row
 label="Application Status"
 value={formatApplicationStatus(detailView.application_status)}
/>
</SectionBox>
{/* Applicant Details */}
<SectionBox title="Applicant Details">
<Row label="Name" value={detailView.name}/>
<Row label="Gender" value={detailView.gender}/>
<Row label="Email" value={detailView.email}/>
<Row label="Mobile Number" value={detailView.mobile_number}/>
</SectionBox>


{/* Organisation */}
<SectionBox title="Organisation Details">
<Row label="Organisation Name" value={detailView.organisation_name}/>
<Row label="Establishment Type" value={detailView.establishment_type}/>
<Row label="District" value={detailView.district}/>
<Row label="Block" value={detailView.block}/>
<Row label="Gram Panchayat" value={detailView.gram_panchayat}/>
<Row label="Village" value={detailView.village}/>
<Row label="Habitation" value={detailView.habitation}/>
</SectionBox>


{/* Connection */}
<SectionBox title="Connection Details">
<Row label="Connection Type" value={detailView.type_of_connection}/>
<Row
 label="Water Requirement (Litre/Day)"
 value={`${detailView.water_requirement} L/Day`}
/>
</SectionBox>



{/* Site Visit */}
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


{/* Documents */}
<SectionBox title="Documents">
{DOCUMENT_ROWS.map(([label, documentType]) => (
<Row
 key={documentType}
 label={label}
 value={renderDocumentLink(detailView, documentType)}
/>
))}
</SectionBox>

</div>
</section>
)  : (

  // ── Table view ──────────────────────────────────────────────────────────────

    <section style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={20} style={{ color: "#b45309" }} />
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
            Applications Received
          </h2>
          <span style={{
            background: "#fef3c7", color: "#92400e", borderRadius: "999px",
            padding: "2px 10px", fontSize: "0.78rem", fontWeight: 600,
          }}>
            {filtered.length}
          </span>
        </div>

        <div style={{
display:"flex",
alignItems:"center",
gap:"12px"
}}>

{/* Status Filter */}
<select
value={statusFilter}
onChange={(e)=>setStatusFilter(e.target.value)}
style={{
padding:"8px 12px",
border:"1px solid #e2e8f0",
borderRadius:"8px",
fontSize:"0.85rem",
background:"#fff",
color:"#1e293b",
outline:"none",
minWidth:"230px"
}}
>
<option value="all">
All Status
</option>

<option value="APPLICATION_SUBMITTED">
Application Pending
</option>

<option value="APPLICATION_FORWARDED_TO_JE">
Application Forwarded To JE
</option>

<option value="JE_VERIFIED_REPORT_UPLOADED">
Verify JE Upload Report
</option>

<option value="APPLICATION_APPROVED">
Application Approved
</option>

</select>


{/* Search */}
<div style={{ position:"relative" }}>
<Search
size={15}
style={{
position:"absolute",
left:"10px",
top:"50%",
transform:"translateY(-50%)",
color:"#94a3b8"
}}
/>

<input
type="text"
placeholder="Search applications..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
paddingLeft:"32px",
paddingRight:"12px",
paddingTop:"8px",
paddingBottom:"8px",
border:"1px solid #e2e8f0",
borderRadius:"8px",
fontSize:"0.85rem",
width:"220px",
background:"#fff"
}}
/>
</div>

</div>
      </div>

      {/* Body */}
      {isLoadingApplications ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "40px", color: "#666" }}>
          <LoaderCircle size={20} style={{ animation: "spin 1s linear infinite" }} />
          <span>Loading applications...</span>
        </div>
      ) : applicationError ? (
        <div style={{ padding: "24px", color: "#c0392b" }}>{applicationError}</div>
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
                    No applications found.
                  </td>
                </tr>
              ) : (
                filtered.map((app, index) => {
                  const actionMeta = getActionStatusMeta(app);
                  return (
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
                      {/* Application ID — clickable */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span
                          onClick={() => setDetailView(app)}
                          style={{
                            background: "#fef3c7", color: "#92400e", borderRadius: "6px",
                            padding: "3px 8px", fontWeight: 600, fontSize: "0.78rem",
                            fontFamily: "monospace", cursor: "pointer",
                            textDecoration: "underline", textDecorationStyle: "dotted",
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

                      {/* Connection Type */}
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

                      {/* Application Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          ...getApplicationStatusStyle(app.application_status),
                          borderRadius: "999px", padding: "3px 10px",
                          fontSize: "0.75rem", fontWeight: 600,
                        }}>
                          {formatApplicationStatus(app.application_status)}
                        </span>
                      </td>

                      {/* Application Received */}
                      <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDisplayDate(getReceivedDate(app))}
                      </td>
{/* Action Taken On */}
<td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
  {formatDisplayDate(getActionTakenDate(app)) || "—"}
</td>
                      {/* Action Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          ...actionMeta,
                          borderRadius: "999px", padding: "3px 10px",
                          fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap",
                        }}>
                          {actionMeta.text}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "12px 16px" }}>
                        {renderActionButton(app)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  // ── Shell ───────────────────────────────────────────────────────────────────

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
    className="officer-dashboard-nav__item"
    onClick={() => navigate("/se-dashboard")}
  >
    <div className="officer-dashboard-nav__item-copy">
      <Users size={18} />
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
            <strong>{user.name || user.loginId}</strong>
            <span>{user.roleName || "Officer Access"}</span>
          </div>
        </aside>

        <main className="officer-dashboard-main">
          <header className="officer-dashboard-header">
            <div className="officer-dashboard-header__copy">
              <h1>Application Received</h1>
            </div>
            <div className="officer-dashboard-user">
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

          {!shouldShowCreateUserForm ? shellContent : null}

          {shouldShowCreateUserForm ? (
            <section className="officer-dashboard-form-section officer-dashboard-form-section--full" />
          ) : null}
        </main>
      </div>
      {pdfPreview && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 9999,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
    }}
  >
    <div
      style={{
        width: "95%",
        height: "95%",
        background: "#fff",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          background: "#1e293b",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>
          {pdfPreview.title}
        </h3>

        <button
          onClick={() => setPdfPreview(null)}
          style={{
            border: "none",
            background: "red",
            color: "#fff",
            borderRadius: "6px",
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      <iframe
        src={pdfPreview.url}
        title="PDF Preview"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
        }}
      />
    </div>
  </div>
)}
    </div>
  );
}

export default ApplicationReceivedPage;

// ─── Inline style helpers ─────────────────────────────────────────────────────

function actionBtnStyle(bg, disabled) {
  return {
    display: "inline-flex", alignItems: "center", gap: "5px",
    background: bg, color: "#fff", border: "none",
    borderRadius: "6px", padding: "6px 12px",
    fontSize: "0.78rem", fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}

function actionBadgeStyle(bg, color) {
  return {
    display: "inline-flex", alignItems: "center",
    background: bg, color,
    borderRadius: "6px", padding: "6px 12px",
    fontSize: "0.78rem", fontWeight: 600,
  };
}

function SectionBox({title, children}) {
 return (
   <div style={{
     background:"#fff",
     border:"1px solid #ddd6ce",
     borderRadius:"12px",
     overflow:"hidden"
   }}>
     <div style={{
       padding:"14px 16px",
       fontWeight:"700",
       borderBottom:"1px solid #ddd6ce",
       background:"#fafaf9"
     }}>
       {title}
     </div>

     <div style={{padding:"12px 16px"}}>
       {children}
     </div>
   </div>
 )
}

function Row({label,value}) {
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

