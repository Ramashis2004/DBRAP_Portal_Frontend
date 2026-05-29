import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, User, KeyRound, ShieldCheck,
  CheckCircle2, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import "./ForgotPasswordPage.css";

// ── API base (reuse same base URL your loginOfficer uses) ────────────────────
//const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });
import { sendOtp, verifyOtp, resetPassword } from "../api/api";
// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ current }) {
  const labels = ["Enter ID", "Verify OTP", "New Password"];
  return (
    <div className="fp-stepper">
      {labels.map((label, i) => {
        const n    = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="fp-stepper__item">
            <div className={`fp-stepper__dot ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
              {done ? <CheckCircle2 size={13} /> : n}
            </div>
            <span className="fp-stepper__label">{label}</span>
            {n < labels.length && <div className="fp-stepper__line" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Reusable alert ────────────────────────────────────────────────────────────
function Alert({ type, text }) {
  if (!text) return null;
  return <p className={`fp-alert fp-alert--${type}`}>{text}</p>;
}

// ── Step 1: Enter Officer ID ──────────────────────────────────────────────────
function StepSendOtp({ onNext }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError("Please enter your Officer ID."); return; }
    setLoading(true);
    setError("");
    try {
    //   const { data } = await API.post("/officer/forgot-password/send-otp", {
    //     username: username.trim(),
    //   });
    const { data } = await sendOtp({
      username: username.trim(),
    });
      console.log("OTP sent successfully. User ID:", username.trim(), "Mobile Number:", data.maskedMobile);
      onNext({
        username: username.trim(),
        maskedMobile: data.maskedMobile,
        resendAfterSeconds: data.resendAfterSeconds,
        resendBlocked: data.resendBlocked,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-body">
      <div className="fp-icon fp-icon--amber"><User size={24} /></div>
      <h2>Forgot Password?</h2>
      <p className="fp-hint">
        Enter your Officer ID and we'll send a 6-digit OTP to your registered mobile number.
      </p>

      <form className="fp-form" onSubmit={handleSubmit}>
        <label className="fp-field">
          <span>Officer ID / Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => { setError(""); setUsername(e.target.value); }}
            placeholder="e.g. JE30901"
            autoComplete="username"
            required
          />
        </label>

        <Alert type="error" text={error} />

        <button className="fp-btn" type="submit" disabled={loading}>
          {loading ? <><RefreshCw size={15} className="fp-spin" /> Sending OTP…</> : "Send OTP"}
        </button>
      </form>

      <p className="fp-back-login">
        Remember your password? <Link to="/login">Back to Login</Link>
      </p>
    </div>
  );
}

// ── Step 2: Enter OTP ─────────────────────────────────────────────────────────
function StepVerifyOtp({ data, onNext, onBack }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(Number(data.resendAfterSeconds || 25));
  const [resendBlocked, setResendBlocked] = useState(Boolean(data.resendBlocked));
  const [lockoutMessage, setLockoutMessage] = useState(
    data.resendBlocked ? "You have exceed your time limit of send OTP try after 30 minutes." : ""
  );

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setResendCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldownSeconds]);

  useEffect(() => {
    if (resendBlocked && resendCooldownSeconds === 0) {
      setResendBlocked(false);
      setLockoutMessage("");
    }
  }, [resendBlocked, resendCooldownSeconds]);

  const formatCountdown = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes <= 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyOtp({
        username: data.username,
        otp: otp.trim(),
      });
      onNext({ ...data, otp: otp.trim() });
    } catch (err) {
      setError(err.response?.data?.error || "Incorrect OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setSuccess("");

    try {
      const response = await sendOtp({ username: data.username });
      console.log("OTP sent successfully. User ID:", data.username, "Mobile Number:", response.data?.maskedMobile || data.maskedMobile);
      const nextCooldown = Number(response.data?.retryAfterSeconds || response.data?.resendAfterSeconds || 25);
      const isBlocked = Boolean(response.data?.resendBlocked);

      setResendCooldownSeconds(nextCooldown);
      setResendBlocked(isBlocked);
      setLockoutMessage(isBlocked ? "You have exceed your time limit of send OTP try after 30 minutes." : "");
      setSuccess("A new OTP has been sent to your mobile.");
      setOtp("");
    } catch (err) {
      const retryAfterSeconds = Number(err.response?.data?.retryAfterSeconds || 0);
      const isBlocked = Boolean(err.response?.data?.resendBlocked);

      if (retryAfterSeconds > 0) {
        setResendCooldownSeconds(retryAfterSeconds);
      }

      setResendBlocked(isBlocked);
      setLockoutMessage(isBlocked ? (err.response?.data?.error || "You have exceed your time limit of send OTP try after 30 minutes.") : "");
      setError(isBlocked ? "" : (err.response?.data?.error || "Could not resend OTP."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fp-body">
      <div className="fp-icon fp-icon--amber"><KeyRound size={24} /></div>
      <h2>Enter OTP</h2>
      <p className="fp-hint">
        A 6-digit OTP was sent to <strong>{data.maskedMobile}</strong>.{" "}
        It is valid for <strong>10 minutes</strong>.
      </p>

      <form className="fp-form" onSubmit={handleSubmit}>
        <label className="fp-field">
          <span>One-Time Password</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => { setError(""); setOtp(e.target.value.replace(/\D/g, "")); }}
            placeholder="Enter 6-digit OTP"
            autoComplete="one-time-code"
            required
          />
        </label>

        <Alert type="error" text={error} />
        <Alert type="success" text={success} />
        {lockoutMessage ? <Alert type="error" text={lockoutMessage} /> : null}
        {!resendBlocked && resendCooldownSeconds > 0 ? (
          <p className="fp-hint fp-hint--compact">
            You can resend OTP in <strong>{formatCountdown(resendCooldownSeconds)}</strong>.
          </p>
        ) : null}
        {resendBlocked ? (
          <p className="fp-hint fp-hint--compact">
            OTP resend is blocked for <strong>{formatCountdown(resendCooldownSeconds)}</strong>.
          </p>
        ) : null}

        <button className="fp-btn" type="submit" disabled={loading}>
          {loading ? <><RefreshCw size={15} className="fp-spin" /> Verifying?</> : "Verify OTP"}
        </button>
      </form>

      <div className="fp-row">
        <button className="fp-link" type="button" onClick={onBack}>? Change ID</button>
        <button
          className="fp-link"
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldownSeconds > 0 || resendBlocked}
        >
          {resending
            ? "Resending?"
            : resendBlocked
              ? "Resend OTP"
              : resendCooldownSeconds > 0
                ? `Resend OTP (${formatCountdown(resendCooldownSeconds)})`
                : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}

function StepResetPassword({ data, onDone }) {
  const [form, setForm]       = useState({ password: "", confirm: "" });
  const [show, setShow]       = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const toggle = (field) => setShow((p) => ({ ...p, [field]: !p[field] }));
  const onChange = (field) => (e) => {
    setError("");
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }

    setLoading(true); setError("");
    try {
    //   await API.post("/officer/forgot-password/reset", {
    //     username:    data.username,
    //     otp:         data.otp,
    //     newPassword: form.password,
    //   });
    await resetPassword({
  username: data.username,
  otp: data.otp,
  newPassword: form.password,
});
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-body">
      <div className="fp-icon fp-icon--amber"><ShieldCheck size={24} /></div>
      <h2>Set New Password</h2>
      <p className="fp-hint">Choose a strong password for <strong>{data.username}</strong>.</p>

      <form className="fp-form" onSubmit={handleSubmit}>
        <label className="fp-field">
          <span>New Password</span>
          <div className="fp-pw-wrap">
            <input
              type={show.password ? "text" : "password"}
              value={form.password}
              onChange={onChange("password")}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              required
            />
            <button type="button" className="fp-eye" onClick={() => toggle("password")}>
              {show.password ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        <label className="fp-field">
          <span>Confirm Password</span>
          <div className="fp-pw-wrap">
            <input
              type={show.confirm ? "text" : "password"}
              value={form.confirm}
              onChange={onChange("confirm")}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              required
            />
            <button type="button" className="fp-eye" onClick={() => toggle("confirm")}>
              {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        <Alert type="error" text={error} />

        <button className="fp-btn" type="submit" disabled={loading}>
          {loading
            ? <><RefreshCw size={15} className="fp-spin" /> Resetting…</>
            : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

// ── Success ───────────────────────────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="fp-body fp-body--center">
      <div className="fp-icon fp-icon--green"><CheckCircle2 size={28} /></div>
      <h2>Password Reset!</h2>
      <p className="fp-hint">
        Your password has been updated successfully.
        You can now log in with your new credentials.
      </p>
      <Link to="/login" className="fp-btn">Back to Login</Link>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({});
  const [done, setDone] = useState(false);

  const goNext = (newData) => { setData(newData); setStep((s) => s + 1); };

  return (
    <div className="fp-page">
      <div className="fp-shell">

        {/* ── Left decorative panel ── */}
        <section className="fp-hero">
          <Link to="/login" className="fp-back-link">
            <ArrowLeft size={17} /> Back to login
          </Link>
          <div className="fp-hero__body">
            <div className="fp-hero__circle">
              <KeyRound size={44} strokeWidth={1.3} />
            </div>
            <h1>Account Recovery</h1>
            <p>
              Regain access to your DBRAP officer account in three quick steps.
              An OTP will be sent to your registered mobile number.
            </p>
            <ul className="fp-hero__list">
              <li><CheckCircle2 size={14} /> Enter your Officer ID</li>
              <li><CheckCircle2 size={14} /> Verify 6-digit OTP</li>
              <li><CheckCircle2 size={14} /> Set a new password</li>
            </ul>
          </div>
        </section>

        {/* ── Right form panel ── */}
        <section className="fp-card">
          {!done && <StepDots current={step} />}

          {done ? (
            <SuccessScreen />
          ) : step === 1 ? (
            <StepSendOtp onNext={goNext} />
          ) : step === 2 ? (
            <StepVerifyOtp
              data={data}
              onNext={goNext}
              onBack={() => setStep(1)}
            />
          ) : (
            <StepResetPassword data={data} onDone={() => setDone(true)} />
          )}
        </section>
      </div>
    </div>
  );
}
