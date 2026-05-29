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
  Users,
  Download,
  X,
} from "lucide-react";
import {
  fetchOfficerDashboardConfig,
  getOrganisationDocumentUrl,
  getSiteVisitReportUrl,
  logoutOfficer,
  fetchPaymentVerificationApplications,
  verifyPaymentReceipt,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
} from "../utils/applicationStatus";
import "./OfficerDashboardPage.css";
import "./PaymentVerificationPage.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getApplicationStatusStyle = (status) => {
  switch (status) {
    case "PAYMENT_RECEIPT_UPLOADED":  return { background: "#ede9fe", color: "#6d28d9" };
    case "PAYMENT_RECEIPT_VERIFIED":  return { background: "#dcfce7", color: "#166534" };
    case "PAYMENT_RECEIPT_REJECTED":      return { background: "#fee2e2", color: "#991b1b" };
    default:                          return { background: "#e2e8f0", color: "#475569" };
  }
};

const DOCUMENT_ROWS = [
  ["Property Proof",       "property_proof"],
  ["Registration Proof",   "registration_proof"],
  ["Ownership Proof",      "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof",       "identity_proof"],
];

const ACTION_LABELS = {
  PAYMENT_RECEIPT_VERIFIED: "✅ Verify Payment",
  PAYMENT_RECEIPT_REJECTED:     "❌ Mark as Rejected",
};

const ACTION_MESSAGES = {
  PAYMENT_RECEIPT_VERIFIED: "Payment receipt will be marked as Accepted.",
  PAYMENT_RECEIPT_REJECTED:     "Payment receipt will be marked as Rejected.",
};

const SUCCESS_MESSAGES = {
  PAYMENT_RECEIPT_VERIFIED: "Payment receipt accepted successfully.",
  PAYMENT_RECEIPT_REJECTED:     "Payment receipt rejected successfully.",
};

const tableColumns = [
  { label: "Application ID",       width: 140 },
  { label: "Organisation Name",    width: 180 },
  { label: "Block",                width: 105 },
  { label: "Village",              width: 120 },
  { label: "Applicant Name",       width: 160 },
  { label: "Connection Type",      width: 130 },
  { label: "Amount",               width: 110 },
  { label: "Date of Payment",      width: 135 },
  { label: "Money Receipt",        width: 120 },
  { label: "Application Received", width: 155 },
  { label: "Application Status",   width: 175 },
  { label: "Action Status",        width: 185 },
  { label: "Action",               width: 150 },
];

// ─── Main Component ───────────────────────────────────────────────────────────

