import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sessionChannel } from "../utils/sessionChannel";
import { checkSessionValid } from "../api/api";

const POLL_INTERVAL_MS = 15000;
const LOGIN_GRACE_MS = 3000; // ignore FORCE_LOGOUT for 3s after login

function SessionWatcher() {
  const navigate     = useNavigate();
  const timerRef     = useRef(null);
  const loginTimeRef = useRef(null); // tracks when session was written

  const getActiveSession = () => {
    const officerRaw   = localStorage.getItem("officerSession");
    const applicantRaw = localStorage.getItem("applicantSession");

    if (officerRaw) {
      try {
        const s = JSON.parse(officerRaw);
        return { id: s.id, type: "officer", redirectTo: "/login", loginTime: s.loginTime };
      } catch {}
    }

    if (applicantRaw) {
      try {
        const s = JSON.parse(applicantRaw);
        return { id: s.id, type: "applicant", redirectTo: "/applicant-login", loginTime: s.loginTime };
      } catch {}
    }

    return null;
  };

  const forceLogout = (redirectTo) => {
    localStorage.removeItem("officerSession");
    localStorage.removeItem("applicantSession");
    navigate(redirectTo, { replace: true });
  };

  const startPolling = () => {
    stopPolling();
    timerRef.current = setInterval(async () => {
      const session = getActiveSession();
      if (!session) { stopPolling(); return; }

      try {
        const res = await checkSessionValid(session.id);
        if (!res.data?.valid) {
          stopPolling();
          forceLogout(session.redirectTo);
        }
      } catch (err) {
        console.warn("Session check failed:", err.message);
      }
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── BroadcastChannel — instant logout within same browser ────────────────
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type !== "FORCE_LOGOUT") return;

      const session = getActiveSession();
      if (!session) return;

      // ✅ Ignore if this session was just created (within grace period)
      if (session.loginTime) {
        const loginAge = Date.now() - new Date(session.loginTime).getTime();
        if (loginAge < LOGIN_GRACE_MS) return; // new tab — ignore
      }

      if (String(session.id) === String(event.data.userId)) {
        stopPolling();
        forceLogout(session.redirectTo);
      }
    };

    sessionChannel.addEventListener("message", handleMessage);
    return () => sessionChannel.removeEventListener("message", handleMessage);
  }, [navigate]);

  // ── Start/stop polling on session changes ─────────────────────────────────
  useEffect(() => {
    const session = getActiveSession();
    if (session) startPolling();

    const handleStorage = () => {
      const s = getActiveSession();
      if (s) startPolling();
      else stopPolling();
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      stopPolling();
      window.removeEventListener("storage", handleStorage);
    };
  }, [navigate]);

  return null;
}

export default SessionWatcher;