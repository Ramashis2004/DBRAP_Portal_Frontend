// PendingPieChart.jsx
// Drop-in companion to CEDashboardOverduePieChart.
// Shows all applications whose status is NOT CONNECTION_DETAILS_UPDATED
// or APPLICATION_REJECTED, bucketed by how long they have been pending.

import { useEffect, useRef, useState, useCallback } from "react";
import { History, X, LoaderCircle } from "lucide-react";
import { formatApplicationStatus } from "../utils/applicationStatus";
import "./PendingPieChart.css";

// ── Bucket config (matches controller BUCKET_WHERE keys) ─────────────────────
const BUCKETS = [
  { key: "0_2",     label: "0 – 2 days",  color: "#60a5fa", bg: "#dbeafe", text: "#1e40af" },
  { key: "2_5",     label: "2 – 5 days",  color: "#f59e0b", bg: "#fef3c7", text: "#92400e" },
  { key: "5_10",    label: "5 – 10 days", color: "#f97316", bg: "#ffedd5", text: "#7c2d12" },
  { key: "10_plus", label: "10+ days",    color: "#ef4444", bg: "#fee2e2", text: "#7f1d1d" },
];

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 320, H = 320, CX = 160, CY = 160, R = 112;

// ── Application status style (mirrors CEApplicationReceivedPage) ──────────────
const getApplicationStatusStyle = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "APPLICATION_SUBMITTED":       return { background: "#dbeafe", color: "#1d4ed8" };
    case "APPLICATION_FORWARDED_TO_JE": return { background: "#fef3c7", color: "#92400e" };
    case "JE_VERIFIED_REPORT_UPLOADED": return { background: "#ede9fe", color: "#6d28d9" };
    case "APPLICATION_APPROVED":        return { background: "#dcfce7", color: "#166534" };
    case "PAYMENT_RECEIPT_UPLOADED":    return { background: "#fef3c7", color: "#92400e" };
    case "PAYMENT_RECEIPT_VERIFIED":    return { background: "#dcfce7", color: "#166534" };
    default:                            return { background: "#e2e8f0", color: "#475569" };
  }
};

const getSlaStatusStyle = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "ON_TIME": return { background: "#dcfce7", color: "#166534" };
    case "DELAY":   return { background: "#fee2e2", color: "#991b1b" };
    case "PENDING": return { background: "#fef3c7", color: "#92400e" };
    default:        return { background: "#e2e8f0", color: "#475569" };
  }
};

