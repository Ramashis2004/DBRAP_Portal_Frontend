import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sessionChannel } from "../utils/sessionChannel";

const SESSION_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 60;
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
const CHECK_INTERVAL_MS = 5000; // purely client-side local timer (0 API hits)
const LOGIN_GRACE_MS = 3000; // ignore FORCE_LOGOUT for 3s after login

function SessionWatcher() {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const loginTimeRef = useRef(null); // tracks when session was written
  const lastActivityRef = useRef(Date.now()); // tracks last user interaction

  const getActiveSession = () => {
    const officerRaw = localStorage.getItem("officerSession");
    const applicantRaw = localStorage.getItem("applicantSession");

    if (officerRaw) {
      try {
        const s = JSON.parse(officerRaw);
        return { id: s.id, type: "officer", redirectTo: "/login", loginTime: s.loginTime };
      } catch { }
    }

    if (applicantRaw) {
      try {
        const s = JSON.parse(applicantRaw);
        return { id: s.id, type: "applicant", redirectTo: "/applicant-login", loginTime: s.loginTime };
      } catch { }
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
    lastActivityRef.current = Date.now();

    const session = getActiveSession();
    if (!session) return;

    timerRef.current = setInterval(() => {
      const currentSession = getActiveSession();
      if (!currentSession) { stopPolling(); return; }

      const inactiveDuration = Date.now() - lastActivityRef.current;
      if (inactiveDuration >= SESSION_TIMEOUT_MS) {
        stopPolling();
        forceLogout(currentSession.redirectTo);
      }
    }, CHECK_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleActivity = () => {
    lastActivityRef.current = Date.now();
    const session = getActiveSession();
    if (session && !timerRef.current) {
      startPolling();
    }
  };

  // Keep handleActivity stable using a ref so event listeners don't re-bind on every render
  const handleActivityRef = useRef(null);
  handleActivityRef.current = handleActivity;

  // ── Listen for user activity to reset inactivity timer ─────────────────────
  useEffect(() => {
    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    const onActivity = () => {
      if (handleActivityRef.current) {
        handleActivityRef.current();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
    };
  }, []);

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