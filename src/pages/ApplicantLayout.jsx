import { useEffect, useMemo, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  Home,
  LogOut,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import { logoutOfficer,fetchApplicantNavigation} from "../api/api";
import "./ApplicantDashboardPage.css";

function ApplicantLayout() {
  const navigate = useNavigate();
  const [activeMenuKey, setActiveMenuKey] = useState("");
  const [activeOptionKey, setActiveOptionKey] = useState("");
  const [menus, setMenus] = useState([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const applicantSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("applicantSession") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!applicantSession?.id) {
      navigate("/applicant-login", { replace: true });
    }
  }, [applicantSession, navigate]);

  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const response = await fetchApplicantNavigation(applicantSession?.roleId || 7);
        setMenus(response.data?.menus || []);
      } catch (error) {
       // console.error("Applicant navigation load failed:", error);
        setMenus([]);
      }
    };
    if (applicantSession?.id) {
      loadNavigation();
    }
  }, [applicantSession]);

  const handleDashboardClick = () => {
    setActiveMenuKey("");
    setActiveOptionKey("");
    navigate("/applicant-dashboard");
  };

  const handleMenuClick = (menuKey) => {
    setActiveMenuKey((current) => (current === menuKey ? "" : menuKey));
    setActiveOptionKey("");
  };

  const handleOptionClick = (option) => {
  setActiveOptionKey(option.key);
  const normalizedLabel = String(option.label || "").toLowerCase();
  const normalizedUrl   = String(option.url   || "").toLowerCase();

  if (normalizedLabel === "apply for water connection") {
    navigate("/applicant-organisation-registration");
    return;
  }

  // ✅ Catch payment details regardless of what URL is stored in DB
  if (normalizedLabel.includes("payment") || normalizedUrl.includes("payment")) {
    navigate("/applicant-payment");
    return;
  }

  // Fallback
  if (option.url) {
    navigate(option.url);
  }
};

  

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
    if (applicantSession?.id) {
      await logoutOfficer({ userId: applicantSession.id }); // or your applicant logout API
    }
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    localStorage.removeItem("applicantSession"); // ✅ correct key
    navigate("/applicant-login");                // ✅ correct route
  }
};
  if (!applicantSession?.id) return null;

  return (
    <div className="applicant-dashboard-page">
      <div className="applicant-dashboard-shell">
        <aside className="applicant-dashboard-sidebar">
          <div className="applicant-dashboard-sidebar__brand">
            <div className="applicant-dashboard-brand__icon">
              <Droplet size={22} />
            </div>
            <div>
              <span>DBRAP Portal</span>
              <strong>Applicant Workspace</strong>
            </div>
          </div>

          <nav className="applicant-dashboard-nav">
            <div className="applicant-dashboard-nav__group">
              <button
                type="button"
                className={`applicant-dashboard-nav__item ${!activeMenuKey ? "is-active" : ""}`}
                onClick={handleDashboardClick}
              >
                <div className="applicant-dashboard-nav__item-copy">
                  <Home size={18} />
                  <span>Dashboard</span>
                </div>
              </button>
            </div>

            {menus.map((menu) => {
              const isActive = menu.key === activeMenuKey;
              const filteredOptions = menu.options.filter(
                (option) => String(option.label || "").toLowerCase() !== "apply connection"
              );
              return (
                <div key={menu.key} className="applicant-dashboard-nav__group">
                  <button
                    type="button"
                    className={`applicant-dashboard-nav__item${isActive ? " is-active" : ""}`}
                    onClick={() => handleMenuClick(menu.key)}
                  >
                    <div className="applicant-dashboard-nav__item-copy">
                      <Users size={18} />
                      <span>{menu.label}</span>
                    </div>
                    {isActive ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {isActive && filteredOptions.length > 0 ? (
                    <div className="applicant-dashboard-nav__options">
                      {filteredOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={`applicant-dashboard-nav__option${
                            option.key === activeOptionKey ? " is-active" : ""
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

          <div className="applicant-dashboard-sidebar__footer">
            <p>Logged in as</p>
            <button
              type="button"
              className="applicant-dashboard-sidebar__user-button"
              onClick={() => setIsUserMenuOpen((current) => !current)}
            >
              <strong>{applicantSession.name || applicantSession.mobileNo}</strong>
              {isUserMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isUserMenuOpen ? (
              <button
                type="button"
                className="applicant-dashboard-sidebar__user-option"
                onClick={() => navigate("/change-password")}
              >
                Change Password
              </button>
            ) : null}
            <span>Applicant</span>
          </div>
        </aside>

        <main className="applicant-dashboard-main">
          <header className="applicant-dashboard-header">
            <div className="applicant-dashboard-header__copy">
              <h1>Applicant Dashboard</h1>
            </div>
            <div className="applicant-dashboard-user">
              <div>
                <span>Logged in as</span>
                <strong>{applicantSession.id}</strong>
              </div>
              <button type="button" className="applicant-dashboard-logout" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </header>

          {/* Child routes render here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ApplicantLayout;
