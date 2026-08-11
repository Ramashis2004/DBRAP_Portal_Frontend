import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  Search,
  Pencil,
  X,
  LoaderCircle,
} from "lucide-react";

import {
  fetchOfficerDashboardConfig,
  logoutOfficer,
  fetchJEPaymentBlocks,
  fetchConnectionApplications,
  submitConnectionDetails,
} from "../api/api";

import "./OfficerDashboardPage.css";
import "./JEUpdateConnectionPage.css";
import  UserManualButton from "../components/UserManualButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initialForm = {
  typeOfConnectionRwss: "",
  nameOfProject: "",
  tappingPoint: "",
  meterId: "",
  initialMeterReading: "",
  meterMake: "",
};

const tableColumns = [
  { label: "Application ID",    width: 150 },
  { label: "Organisation Name", width: 190 },
  { label: "Block",             width: 110 },
  { label: "Village",           width: 120 },
  { label: "Applicant Name",    width: 160 },
  { label: "Connection Type",   width: 140 },
  { label: "Action",            width: 130 },
];

// ─── Component ────────────────────────────────────────────────────────────────

function JEUpdateConnectionPage() {
  const navigate = useNavigate();

  const [session,       setSession]       = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [blocks,        setBlocks]        = useState([]);
  const [applications,  setApplications]  = useState([]);
  const [loadingApps,   setLoadingApps]   = useState(false);
  const [isLoadingShell,setIsLoadingShell]= useState(true);
  const [search,        setSearch]        = useState("");
  const [activeMenuKey, setActiveMenuKey] = useState("");
  const [activeOptionKey,setActiveOptionKey]=useState("");

  // Modal state
  const [modalApp,   setModalApp]   = useState(null); // selected app
  const [form,       setForm]       = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const user  = dashboardData?.user;
  const menus = dashboardData?.dashboard?.navigation?.menus || [];
  const assignedBlock = blocks[0] || null;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Derived from modal app
  const connectionType = String(modalApp?.type_of_connection || "").toLowerCase().trim();
  const isSingleTap    = connectionType === "single tap";

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw    = localStorage.getItem("officerSession");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.id) { navigate("/login"); return; }
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

        if (loadedBlocks.length) {
          await loadApplications(loadedBlocks[0].block_code);
        }
      } catch (err) {
        //console.error("INIT ERROR:", err);
        Swal.fire("Error", "Failed to load page data. Please refresh.", "error");
      } finally {
        setIsLoadingShell(false);
      }
    };

    init();
  }, [navigate]);

  // ─── Load applications ─────────────────────────────────────────────────────
  const loadApplications = async (blockCode) => {
    setLoadingApps(true);
    try {
      const appRes = await fetchConnectionApplications(blockCode);
      const list   = Array.isArray(appRes.data?.data) ? appRes.data.data : [];
      setApplications(list);
    } catch (err) {
      //console.error("Failed to load applications:", err);
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  const handleMenuClick   = (menuKey) => setActiveMenuKey(menuKey === activeMenuKey ? "" : menuKey);
  const handleOptionClick = (option) => {
    const label = option.label.toLowerCase();
    if (label.includes("application"))          navigate("/je-application-received");
    if (label.includes("payment verification")) navigate("/je-payment-verification");
    if (label.includes("connection"))           navigate("/je-update-connection");
    setActiveOptionKey(option.key);
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    const res = await Swal.fire({
      title: "Logout?",
      text: "Do you want to logout from this account?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;
    await logoutOfficer({ userId: session.id });
    localStorage.removeItem("officerSession");
    navigate("/login");
  };

  // ─── Open modal ────────────────────────────────────────────────────────────
  const openModal = (app) => {
    setModalApp(app);
    setForm(initialForm);
  };

  const closeModal = () => {
    setModalApp(null);
    setForm(initialForm);
  };

  // ─── Form field change ─────────────────────────────────────────────────────
  const handleFieldChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modalApp) return;

    // Validation
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

    // Capture block code before we close the modal (which clears modalApp)
    const blockCode = assignedBlock?.block_code || blocks[0]?.block_code;

    const payload = {
      applicationId:        modalApp.application_id,
      typeOfConnectionRwss: isSingleTap ? "Unmetered" : form.typeOfConnectionRwss,
      nameOfProject:        form.nameOfProject   || null,
      tappingPoint:         form.tappingPoint    || null,
      meterId:              form.meterId         || null,
      initialMeterReading:  form.initialMeterReading || null,
      meterMake:            form.meterMake       || null,
      applicationStatus:    "CONNECTION_DETAILS_UPDATED",
        officerId:            session?.id || null,   

    };

    try {
      await submitConnectionDetails(payload);

      // ✅ Close modal FIRST so Swal isn't trapped behind the overlay
      closeModal();

      await Swal.fire("Success", "Connection details updated successfully!", "success");
      await loadApplications(blockCode);
    } catch (err) {
      //console.error("Submit error:", err);
      setSubmitting(false);
      Swal.fire("Error", err?.response?.data?.message || "Failed to update. Please try again.", "error");
    } finally {
      // Only runs on success path (error path sets it above before Swal)
      setSubmitting(false);
    }
  };

  // ─── Filtered rows ─────────────────────────────────────────────────────────
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

  // ─── Shell guard ───────────────────────────────────────────────────────────
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="officer-dashboard-page">
      <div className="officer-dashboard-shell">

        {/* ── SIDEBAR ── */}
        <aside className="officer-dashboard-sidebar">
          <div className="officer-dashboard-sidebar__brand">
            <div className="officer-dashboard-brand__icon"><Droplet size={22} /></div>
            <div>
              <span>DBRAP Portal</span>
              <strong>{user?.roleName || "JE"} Workspace</strong>
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
                  <ShieldCheck size={18} /><span>Dashboard</span>
                </div>
              </button>
            </div>

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
                          className={`officer-dashboard-nav__option ${option.key === activeOptionKey ? "is-active" : ""}`}
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

        {/* ── MAIN ── */}
        <main className="officer-dashboard-main">
          <header className="officer-dashboard-header">
            <div className="officer-dashboard-header__copy">
              <h1>Update Connection Details</h1>
            </div>
            <div className="officer-dashboard-user">
                            <UserManualButton /> 

              <div>
                <span>Logged in as</span>
                <strong>{user?.loginId}</strong>
              </div>
              <button type="button" className="officer-dashboard-logout" onClick={handleLogout}>
                <LogOut size={18} /> Logout
              </button>
            </div>
          </header>

          {/* ── TABLE SECTION ── */}
          <section style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>

            {/* Section header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "20px", flexWrap: "wrap", gap: "12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Settings size={20} style={{ color: "#b45309" }} />
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                  Connection Applications
                </h2>
                <span style={{
                  background: "#fef3c7", color: "#92400e", borderRadius: "999px",
                  padding: "2px 10px", fontSize: "0.78rem", fontWeight: 600,
                }}>
                  {filtered.length}
                </span>
                {assignedBlock && (
                  <span style={{
                    background: "#e0f2fe", color: "#0369a1", borderRadius: "999px",
                    padding: "2px 10px", fontSize: "0.78rem", fontWeight: 600,
                  }}>
                    Block: {assignedBlock.block_name}
                  </span>
                )}
              </div>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search size={15} style={{
                  position: "absolute", left: "10px",
                  top: "50%", transform: "translateY(-50%)", color: "#94a3b8",
                }} />
                <input
                  type="text"
                  placeholder="Search applications…"
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

            {/* Table */}
            {loadingApps ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "40px", color: "#666" }}>
                <LoaderCircle size={20} style={{ animation: "spin 1s linear infinite" }} />
                <span>Loading applications…</span>
              </div>
            ) : (
              <div style={{
                overflowX: "auto", borderRadius: "12px",
                border: "1px solid #e2e8f0", background: "#fff",
              }}>
                <table style={{
                  width: "100%", minWidth: "900px", borderCollapse: "collapse",
                  fontSize: "0.85rem", tableLayout: "fixed",
                }}>
                  <thead>
                    <tr style={{ background: "#1e293b", color: "#fff" }}>
                      {tableColumns.map((col) => (
                        <th
                          key={col.label}
                          style={{
                            width: `${col.width}px`, padding: "12px 14px",
                            textAlign: "left", fontWeight: 600,
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
                          No applications pending for connection update.
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
                          {/* Application ID */}
                          <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                            <span style={{
                              background: "#fef3c7", color: "#92400e", borderRadius: "6px",
                              padding: "3px 8px", fontWeight: 600, fontSize: "0.78rem",
                              fontFamily: "monospace",
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

                          {/* Connection Type */}
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              background: app.type_of_connection?.toLowerCase() === "single tap" ? "#dcfce7" : "#dbeafe",
                              color:      app.type_of_connection?.toLowerCase() === "single tap" ? "#166534" : "#1e40af",
                              borderRadius: "999px", padding: "3px 10px",
                              fontSize: "0.75rem", fontWeight: 600,
                            }}>
                              {app.type_of_connection || "—"}
                            </span>
                          </td>

                          {/* Action */}
                          <td style={{ padding: "12px 16px" }}>
                            <button
                              onClick={() => openModal(app)}
                              className="juc-update-btn"
                            >
                              <Pencil size={13} />
                              Update
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── UPDATE MODAL ── */}
      {modalApp && (
        <div className="juc-modal-overlay">
          <div className="juc-modal">

            {/* Modal header */}
            <div className="juc-modal__header">
              <div className="juc-modal__header-left">
                <div className="juc-modal__icon">
                  <Settings size={20} />
                </div>
                <div>
                  <p className="juc-modal__label">Update Connection Details</p>
                  <h3 className="juc-modal__title">
                    <span className="juc-modal__app-id">{modalApp.application_id}</span>
                  </h3>
                  <p className="juc-modal__subtitle">{modalApp.organisation_name}</p>
                </div>
              </div>
              <button className="juc-modal__close" onClick={closeModal} title="Close">
                <X size={18} />
              </button>
            </div>

            {/* App summary strip */}
            <div className="juc-modal__summary">
              <div className="juc-modal__summary-item">
                <span className="juc-modal__summary-label">Block</span>
                <span className="juc-modal__summary-value">{modalApp.block || "—"}</span>
              </div>
              <div className="juc-modal__summary-item">
                <span className="juc-modal__summary-label">Village</span>
                <span className="juc-modal__summary-value">{modalApp.village || "—"}</span>
              </div>
              <div className="juc-modal__summary-item">
                <span className="juc-modal__summary-label">Applicant</span>
                <span className="juc-modal__summary-value">{modalApp.name || "—"}</span>
              </div>
              <div className="juc-modal__summary-item">
                <span className="juc-modal__summary-label">Connection Type</span>
                <span
                  className="juc-modal__summary-badge"
                  style={{
                    background: isSingleTap ? "#dcfce7" : "#dbeafe",
                    color:      isSingleTap ? "#166534" : "#1e40af",
                  }}
                >
                  {modalApp.type_of_connection || "—"}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="juc-modal__form">

              {/* ── SINGLE TAP → always Unmetered ── */}
              {isSingleTap && (
                <>
                  <div className="juc-form-field">
                    <label>
                      <span>Type of Connection (RWSS)</span>
                      <input value="Unmetered" readOnly className="juc-form-input juc-form-input--readonly" />
                    </label>
                  </div>

                  <div className="juc-form-field">
                    <label>
                      <span>Name of Project <em>*</em></span>
                      <input
                        className="juc-form-input"
                        placeholder="Enter project name"
                        value={form.nameOfProject}
                        onChange={handleFieldChange("nameOfProject")}
                        required
                      />
                    </label>
                  </div>

                  <div className="juc-form-field">
                    <label>
                      <span>Tapping Point <em>*</em></span>
                      <input
                        className="juc-form-input"
                        placeholder="Enter tapping point"
                        value={form.tappingPoint}
                        onChange={handleFieldChange("tappingPoint")}
                        required
                      />
                    </label>
                  </div>
                </>
              )}

              {/* ── MULTIPLE TAP → Metered or Unmetered ── */}
              {!isSingleTap && (
                <>
                  <div className="juc-form-field">
                    <label>
                      <span>Type of Connection (RWSS) <em>*</em></span>
                      <select
                        className="juc-form-input"
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

                  {form.typeOfConnectionRwss === "Metered" && (
                    <>
                      <div className="juc-form-field">
                        <label>
                          <span>Meter ID <em>*</em></span>
                          <input
                            className="juc-form-input"
                            placeholder="Enter meter ID"
                            value={form.meterId}
                            onChange={handleFieldChange("meterId")}
                            required
                          />
                        </label>
                      </div>

                      <div className="juc-form-field">
                        <label>
                          <span>Initial Meter Reading <em>*</em></span>
                          <input
                            type="number"
                            min="0"
                            className="juc-form-input"
                            placeholder="Enter initial reading"
                            value={form.initialMeterReading}
                            onChange={handleFieldChange("initialMeterReading")}
                            required
                          />
                        </label>
                      </div>

                      <div className="juc-form-field">
                        <label>
                          <span>Meter Make <em>*</em></span>
                          <input
                            className="juc-form-input"
                            placeholder="Enter meter make / brand"
                            value={form.meterMake}
                            onChange={handleFieldChange("meterMake")}
                            required
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {form.typeOfConnectionRwss === "Unmetered" && (
                    <>
                      <div className="juc-form-field">
                        <label>
                          <span>Name of Project <em>*</em></span>
                          <input
                            className="juc-form-input"
                            placeholder="Enter project name"
                            value={form.nameOfProject}
                            onChange={handleFieldChange("nameOfProject")}
                            required
                          />
                        </label>
                      </div>

                      <div className="juc-form-field">
                        <label>
                          <span>Tapping Point <em>*</em></span>
                          <input
                            className="juc-form-input"
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

              {/* Modal actions */}
              <div className="juc-modal__actions">
                <button
                  type="button"
                  className="juc-modal__btn juc-modal__btn--cancel"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="juc-modal__btn juc-modal__btn--submit"
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Submit Connection Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default JEUpdateConnectionPage;

