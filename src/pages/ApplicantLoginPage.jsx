import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  MessageSquareText,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Swal from "sweetalert2";
import { checkApplicantLoginMobile, loginApplicant, loginApplicantWithPassword } from "../api/api";
import "./ApplicantLoginPage.css";
import { sendApplicantOtp } from "../api/api";
// ─── Helpers ──────────────────────────────────────────────────────────────────

const swalError   = (title, text) => Swal.fire({ icon: "error",   title, text, confirmButtonColor: "#3d1f0f" });
const swalSuccess = (title, text) => Swal.fire({ icon: "success", title, text, confirmButtonColor: "#3d1f0f" });
const swalWarning = (title, text) => Swal.fire({ icon: "warning", title, text, confirmButtonColor: "#3d1f0f" });

const generateOTP     = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateCaptcha = () => {
  const left  = Math.floor(10 + Math.random() * 40);
  const right = Math.floor(1  + Math.random() * 9);
  return { question: `${left} + ${right}`, answer: String(left + right) };
};

const TABS = [
  { key: "otp",      label: "Mobile OTP" },
  { key: "password", label: "User ID & Password" },
];

// ─── Component ────────────────────────────────────────────────────────────────

function ApplicantLoginPage() {
  const navigate = useNavigate();

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("otp");

  // ── Shared ────────────────────────────────────────────────────────────────
  const [captcha,      setCaptcha]      = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── OTP tab state ─────────────────────────────────────────────────────────
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError,  setMobileError]  = useState("");
  const [otpInput,     setOtpInput]     = useState("");
  const [sentOtp,      setSentOtp]      = useState("");
  const [isOtpSent,    setIsOtpSent]    = useState(false);

  // ── Password tab state ────────────────────────────────────────────────────
  const [userId,        setUserId]        = useState("");
  const [password,      setPassword]      = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [userIdError,   setUserIdError]   = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Derived ───────────────────────────────────────────────────────────────
  const canSendOtp = useMemo(
    () => !mobileError && mobileNumber.length === 10 && !isSubmitting,
    [mobileError, mobileNumber, isSubmitting]
  );

  // ── Tab switch — reset everything ─────────────────────────────────────────
  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    // OTP state
    setMobileNumber(""); setMobileError(""); setOtpInput("");
    setSentOtp(""); setIsOtpSent(false);
    // Password state
    setUserId(""); setPassword(""); setShowPassword(false);
    setUserIdError(""); setPasswordError("");
    // Shared
    setCaptcha(generateCaptcha()); setCaptchaInput("");
  };

  // ── Captcha ───────────────────────────────────────────────────────────────
  const refreshCaptcha = () => { setCaptcha(generateCaptcha()); setCaptchaInput(""); };

  const saveApplicantSession = (applicant, token) => {
    localStorage.setItem("applicantSession", JSON.stringify({
      id: applicant.id, mobileNo: applicant.mobileNo,
      name: applicant.name, roleId: applicant.roleId,
      loginTime: new Date().toISOString(),
      token: token,
    }));
  };

  const confirmActiveSessionTakeover = async (message) => {
    const result = await Swal.fire({
      title: "Already logged in",
      text: message || "This login ID is already logged in. Do you want to logout there and login here?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      confirmButtonColor: "#3d1f0f",
    });

    return result.isConfirmed;
  };

  // ── OTP handlers ──────────────────────────────────────────────────────────
  const validateMobile = (n) => {
    if (!n) return "Mobile number is required.";
    if (!/^[6-9]\d{9}$/.test(n)) return "Enter a valid 10-digit Indian mobile number.";
    return "";
  };

  const handleMobileChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(v);
    setMobileError(validateMobile(v));
    setOtpInput(""); setSentOtp(""); setIsOtpSent(false);
  };

  const sendOTP = async () => {
    const err = validateMobile(mobileNumber);
    if (err) { setMobileError(err); return; }

    setIsSubmitting(true);
    let otp = "";
    try {
      await checkApplicantLoginMobile(mobileNumber);
      otp = generateOTP();
      setSentOtp(otp);

//       const data = new FormData();
//       data.append("template_id",  "1007529288081313959");
//       data.append("phonenumber",  mobileNumber);
//       data.append("department_id","D047009");
//       data.append("action",       "sendOTPSMS");
//       data.append("source",       "ODIGOV");
//       data.append("sms_content",
//         `Your OTP for Gramsewa Nidhi Portal is ${otp}. Please do not share this with anyone. Panchayati Raj & Drinking Water Dept. - Govt. of Odisha`
//       );
// console.log("OTP sent successfully. Mobile Number:", mobileNumber);
//       await axios.post("https://govtsms.odisha.gov.in/api/api.php", data);

//await axios.post("/api/applicant-auth/send-otp", { mobile: mobileNumber, otp });
      await sendApplicantOtp(mobileNumber, otp);

      setIsOtpSent(true);
      await swalSuccess("OTP Sent", `OTP has been sent to ${mobileNumber}.`);
    } catch (error) {
      if (error.response?.status === 404) {
        await swalError("Applicant Not Found", error.response.data?.error || "Applicant not found. Please register first.");
        return;
      }
      if (error.response?.data?.error) {
        await swalError("Unable to Send OTP", error.response.data.error);
        return;
      }
      //console.error("OTP error:", error);
     // console.log("BYPASS: OTP is " + otp);
      setIsOtpSent(true);
    //  await swalWarning("OTP Generated", `SMS could not be sent. Use this OTP for testing: ${otp}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    if (!isOtpSent) { await swalWarning("OTP Required", "Please send OTP first."); return; }
    if (otpInput !== sentOtp) { await swalError("Invalid OTP", "The OTP you entered is incorrect."); return; }
    if (captchaInput.trim() !== captcha.answer) {
      await swalError("Invalid Captcha", "Please enter the correct captcha answer.");
      refreshCaptcha(); return;
    }

    setIsSubmitting(true);
    try {
      const response  = await loginApplicant({ mobile_number: mobileNumber });
      const applicant = response.data?.applicant;
      saveApplicantSession(applicant, response.data?.token);
      await swalSuccess("Login Successful", `Welcome ${applicant.name || applicant.mobileNo}.`);
      navigate("/applicant-dashboard");
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.code === "ALREADY_LOGGED_IN") {
        const shouldContinue = await confirmActiveSessionTakeover(error.response.data.error);
        if (!shouldContinue) return;

        try {
          const response = await loginApplicant({ mobile_number: mobileNumber, forceLogin: true });
          const applicant = response.data?.applicant;
          broadcastLogout(applicant.id); // ← ADD

          saveApplicantSession(applicant, response.data?.token);
          await swalSuccess("Login Successful", `Welcome ${applicant.name || applicant.mobileNo}.`);
          navigate("/applicant-dashboard");
        } catch (retryError) {
          await swalError("Login Failed", retryError.response?.data?.error || "Something went wrong.");
        }
        return;
      }

      await swalError("Login Failed", error.response?.data?.error || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Password handlers ─────────────────────────────────────────────────────

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    let hasError = false;
    if (!userId.trim()) {
      setUserIdError("User ID is required."); hasError = true;
    } else {
      setUserIdError("");
    }
    if (!password) {
      setPasswordError("Password is required."); hasError = true;
    } else {
      setPasswordError("");
    }
    if (captchaInput.trim() !== captcha.answer) {
      await swalError("Invalid Captcha", "Please enter the correct captcha answer.");
      refreshCaptcha(); return;
    }
    if (hasError) return;

    setIsSubmitting(true);
    try {
      const response  = await loginApplicantWithPassword({ login_id: userId.trim(), password });
      const applicant = response.data?.applicant;
      saveApplicantSession(applicant, response.data?.token);
      await swalSuccess("Login Successful", `Welcome ${applicant.name || applicant.loginId}.`);
      navigate("/applicant-dashboard");
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.code === "ALREADY_LOGGED_IN") {
        const shouldContinue = await confirmActiveSessionTakeover(error.response.data.error);
        if (!shouldContinue) return;

        try {
          const response = await loginApplicantWithPassword({
            login_id: userId.trim(),
            password,
            forceLogin: true,
          });
          const applicant = response.data?.applicant;
          broadcastLogout(applicant.id); // ← ADD

          saveApplicantSession(applicant, response.data?.token);
          await swalSuccess("Login Successful", `Welcome ${applicant.name || applicant.loginId}.`);
          navigate("/applicant-dashboard");
        } catch (retryError) {
          await swalError("Login Failed", retryError.response?.data?.error || "Invalid User ID or password.");
        }
        return;
      }

      await swalError("Login Failed", error.response?.data?.error || "Invalid User ID or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="applicant-login-page">
      <div className="applicant-login-shell">

        {/* ── Left info panel ── */}
        <section className="applicant-login-info">
          <Link to="/" className="applicant-login-back">
            <ArrowLeft size={18} />
            Back to home
          </Link>

          <div className="applicant-login-copy">
            <p className="applicant-login-badge">
              <ShieldCheck size={25} />
              Applicant Access
            </p>
            <h1>Applicant Login</h1>
          </div>

          <div className="applicant-login-points">
            <div>
              <CheckCircle2 size={18} />
              <span>Mobile number must be registered as an applicant.</span>
            </div>
          </div>
        </section>

        {/* ── Right card ── */}
        <section className="applicant-login-card">
          <div className="applicant-login-card__header">
            <h2>Login</h2>
            <p>Choose your preferred login method below.</p>
          </div>

          {/* ── Tabs ── */}
          <div className="applicant-login-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`applicant-login-tab${activeTab === tab.key ? " is-active" : ""}`}
                onClick={() => switchTab(tab.key)}
              >
                {tab.key === "otp"
                  ? <Phone size={15} />
                  : <KeyRound size={15} />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════
              TAB 1 — Mobile OTP
          ══════════════════════════════════════════ */}
          {activeTab === "otp" && (
            <form onSubmit={handleOtpSubmit} className="applicant-login-form">

              <label className="applicant-login-field">
                <span>Mobile Number</span>
                <div className="applicant-login-input">
                  <Phone size={18} />
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={handleMobileChange}
                    placeholder="Enter 10 digit mobile number"
                    disabled={isSubmitting}
                  />
                </div>
              </label>

              {mobileError && mobileNumber.length > 0 && (
                <p className="applicant-login-error">{mobileError}</p>
              )}

              <button
                type="button"
                className="applicant-login-send"
                onClick={sendOTP}
                disabled={!canSendOtp}
              >
                {isSubmitting ? "Please wait..." : isOtpSent ? "Resend OTP" : "Send OTP"}
              </button>

              {isOtpSent && (
                <>
                  <label className="applicant-login-field">
                    <span>OTP</span>
                    <div className="applicant-login-input">
                      <MessageSquareText size={18} />
                      <input
                        type="text"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6 digit OTP"
                        disabled={isSubmitting}
                      />
                    </div>
                  </label>

                  <label className="applicant-login-field">
                    <span>Captcha: What is {captcha.question}?</span>
                    <div className="applicant-login-captcha">
                      <div className="applicant-login-captcha__question">{captcha.question}</div>
                      <input
                        type="text"
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        placeholder="Answer"
                        disabled={isSubmitting}
                      />
                      <button type="button" onClick={refreshCaptcha} aria-label="Refresh captcha">
                        <RefreshCw size={17} />
                      </button>
                    </div>
                  </label>

                  <button type="submit" className="applicant-login-submit" disabled={isSubmitting}>
                    <LogIn size={18} />
                    {isSubmitting ? "Signing in..." : "Submit"}
                  </button>
                </>
              )}

              <p className="applicant-login-register-link">
                New user?{" "}
                <span onClick={() => navigate("/register")}>
                  Click Here for New Registration
                </span>
              </p>
            </form>
          )}

          {/* ══════════════════════════════════════════
              TAB 2 — User ID & Password
          ══════════════════════════════════════════ */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="applicant-login-form">

              {/* User ID */}
              <label className="applicant-login-field">
                <span>User ID</span>
                <div className={`applicant-login-input${userIdError ? " has-error" : ""}`}>
                  <UserRound size={18} />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => { setUserId(e.target.value); setUserIdError(""); }}
                    placeholder="Enter your User ID"
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                </div>
                {userIdError && <p className="applicant-login-error">{userIdError}</p>}
              </label>

              {/* Password */}
              <label className="applicant-login-field">
                <span>Password</span>
                <div className={`applicant-login-input${passwordError ? " has-error" : ""}`}>
                  <KeyRound size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="applicant-login-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {passwordError && <p className="applicant-login-error">{passwordError}</p>}
              </label>

              {/* Captcha */}
              <label className="applicant-login-field">
                <span>Captcha: What is {captcha.question}?</span>
                <div className="applicant-login-captcha">
                  <div className="applicant-login-captcha__question">{captcha.question}</div>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    placeholder="Answer"
                    disabled={isSubmitting}
                  />
                  <button type="button" onClick={refreshCaptcha} aria-label="Refresh captcha">
                    <RefreshCw size={17} />
                  </button>
                </div>
              </label>

              <button type="submit" className="applicant-login-submit" disabled={isSubmitting}>
                <LogIn size={18} />
                {isSubmitting ? "Signing in..." : "Login"}
              </button>

              <p className="applicant-login-register-link">
                New user?{" "}
                <span onClick={() => navigate("/register")}>
                  Click Here for New Registration
                </span>
              </p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
const broadcastLogout = (userId) => {
  const channel = new BroadcastChannel("applicant_session");
  channel.postMessage({ type: "FORCE_LOGOUT", userId });
  channel.close();
};
export default ApplicantLoginPage;
