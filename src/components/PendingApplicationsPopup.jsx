import { useEffect, useState, useRef } from "react";
import { fetchOrganisations } from "../api/api";
import "./PendingApplicationsPopup.css";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1100, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.13);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.13 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.13 + 0.22);
      osc.start(ctx.currentTime + i * 0.13);
      osc.stop(ctx.currentTime + i * 0.13 + 0.28);
    });
  } catch (e) {
    //console.warn("Audio failed:", e);
  }
}

export default function PendingApplicationsPopup({ session, dashboardReady }) {
  const [visible, setVisible] = useState(false);
  const [pendingApps, setPendingApps] = useState([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!dashboardReady || !session || hasFetched.current) return;

    hasFetched.current = true;

    fetchOrganisations("APPLICATION_SUBMITTED", session.loginId)
      .then((response) => {
        const all = Array.isArray(response?.data) ? response.data : [];

        const pending = all.filter(
          (app) =>
            String(app.application_status || "")
              .toUpperCase()
              .replace(/\s+/g, "_") === "APPLICATION_SUBMITTED"
        );

        if (pending.length > 0) {
          setPendingApps(pending);
          setVisible(true);
          setTimeout(playNotificationSound, 500);
        }
      })
      .catch((err) => {
        //console.error("[Popup] fetch failed:", err);
      });
  }, [dashboardReady, session]);

  // ← KEY FIX: if not visible, render nothing at all
  if (!visible) return null;

  const pendingRows = pendingApps.map((app, idx) => ({
    sl: idx + 1,
    applicationId: app.application_id || "-",
    block: app.block_name || app.block || "-",
    district: app.district_name || app.district || "-",
    division: app.division_name || "-",
  }));
  const uniqueBlocks = new Set(pendingRows.map((row) => row.block).filter((block) => block !== "-"));

  return (
    <>
      
      <div className="se-overlay">
        <div className="se-box">
          <div className="se-hdr">
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <div className="se-bell">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div>
                <p style={{margin:0,fontSize:"13px",fontWeight:900,color:"#fff"}}>Pending Application Alert</p>
                <p style={{margin:"2px 0 0",fontSize:"12px",color:"#e6bea5"}}>
                  SE: {session?.loginId || session?.login_id || session?.id || "—"} &bull; On Login
                </p>
              </div>
            </div>
            <button onClick={() => setVisible(false)}
              style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"6px",
                width:"28px",height:"28px",color:"#fff",fontSize:"16px",cursor:"pointer"}}>
              ✕
            </button>
          </div>

          <div className="se-meta">
            <span>Pending blocks: <strong style={{color:"#e24b4a"}}>{uniqueBlocks.size}</strong></span>
            <span>Total applications: <strong style={{color:"#d97234"}}>{pendingApps.length}</strong></span>
            <span>Status: <strong style={{color:"#1a3550"}}>APPLICATION SUBMITTED</strong></span>
          </div>

          <div className="se-body">
            <table className="se-tbl">
              <thead>
                <tr>
                  <th style={{width:"50px"}}>Sl. No.</th>
                  <th style={{width:"150px"}}>Application ID</th>
                  <th>Block</th>
                  <th>District</th>
                  <th>Division</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map((row) => (
                  <tr key={row.applicationId}>
                    <td style={{color:"#bbb",fontSize:"11px"}}>{row.sl}</td>
                    <td>
                      <span className="se-badge">
                        <span className="se-pdot" />
                        {row.applicationId}
                      </span>
                    </td>
                    <td style={{fontWeight:600,color:"#1a3550"}}>{row.block}</td>
                    <td>{row.district}</td>
                    <td>{row.division}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="se-foot">
            <span className="se-tbadge">Total pending: {pendingApps.length}</span>
            <button className="se-dismiss" onClick={() => setVisible(false)}>
              Acknowledge &amp; Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