const formatSlaStatus = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "ON_TIME": return "On Time";
    case "DELAY":   return "Delay";
    case "PENDING": return "Pending";
    default:        return "-";
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ── Pie hit-test ──────────────────────────────────────────────────────────────
function hitTestPie(mx, my, vals, total) {
  if (total <= 0) return null;
  let cum = -Math.PI / 2;
  for (let i = 0; i < BUCKETS.length; i++) {
    const angle = (vals[i] / total) * 2 * Math.PI;
    const a1 = cum, a2 = cum + angle;
    cum += angle;
    if (vals[i] <= 0) continue;
    const dx = mx - CX, dy = my - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > R) continue;
    const normAng = ((Math.atan2(dy, dx) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const na1 = ((a1 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const na2 = ((a2 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const inArc = na1 <= na2
      ? normAng >= na1 && normAng <= na2
      : normAng >= na1 || normAng <= na2;
    if (inArc) return BUCKETS[i].key;
  }
  return null;
}

// ── Canvas draw ───────────────────────────────────────────────────────────────
function drawPie(ctx, vals, total, activeKey) {
  ctx.clearRect(0, 0, W, H);

  const slices = [];
  let cum = -Math.PI / 2;
  BUCKETS.forEach((b, i) => {
    const ratio = total > 0 ? vals[i] / total : 0;
    const angle = ratio * 2 * Math.PI;
    slices.push({ b, a1: cum, a2: cum + angle, mid: cum + angle / 2, ratio, val: vals[i] });
    cum += angle;
  });

  if (total <= 0) {
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, 2 * Math.PI);
    ctx.fillStyle = "#e2e8f0";
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    slices.forEach((sl) => {
      if (sl.val <= 0) return;
      const isActive = activeKey === sl.b.key;
      const offset = isActive ? 8 : 0;
      ctx.save();
      ctx.translate(Math.cos(sl.mid) * offset, Math.sin(sl.mid) * offset);
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, sl.a1, sl.a2);
      ctx.closePath();
      ctx.fillStyle = sl.b.color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.stroke();
      if (sl.ratio >= 0.08) {
        ctx.font = "700 13px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sl.val, CX + R * 0.62 * Math.cos(sl.mid), CY + R * 0.62 * Math.sin(sl.mid));
      }
      ctx.restore();
    });
  }

  // Donut hole
  ctx.beginPath();
  ctx.arc(CX, CY, 48, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "700 24px sans-serif";
  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total, CX, CY - 6);
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("PENDING", CX, CY + 15);

  // Outer % labels
  slices.forEach((sl) => {
    if (sl.ratio <= 0.04) return;
    const isActive = activeKey === sl.b.key;
    const lx = CX + (R + (isActive ? 24 : 18)) * Math.cos(sl.mid);
    const ly = CY + (R + (isActive ? 24 : 18)) * Math.sin(sl.mid);
    ctx.font = "700 11px sans-serif";
    ctx.fillStyle = sl.b.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(sl.ratio * 100)}%`, lx, ly);
  });
}

// ── Application History Modal ─────────────────────────────────────────────────
function ApplicationHistoryModal({ userId, applicationId, fetchApplicationHistory, onClose }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    fetchApplicationHistory(userId, applicationId)
      .then((r) => { if (!cancelled) setHistory(Array.isArray(r.data) ? r.data : []); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || "Failed to load history."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId, applicationId, fetchApplicationHistory]);

  return (
    <div className="pending-modal" role="dialog" aria-modal="true">
      <div className="pending-modal__card">
        <div className="pending-modal__header">
          <div>
            <h3>Application History</h3>
            <p>Application ID: {applicationId}</p>
          </div>
          <button className="pending-panel__close" type="button" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="pending-modal__body">
          {isLoading ? (
            <div className="pending-state"><LoaderCircle size={18} className="pending-spin" /> Loading history...</div>
          ) : error ? (
            <div className="pending-error">{error}</div>
          ) : history.length === 0 ? (
            <div className="pending-state">No SLA history found.</div>
          ) : (
            <div className="pending-modal__table-wrap">
              <table className="pending-table pending-history-table">
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Start Time</th>
                    <th>Assigned</th>
                    <th>Due Time</th>
                    <th>Completion Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr key={`${row.stage}-${idx}`}>
                      <td className="pending-table__name">{row.stage || "-"}</td>
                      <td>{formatDateTime(row.start_time)}</td>
                      <td>{row.assigned_to || "-"}</td>
                      <td>{formatDateTime(row.due_time)}</td>
                      <td>{formatDateTime(row.completed_time)}</td>
                      <td>
                        <span className="pending-sla-pill" style={getSlaStatusStyle(row.sla_time_status)}>
                          {formatSlaStatus(row.sla_time_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Applications Modal ────────────────────────────────────────────────────────
function ApplicationsModal({ userId, bucket, division, fetchApplicationsByDivision, fetchApplicationHistory, onClose }) {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState("");
  const [historyAppId, setHistoryAppId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    fetchApplicationsByDivision(userId, division.division_code, bucket.key)
      .then((r) => { if (!cancelled) setApplications(Array.isArray(r.data) ? r.data : []); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || "Failed to load applications."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId, division.division_code, bucket.key, fetchApplicationsByDivision]);

  return (
    <div className="pending-modal" role="dialog" aria-modal="true">
      <div className="pending-modal__card">
        <div className="pending-modal__header">
          <div>
            <h3>{division.division_name || "Division"} — Pending Applications</h3>
            <p>Pending {bucket.label}</p>
          </div>
          <button className="pending-panel__close" type="button" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="pending-modal__body">
          {isLoading ? (
            <div className="pending-state"><LoaderCircle size={18} className="pending-spin" /> Loading applications...</div>
          ) : error ? (
            <div className="pending-error">{error}</div>
          ) : applications.length === 0 ? (
            <div className="pending-state">No applications found.</div>
          ) : (
            <div className="pending-modal__table-wrap">
              <table className="pending-table pending-app-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Organisation Name</th>
                    <th>Block</th>
                    <th>Village</th>
                    <th>Applicant Name</th>
                    <th>Connection Type</th>
                    <th>Application Status</th>
                    <th>Pending With</th>
                    <th>Days Pending</th>
                    <th>History</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.application_id}>
                      <td className="pending-table__name">{app.application_id || "-"}</td>
                      <td>{app.organisation_name || "-"}</td>
                      <td>{app.block || "-"}</td>
                      <td>{app.village || "-"}</td>
                      <td>{app.name || "-"}</td>
                      <td>{app.type_of_connection || "-"}</td>
                      <td>
                        <span className="pending-pill" style={getApplicationStatusStyle(app.application_status)}>
                          {formatApplicationStatus(app.application_status)}
                        </span>
                      </td>
                      <td>
                        {app.pending_with
                          ? <span className="pending-with-pill">{app.pending_with}</span>
                          : <span style={{ color: "#94a3b8" }}>—</span>
                        }
                      </td>
                      <td>
                        <span
                          className="pending-pill"
                          style={{ background: bucket.bg, color: bucket.text }}
                        >
                          {app.pending_days ?? "-"}d
                        </span>
                      </td>
                      <td className="pending-history-cell">
                        <button
                          type="button"
                          className="pending-history-btn"
                          onClick={() => setHistoryAppId(app.application_id)}
                          aria-label={`History for ${app.application_id}`}
                          title="Check SLA history"
                        >
                          <History size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {historyAppId && (
        <ApplicationHistoryModal
          userId={userId}
          applicationId={historyAppId}
          fetchApplicationHistory={fetchApplicationHistory}
          onClose={() => setHistoryAppId(null)}
        />
      )}
    </div>
  );
}

// ── Division Panel ────────────────────────────────────────────────────────────
function DivisionPanel({ userId, bucket, fetchByDivision, fetchApplicationsByDivision, fetchApplicationHistory, onClose }) {
  const [rows, setRows]                 = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState("");
  const [selectedDivision, setSelectedDivision] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    fetchByDivision(userId, bucket.key)
      .then((r) => { if (!cancelled) setRows(Array.isArray(r.data) ? r.data : []); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || "Failed to load."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId, bucket.key, fetchByDivision]);

  const total = rows.reduce((s, r) => s + (r.application_count || 0), 0);

  return (
    <div className="pending-panel">
      <div className="pending-panel__header" style={{ borderBottomColor: bucket.color }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pending-panel__badge" style={{ background: bucket.bg, color: bucket.text }}>
            <span className="pending-panel__bdot" style={{ background: bucket.color }} />
            {bucket.label} pending
          </span>
          <span className="pending-panel__title">Division-wise breakdown</span>
        </div>
        <button className="pending-panel__close" type="button" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </div>

      <div className="pending-panel__body">
        {isLoading ? (
          <div className="pending-state"><LoaderCircle size={18} className="pending-spin" /> Loading...</div>
        ) : error ? (
          <div className="pending-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="pending-state">No pending applications in this range.</div>
        ) : (
          <table className="pending-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Division Name</th>
                <th>Applications</th>
                <th>Share</th>
                <th>Avg Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pct = total > 0 ? Math.round((r.application_count / total) * 100) : 0;
                return (
                  <tr key={r.division_code}>
                    <td className="pending-table__idx">{i + 1}</td>
                    <td className="pending-table__name">{r.division_name || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="pending-pill pending-pill--btn"
                        style={{ background: bucket.bg, color: bucket.text }}
                        onClick={() => setSelectedDivision(r)}
                      >
                        {r.application_count}
                      </button>
                    </td>
                    <td>
                      <div className="pending-bar-wrap">
                        <div className="pending-bar" style={{ width: `${pct}%`, background: bucket.color }} />
                        <span className="pending-pct">{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: bucket.text }}>
                        {Number(r.avg_pending_days || 0).toFixed(1)}d avg
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pending-table__name">Total</td>
                <td colSpan={3}>
                  <span className="pending-pill" style={{ background: bucket.color, color: "#fff" }}>
                    {total} applications
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {selectedDivision && (
        <ApplicationsModal
          userId={userId}
          bucket={bucket}
          division={selectedDivision}
          fetchApplicationsByDivision={fetchApplicationsByDivision}
          fetchApplicationHistory={fetchApplicationHistory}
          onClose={() => setSelectedDivision(null)}
        />
      )}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
// Props:
//   userId                    – logged-in officer ID
//   titlePrefix               – "CE" | "EIC"
//   fetchPendingSummary       – () => Promise<{ bucket_0_2, … }>
//   fetchPendingByDivision    – (userId, bucket) => Promise<row[]>
//   fetchApplicationsByDivision – (userId, divisionCode, bucket) => Promise<row[]>
//   fetchApplicationHistory   – (userId, applicationId) => Promise<row[]>

export function PendingPieChart({
  userId,
  titlePrefix = "CE",
  fetchPendingSummary,
  fetchPendingByDivision,
  fetchApplicationsByDivision,
  fetchApplicationHistory,
}) {
  const canvasRef = useRef(null);
  const [summary, setSummary]       = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState("");
  const [activeBucket, setActiveBucket] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setIsLoading(true);
    setError("");
    fetchPendingSummary(userId)
      .then((r) => { if (!cancelled) setSummary(r.data); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || e.message || "Failed to load."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId, fetchPendingSummary]);

  const vals  = summary ? BUCKETS.map((b) => summary[`bucket_${b.key}`] ?? 0) : [0, 0, 0, 0];
  const total = vals.reduce((s, v) => s + v, 0);

  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    const ctx = canvasRef.current.getContext("2d");
    drawPie(ctx, vals, total, activeBucket?.key ?? null);
  }, [vals, total, activeBucket, isLoading]);

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    const hit = hitTestPie(mx, my, vals, total);
    if (!hit) return;
    const bucket = BUCKETS.find((b) => b.key === hit);
    setActiveBucket((prev) => (prev?.key === hit ? null : bucket));
  }, [vals, total]);

  return (
    <div className="pending-card">
      <div className="pending-card__head">
        <h3 className="pending-card__title"> Pending Applications</h3>
        <p className="pending-card__sub">
          All in-progress applications : &nbsp; Click a slice for division details
        </p>
      </div>

      {isLoading ? (
        <div className="pending-state">
          <LoaderCircle size={18} className="pending-spin" /> Loading chart...
        </div>
      ) : error ? (
        <div className="pending-error">{error}</div>
      ) : (
        <>
          <div className="pending-body">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="pending-canvas"
              onClick={handleCanvasClick}
              role="img"
              aria-label="Pie chart of pending applications by age"
            />
            <div className="pending-legend">
              {BUCKETS.map((b, i) => {
                const pct = total > 0 ? Math.round((vals[i] / total) * 100) : 0;
                return (
                  <div
                    key={b.key}
                    className={`pending-leg-row${activeBucket?.key === b.key ? " active" : ""}`}
                    style={{ "--lc": b.color, "--lpb": b.bg, "--lpt": b.text }}
                  >
                    <span className="pending-leg-dot" />
                    <span className="pending-leg-label">{b.label}</span>
                    <span className="pending-leg-pct">{pct}%</span>
                    <span className="pending-leg-count">{vals[i]}</span>
                  </div>
                );
              })}
              <p className="pending-hint">Click a pie slice to see division-wise breakdown</p>
            </div>
          </div>

          {activeBucket && (
            <DivisionPanel
              userId={userId}
              bucket={activeBucket}
              fetchByDivision={fetchPendingByDivision}
              fetchApplicationsByDivision={fetchApplicationsByDivision}
              fetchApplicationHistory={fetchApplicationHistory}
              onClose={() => setActiveBucket(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
