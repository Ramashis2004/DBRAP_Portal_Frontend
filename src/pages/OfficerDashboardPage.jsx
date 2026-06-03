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
} from "lucide-react";
import {
  createOfficerUser,
  fetchBlocksByDivision,
  fetchCircles,
  fetchDistrictsByCircle,
  fetchDivisionsByDistrict,
  fetchOfficerDashboardConfig,
  logoutOfficer,
  fetchCEPendingSummary,
  fetchCEPendingByDivision,
  fetchCEPendingApplicationsByDivision,
  fetchCEPendingApplicationHistory,
  fetchEICPendingSummary,
  fetchEICPendingByDivision,
  fetchEICPendingApplicationsByDivision,
  fetchEICPendingApplicationHistory,
} from "../api/api";
import { PendingPieChart } from "../components/PendingPieChart";
import SLAConfigPage from "./SLAConfigPage";

import "./OfficerDashboardPage.css";
import {
  CEDashboardApplicationCountCard,
  CEDashboardApplicationsDrilldown,
} from "../components/CEDashboardApplications";
import { CEDashboardOverduePieChart } from "../components/Cedashboardoverduepiechart";
import {
  EICDashboardApplicationCountCard,
  EICDashboardApplicationsDrilldown,
  EICDashboardOverduePieChart,
} from "../components/EICDashboardApplications";

