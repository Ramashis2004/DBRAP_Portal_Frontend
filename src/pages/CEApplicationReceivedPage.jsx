import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  FileText,
  Filter,
  LoaderCircle,
  LogOut,
  RotateCcw,
  Search,
  Send,
  Users,
  Download,
  X,
} from "lucide-react";
import {
  fetchOfficerDashboardConfig,
  logoutOfficer,
  fetchCircles,
  fetchDistrictsByCircle,
  fetchDivisionsByDistrict,
  fetchBlocksByDivision,
  fetchCEApplicationReceivedApplications,
  updateOrganisationStatus,
  getOrganisationDocumentUrl,
  getSiteVisitReportUrl,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
} from "../utils/applicationStatus";
import "./OfficerDashboardPage.css";
import "./CEApplicationReceivedPage.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES =
  "APPLICATION_SUBMITTED," +
  "APPLICATION_FORWARDED_TO_JE," +
  "JE_VERIFIED_REPORT_UPLOADED," +
  "APPLICATION_APPROVED," +
  "APPLICATION_REJECTED," +
  "PAYMENT_RECEIPT_UPLOADED," +
  "PAYMENT_RECEIPT_VERIFIED," +
  "CONNECTION_DETAILS_UPDATED";
const TABLE_COLUMNS = [
  { label: "Application ID",       width: 130 },
  { label: "Organisation Name",    width: 180 },
  { label: "Block",                width: 105 },
  { label: "Village",              width: 120 },
  { label: "Applicant Name",       width: 180 },
  { label: "Connection Type",      width: 130 },
  { label: "Application Status",   width: 165 },
  { label: "Application Received", width: 150 },
  { label: "Action Taken On",      width: 135 },
  { label: "Action Status",        width: 185 },
  { label: "Pending With",         width: 180 },
];

const DOCUMENT_ROWS = [
  ["Property Proof",       "property_proof"],
  ["Registration Proof",   "registration_proof"],
  ["Ownership Proof",      "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof",       "identity_proof"],
];

// ─── Helper sub-components ────────────────────────────────────────────────────

function SectionBox({ title, children }) {
  return (
    <div className="ce-section-box">
      <div className="ce-section-box__title">{title}</div>
      <div className="ce-section-box__body">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="ce-section-row">
      <span className="ce-section-row__label">{label}</span>
      <span className="ce-section-row__value">{value || "—"}</span>
    </div>
  );
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const loadDistricts = async (circleCode)   => { const r = await fetchDistrictsByCircle(circleCode);  return r.data || []; };
const loadDivisions = async (districtCode) => { const r = await fetchDivisionsByDistrict(districtCode); return r.data || []; };
const loadBlocks    = async (divisionCode) => { const r = await fetchBlocksByDivision(divisionCode);  return r.data || []; };

/**
 * Fetch applications.
 * blockCode = ""  → "All mapped circles" path (backend uses circle_code list)
 * blockCode = "X" → specific block (existing behaviour)
 */
const loadApplications = async (officerId, blockCode) => {
  const res = await fetchCEApplicationReceivedApplications(
    officerId,
    blockCode,   // empty string → All path on backend
    ALL_STATUSES
  );
  return res.data || [];
};

const forwardToJE        = (id) => updateOrganisationStatus(id, "APPLICATION_FORWARDED_TO_JE");
const approveApplication = (id) => updateOrganisationStatus(id, "APPLICATION_APPROVED");

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
  switch (String(status).toUpperCase()) {
    case "APPLICATION_SUBMITTED":        return { background: "#dbeafe", color: "#1d4ed8" };
    case "APPLICATION_FORWARDED_TO_JE":  return { background: "#fef3c7", color: "#92400e" };
    case "JE_VERIFIED_REPORT_UPLOADED":  return { background: "#ede9fe", color: "#6d28d9" };
    case "APPLICATION_APPROVED":         return { background: "#dcfce7", color: "#166534" };
    case "APPLICATION_REJECTED":         return { background: "#fee2e2", color: "#b91c1c" };
    case "PAYMENT_RECEIPT_UPLOADED":     return { background: "#fef3c7", color: "#92400e" };
    case "PAYMENT_RECEIPT_VERIFIED":     return { background: "#dcfce7", color: "#166534" };
    case "CONNECTION_DETAILS_UPDATED":   return { background: "#fef3c7", color: "#166534" };
    default:                             return { background: "#e2e8f0", color: "#475569" };
  }
};
// const getActionStatusMeta = (app) => {
//   const s = String(app.application_status || "").toUpperCase();
//   if (s === "APPLICATION_SUBMITTED")
//     return { background: "#fef3c7", color: "#92400e", text: buildDayLabel("Pending since", app.created_at) };
//   if (s === "APPLICATION_FORWARDED_TO_JE")
//     return { background: "#dcfce7", color: "#166534", text: buildDayLabel("Action taken in", app.created_at, app.forward_on) };
//   if (s === "JE_VERIFIED_REPORT_UPLOADED")
//     return { background: "#fef3c7", color: "#92400e", text: buildDayLabel("Pending since", app.site_visit_report_upload_on) };
//   if (s === "APPLICATION_APPROVED")
//     return { background: "#dcfce7", color: "#166534", text: buildDayLabel("Action taken in", app.site_visit_report_upload_on, app.approved_on) };
//   return { background: "#e2e8f0", color: "#475569", text: "—" };
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
const getReceivedDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (status === "APPLICATION_SUBMITTED") {
    return app.created_at || null;
  }
  return app.update_on || app.created_at || null;
};

