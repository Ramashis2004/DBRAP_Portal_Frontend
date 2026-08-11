import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { secureStorage } from "../main";
import { ArrowLeft, Lock, LogIn, User, Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";
import { loginOfficer } from "../api/api";
import "./OfficerLoginPage.css";
const SAFE_UI = Object.freeze({
    LOGIN: "Login",
    OFFICER_LOGIN:
        "Use your officer credentials to access the internal dashboard.",
    USERNAME: "Officer ID / Username",
    PASSWORD: "Password"
});
const getOfficerDashboardPath = (user) => {
  const roleName = String(user?.roleName || "").trim().toUpperCase();
  const userTypeId = Number(user?.userTypeId);

  if (roleName === "SE" || userTypeId === 2) return "/se-dashboard";
  if (roleName === "AEE") return "/aee-dashboard";
  if (roleName === "JE" || userTypeId === 4) return "/je-dashboard";

  return "/dashboard";
};

function OfficerLoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    localStorage.removeItem("officerSession");
    localStorage.removeItem("applicantSession");
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage("");
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openDashboard = (user, token) => {
    const sessionData = JSON.stringify({
      id: user.id,
      username: user.loginId,
      loginId: user.loginId,
      login_id: user.loginId,
      name: user.name,
      roleName: user.roleName,
      userTypeId: user.userTypeId,
      passwordChangeRequired: Boolean(user.passwordChangeRequired),
      loginTime: new Date().toISOString(),
      token: token,
    });

    localStorage.setItem(
      "officerSession",
      secureStorage.encrypt(sessionData)
    );

    navigate(user.passwordChangeRequired ? "/change-password" : getOfficerDashboardPath(user));
  };
const broadcastLogout = (userId) => {
  const channel = new BroadcastChannel("officer_session");
  channel.postMessage({ type: "FORCE_LOGOUT", userId });
  channel.close();
};
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const username = formData.username.trim();
      const password = formData.password.trim();

      if (!username || !password) {
        setErrorMessage("Please enter both user ID and password.");
        return;
      }

      const response = await loginOfficer({ username, password });
      if (response.data?.passwordChangeRequired) {
        navigate("/change-password", {
          state: {
            username: response.data.username,
            role: "officer",
          },
        });
        return;
      }
      openDashboard(response.data.user, response.data.token);
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.code === "ALREADY_LOGGED_IN") {
        const result = await Swal.fire({
          title: "Already logged in",
          text: error.response.data.error || "This login ID is already logged in. Do you want to logout there and login here?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "OK",
          cancelButtonText: "Cancel",
          reverseButtons: true,
        });

        if (result.isConfirmed) {
          try {
            const retryResponse = await loginOfficer({
              username: formData.username.trim(),
              password: formData.password.trim(),
              forceLogin: true,
            });

            if (retryResponse.data?.passwordChangeRequired) {
              navigate("/change-password", {
                state: {
                  username: retryResponse.data.username,
                  role: "officer",
                },
              });
              return;
            }

            openDashboard(retryResponse.data.user, retryResponse.data.token);
            broadcastLogout(retryResponse.data.user.id); // ← ADD
            
          } catch (retryError) {
            setErrorMessage(retryError.response?.data?.error || "Login failed. Please try again.");
          }
        }
        return;
      }

      setErrorMessage(error.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="officer-login-page">
      <div className="officer-login-shell">
        <section className="officer-login-hero">
          <Link to="/" className="officer-login-back">
            <ArrowLeft size={18} />
            Back to home
          </Link>

          {/* <div className="officer-login-brand">
            <div className="officer-login-brand__icon">
              <Droplet size={24} />
            </div>
            <span>DBRAP PORTAL</span>
          </div> */}

          {/* <div className="officer-login-copy">
            <p className="officer-login-badge">
              <ShieldCheck size={16} />
              Government Officer Access
            </p>
            <h1>Officer Login</h1>
            <p>
              Sign in to review applications, track field verification, and manage
              approvals across the water connection workflow.
            </p>
          </div> */}

          <div className="officer-login-highlights">
            <div>
              <strong>Role-based access</strong>
              <span>Secure entry for authorized field and approval officers.</span>
            </div>
            <div>
              <strong>Workflow visibility</strong>
              <span>Monitor application status, escalations, and pending actions.</span>
            </div>
            <div>
              <strong>Fast processing</strong>
              <span>Move applications forward with clear operational context.</span>
            </div>
          </div>
        </section>

        <section className="officer-login-card">
          <div className="officer-login-card__header">
            <h3>{SAFE_UI.LOGIN}</h3>
            <p>{SAFE_UI.OFFICER_LOGIN}</p>
          </div>

          <form onSubmit={handleSubmit} className="officer-login-form">
            <label className="officer-login-field">
              <span>{SAFE_UI.USERNAME}</span>
              <div className="officer-login-input">
                <User size={18} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter officer username"
                  required
                />
              </div>
            </label>

            <label className="officer-login-field">
  <span>{SAFE_UI.PASSWORD}</span>

  <div className="officer-login-input">
    <Lock size={18} />

    <input
      type={showPassword ? "text" : "password"}
      name="password"
      value={formData.password}
      onChange={handleChange}
      placeholder="Enter password"
      required
    />

   <button
    type="button"
    className="password-eye-icon"
    onClick={() => setShowPassword(prev => !prev)}
    aria-label={showPassword ? "Hide password" : "Show password"}
>
    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
</button>

  </div>
</label>
<div className="officer-login-forgot">
  <Link to="/forgot-password">Forgot Password?</Link>
</div>
            {errorMessage ? <p className="officer-login-error">{errorMessage}</p> : null}

            <button type="submit" className="officer-login-submit" disabled={isSubmitting}>
              <LogIn size={18} />
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default OfficerLoginPage;

