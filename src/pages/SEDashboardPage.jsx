import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";

import {
  ChevronDown,
  ChevronRight,
  Droplet,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Users,
  Search,
  FileText,
  Send,
} from "lucide-react";
import {
  createOfficerUser,
  fetchBlocksByDivision,
  fetchCircles,
  fetchDistrictsByCircle,
  fetchDivisionsByDistrict,
  fetchOfficerDashboardConfig,
  getOfficerUsers,
  logoutOfficer,
  fetchOrganisations, // ← add this to your api.js
  updateOrganisationStatus,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
  formatDayProgress,
} from "../utils/applicationStatus";
import "./OfficerDashboardPage.css";
// At top with other imports
import PendingApplicationsPopup from "../components/PendingApplicationsPopup";
import SEStatusCards from "../components/SEStatusCards";
import  UserManualButton from "../components/UserManualButton";

import {
  SEDashboardApplicationCountCard,
  SEDashboardApplicationsTable,
} from "../components/SEDashboardApplications";

// Inside SEDashboardPage function, with other useState:

// Inside initializeDashboard, add setDashboardReady(true) on success:
const initializeDashboard = async () => {
  try {
    await loadDashboard(parsedSession.id);
    setDashboardReady(true);  // ← ADD THIS LINE
  } catch (error) {
    setErrorMessage(error.response?.data?.error || "Unable to load dashboard.");
  } finally {
    setIsLoading(false);
  }
};



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

const validateCreateUserForm = (formData) => {
  const errors = {};
  if (!formData.userTypeId) errors.userTypeId = "Please select a user type.";
  if (!formData.circleCode) errors.circleCode = "Please select a circle.";
  if (!formData.districtCode) errors.districtCode = "Please select a district.";
  if (!formData.divisionCode) errors.divisionCode = "Please select a division.";
  if (formData.requiresBlockSelection && !formData.blockCode) errors.blockCode = "Please select a block.";
  if (!formData.userName.trim()) errors.userName = "Please enter the user's name.";
  else if (!USER_NAME_REGEX.test(formData.userName.trim())) errors.userName = "Name must be 2-80 characters and contain valid letters only.";
  if (!formData.designation.trim()) errors.designation = "Please enter a designation.";
  else if (!DESIGNATION_REGEX.test(formData.designation.trim())) errors.designation = "Designation must be 2-80 characters and contain valid text.";
  if (!formData.mobileNo.trim()) errors.mobileNo = "Please enter a mobile number.";
  else if (!MOBILE_REGEX.test(formData.mobileNo.trim())) errors.mobileNo = "Mobile number must be a valid 10-digit Indian mobile number.";
  if (formData.emailId.trim() && !EMAIL_REGEX.test(formData.emailId.trim())) errors.emailId = "Please enter a valid email address.";
  return errors;
};

