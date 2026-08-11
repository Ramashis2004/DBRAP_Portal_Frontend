import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { secureStorage } from "../main";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import Swal from "sweetalert2";
import { changePassword } from "../api/api";
import "./ChangePasswordPage.css";
const SAFE_TEXT = Object.freeze({
    CURRENT_PASSWORD: "Current Password",
    NEW_PASSWORD: "New Password",
    CONFIRM_PASSWORD: "Confirm Password",
    TITLE: "Change Password"
});

const getOfficerDashboardPath = (session) => {
  const roleName = String(session?.roleName || "").trim().toUpperCase();
  const userTypeId = Number(session?.userTypeId);

  if (roleName === "SE" || userTypeId === 2) return "/se-dashboard";
  if (roleName === "AEE") return "/aee-dashboard";
  if (roleName === "JE" || userTypeId === 4) return "/je-dashboard";

  return "/dashboard";
};

const getSession = () => {
  try {
    const officerSession = JSON.parse(localStorage.getItem("officerSession") || "null");
    if (officerSession?.id) {
      return { type: "officer", storageKey: "officerSession", loginPath: "/login", dashboardPath: getOfficerDashboardPath(officerSession), data: officerSession };
    }

    const applicantSession = JSON.parse(localStorage.getItem("applicantSession") || "null");
    if (applicantSession?.id) {
      return { type: "applicant", storageKey: "applicantSession", loginPath: "/applicant-login", dashboardPath: "/applicant-dashboard", data: applicantSession };
    }
  } catch {
    return null;
  }

  return null;
};

const validatePassword = (password) => {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Add at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Add at least one lowercase letter.";
  if (!/\d/.test(password)) return "Add at least one number.";
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(password)) return "Add at least one special character.";
  return "";
};

