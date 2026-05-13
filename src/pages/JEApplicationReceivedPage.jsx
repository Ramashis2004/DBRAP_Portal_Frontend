import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  LoaderCircle,
  LogOut,
  Users,
} from "lucide-react";
import {
  fetchOfficerDashboardConfig,
  logoutOfficer,
} from "../api/api";
import { ForwardedApplicationsTable } from "./JEDashboardPage";
import "./OfficerDashboardPage.css";

function JEApplicationReceivedPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeMenuKey, setActiveMenuKey] = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
const [tableKey, setTableKey] = useState(0);

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
        setIsLoading(false);
      }
    };

    initialize();
  }, [navigate]);

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
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("officerSession");
      navigate("/login");
    }
  };

  // const handleMenuClick = (menuKey) => {
  //   const activeMenu = menus.find((item) => item.key === menuKey) || null;
  //   const menuLabel = String(activeMenu?.label || "").toLowerCase();

  //   if (menuLabel === "application management") {
  //     navigate("/je-dashboard");
  //     return;
  //   }

  //   if (menuKey === activeMenuKey) {
  //     setActiveMenuKey("");
  //     setActiveOptionKey("");
  //     return;
  //   }

  //   setActiveMenuKey(menuKey);
  //   setActiveOptionKey("");
  // };
const handleMenuClick = (menuKey) => {

  // Application Management stays here
  if (menuKey === activeMenuKey) {
    setActiveMenuKey("");
    setActiveOptionKey("");
    return;
  }

  setActiveMenuKey(menuKey);
  setActiveOptionKey("");
};
  const handleOptionClick = (option) => {
    const optionUrl = String(option.url || "").toLowerCase();
    const optionLabel = String(option.label || "").toLowerCase();

    setActiveOptionKey(option.key);
  setTableKey(k => k + 1); // ✅ forces table remount, clears detailView

    if (optionUrl === "/createuser" || optionLabel === "create user") {
      navigate("/je-dashboard");
      return;
    }

    if (optionUrl === "/applicationreceived" || optionLabel === "application received") {
      navigate("/je-application-received");
    }
 // ✅ ADD THIS
  // if (optionUrl.includes("payment") || optionLabel === "payment details") {
  //   navigate("/je-payment-details");
  //   return;
  // }

  if (optionUrl.includes("paymentverification") || optionLabel.includes("payment verification")) {
  navigate("/je-payment-verification");
  return;
}

if (optionUrl.includes("updateConnectionDetails") || optionLabel.includes("update connection details")) {
  navigate("/je-update-connection");
  return;
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
  const menus = dashboard.navigation?.menus || [];
  const activeMenu = menus.find((item) => item.key === activeMenuKey) || null;
  const activeOption = activeMenu?.options.find((item) => item.key === activeOptionKey) || null;

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
    onClick={() => navigate("/je-dashboard")}
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

          <section style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
            <ForwardedApplicationsTable
              key={tableKey}   
              userId={session?.id}
              applicationStatus="APPLICATION_FORWARDED_TO_JE"
              actionMode="upload"
            />
          </section>
        </main>
      </div>
    </div>
  );
}

export default JEApplicationReceivedPage;