function PaymentVerificationPage() {
  const navigate = useNavigate();

  // ── All useState hooks first ──────────────────────────────────────────────
  const [session,            setSession]            = useState(null);
  const [dashboardData,      setDashboardData]      = useState(null);
  const [applications,       setApplications]       = useState([]);
  const [activeMenuKey,      setActiveMenuKey]      = useState("");
  const [activeOptionKey,    setActiveOptionKey]    = useState("");
  const [isLoadingShell,     setIsLoadingShell]     = useState(true);
  const [isLoadingApps,      setIsLoadingApps]      = useState(true);
  const [errorMessage,       setErrorMessage]       = useState("");
  const [appError,           setAppError]           = useState("");
  const [search,             setSearch]             = useState("");
  const [detailView,         setDetailView]         = useState(null);
  const [actionModal,        setActionModal]        = useState(null);
  const [remarkInput,        setRemarkInput]        = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [pdfPreview,         setPdfPreview]         = useState(null);

  // ── useEffect: session + dashboard shell ──────────────────────────────────
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

  // ── useEffect: fetch applications ─────────────────────────────────────────
  useEffect(() => {
    if (!session?.id) return;
    setIsLoadingApps(true);
    setAppError("");
    setApplications([]);
    setDetailView(null);

    fetchPaymentVerificationApplications(session.id)
      .then((r) => setApplications(r.data))
      .catch((e) => { console.error(e); setAppError("Failed to load applications."); })
      .finally(() => setIsLoadingApps(false));
  }, [session?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    setActiveMenuKey(menuKey);
    setActiveOptionKey("");
  };

  const handleOptionClick = (option) => {
    const url   = String(option.url   || "").toLowerCase();
    const label = String(option.label || "").toLowerCase();
    setActiveOptionKey(option.key);
    setDetailView(null);

    if (url === "/applicationreceived" || label === "application received")            { navigate("/je-application-received"); return; }
    if (url.includes("paymentverification") || label.includes("payment verification")) { navigate("/je-payment-verification"); return; }
    if (url.includes("updateconnectiondetails") || label.includes("update connection details")) { navigate("/je-update-connection"); return; }
  };

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { app, action } = actionModal;

    if (!remarkInput.trim()) {
      await Swal.fire({
        title: "Remark Required",
        text: "Please enter a remark before submitting.",
        icon: "warning", confirmButtonText: "OK",
      });
      return;
    }

    setIsSubmittingAction(true);
    try {
      await verifyPaymentReceipt(app.application_id, action, remarkInput.trim(),session.id);
      setApplications((prev) => prev.filter((a) => a.application_id !== app.application_id));
      setActionModal(null);
      setRemarkInput("");
      await Swal.fire({
        title: "Done",
        text: SUCCESS_MESSAGES[action],
        icon: "success", confirmButtonText: "OK",
      });
    } catch (e) {
      await Swal.fire({
        title: "Failed",
        text: e.response?.data?.error || "Action failed.",
        icon: "error", confirmButtonText: "OK",
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const renderActionButton = (app) => (
    <select
      value=""
      onChange={(e) => {
        if (!e.target.value) return;
        setActionModal({ app, action: e.target.value });
        setRemarkInput("");
      }}
      style={{
        padding: "6px 10px", borderRadius: "6px",
        border: "1px solid #d1d5db", fontSize: "0.78rem",
        fontWeight: 600, background: "#fff", color: "#1e293b",
        cursor: "pointer", outline: "none", minWidth: "140px",
      }}
    >
      <option value="">Select Action</option>
      <option value="PAYMENT_RECEIPT_VERIFIED">Accept</option>
      <option value="PAYMENT_RECEIPT_REJECTED">Reject</option>
    </select>
  );

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

  // ── Filtered rows ─────────────────────────────────────────────────────────
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

  // ── Shell guards ──────────────────────────────────────────────────────────
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
  const menus        = dashboard.navigation?.menus || [];
  const activeMenu   = menus.find((m) => m.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((o) => o.key === activeOptionKey) || null;

  // ── Detail view ───────────────────────────────────────────────────────────
  const mainContent = detailView ? (
    <section style={{ padding: "24px" }}>
      <button
        onClick={() => setDetailView(null)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          border: "1px solid #d6d3d1", borderRadius: "8px", padding: "8px 14px",
          background: "#fff", fontWeight: "600", cursor: "pointer", marginBottom: "20px",
        }}
      >
        ← Back to Applications
      </button>

      <div style={{
        background: "#1e2f4d", borderRadius: "12px",
        padding: "22px 28px", marginBottom: "18px",
      }}>
        <div style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600", letterSpacing: "1px" }}>
          PAYMENT VERIFICATION DETAILS
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
          <Row label="Application ID"       value={detailView.application_id} />
          <Row label="Application Status"   value={formatApplicationStatus(detailView.application_status)} />
          <Row label="Application Received" value={formatDisplayDate(detailView.money_receipt_upload_on ?? detailView.created_at)} />
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
          <Row label="Connection Type"           value={detailView.type_of_connection} />
          <Row label="Water Requirement (L/Day)" value={detailView.water_requirement ? `${detailView.water_requirement} L/Day` : null} />
        </SectionBox>

        <SectionBox title="Payment Details">
          <Row label="Amount"             value={detailView.amount ? `₹ ${Number(detailView.amount).toLocaleString("en-IN")}` : "NA"} />
          <Row label="Date of Payment"    value={formatDisplayDate(detailView.date_of_payment)} />
          <Row label="Payment Status"     value={detailView.payment_status} />
          <Row
            label="Money Receipt"
            value={
              detailView.money_receipt
                ? <button
                    onClick={() => setPdfPreview({
                      url: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/payment-verification/${detailView.application_id}/money-receipt`,
                      title: "Money Receipt"
                    })}
                    style={{
                      background: "none", border: "none", color: "#2563eb",
                      textDecoration: "underline", cursor: "pointer", padding: 0,
                      fontSize: "inherit", fontWeight: "inherit"
                    }}
                  >
                    View Receipt
                  </button>
                : "NA"
            }
          />
        </SectionBox>

        <SectionBox title="Site Visit Report">
          <Row
            label="Site Visit Report"
            value={
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
            }
          />
        </SectionBox>

        <SectionBox title="Documents">
          {DOCUMENT_ROWS.map(([label, docType]) => (
            <Row key={docType} label={label} value={renderDocumentLink(detailView, docType)} />
          ))}
        </SectionBox>
      </div>
    </section>
  ) : (
    // ── Table view ────────────────────────────────────────────────────────────
    <section style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "20px", flexWrap: "wrap", gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={20} style={{ color: "#b45309" }} />
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
            Payment Verification
          </h2>
          <span style={{
            background: "#fef3c7", color: "#92400e", borderRadius: "999px",
            padding: "2px 10px", fontSize: "0.78rem", fontWeight: 600,
          }}>
            {filtered.length}
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{
            position: "absolute", left: "10px",
            top: "50%", transform: "translateY(-50%)", color: "#94a3b8",
          }} />
          <input
            type="text"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: "32px", paddingRight: "12px",
              paddingTop: "8px", paddingBottom: "8px",
              border: "1px solid #e2e8f0", borderRadius: "8px",
              fontSize: "0.85rem", width: "220px",
              background: "#fff", color: "#1e293b", outline: "none",
            }}
          />
        </div>
      </div>

      {/* Body */}
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
            width: "100%", minWidth: "1500px", borderCollapse: "collapse",
            fontSize: "0.85rem", tableLayout: "fixed",
          }}>
            <thead>
              <tr style={{ background: "#1e293b", color: "#fff" }}>
                {tableColumns.map((col) => (
                  <th
                    key={col.label}
                    style={{
                      width: `${col.width}px`, maxWidth: `${col.width}px`,
                      padding: "12px 14px", textAlign: "left", fontWeight: 600,
                      fontSize: "0.78rem", letterSpacing: "0.04em", whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    No applications pending for payment verification.
                  </td>
                </tr>
              ) : (
                filtered.map((app, index) => (
                  <tr
                    key={app.application_id}
                    style={{
                      background: index % 2 === 0 ? "#fff" : "#f8fafc",
                      borderBottom: "1px solid #f1f5f9", transition: "background 0.15s",
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

                    {/* Amount */}
                    <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 600 }}>
                      {app.amount
                        ? `₹ ${Number(app.amount).toLocaleString("en-IN")}`
                        : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>

                    {/* Date of Payment */}
                    <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
                      {formatDisplayDate(app.date_of_payment) || "—"}
                    </td>

                    {/* Money Receipt */}
                    <td style={{ padding: "12px 16px" }}>
                      {app.money_receipt ? (
                        <button
                          onClick={() => setPdfPreview({
                            url: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/payment-verification/${app.application_id}/money-receipt`,
                            title: `Money Receipt - ${app.application_id}`
                          })}
                          style={{
                            display: "inline-block",
                            background: "#1e293b", color: "#fff",
                            borderRadius: "6px", padding: "4px 12px",
                            fontSize: "0.75rem", fontWeight: 600,
                            textDecoration: "none", border: "none", cursor: "pointer"
                          }}
                        >
                          View
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>NA</span>
                      )}
                    </td>

                    {/* Application Received (money_receipt_upload_on) */}
                    <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
                      {formatDisplayDate(app.money_receipt_upload_on ?? app.created_at)}
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
                    {/* Action Status */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: app.money_receipt_verify_on ? "#dcfce7" : "#fef3c7",
                        color:      app.money_receipt_verify_on ? "#166534" : "#92400e",
                        borderRadius: "999px",
                        padding: "3px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        {app.money_receipt_verify_on
                          ? `Verified on ${formatDisplayDate(app.update_on)}`
                          : (() => {
                              if (!app.update_on) return "Pending";
                              const days = Math.max(0, Math.floor(
                                (new Date() - new Date(app.update_on)) / 86400000
                              ));
                              return `Pending since ${days} ${days === 1 ? "day" : "days"}`;
                            })()
                        }
                      </span>
                    </td>
                    {/* Action dropdown */}
                    <td style={{ padding: "12px 16px" }}>
                      {renderActionButton(app)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  // ── Shell ─────────────────────────────────────────────────────────────────
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
              <button
                type="button"
                className="officer-dashboard-nav__item"
                onClick={() => navigate("/je-dashboard")}
              >
                <div className="officer-dashboard-nav__item-copy">
                  <Users size={18} /><span>Dashboard</span>
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
                      <Users size={18} /><span>{item.label}</span>
                    </div>
                    {isActive ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  {isActive && item.options.length > 0 && (
                    <div className="officer-dashboard-nav__options">
                      {item.options.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={`officer-dashboard-nav__option${option.key === activeOption?.key ? " is-active" : ""}`}
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
            <strong>{user.name || user.loginId}</strong>
            <span>{user.roleName || "Officer Access"}</span>
          </div>
        </aside>

        <main className="officer-dashboard-main">
          <header className="officer-dashboard-header">
            <div className="officer-dashboard-header__copy">
              <h1>Payment Verification</h1>
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

      {/* ── Action Remarks Modal ────────────────────────────────────────────── */}
      {actionModal && (
        <div className="pv-modal-overlay">
          <div className="pv-modal">
            {/* Header */}
            <div className="pv-modal__header">
              <p className="pv-modal__label">Confirm Action</p>
              <h3 className="pv-modal__title">{ACTION_LABELS[actionModal.action]}</h3>
              <p className="pv-modal__app-id">
                Application ID:{" "}
                <span className="pv-modal__app-id-badge">
                  {actionModal.app.application_id}
                </span>
              </p>
            </div>

            {/* Status banner */}
            <div
              className="pv-modal__banner"
              style={
                actionModal.action === "PAYMENT_RECEIPT_VERIFIED"
                  ? { background: "#dcfce7", color: "#166534" }
                  : { background: "#fee2e2", color: "#991b1b" }
              }
            >
              {ACTION_MESSAGES[actionModal.action]}
            </div>

            {/* Remark */}
            <label className="pv-modal__label-block">
              <span className="pv-modal__label-text">
                Remark <span style={{ color: "#c0392b" }}>*</span>
              </span>
              <textarea
                rows={3}
                value={remarkInput}
                onChange={(e) => setRemarkInput(e.target.value)}
                placeholder="Enter your remark..."
                className="pv-modal__textarea"
              />
            </label>

            {/* Buttons */}
            <div className="pv-modal__actions">
              <button
                onClick={() => { setActionModal(null); setRemarkInput(""); }}
                disabled={isSubmittingAction}
                className="pv-modal__btn pv-modal__btn--cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={isSubmittingAction || !remarkInput.trim()}
                className="pv-modal__btn pv-modal__btn--confirm"
                style={{
                  background: (isSubmittingAction || !remarkInput.trim())
                    ? "#94a3b8"
                    : actionModal.action === "PAYMENT_RECEIPT_VERIFIED"
                    ? "#166534"
                    : "#dc2626",
                }}
              >
                {isSubmittingAction ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Preview Overlay ────────────────────────────────────────────── */}
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

export default PaymentVerificationPage;

// ─── Helper components ────────────────────────────────────────────────────────

function SectionBox({ title, children }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #ddd6ce",
      borderRadius: "12px", overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px", fontWeight: "700",
        borderBottom: "1px solid #ddd6ce", background: "#fafaf9",
      }}>
        {title}
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "10px 0", borderBottom: "1px dashed #e7e5e4",
    }}>
      <span style={{ fontWeight: "600" }}>{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}