function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const stateData = location.state || {};
  const { username, role } = stateData;
  const isPublicChange = Boolean(username && role);

  const session = useMemo(() => getSession(), []);
  const safeUserName = useMemo(() => {
    if (isPublicChange) {
        return String(username || "");
    }

    return String(session?.data?.name || "");
}, [username, session]);
  const isFirstLogin = isPublicChange || Boolean(session?.data?.passwordChangeRequired);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleFields, setVisibleFields] = useState({});

  useEffect(() => {
       
    if (!session?.data?.id && !isPublicChange) {
      navigate("/login", { replace: true });
    }
  }, [navigate, session, isPublicChange]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage("");
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const toggleVisibility = (fieldName) => {
    setVisibleFields((current) => ({ ...current, [fieldName]: !current[fieldName] }));
  };

  const handleBack = () => {
    if (isFirstLogin) {
      return;
    }

    navigate(session?.dashboardPath || "/");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setErrorMessage("Please fill in all password fields.");
      return;
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
    setErrorMessage("Password does not meet the required policy.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      };

      if (isPublicChange) {
        payload.username = username;
      }

      const response = await changePassword(payload);

      if (isPublicChange) {
        await Swal.fire({
          icon: "success",
          title: "Password Changed",
          text: "Your password has been updated successfully. Please log in with your new password.",
          confirmButtonColor: "#1a3c5a",
        });

        const loginPath = role === "applicant" ? "/applicant-login" : "/login";
        navigate(loginPath, { replace: true });
        return;
      }

      
      let updatedSession;
      if (response.data?.token && response.data?.user) {
        const u = response.data.user;
        if (session.type === "applicant") {
          updatedSession = {
            id: u.id,
            loginId: u.loginId,
            name: u.name,
            roleId: u.roleId,
            passwordChangeRequired: false,
            loginTime: new Date().toISOString(),
            token: response.data.token,
          };
        } else {
          updatedSession = {
            id: u.id,
             loginId: u.loginId,
            name: u.name,
            roleName: u.roleName,
            userTypeId: u.userTypeId,
            passwordChangeRequired: false,
            loginTime: new Date().toISOString(),
            token: response.data.token,
          };
        }
      } else {
       
        updatedSession = {
          ...session.data,
          passwordChangeRequired: false,
        };
      }
      localStorage.setItem(session.storageKey, secureStorage.encrypt(JSON.stringify(updatedSession)));

      // await Swal.fire({
      //   icon: "success",
      //   title: "Password Changed",
      //   text: "Your password has been updated successfully.",
      //   confirmButtonColor: "#1a3c5a",
      // });

      // navigate(session.dashboardPath, { replace: true });
      setFormData({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
});

setVisibleFields({});

await Swal.fire({
    icon: "success",
    title: "Password Changed",
    text: "Your password has been updated successfully."
});

navigate(session.dashboardPath, {
    replace: true
});
    } catch (error) {
         setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
      setErrorMessage(error.response?.data?.error || "Unable to change password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session?.data?.id && !isPublicChange) {
    return null;
  }

  // const renderPasswordField = ({ name, label, autoComplete }) => (
  //   <label className="change-password-field">
  //     <span>{label}</span>
  //     <div className="change-password-input">
  //       <Lock size={18} />
  //       <input
  //         type={visibleFields[name] ? "text" : "password"}
  //         name={name}
  //         value={formData[name]}
  //         onChange={handleChange}
  //         autoComplete={autoComplete}
  //         disabled={isSubmitting}
  //         required
  //       />
  //       <button
  //         type="button"
  //         onClick={() => toggleVisibility(name)}
  //         aria-label={visibleFields[name] ? "Hide password" : "Show password"}
  //       >
  //         {visibleFields[name] ? <EyeOff size={17} /> : <Eye size={17} />}
  //       </button>
  //     </div>
  //   </label>
  // );

  return (
    <div className="change-password-page">
      <section className="change-password-panel">
        {!isFirstLogin ? (
          <button type="button" className="change-password-back" onClick={handleBack}>
            <ArrowLeft size={18} />
            Back
          </button>
        ) : null}

        <div className="change-password-header">
          <div className="change-password-header__icon">
            <KeyRound size={24} />
          </div>
          <div>
            <h1>{SAFE_TEXT.TITLE}</h1>
            <p>
              {isFirstLogin
                ? "Please change your temporary password before continuing."
                : "Update your account password."}
            </p>
          </div>
        </div>

        <div className="change-password-user">
          <span>{isPublicChange ? "Changing password for" : "Signed in as"}</span>
<strong>{safeUserName}</strong>
        </div>

        <form className="change-password-form" onSubmit={handleSubmit}>
          <label className="change-password-field">
    <span>{SAFE_TEXT.CURRENT_PASSWORD}</span>

    <div className="change-password-input">
        <Lock size={18} />

        <input
            type={visibleFields.currentPassword ? "text" : "password"}
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            required
        />

        <button
            type="button"
            onClick={() => toggleVisibility("currentPassword")}
            aria-label={
                visibleFields.currentPassword
                    ? "Hide password"
                    : "Show password"
            }
        >
            {visibleFields.currentPassword
                ? <EyeOff size={17}/>
                : <Eye size={17}/>}
        </button>
    </div>
</label>
         <label className="change-password-field">
    <span>{SAFE_TEXT.NEW_PASSWORD}</span>

    <div className="change-password-input">
        <Lock size={18} />

        <input
            type={visibleFields.newPassword ? "text" : "password"}
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
        />

        <button
            type="button"
            onClick={() => toggleVisibility("newPassword")}
            aria-label={
                visibleFields.newPassword
                    ? "Hide password"
                    : "Show password"
            }
        >
            {visibleFields.newPassword
                ? <EyeOff size={17}/>
                : <Eye size={17}/>}
        </button>
    </div>
</label>
        <label className="change-password-field">
    <span>{SAFE_TEXT.CONFIRM_PASSWORD}</span>

    <div className="change-password-input">
        <Lock size={18} />

        <input
            type={visibleFields.confirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="confirm-password"
            required
        />

        <button
            type="button"
            onClick={() => toggleVisibility("confirmPassword")}
            aria-label={
                visibleFields.confirmPassword
                    ? "Hide password"
                    : "Show password"
            }
        >
            {visibleFields.confirmPassword
                ? <EyeOff size={17}/>
                : <Eye size={17}/>}
        </button>
    </div>
</label>

          <div className="change-password-rules">
            <CheckCircle2 size={18} />
            <span>Minimum 8 characters with uppercase, lowercase, number, and special character.</span>
          </div>

          {errorMessage ? <p className="change-password-error">{errorMessage}</p> : null}

          <button type="submit" className="change-password-submit" disabled={isSubmitting}>
            {isSubmitting ? "Changing..." : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default ChangePasswordPage;