const getActionTakenDate = (app) => {
  const status = String(app.application_status || "").toUpperCase();
  if (status === "APPLICATION_REJECTED")        return app.update_on ?? app.rejected_on ?? null;
  if (status === "CONNECTION_DETAILS_UPDATED")  return app.update_on ?? null;
  return null;
};

// getSiteVisitReportUrl imported from ../api/api

const filterApplications = (applications, { search = "", statusFilter = "all" }) => {
  const q = search.toLowerCase();
  return applications.filter((app) => {
    const matchesSearch =
      !q ||
      app.application_id?.toLowerCase().includes(q) ||
      app.organisation_name?.toLowerCase().includes(q) ||
      app.block?.toLowerCase().includes(q) ||
      app.village?.toLowerCase().includes(q) ||
      app.name?.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      String(app.application_status || "").toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

// ─── Page component ───────────────────────────────────────────────────────────

function CEApplicationReceivedPage({ rolePrefix = "CE" }) {
  const navigate = useNavigate();

  // Shell
  const [session,        setSession]        = useState(null);
  const [dashboardData,  setDashboardData]  = useState(null);
  const [isLoadingShell, setIsLoadingShell] = useState(true);
  const [shellError,     setShellError]     = useState("");

  // Sidebar nav
  const [activeMenuKey,   setActiveMenuKey]   = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");

  // Location dropdowns
  const [circles,   setCircles]   = useState([]);
  const [districts, setDistricts] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [blocks,    setBlocks]    = useState([]);

  const [selectedCircle,   setSelectedCircle]   = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedBlock,    setSelectedBlock]    = useState("");

  const [isLoadingCircles,   setIsLoadingCircles]   = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isLoadingBlocks,    setIsLoadingBlocks]    = useState(false);

  // Applications
  const [applications,  setApplications]  = useState([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appError,      setAppError]      = useState("");
  const [hasSubmitted,  setHasSubmitted]  = useState(false);

  // Table controls
  const [statusFilter, setStatusFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Detail / PDF
  const [detailView,   setDetailView]   = useState(null);
  const [sendingAppId, setSendingAppId] = useState("");
  const [pdfPreview,   setPdfPreview]   = useState(null);

  // Convenience flag
  const isAllCircles = selectedCircle === "ALL";

  // ── Session + dashboard init ──────────────────────────────────────────────

  useEffect(() => {
    const raw    = localStorage.getItem("officerSession");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.id) { navigate("/login", { replace: true }); return; }
    setSession(parsed);

    const init = async () => {
      try {
        const res = await fetchOfficerDashboardConfig(parsed.id);
        setDashboardData(res.data);
      } catch (err) {
        setShellError(err.response?.data?.error || "Unable to load dashboard.");
      } finally {
        setIsLoadingShell(false);
      }
    };
    init();
  }, [navigate]);

  // ── Load circles mapped to this CE user ───────────────────────────────────

  useEffect(() => {
    if (!dashboardData?.user?.circle_code) return;

    const fetch = async () => {
      setIsLoadingCircles(true);
      try {
        const mappedCodes = dashboardData.user.circle_code
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean);

        const res        = await fetchCircles();
        const allCircles = res.data || [];
        const filtered   = allCircles.filter((c) =>
          mappedCodes.includes(String(c.circle_code).trim().toUpperCase())
        );

        setCircles(filtered);

        // Auto-select if only one circle is mapped
        if (filtered.length === 1) setSelectedCircle(filtered[0].circle_code);
      } catch (err) {
        //console.error(err);
      } finally {
        setIsLoadingCircles(false);
      }
    };
    fetch();
  }, [dashboardData]);

  // ── Cascade: circle → districts ──────────────────────────────────────────

  const handleCircleChange = useCallback(async (e) => {
    const val = e.target.value;
    setSelectedCircle(val);
    setSelectedDistrict(""); setSelectedDivision(""); setSelectedBlock("");
    setDistricts([]); setDivisions([]); setBlocks([]);
    setApplications([]); setHasSubmitted(false); setAppError("");

    // "ALL" or empty → no cascade
    if (!val || val === "ALL") return;

    setIsLoadingDistricts(true);
    try   { setDistricts(await loadDistricts(val)); }
    catch (err) { console.error(err); }
    finally { setIsLoadingDistricts(false); }
  }, []);

  // ── Cascade: district → divisions ────────────────────────────────────────

  const handleDistrictChange = useCallback(async (e) => {
    const val = e.target.value;
    setSelectedDistrict(val);
    setSelectedDivision(""); setSelectedBlock("");
    setDivisions([]); setBlocks([]);
    setApplications([]); setHasSubmitted(false); setAppError("");

    if (!val) return;
    setIsLoadingDivisions(true);
    try   { setDivisions(await loadDivisions(val)); }
    catch (err) { console.error(err); }
    finally { setIsLoadingDivisions(false); }
  }, []);

  // ── Cascade: division → blocks ────────────────────────────────────────────

  const handleDivisionChange = useCallback(async (e) => {
    const val = e.target.value;
    setSelectedDivision(val);
    setSelectedBlock("");
    setBlocks([]);
    setApplications([]); setHasSubmitted(false); setAppError("");

    if (!val) return;
    setIsLoadingBlocks(true);
    try   { setBlocks(await loadBlocks(val)); }
    catch (err) { console.error(err); }
    finally { setIsLoadingBlocks(false); }
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!isAllCircles && !selectedBlock) return;
    if (!session?.id) return;

    setIsLoadingApps(true);
    setAppError(""); setApplications([]); setDetailView(null);
    setSearch(""); setStatusFilter("all");

    try {
      // Empty string → backend All path (scoped to CE's mapped circles)
      const blockParam = isAllCircles ? "" : selectedBlock;
      const data = await loadApplications(session.id, blockParam);
      setApplications(data);
      setHasSubmitted(true);
    } catch (err) {
      //console.error("Applications load failed:", err.response?.data || err);
      setAppError(err.response?.data?.error || "Failed to load applications.");
      setHasSubmitted(true);
    } finally {
      setIsLoadingApps(false);
    }
  }, [isAllCircles, selectedBlock, session?.id]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setSelectedCircle(""); setSelectedDistrict(""); setSelectedDivision(""); setSelectedBlock("");
    setDistricts([]); setDivisions([]); setBlocks([]);
    setApplications([]); setHasSubmitted(false); setAppError("");
    setSearch(""); setStatusFilter("all"); setDetailView(null);
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    const r = await Swal.fire({ title: "Logout?", text: "Do you want to logout?", icon: "warning", showCancelButton: true, confirmButtonText: "OK", cancelButtonText: "Cancel", reverseButtons: true });
    if (!r.isConfirmed) return;
    try { if (session?.id) await logoutOfficer({ userId: session.id }); } catch {}
    finally { localStorage.removeItem("officerSession"); navigate("/login"); }
  };

  // ── Sidebar nav ───────────────────────────────────────────────────────────

  const handleMenuClick = (key) => {
    if (key === activeMenuKey) { setActiveMenuKey(""); setActiveOptionKey(""); return; }
    setActiveMenuKey(key); setActiveOptionKey("");
  };

  const handleOptionClick = (option) => {
    const url   = String(option.url   || "").toLowerCase();
    const label = String(option.label || "").toLowerCase();
    setActiveOptionKey(option.key); setDetailView(null);
    if (url === "/createuser"          || label === "create user")          navigate("/se-dashboard");
    if (url === "/applicationreceived" || label === "application received") { handleReset(); navigate("/ce-application-received"); }
  };

  // ── Row actions ───────────────────────────────────────────────────────────

  const handleSendToJe = async (app) => {
    const c = await Swal.fire({ title: "Forward application?", text: `Forward to ${app.block} JE?`, icon: "question", showCancelButton: true, confirmButtonText: "OK", cancelButtonText: "Cancel", reverseButtons: true });
    if (!c.isConfirmed) return;
    setSendingAppId(app.application_id);
    try {
      await forwardToJE(app.application_id);
      setApplications((cur) => cur.map((i) => i.application_id === app.application_id ? { ...i, application_status: "APPLICATION_FORWARDED_TO_JE" } : i));
      if (detailView?.application_id === app.application_id) setDetailView(null);
      await Swal.fire({ title: "Forwarded", text: "Application forwarded to JE.", icon: "success", confirmButtonText: "OK" });
    } catch (err) {
      await Swal.fire({ title: "Failed", text: err.response?.data?.error || "Unable to forward.", icon: "error", confirmButtonText: "OK" });
    } finally { setSendingAppId(""); }
  };

  const handleApprove = async (app) => {
    const c = await Swal.fire({ title: "Approve application?", text: `Approve "${app.application_id}"?`, icon: "question", showCancelButton: true, confirmButtonText: "OK", cancelButtonText: "Cancel", reverseButtons: true });
    if (!c.isConfirmed) return;
    setSendingAppId(app.application_id);
    try {
      const res = await approveApplication(app.application_id);
      const approvedOn = res.data?.data?.approved_on ?? new Date().toISOString();
      setApplications((cur) => cur.map((i) => i.application_id === app.application_id ? { ...i, application_status: "APPLICATION_APPROVED", approved_on: approvedOn } : i));
      await Swal.fire({ title: "Approved", text: "Application approved.", icon: "success", confirmButtonText: "OK" });
    } catch (err) {
      await Swal.fire({ title: "Failed", text: err.response?.data?.error || "Unable to approve.", icon: "error", confirmButtonText: "OK" });
    } finally { setSendingAppId(""); }
  };

  const renderDocumentLink = (app, documentType, label = "View File") => {
    if (!app?.[documentType]) return "NA";
    const url = getOrganisationDocumentUrl(app.application_id, documentType);
    return (
      <button onClick={() => setPdfPreview({ url, title: label })}
        style={{ background: "none", border: "none", color: "#2563eb", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "inherit", fontWeight: "inherit" }}>
        {label}
      </button>
    );
  };

  // ── Shell guards ──────────────────────────────────────────────────────────

  if (isLoadingShell) return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-loading"><LoaderCircle size={28} className="officer-dashboard-loading__icon" /><span>Loading dashboard...</span></div>
    </div>
  );

  if (shellError || !dashboardData) return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-error">
        <h2>Dashboard unavailable</h2><p>{shellError || "Unable to load dashboard data."}</p>
        <button type="button" className="officer-dashboard-logout" onClick={handleLogout}><LogOut size={18} /> Back to Login</button>
      </div>
    </div>
  );

  const { user, dashboard } = dashboardData;
  const menus        = dashboard.navigation?.menus || [];
  const activeMenu   = menus.find((m) => m.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((o) => o.key === activeOptionKey) || null;
  const filtered     = filterApplications(applications, { search, statusFilter });

  const canSubmit = isAllCircles || !!selectedBlock;

  // ── Detail view ───────────────────────────────────────────────────────────

  const mainContent = detailView ? (
    <div className="ce-detail-section">
      <button className="ce-detail-back-btn" onClick={() => setDetailView(null)}>← Back to Applications</button>
      <div className="ce-detail-header">
        <div className="ce-detail-header__label">APPLICATION DETAILS</div>
        <span className="ce-detail-header__id">{detailView.application_id}</span>
      </div>
      <div className="ce-detail-grid">
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
          <Row label="Connection Type"           value={detailView.type_of_connection} />
          <Row label="Water Requirement (L/Day)" value={detailView.water_requirement ? `${detailView.water_requirement} L/Day` : null} />
        </SectionBox>
        <SectionBox title="Site Visit Report">
          <Row label="Site Visit Report" value={
            detailView.site_visit_report
              ? <button onClick={() => setPdfPreview({ url: getSiteVisitReportUrl(detailView.application_id), title: "Site Visit Report" })}
                  style={{ background: "none", border: "none", color: "#2563eb", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "inherit", fontWeight: "inherit" }}>
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
    </div>
  ) : (
    <>
      {/* ── Filter Panel ── */}
      <div className="ce-filter-panel">
        <div className="ce-filter-panel__title"><Filter size={16} />Select Location to View Applications</div>

        <div className="ce-filter-grid">
          {/* Circle — includes "All Circles" option */}
          <div className="ce-filter-field">
            <label>Circle</label>
            <select value={selectedCircle} onChange={handleCircleChange} disabled={isLoadingCircles}>
              <option value="">{isLoadingCircles ? "Loading circles…" : "Select circle"}</option>
              {/* "All Circles" option — CE scope: only their mapped circles */}
              <option value="ALL">— All Circles —</option>
              {circles.map((c) => (
                <option key={c.circle_code} value={c.circle_code}>{c.circle_name}</option>
              ))}
            </select>
          </div>

          {/* District — disabled when "All Circles" */}
          <div className="ce-filter-field">
            <label>District</label>
            <select value={selectedDistrict} onChange={handleDistrictChange}
              disabled={isAllCircles || !selectedCircle || isLoadingDistricts}>
              <option value="">
                {isAllCircles ? "N/A (All Circles)" : !selectedCircle ? "Select circle first" : isLoadingDistricts ? "Loading districts…" : "Select district"}
              </option>
              {!isAllCircles && districts.map((d) => (
                <option key={d.district_code} value={d.district_code}>{d.district_name}</option>
              ))}
            </select>
          </div>

          {/* Division — disabled when "All Circles" */}
          <div className="ce-filter-field">
            <label>Division</label>
            <select value={selectedDivision} onChange={handleDivisionChange}
              disabled={isAllCircles || !selectedDistrict || isLoadingDivisions}>
              <option value="">
                {isAllCircles ? "N/A (All Circles)" : !selectedDistrict ? "Select district first" : isLoadingDivisions ? "Loading divisions…" : "Select division"}
              </option>
              {!isAllCircles && divisions.map((d) => (
                <option key={d.division_code} value={d.division_code}>{d.division_name}</option>
              ))}
            </select>
          </div>

          {/* Block — disabled when "All Circles" */}
          <div className="ce-filter-field">
            <label>Block</label>
            <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)}
              disabled={isAllCircles || !selectedDivision || isLoadingBlocks}>
              <option value="">
                {isAllCircles ? "N/A (All Circles)" : !selectedDivision ? "Select division first" : isLoadingBlocks ? "Loading blocks…" : "Select block"}
              </option>
              {!isAllCircles && blocks.map((b) => (
                <option key={b.block_code} value={b.block_code}>{b.block_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button className="ce-filter-submit" onClick={handleSubmit} disabled={!canSubmit || isLoadingApps}>
            {isLoadingApps
              ? <><LoaderCircle size={14} className="ce-spin" /> Loading…</>
              : <><Search size={14} /> View Applications</>}
          </button>
          {hasSubmitted && (
            <button className="ce-filter-reset" onClick={handleReset}><RotateCcw size={13} /> Reset</button>
          )}
        </div>
      </div>

      {/* ── Applications Table ── */}
      <div className="ce-table-section">
        {!hasSubmitted ? (
          <div className="ce-prompt-box">
            <Filter size={40} />
            <strong>Select a location to view applications</strong>
            <p>Choose "All Circles" to see all applications in your assigned circles, or drill down to a specific block.</p>
          </div>
        ) : isLoadingApps ? (
          <div className="ce-loading-inline"><LoaderCircle size={20} className="ce-spin" /><span>Loading applications…</span></div>
        ) : appError ? (
          <div style={{ padding: "24px", color: "#c0392b" }}>{appError}</div>
        ) : (
          <>
            <div className="ce-table-header">
              <div className="ce-table-header__left">
                <FileText size={19} />
                  <h2>{rolePrefix} Application Received</h2>

                <span className="ce-count-badge">{filtered.length}</span>
              </div>
              <div className="ce-table-controls">
               <select className="ce-status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
                <div className="ce-search-wrap">
                  <Search size={14} />
                  <input className="ce-search-input" type="text" placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="ce-table-wrap">
              <table className="ce-table">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map((col) => (
                      <th key={col.label} style={{ width: `${col.width}px`, maxWidth: `${col.width}px` }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr className="ce-state-row"><td colSpan={11}>No applications found.</td></tr>
                  ) : (
                    filtered.map((app) => {
                      const actionMeta = getActionStatusMeta(app);
                      return (
                        <tr key={app.application_id}>
                          <td>
                            <span className="ce-app-id-chip" onClick={() => setDetailView(app)}
                              style={{ background: "#fef3c7", color: "#92400e", borderRadius: "6px", padding: "4px 10px", fontWeight: "600", fontFamily: "monospace", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>
                              {app.application_id}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, color: "#1e293b" }}>{app.organisation_name || "—"}</td>
                          <td>{app.block   || "—"}</td>
                          <td>{app.village || "—"}</td>
                          <td>{app.name    || "—"}</td>
                          <td>
                            <span className="ce-pill" style={{ background: app.type_of_connection === "Single Tap" ? "#dcfce7" : "#dbeafe", color: app.type_of_connection === "Single Tap" ? "#166534" : "#1e40af" }}>
                              {app.type_of_connection || "—"}
                            </span>
                          </td>
                          <td><span className="ce-pill" style={getApplicationStatusStyle(app.application_status)}>{formatApplicationStatus(app.application_status)}</span></td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDisplayDate(getReceivedDate(app))}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDisplayDate(getActionTakenDate(app)) || "—"}</td>
                          <td><span className="ce-pill" style={{ background: actionMeta.background, color: actionMeta.color }}>{actionMeta.text}</span></td>
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );

  // ── Full shell ────────────────────────────────────────────────────────────

  return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-shell">
        <aside className="officer-dashboard-sidebar">
          <div className="officer-dashboard-sidebar__brand">
            <div className="officer-dashboard-brand__icon"><Droplet size={22} /></div>
            <div><span>DBRAP Portal</span><strong>{user.roleName || "Officer"} Workspace</strong></div>
          </div>
          <nav className="officer-dashboard-nav">
            <div className="officer-dashboard-nav__group">
              <button type="button" className="officer-dashboard-nav__item" onClick={() => navigate("/dashboard")}>
                <div className="officer-dashboard-nav__item-copy"><Users size={18} /><span>Dashboard</span></div>
              </button>
            </div>
            {menus.map((item) => {
              const isActive = item.key === activeMenuKey;
              return (
                <div key={item.key} className="officer-dashboard-nav__group">
                  <button type="button" className={`officer-dashboard-nav__item${isActive ? " is-active" : ""}`} onClick={() => handleMenuClick(item.key)}>
                    <div className="officer-dashboard-nav__item-copy"><Users size={18} /><span>{item.label}</span></div>
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
            <div className="officer-dashboard-header__copy"><h1>Application Received</h1></div>
            <div className="officer-dashboard-user">
              <div><span>Logged in as</span><strong>{user.loginId}</strong></div>
              <button type="button" className="officer-dashboard-logout" onClick={handleLogout}><LogOut size={18} />Logout</button>
            </div>
          </header>
          {mainContent}
        </main>
      </div>

      {pdfPreview && (
        <div className="pv-preview-overlay">
          <div className="pv-preview-card">
            <div className="pv-preview-header">
              <h2 className="pv-preview-header__title">{pdfPreview.title}</h2>
              <div className="pv-preview-header__actions">
                <a href={pdfPreview.url} download className="pv-preview-btn-download" target="_blank" rel="noreferrer"><Download size={14} />Download PDF</a>
                <button className="pv-preview-btn-close" onClick={() => setPdfPreview(null)} title="Close Preview"><X size={18} /></button>
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

export default CEApplicationReceivedPage;