// ─── Application Received Table ───────────────────────────────────────────────
function ApplicationReceivedTable() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailView, setDetailView] = useState(null); // ← new: full detail tab
  const [sendingAppId, setSendingAppId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchOrganisations();
        setApplications(response.data);
      } catch (err) {
        setError("Failed to load applications.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const submittedApplications = applications.filter(
    (app) => String(app.application_status || "").toUpperCase() === "APPLICATION_SUBMITTED"
  );

  const filtered = submittedApplications.filter((app) => {
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

  const getActionStatusMeta = (app) => {
    const status = String(app.application_status || "").toUpperCase();
    const referenceDate =
      status === "APPLICATION_FORWARDED_TO_JE"
        ? app.forward_on || app.forwardOn || app.created_at || app.createdAt
        : status === "JE_VERIFIED_REPORT_UPLOADED"
          ? app.site_visit_report_upload_on || app.siteVisitReportUploadOn || app.created_at || app.createdAt
          : status === "APPLICATION_APPROVED"
            ? app.approved_on || app.approvedOn || app.site_visit_report_upload_on || app.siteVisitReportUploadOn || app.created_at || app.createdAt
            : app.created_at || app.createdAt;

    if (status === "APPLICATION_SUBMITTED") {
      return {
        background: "#fef3c7",
        color: "#92400e",
        text: formatDayProgress("Pending since", referenceDate),
      };
    }

    if (status === "APPLICATION_FORWARDED_TO_JE") {
      return {
        background: "#dcfce7",
        color: "#166534",
        text: formatDayProgress("Pending since", referenceDate),
      };
    }

    if (status === "JE_VERIFIED_REPORT_UPLOADED") {
      return {
        background: "#fef3c7",
        color: "#92400e",
        text: formatDayProgress("Pending since", referenceDate),
      };
    }

    if (status === "APPLICATION_APPROVED") {
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

  const getReceivedDate = (app) => app.site_visit_report_upload_on || app.siteVisitReportUploadOn || null;

  const handleSendToJe = async (app) => {
    const confirmation = await Swal.fire({
      title: "Forward application?",
      text: "Do you want to forward application to " + app.block + " JE for site visit?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setSendingAppId(app.application_id);

    try {
      await updateOrganisationStatus(app.application_id, "APPLICATION_FORWARDED_TO_JE");
      setApplications((current) => current.filter((item) => item.application_id !== app.application_id));
      if (detailView?.application_id === app.application_id) {
        setDetailView(null);
      }
      await Swal.fire({
        title: "Forwarded",
        text: "Application has been forwarded to " + app.block + " JE for site visit.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
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

  // ─── Full Detail Panel ─────────────────────────────────────────────────────
  if (detailView) {
    const app = detailView;
    const fields = [
      ["Application ID",    app.application_id],
      ["Organisation Name", app.organisation_name],
      ["Establishment Type",app.establishment_type],
      ["Applicant Name",    app.name],
      ["Gender",            app.gender],
      ["Email",             app.email],
      ["Mobile",            app.mobile_number],
      ["District",          app.district],
      ["Block",             app.block],
      ["Gram Panchayat",    app.gram_panchayat],
      ["Village",           app.village],
      ["Habitation",        app.habitation],
      ["Connection Type",   app.type_of_connection],
      ["Water Requirement", app.water_requirement ? `${app.water_requirement} L/Day` : null],
      ["Application Received", formatDisplayDate(getReceivedDate(app))],
      ["Application Status", formatApplicationStatus(app.application_status)],
    ];

    return (
      <div style={{ width: "100%", boxSizing: "border-box" }}>
        {/* Back button */}
        <button
          onClick={() => setDetailView(null)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "none", border: "1px solid #e2e8f0", borderRadius: "8px",
            padding: "7px 14px", fontSize: "0.82rem", fontWeight: 600,
            color: "#475569", cursor: "pointer", marginBottom: "20px"
          }}
        >
          ← Back to Applications
        </button>

        {/* Header card */}
        <div style={{
          background: "#1e293b", borderRadius: "12px",
          padding: "24px 28px", marginBottom: "20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "12px"
        }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500, letterSpacing: "0.06em" }}>
              APPLICATION DETAILS
            </p>
            <span style={{
              background: "#fef3c7", color: "#92400e", borderRadius: "6px",
              padding: "4px 12px", fontWeight: 700, fontSize: "1rem",
              fontFamily: "monospace"
            }}>
              {app.application_id}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.75rem", color: "#94a3b8" }}>Connection Type</p>
              <span style={{
                background: app.type_of_connection === "Single Tap" ? "#dcfce7" : "#dbeafe",
                color: app.type_of_connection === "Single Tap" ? "#166534" : "#1e40af",
                borderRadius: "999px", padding: "4px 14px", fontSize: "0.82rem", fontWeight: 700
              }}>
                {app.type_of_connection || "—"}
              </span>
            </div>
          </div>

        {/* Detail grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "12px"
        }}>
          {fields.map(([label, value]) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "10px",
              border: "1px solid #e2e8f0", padding: "14px 18px"
            }}>
              <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 600,
                color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>
                {value || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Table View ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "40px", color: "#666" }}>
        <LoaderCircle size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span>Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: "24px", color: "#c0392b" }}>{error}</div>;
  }

  return (
    <div style={{ width: "100%" }}>
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
            padding: "2px 10px", fontSize: "0.78rem", fontWeight: 600
          }}>
            {filtered.length}
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "50%",
            transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px",
              border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem",
              outline: "none", width: "220px", background: "#fff", color: "#1e293b"
            }}
          />
        </div>
      </div>

      {/* Table */}
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
                  padding: "12px 14px", textAlign: "left", fontWeight: 600,
                  fontSize: "0.78rem", letterSpacing: "0.04em", whiteSpace: "nowrap"
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
                  No applications found.
                </td>
              </tr>
            ) : (
              filtered.map((app, index) => (
                <tr
                  key={app.application_id}
                  style={{
                    background: index % 2 === 0 ? "#fff" : "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fef9f0"}
                  onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? "#fff" : "#f8fafc"}
                >
                  {/* ← Clickable Application ID */}
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    <span
                      onClick={() => setDetailView(app)}
                      style={{
                        background: "#fef3c7", color: "#92400e", borderRadius: "6px",
                        padding: "3px 8px", fontWeight: 600, fontSize: "0.78rem",
                        fontFamily: "monospace", cursor: "pointer",
                        textDecoration: "underline", textDecorationStyle: "dotted",
                        textUnderlineOffset: "2px"
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
                      borderRadius: "999px", padding: "3px 10px",
                      fontSize: "0.75rem", fontWeight: 600
                    }}>
                      {app.type_of_connection || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      ...getApplicationStatusStyle(app.application_status),
                      borderRadius: "999px",
                      padding: "3px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}>
                      {formatApplicationStatus(app.application_status)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>
                    {formatDisplayDate(getReceivedDate(app))}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      ...getActionStatusMeta(app),
                      borderRadius: "999px",
                      padding: "3px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}>
                      {getActionStatusMeta(app).text}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleSendToJe(app)}
                        disabled={sendingAppId === app.application_id}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          background: sendingAppId === app.application_id ? "#94a3b8" : "#166534",
                          color: "#fff", border: "none",
                          borderRadius: "6px", padding: "6px 12px", fontSize: "0.78rem",
                          fontWeight: 600, cursor: sendingAppId === app.application_id ? "not-allowed" : "pointer"
                        }}
                      >
                        <Send size={13} />
                        Send
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ─── Main Dashboard ────────────────────────────────────────────────────────────
function SEDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
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
  const [showDashboardApplications, setShowDashboardApplications] = useState(false);
const [dashboardReady, setDashboardReady] = useState(false);
const [statusFilter, setStatusFilter] = useState("all");

  const loadDashboard = async (userId, preserveMenuState = false) => {
    const response = await fetchOfficerDashboardConfig(userId);
    setDashboardData(response.data);
    if (!preserveMenuState) {
      setActiveMenuKey("");
      setActiveOptionKey("");
    }
    return response.data;
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await getOfficerUsers();
      setUsers(response.data.users);
    } catch (error) {
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
              setDashboardReady(true);  // ← THIS IS THE CRITICAL FIX

      } catch (error) {
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
    if (!result.isConfirmed) return;
    try {
      if (session?.id) await logoutOfficer({ userId: session.id });
    } catch (error) {
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
  const popupSession = {
    ...session,
    loginId: user.loginId || session?.loginId || session?.login_id,
    login_id: user.loginId || session?.login_id || session?.loginId,
  };
  const menus = dashboard.navigation?.menus || [];
  const userTypes = dashboard.masterData?.userTypes || [];
  const activeMenu = menus.find((item) => item.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((item) => item.key === activeOptionKey) || null;

  const shouldShowCreateUserForm =
    activeOption?.url?.toLowerCase() === "/createuser" ||
    activeOption?.label?.toLowerCase() === "create user";

  // ✅ Detect "Application Received" option
  const shouldShowApplicationTable =
    activeOption?.url?.toLowerCase() === "/applicationreceived" ||
    activeOption?.label?.toLowerCase() === "application received";

  const selectedUserType = userTypes.find((userType) => String(userType.id) === String(createUserForm.userTypeId)) || null;
  const requiresBlockSelection = selectedUserType?.type_name?.toUpperCase() === "JE";

  const handleMenuClick = (menuKey) => {

  // open Application Management only
  if (menuKey === activeMenuKey) {
    setActiveMenuKey("");
    setActiveOptionKey("");
    return;
  }

  setActiveMenuKey(menuKey);
  setActiveOptionKey("");
};

 const handleOptionClick = (option) => {
  setShowDashboardApplications(false);
  setActiveOptionKey(option.key);

  const optionUrl   = String(option.url   || "").toLowerCase();
  const optionLabel = String(option.label || "").toLowerCase();

  if (optionUrl === "/createuser" || optionLabel === "create user") {
    // stays on dashboard, shows form
    return;
  }

  if (optionUrl === "/applicationreceived" || optionLabel === "application received") {
    navigate("/se-application-received");
    return;
  }

  if (
    optionUrl.includes("pendingforwardtoje") ||
    optionLabel.includes("pending for forward")
  ) {
    navigate("/se-pending-forward-to-je");   // ← ADD THIS
    return;
  }

  if (
    optionUrl.includes("pendingapproval") ||
    optionLabel.includes("pending for approval")
  ) {
    navigate("/se-pending-approval");         // ← ADD THIS
    return;
  }

  if (optionUrl.includes("payment") || optionLabel === "payment details") {
    navigate("/se-payment-details");
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
      ...(isChangingUserType && !nextRequiresBlockSelection ? { blockCode: "" } : {}),
    }));
    setCreateUserForm((current) => ({
      ...current,
      [name]: value,
      ...(isChangingUserType && !nextRequiresBlockSelection ? { blockCode: "" } : {}),
    }));
    if (isChangingUserType && !nextRequiresBlockSelection) setBlocks([]);
  };

  const handleCreateUserCircleChange = async (event) => {
    const { value } = event.target;
    setFormMessage("");
    setFormErrors((current) => ({ ...current, circleCode: "", districtCode: "", divisionCode: "", blockCode: "" }));
    setCreateUserForm((current) => ({ ...current, circleCode: value, districtCode: "", divisionCode: "", blockCode: "" }));
    setDistricts([]); setDivisions([]); setBlocks([]);
    if (!value) return;
    setIsLoadingDistricts(true);
    try {
      const response = await fetchDistrictsByCircle(value);
      setDistricts(response.data);
    } catch (error) {
      setFormMessage("Unable to load districts for the selected circle.");
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const handleCreateUserDistrictChange = async (event) => {
    const { value } = event.target;
    setFormMessage("");
    setFormErrors((current) => ({ ...current, districtCode: "", divisionCode: "", blockCode: "" }));
    setCreateUserForm((current) => ({ ...current, districtCode: value, divisionCode: "", blockCode: "" }));
    setDivisions([]); setBlocks([]);
    if (!value) return;
    setIsLoadingDivisions(true);
    try {
      const response = await fetchDivisionsByDistrict(value);
      setDivisions(response.data);
    } catch (error) {
      setFormMessage("Unable to load divisions for the selected district.");
    } finally {
      setIsLoadingDivisions(false);
    }
  };

  const handleCreateUserDivisionChange = async (event) => {
    const { value } = event.target;
    setFormMessage("");
    setFormErrors((current) => ({ ...current, divisionCode: "", blockCode: "" }));
    setCreateUserForm((current) => ({ ...current, divisionCode: value, blockCode: "" }));
    setBlocks([]);
    if (!value || !requiresBlockSelection) return;
    setIsLoadingBlocks(true);
    try {
      const response = await fetchBlocksByDivision(value);
      setBlocks(response.data);
    } catch (error) {
      setFormMessage("Unable to load blocks for the selected division.");
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const handleCreateUserSubmit = async (event) => {
    event.preventDefault();
    setFormMessage("");
    const validationErrors = validateCreateUserForm({ ...createUserForm, requiresBlockSelection });
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setCreatedCredentials(null);
      setFormMessage("Please correct the highlighted fields.");
      return;
    }
    setIsSubmittingUser(true);
    try {
      const response = await createOfficerUser({ ...createUserForm, createdBy: session?.loginId || session?.id || null });
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
      setDistricts([]); setDivisions([]); setBlocks([]);
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
    className={`officer-dashboard-nav__item ${!activeMenuKey ? "is-active" : ""}`}
    onClick={() => {
      setActiveMenuKey("");
      setActiveOptionKey("");
      setShowDashboardApplications(false);
      navigate("/se-dashboard");   // Back to dashboard
    }}
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
                          className={`officer-dashboard-nav__option${option.key === activeOption?.key ? " is-active" : ""}`}
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
              <h1>SE/EE Dashboard</h1>
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
          

          {/* Default stats — hide when a panel is active */}
         {!shouldShowCreateUserForm && !shouldShowApplicationTable && !showDashboardApplications ? (
  <section
 className="officer-dashboard-stats se-dashboard-stats"
 style={{
    display:"flex",
    justifyContent:"center",
    width:"100%",
    overflowX:"auto",
    padding:"24px"
 }}
>
    <SEStatusCards
      userId={user.id}
      /* Clicking a status card opens the full table filtered to that status */
      onCardClick={(item) => {
        setStatusFilter(item.status);
        setShowDashboardApplications(true);
        setActiveMenuKey("");
        setActiveOptionKey("");
      }}
      /* Clicking the total card opens the full unfiltered table */
      onTotalClick={() => {
        setStatusFilter("all");
        setShowDashboardApplications(true);
        setActiveMenuKey("");
        setActiveOptionKey("");
      }}
    />
  </section>
) : null}

{showDashboardApplications ? (
  <SEDashboardApplicationsTable
    userId={user.id}
    initialStatusFilter={statusFilter}
    onBack={() => {
      setShowDashboardApplications(false);
      setStatusFilter("all");
    }}
  />
) : null}

          {/* Create User Form */}
          {shouldShowCreateUserForm ? (
            <section className="officer-dashboard-form-section officer-dashboard-form-section--full">
              {/* your existing create user form UI here */}
            </section>
          ) : null}

          {/* ✅ Application Received Table */}
          {shouldShowApplicationTable ? (
            <section style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
              <ApplicationReceivedTable />
            </section>
          ) : null}

          {/* {showDashboardApplications ? (
            <SEDashboardApplicationsTable
              userId={user.id}
              onBack={() => setShowDashboardApplications(false)}
            />
          ) : null} */}

          <PendingApplicationsPopup
            session={popupSession}
            dashboardReady={dashboardReady}
          />
        </main>


      </div>
    </div>
  );
}

export default SEDashboardPage;