const initialCreateUserForm = {
  userTypeId: "",
  subTypeId: "",
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

// ─── Subtype circle helpers (CE users) ───────────────────────────────────────

const getSubtypeCircleCodes = (subType) => {
  const rawValue =
    subType?.circle_codes ??
    subType?.circle_code ??
    subType?.mapped_circle_codes ??
    subType?.mapped_circle_code ??
    subType?.circle_mapping ??
    subType?.mapped_circle ??
    "";

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(rawValue)
    .split(",")
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const getSubtypeCircleNames = (subType) => {
  const rawValue =
    subType?.circle_names ??
    subType?.circle_name ??
    subType?.mapped_circle_names ??
    subType?.mapped_circle_name ??
    "";

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(rawValue)
    .split(",")
    .map((item) => String(item).trim())
    .filter(Boolean);
};

// ─── Subtype division helpers (non-CE users) ──────────────────────────────────

const getSubtypeDivisionCodes = (subType) => {
  const rawDivisionValue =
    subType?.division_codes ??
    subType?.division_code ??
    subType?.mapped_division_codes ??
    subType?.mapped_division_code ??
    subType?.division_mapping ??
    subType?.mapped_division ??
    "";

  if (Array.isArray(rawDivisionValue)) {
    return rawDivisionValue.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(rawDivisionValue)
    .split(",")
    .map((item) => String(item).trim())
    .filter(Boolean);
};

// ─────────────────────────────────────────────────────────────────────────────

const validateCreateUserForm = (formData) => {
  const errors = {};

  if (!formData.userTypeId) {
    errors.userTypeId = "Please select a user type.";
  }

  if (formData.requiresSubTypeSelection && !formData.subTypeId) {
    errors.subTypeId = "Please select a subtype.";
  }

  if (formData.isEicUserType) {
    // EIC users are created without circle/district/division/block mapping.
  } else if (formData.isMappedCircleUserType) {
    // For CE/ACE users, circleCode is auto-filled from subtype; validate it exists
    if (!formData.circleCode) {
      errors.circleCode = "Circle mapping is unavailable for the selected subtype.";
    }
  } else {
    // For non-CE users, all location fields are required
    if (!formData.circleCode) {
      errors.circleCode = "Please select a circle.";
    }

    if (!formData.districtCode) {
      errors.districtCode = "Please select a district.";
    }

    if (!formData.divisionCode) {
      errors.divisionCode = "Please select a division.";
    }
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

function OfficerDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeMenuKey, setActiveMenuKey] = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [showCreateUserHint, setShowCreateUserHint] = useState(true);
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
  const [showCEDashboardApplications, setShowCEDashboardApplications] = useState(false);
const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const loadDashboard = async (userId, preserveMenuState = false) => {
    const response = await fetchOfficerDashboardConfig(userId);
    setDashboardData(response.data);

    if (!preserveMenuState) {
      setActiveMenuKey("");
      setActiveOptionKey("");
    }

    return response.data;
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
    if (!formMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setFormMessage("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [formMessage]);

  useEffect(() => {
    if (!showCreateUserHint) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setShowCreateUserHint(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [showCreateUserHint]);

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
    } finally {
      localStorage.removeItem("officerSession");
      navigate("/login");
    }
  };
useEffect(() => {
  const channel = new BroadcastChannel("officer_session");
  channel.onmessage = (event) => {
    if (event.data?.type === "FORCE_LOGOUT") {
      // Get the CURRENT session at time of message, not stale closure
      const currentSession = JSON.parse(localStorage.getItem("officerSession") || "null");
      // Only logout if we still have the OLD session (new tab already set new session)
      if (!currentSession || event.data?.userId === currentSession?.id) {
        localStorage.removeItem("officerSession");
        navigate("/login", { replace: true });
      }
    }
  };
  return () => channel.close();
}, [navigate]);
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
  const subTypes = dashboard.masterData?.subTypes || [];
  const activeMenu = menus.find((item) => item.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((item) => item.key === activeOptionKey) || null;
  const shouldShowCreateUserForm =
    activeOption?.url?.toLowerCase() === "/createuser" ||
    activeOption?.label?.toLowerCase() === "create user";

    const shouldShowSLAConfig =
  activeOption?.url?.toLowerCase() === "/slaconfig" ||
  activeOption?.label?.toLowerCase() === "sla config";
  
  const isLoggedInCE = String(user.roleName || user.loginId || "").trim().toUpperCase().startsWith("CE");
  const isLoggedInEIC = String(user.roleName || user.loginId || "").trim().toUpperCase() === "EIC";
  const isLoggedInACE = String(user.roleName || user.loginId || "").trim().toUpperCase().startsWith("ACE");

  const dashboardTitle = isLoggedInCE
    ? "CE Dashboard"
    : isLoggedInEIC
      ? "State Dashboard"
      : isLoggedInACE
      ? "ACE Dashboard"
      : "Officer Dashboard";

  // ── Derived form state ──────────────────────────────────────────────────────
  const selectedUserType =
    userTypes.find((ut) => String(ut.id) === String(createUserForm.userTypeId)) || null;
  const selectedSubTypes = subTypes.filter(
    (st) => String(st.type_id) === String(selectedUserType?.id)
  );
  const selectedUserTypeName = selectedUserType?.type_name?.toUpperCase() || "";
  const requiresSubTypeSelection = ["CE", "ACE"].includes(selectedUserTypeName);
  const isMappedCircleUserType = requiresSubTypeSelection;
  const isEicUserType = selectedUserTypeName === "EIC";
  const requiresLocationSelection = Boolean(selectedUserType) && !isMappedCircleUserType && !isEicUserType;
  const requiresBlockSelection = selectedUserTypeName === "JE";

  const selectedSubType =
    selectedSubTypes.find((st) => String(st.id) === String(createUserForm.subTypeId)) || null;

  // CE/ACE users: show auto-filled circle from subtype master
  const selectedSubTypeCircleCodes = isMappedCircleUserType ? getSubtypeCircleCodes(selectedSubType) : [];
  const selectedSubTypeCircleNames = isMappedCircleUserType ? getSubtypeCircleNames(selectedSubType) : [];
  const selectedSubTypeCircleLabel =
    selectedSubTypeCircleNames.length > 0
      ? selectedSubTypeCircleNames.join(", ")
      : selectedSubTypeCircleCodes.length > 0
        ? selectedSubTypeCircleCodes.join(", ")
        : "";

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMenuClick = (menuKey) => {
    if (menuKey === activeMenuKey) {
      setActiveMenuKey("");
      setActiveOptionKey("");
      return;
    }

    setActiveMenuKey(menuKey);
    setActiveOptionKey("");
  };

  const handleOptionClick = (option) => {
    const optionUrl = String(option.url || "").trim().toLowerCase();
    const optionLabel = String(option.label || "").trim().toLowerCase();

    setShowCEDashboardApplications(false);
    setActiveOptionKey(option.key);

    // if (optionUrl === "/applicationreceived" || optionLabel === "application received") {
    //   const roleName = String(user.roleName || user.loginId || "").trim().toUpperCase();
    //   navigate(roleName === "EIC" ? "/eic-application-received" : "/ce-application-received");
    //   return;
    // }

    if (optionUrl === "/applicationreceived" || optionLabel === "application received") {
  const roleName = String(user.roleName || user.loginId || "").trim().toUpperCase();
  if (roleName === "EIC") navigate("/eic-application-received");
  else if (roleName.startsWith("ACE")) navigate("/ace-application-received");  // ← add
  else navigate("/ce-application-received");
  return;
}

    if (optionUrl === "/createuser" || optionLabel === "create user") {
      return;
    }
if (optionUrl === "/slaconfig" || optionLabel === "sla config") {
  return; // render inline, don't navigate
}
    if (optionUrl) {
      navigate(optionUrl);
    }
  };

  const handleCreateUserFormChange = (event) => {
    const { name, value } = event.target;
    const isChangingUserType = name === "userTypeId";
    const isChangingSubType = name === "subTypeId";

    const nextUserType = isChangingUserType
      ? userTypes.find((ut) => String(ut.id) === String(value))
      : selectedUserType;
    const nextIsMappedCircleUserType = ["CE", "ACE"].includes(nextUserType?.type_name?.toUpperCase());

    setFormMessage("");
    setFormErrors((current) => ({
      ...current,
      [name]: "",
      ...(isChangingUserType
        ? { subTypeId: "", circleCode: "", districtCode: "", divisionCode: "", blockCode: "" }
        : {}),
      ...(isChangingSubType ? { circleCode: "" } : {}),
    }));

    setCreateUserForm((current) => ({
      ...current,
      [name]: value,
      ...(isChangingUserType
        ? {
            subTypeId: "",
            circleCode: "",
            districtCode: "",
            divisionCode: "",
            blockCode: "",
          }
        : {}),
      ...(isChangingSubType
        ? {
            // For CE/ACE: auto-fill circleCode from the selected subtype's mapped circles
            circleCode: nextIsMappedCircleUserType
              ? getSubtypeCircleCodes(
                  subTypes.find((st) => String(st.id) === String(value)) || null
                ).join(",")
              : current.circleCode,
            divisionCode: nextIsMappedCircleUserType
              ? ""
              : getSubtypeDivisionCodes(
                  subTypes.find((st) => String(st.id) === String(value)) || null
                ).join(","),
            districtCode: nextIsMappedCircleUserType ? "" : current.districtCode,
            blockCode: "",
          }
        : {}),
    }));

    if (isChangingUserType) {
      setBlocks([]);
      setDistricts([]);
      setDivisions([]);
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
      isEicUserType,
      isMappedCircleUserType,
      requiresSubTypeSelection,
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

  // ── Render ──────────────────────────────────────────────────────────────────

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
                onClick={() => {
                  setActiveMenuKey("");
                  setActiveOptionKey("");
                  setShowCEDashboardApplications(false);
                  navigate("/dashboard");
                }}
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
              <h1>{dashboardTitle}</h1>
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

              {!shouldShowCreateUserForm && !showCEDashboardApplications ? (
            <section className="officer-dashboard-stats ce-dashboard-stats">

              {/* ── Count card ── */}
              {isLoggedInCE ? (
                <CEDashboardApplicationCountCard
                  userId={user.id}
                  onOpen={() => {
                    setActiveMenuKey("");
                    setActiveOptionKey("");
                    setShowCEDashboardApplications(true);
                  }}
                />
              ) : null}

              {isLoggedInEIC ? (
                <EICDashboardApplicationCountCard
                  userId={user.id}
                  onOpen={() => {
                    setActiveMenuKey("");
                    setActiveOptionKey("");
                    setShowCEDashboardApplications(true);
                  }}
                />
              ) : null}

              {/* ── CE: Overdue + Pending side by side ── */}
              {isLoggedInCE ? (
                <div className="ce-dashboard-charts-row officer-dashboard-charts-wide">
                  <CEDashboardOverduePieChart userId={user.id} />
                  <PendingPieChart
                    userId={user.id}
                    titlePrefix="CE"
                    fetchPendingSummary={fetchCEPendingSummary}
                    fetchPendingByDivision={fetchCEPendingByDivision}
                    fetchApplicationsByDivision={fetchCEPendingApplicationsByDivision}
                    fetchApplicationHistory={fetchCEPendingApplicationHistory}
                  />
                </div>
              ) : null}

              {/* ── EIC: Overdue + Pending side by side ── */}
              {isLoggedInEIC ? (
                <div className="ce-dashboard-charts-row officer-dashboard-charts-wide">
                  <EICDashboardOverduePieChart userId={user.id} />
                  <PendingPieChart
                    userId={user.id}
                    titlePrefix="EIC"
                    fetchPendingSummary={fetchEICPendingSummary}
                    fetchPendingByDivision={fetchEICPendingByDivision}
                    fetchApplicationsByDivision={fetchEICPendingApplicationsByDivision}
                    fetchApplicationHistory={fetchEICPendingApplicationHistory}
                  />
                </div>
              ) : null}

{isLoggedInACE ? (
  <CEDashboardApplicationCountCard
    userId={user.id}
    onOpen={() => {
      setActiveMenuKey("");
      setActiveOptionKey("");
      setShowCEDashboardApplications(true);
    }}
  />
) : null}

{isLoggedInACE ? (
  <div className="ce-dashboard-charts-row officer-dashboard-charts-wide">
    <CEDashboardOverduePieChart userId={user.id} />
    <PendingPieChart
      userId={user.id}
      titlePrefix="ACE"
      fetchPendingSummary={fetchCEPendingSummary}
      fetchPendingByDivision={fetchCEPendingByDivision}
      fetchApplicationsByDivision={fetchCEPendingApplicationsByDivision}
      fetchApplicationHistory={fetchCEPendingApplicationHistory}
    />
  </div>
) : null}

            </section>
          ) : null}


          {showCEDashboardApplications && isLoggedInCE ? (
            <CEDashboardApplicationsDrilldown
              userId={user.id}
              onClose={() => setShowCEDashboardApplications(false)}
            />
          ) : null}

          {showCEDashboardApplications && isLoggedInEIC ? (
            <EICDashboardApplicationsDrilldown
              userId={user.id}
              onClose={() => setShowCEDashboardApplications(false)}
            />
          ) : null}
{showCEDashboardApplications && isLoggedInACE ? (
  <CEDashboardApplicationsDrilldown
    userId={user.id}
    onClose={() => setShowCEDashboardApplications(false)}
  />
) : null}
          {shouldShowCreateUserForm ? (
            <section className="officer-dashboard-form-section officer-dashboard-form-section--full">
              <div className="officer-dashboard-form-card">
                <div className="officer-dashboard-form-card__header">
                  <div className="officer-dashboard-form-card__icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3>Create User</h3>
                    <p>Fill in the officer details to create a new user account.</p>
                  </div>
                </div>

                <form className="officer-dashboard-form" onSubmit={handleCreateUserSubmit}>
                  {showCreateUserHint ? (
                    <p className="officer-dashboard-form__hint">
                      Login ID will be generated automatically. For JE users, it will be saved as
                      JE{`<block_code>`}{`<serial_no>`} like JE363901. For CE and ACE users, subtype
                      wise mapped circle will be filled automatically from the subtype master. ACE
                      login IDs will be saved as ACE{`<subtype_serial>`}{`<serial_no>`} like ACE0101.
                      For AEE users, it will be saved as
                      AEE{`<district_code>`}{`<division_serial>`}{`<serial_no>`} like AEE3090101. Password will be created automatically
                      and sent to the entered mobile number.
                    </p>
                  ) : null}

                  {/* ── User Type ─────────────────────────────────────────── */}
                  <label className="officer-dashboard-form__field">
                    <span>User Type</span>
                    <select
                      name="userTypeId"
                      value={createUserForm.userTypeId}
                      onChange={handleCreateUserFormChange}
                      className={formErrors.userTypeId ? "has-error" : ""}
                      required
                    >
                      <option value="">Select user type</option>
                      {userTypes.map((ut) => (
                        <option key={ut.id} value={ut.id}>
                          {ut.type_name}
                        </option>
                      ))}
                    </select>
                    {formErrors.userTypeId ? (
                      <span className="officer-dashboard-form__error">{formErrors.userTypeId}</span>
                    ) : null}
                  </label>

                  {/* ── Subtype (CE/ACE only) ─────────────────────────────── */}
                  {requiresSubTypeSelection ? (
                    <label className="officer-dashboard-form__field">
                      <span>Subtype</span>
                      <select
                        name="subTypeId"
                        value={createUserForm.subTypeId}
                        onChange={handleCreateUserFormChange}
                        className={formErrors.subTypeId ? "has-error" : ""}
                        required
                      >
                        <option value="">Select subtype</option>
                        {selectedSubTypes.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.sub_type_name}
                          </option>
                        ))}
                      </select>
                      {formErrors.subTypeId ? (
                        <span className="officer-dashboard-form__error">{formErrors.subTypeId}</span>
                      ) : null}
                    </label>
                  ) : null}

                  {/* ── Circle ────────────────────────────────────────────── */}
                  {isMappedCircleUserType ? (
                    // CE/ACE: auto-filled read-only circle from subtype master
                    <label className="officer-dashboard-form__field">
                      <span>Circle</span>
                      <input
                        type="text"
                        value={
                          selectedSubTypeCircleLabel ||
                          (selectedSubTypeCircleCodes.length > 0
                            ? selectedSubTypeCircleCodes.join(", ")
                            : "Select subtype to auto-fill circle")
                        }
                        readOnly
                        disabled
                      />
                      {formErrors.circleCode ? (
                        <span className="officer-dashboard-form__error">{formErrors.circleCode}</span>
                      ) : null}
                    </label>
                  ) : requiresLocationSelection ? (
                    // Non-CE: user selects circle from dropdown
                    <label className="officer-dashboard-form__field">
                      <span>Circle</span>
                      <select
                        name="circleCode"
                        value={createUserForm.circleCode}
                        onChange={handleCreateUserCircleChange}
                        className={formErrors.circleCode ? "has-error" : ""}
                        disabled={isLoadingCircles}
                        required
                      >
                        <option value="">
                          {isLoadingCircles ? "Loading circles..." : "Select circle"}
                        </option>
                        {circles.map((circle) => (
                          <option key={circle.circle_code} value={circle.circle_code}>
                            {circle.circle_name}
                          </option>
                        ))}
                      </select>
                      {formErrors.circleCode ? (
                        <span className="officer-dashboard-form__error">{formErrors.circleCode}</span>
                      ) : null}
                    </label>
                  ) : null}

                  {/* ── District (non-CE only) ────────────────────────────── */}
                  {requiresLocationSelection ? (
                    <label className="officer-dashboard-form__field">
                      <span>District</span>
                      <select
                        name="districtCode"
                        value={createUserForm.districtCode}
                        onChange={handleCreateUserDistrictChange}
                        className={formErrors.districtCode ? "has-error" : ""}
                        disabled={!createUserForm.circleCode || isLoadingDistricts}
                        required
                      >
                        <option value="">
                          {!createUserForm.circleCode
                            ? "Select circle first"
                            : isLoadingDistricts
                              ? "Loading districts..."
                              : "Select district"}
                        </option>
                        {districts.map((district) => (
                          <option key={district.district_code} value={district.district_code}>
                            {district.district_name}
                          </option>
                        ))}
                      </select>
                      {formErrors.districtCode ? (
                        <span className="officer-dashboard-form__error">{formErrors.districtCode}</span>
                      ) : null}
                    </label>
                  ) : null}

                  {/* ── Division (non-CE only) ────────────────────────────── */}
                  {requiresLocationSelection ? (
                    <label className="officer-dashboard-form__field">
                      <span>Division</span>
                      <select
                        name="divisionCode"
                        value={createUserForm.divisionCode}
                        onChange={handleCreateUserDivisionChange}
                        className={formErrors.divisionCode ? "has-error" : ""}
                        disabled={!createUserForm.districtCode || isLoadingDivisions}
                        required
                      >
                        <option value="">
                          {!createUserForm.districtCode
                            ? "Select district first"
                            : isLoadingDivisions
                              ? "Loading divisions..."
                              : "Select division"}
                        </option>
                        {divisions.map((division) => (
                          <option key={division.division_code} value={division.division_code}>
                            {division.division_name}
                          </option>
                        ))}
                      </select>
                      {formErrors.divisionCode ? (
                        <span className="officer-dashboard-form__error">{formErrors.divisionCode}</span>
                      ) : null}
                    </label>
                  ) : null}

                  {/* ── Block (JE only) ───────────────────────────────────── */}
                  {requiresBlockSelection ? (
                    <label className="officer-dashboard-form__field">
                      <span>Block</span>
                      <select
                        name="blockCode"
                        value={createUserForm.blockCode}
                        onChange={handleCreateUserFormChange}
                        className={formErrors.blockCode ? "has-error" : ""}
                        disabled={!createUserForm.divisionCode || isLoadingBlocks}
                        required
                      >
                        <option value="">
                          {!createUserForm.divisionCode
                            ? "Select division first"
                            : isLoadingBlocks
                              ? "Loading blocks..."
                              : "Select block"}
                        </option>
                        {blocks.map((block) => (
                          <option key={block.block_code} value={block.block_code}>
                            {block.block_name}
                          </option>
                        ))}
                      </select>
                      {formErrors.blockCode ? (
                        <span className="officer-dashboard-form__error">{formErrors.blockCode}</span>
                      ) : null}
                    </label>
                  ) : null}

                  {/* ── Name ──────────────────────────────────────────────── */}
                  <label className="officer-dashboard-form__field">
                    <span>Name</span>
                    <input
                      type="text"
                      name="userName"
                      value={createUserForm.userName}
                      onChange={handleCreateUserFormChange}
                      className={formErrors.userName ? "has-error" : ""}
                      placeholder="Enter full name"
                      required
                    />
                    {formErrors.userName ? (
                      <span className="officer-dashboard-form__error">{formErrors.userName}</span>
                    ) : null}
                  </label>

                  {/* ── Designation ───────────────────────────────────────── */}
                  <label className="officer-dashboard-form__field">
                    <span>Designation</span>
                    <input
                      type="text"
                      name="designation"
                      value={createUserForm.designation}
                      onChange={handleCreateUserFormChange}
                      className={formErrors.designation ? "has-error" : ""}
                      placeholder="Enter designation"
                      required
                    />
                    {formErrors.designation ? (
                      <span className="officer-dashboard-form__error">{formErrors.designation}</span>
                    ) : null}
                  </label>

                  {/* ── Mobile Number ─────────────────────────────────────── */}
                  <label className="officer-dashboard-form__field">
                    <span>Mobile Number</span>
                    <input
                      type="text"
                      name="mobileNo"
                      value={createUserForm.mobileNo}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
                        handleCreateUserFormChange({
                          target: { name: "mobileNo", value: digitsOnly },
                        });
                      }}
                      className={formErrors.mobileNo ? "has-error" : ""}
                      placeholder="Enter 10-digit mobile number"
                      inputMode="numeric"
                      required
                    />
                    {formErrors.mobileNo ? (
                      <span className="officer-dashboard-form__error">{formErrors.mobileNo}</span>
                    ) : null}
                  </label>

                  {/* ── Email ID ──────────────────────────────────────────── */}
                  <label className="officer-dashboard-form__field">
                    <span>Email ID</span>
                    <input
                      type="email"
                      name="emailId"
                      value={createUserForm.emailId}
                      onChange={handleCreateUserFormChange}
                      className={formErrors.emailId ? "has-error" : ""}
                      placeholder="Enter email address"
                    />
                    {formErrors.emailId ? (
                      <span className="officer-dashboard-form__error">{formErrors.emailId}</span>
                    ) : null}
                  </label>

                  {/* ── Submit ────────────────────────────────────────────── */}
                  <div className="officer-dashboard-form__actions">
                    <button
                      type="submit"
                      className="officer-dashboard-form__submit"
                      disabled={isSubmittingUser}
                    >
                      {isSubmittingUser ? "Creating..." : "Create User"}
                    </button>
                  </div>

                  {formMessage ? (
                    <p className="officer-dashboard-form__message">{formMessage}</p>
                  ) : null}

                  {createdCredentials ? (
                    <div className="officer-dashboard-form__credentials">
                      <strong>SMS delivery failed. Use these credentials:</strong>
                      <p>Login ID: {createdCredentials.loginId}</p>
                      <p>Password: {createdCredentials.password}</p>
                    </div>
                  ) : null}
                </form>
              </div>
            </section>
          ) : null}

          {shouldShowSLAConfig ? (
  <section className="officer-dashboard-form-section officer-dashboard-form-section--full">
    <SLAConfigPage inline />
  </section>
) : null}
        </main>
      </div>
    </div>
  );
}

export default OfficerDashboardPage;
