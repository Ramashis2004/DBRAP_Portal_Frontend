// CEDashboardOverduePieChart.jsx

import { useEffect, useRef, useState, useCallback } from "react";
import { History, X, LoaderCircle } from "lucide-react";
import {
  fetchCEOverdueApplicationsByDivision,
  fetchCEOverdueApplicationHistory,
  fetchCEOverdueByDivision,
  fetchCEOverdueSummary,
} from "../api/api";
import { formatApplicationStatus } from "../utils/applicationStatus";
import "./Cedashboardoverduepiechart.css";

const BUCKETS = [
  { key: "0_2", label: "1 - 2 days", color: "#f2db7d", bg: "#dcfce7", text: "#713f12" },
  { key: "2_5", label: "2 - 5 days", color: "#eab308", bg: "#fef9c3", text: "#713f12" },
  { key: "5_10", label: "5 - 10 days", color: "#f97316", bg: "#ffedd5", text: "#7c2d12" },
  { key: "10_plus", label: "10+ days", color: "#ef4444", bg: "#fee2e2", text: "#7f1d1d" },
];

const W = 320, H = 320;
const CX = 160, CY = 160;
const R = 112;

const getApplicationStatusStyle = (applicationStatus) => {
  switch (String(applicationStatus || "").toUpperCase()) {
    case "APPLICATION_APPROVED":
    case "CONNECTION_DETAILS_UPDATED":
      return { background: "#f39557", color: "#070808" };
    case "APPLICATION_REJECTED":
      return { background: "#fee2e2", color: "#991b1b" };
    case "APPLICATION_SUBMITTED":
      return { background: "#dbeafe", color: "#1d4ed8" };
    case "APPLICATION_FORWARDED_TO_JE":
      return { background: "#fef3c7", color: "#92400e" };
    case "JE_VERIFIED_REPORT_UPLOADED":
      return { background: "#ede9fe", color: "#6d28d9" };
    default:
      return { background: "#e2e8f0", color: "#475569" };
  }
};

const getSlaTimeStatusStyle = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "ON_TIME":
      return { background: "#dcfce7", color: "#166534" };
    case "DELAY":
      return { background: "#fee2e2", color: "#991b1b" };
    case "PENDING":
      return { background: "#fef3c7", color: "#92400e" };
    default:
      return { background: "#e2e8f0", color: "#475569" };
  }
};

const formatSlaTimeStatus = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "ON_TIME":
      return "On Time";
    case "DELAY":
      return "Delay";
    case "PENDING":
      return "Pending";
    default:
      return "-";
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function hitTestPie(mx, my, vals, total) {
  if (total <= 0) return null;

  let cum = -Math.PI / 2;
  for (let i = 0; i < BUCKETS.length; i++) {
    const ratio = vals[i] / total;
    const angle = ratio * 2 * Math.PI;
    const a1 = cum, a2 = cum + angle;
    cum += angle;
    if (vals[i] <= 0) continue;

    const dx = mx - CX, dy = my - CY;
    const normAng = ((Math.atan2(dy, dx) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const na1 = ((a1 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const na2 = ((a2 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const inArc = na1 <= na2 ? (normAng >= na1 && normAng <= na2) : (normAng >= na1 || normAng <= na2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= R && inArc) return BUCKETS[i].key;
  }
  return null;
}

// ── Division drill-down panel ─────────────────────────────────────────────────
function drawPie2D(ctx, vals, total, activeKey) {
  ctx.clearRect(0, 0, W, H);

  const slices = [];
  let cum = -Math.PI / 2;
  BUCKETS.forEach((b, i) => {
    const ratio = total > 0 ? vals[i] / total : 0;
    const angle = ratio * 2 * Math.PI;
    slices.push({ b, i, a1: cum, a2: cum + angle, mid: cum + angle / 2, ratio, val: vals[i] });
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
      const ox = Math.cos(sl.mid) * offset;
      const oy = Math.sin(sl.mid) * offset;

      ctx.save();
      ctx.translate(ox, oy);
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
        const lx = CX + R * 0.62 * Math.cos(sl.mid);
        const ly = CY + R * 0.62 * Math.sin(sl.mid);
        ctx.font = "700 13px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sl.val, lx, ly);
      }
      ctx.restore();
    });
  }

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
  ctx.fillText("OVERDUE", CX, CY + 15);

  slices.forEach((sl) => {
    if (sl.ratio <= 0.04) return;
    const isActive = activeKey === sl.b.key;
    const labelR = R + (isActive ? 24 : 18);
    const lx = CX + labelR * Math.cos(sl.mid);
    const ly = CY + labelR * Math.sin(sl.mid);
    ctx.font = "700 11px sans-serif";
    ctx.fillStyle = sl.b.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(sl.ratio * 100)}%`, lx, ly);
  });
}

function ApplicationHistoryModal({ userId, applicationId, fetchApplicationHistory, onClose }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    fetchApplicationHistory(userId, applicationId)
      .then((response) => {
        if (!cancelled) setHistory(Array.isArray(response.data) ? response.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || err.message || "Failed to load application history.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, applicationId, fetchApplicationHistory]);

  return (
    <div className="ce-overdue-modal" role="dialog" aria-modal="true">
      <div className="ce-overdue-modal__card">
        <div className="ce-overdue-modal__header">
          <div>
            <h3>Application History</h3>
            <p>Application ID: {applicationId}</p>
          </div>
          <button className="ce-overdue-panel__close" type="button" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="ce-overdue-modal__body">
          {isLoading ? (
            <div className="ce-overdue-state">
              <LoaderCircle size={18} className="ce-overdue-spin" /> Loading history...
            </div>
          ) : error ? (
            <div className="ce-overdue-error">{error}</div>
          ) : history.length === 0 ? (
            <div className="ce-overdue-state">No SLA history found.</div>
          ) : (
            <div className="ce-overdue-modal__table-wrap">
              <table className="ce-overdue-table ce-overdue-history-table">
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
                  {history.map((row, index) => (
                    <tr key={`${row.stage}-${row.start_time}-${index}`}>
                      <td className="ce-overdue-table__name">{row.stage || "-"}</td>
                      <td>{formatDateTime(row.start_time)}</td>
                      <td>{row.assigned_to || "-"}</td>
                      <td>{formatDateTime(row.due_time)}</td>
                      <td>{formatDateTime(row.completed_time)}</td>
                      <td>
                        <span className="ce-overdue-pill" style={getSlaTimeStatusStyle(row.sla_time_status)}>
                          {formatSlaTimeStatus(row.sla_time_status)}
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

function ApplicationsModal({
  userId,
  bucket,
  division,
  fetchApplicationsByDivision,
  fetchApplicationHistory,
  onClose,
}) {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyApplicationId, setHistoryApplicationId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    fetchApplicationsByDivision(userId, division.division_code, bucket.key)
      .then((response) => {
        if (!cancelled) setApplications(Array.isArray(response.data) ? response.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || err.message || "Failed to load applications.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, division.division_code, bucket.key, fetchApplicationsByDivision]);

  return (
    <div className="ce-overdue-modal" role="dialog" aria-modal="true">
      <div className="ce-overdue-modal__card">
        <div className="ce-overdue-modal__header">
          <div>
            <h3>{division.division_name || "Division"} applications</h3>
            <p>{bucket.label} overdue</p>
          </div>
          <button className="ce-overdue-panel__close" type="button" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="ce-overdue-modal__body">
          {isLoading ? (
            <div className="ce-overdue-state">
              <LoaderCircle size={18} className="ce-overdue-spin" /> Loading applications...
            </div>
          ) : error ? (
            <div className="ce-overdue-error">{error}</div>
          ) : applications.length === 0 ? (
            <div className="ce-overdue-state">No applications found.</div>
          ) : (
            <div className="ce-overdue-modal__table-wrap">
              <table className="ce-overdue-table ce-overdue-app-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Organisation Name</th>
                    <th>Block</th>
                    <th>Village</th>
                    <th>Applicant Name</th>
                    <th>Connection Type</th>
                    <th>Application Status</th>
                    <th>Check Application History</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.application_id}>
                      <td className="ce-overdue-table__name">{app.application_id || "-"}</td>
                      <td>{app.organisation_name || "-"}</td>
                      <td>{app.block || "-"}</td>
                      <td>{app.village || "-"}</td>
                      <td>{app.name || "-"}</td>
                      <td>{app.type_of_connection || "-"}</td>
                      <td>
                        <span className="ce-overdue-pill" style={getApplicationStatusStyle(app.application_status)}>
                          {formatApplicationStatus(app.application_status)}
                        </span>
                      </td>
                      <td className="ce-overdue-history-cell">
                        <button
                          type="button"
                          className="ce-overdue-history-btn"
                          onClick={() => setHistoryApplicationId(app.application_id)}
                          aria-label={`Check application history for ${app.application_id}`}
                          title="Check history"
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

      {historyApplicationId ? (
        <ApplicationHistoryModal
          userId={userId}
          applicationId={historyApplicationId}
          fetchApplicationHistory={fetchApplicationHistory}
          onClose={() => setHistoryApplicationId(null)}
        />
      ) : null}
    </div>
  );
}

function DivisionPanel({
  userId,
  bucket,
  fetchOverdueByDivision,
  fetchApplicationsByDivision,
  fetchApplicationHistory,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDivision, setSelectedDivision] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError("");
    fetchOverdueByDivision(userId, bucket.key)
      .then((response) => {
        if (!cancelled) setRows(Array.isArray(response.data) ? response.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || err.message || "Failed to load.");
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId, bucket.key, fetchOverdueByDivision]);

  const total = rows.reduce((s, r) => s + (r.application_count || 0), 0);

  return (
    <div className="ce-overdue-panel">
      <div className="ce-overdue-panel__header" style={{ borderBottomColor: bucket.color }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="ce-overdue-panel__badge" style={{ background: bucket.bg, color: bucket.text }}>
            <span className="ce-overdue-panel__bdot" style={{ background: bucket.color }} />
            {bucket.label} overdue
          </span>
          <span className="ce-overdue-panel__title">Division-wise breakdown</span>
        </div>
        <button className="ce-overdue-panel__close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </div>

      <div className="ce-overdue-panel__body">
        {isLoading ? (
          <div className="ce-overdue-state">
            <LoaderCircle size={18} className="ce-overdue-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="ce-overdue-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="ce-overdue-state">No overdue applications in this range.</div>
        ) : (
          <table className="ce-overdue-table">
            <thead>
              <tr><th>#</th><th>Division name</th><th>Applications</th><th>Share</th><th>Avg delay</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pct = total > 0 ? Math.round((r.application_count / total) * 100) : 0;
                return (
                  <tr key={r.division_code}>
                    <td className="ce-overdue-table__idx">{i + 1}</td>
                    <td className="ce-overdue-table__name">{r.division_name || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="ce-overdue-pill ce-overdue-pill--button"
                        style={{ background: bucket.bg, color: bucket.text }}
                        onClick={() => setSelectedDivision(r)}
                      >
                        {r.application_count}
                      </button>
                    </td>
                    <td>
                      <div className="ce-overdue-bar-wrap">
                        <div className="ce-overdue-bar" style={{ width: `${pct}%`, background: bucket.color }} />
                        <span className="ce-overdue-pct">{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: bucket.text }}>
                        {Number(r.avg_overdue_days || 0).toFixed(1)}d avg
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="ce-overdue-table__foot-label">Total</td>
                <td colSpan={3}>
                  <span className="ce-overdue-pill" style={{ background: bucket.color, color: "#fff" }}>
                    {total} applications
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {selectedDivision ? (
        <ApplicationsModal
          userId={userId}
          bucket={bucket}
          division={selectedDivision}
          fetchApplicationsByDivision={fetchApplicationsByDivision}
          fetchApplicationHistory={fetchApplicationHistory}
          onClose={() => setSelectedDivision(null)}
        />
      ) : null}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CEDashboardOverduePieChart({
  userId,
  titlePrefix = "CE",
  fetchOverdueSummary = fetchCEOverdueSummary,
  fetchOverdueByDivision = fetchCEOverdueByDivision,
  fetchApplicationsByDivision = fetchCEOverdueApplicationsByDivision,
  fetchApplicationHistory = fetchCEOverdueApplicationHistory,
}) {
  const canvasRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeBucket, setActiveBucket] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setIsLoading(true); setError("");
    fetchOverdueSummary(userId)
      .then((response) => {
        if (!cancelled) setSummary(response.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.error || e.message || "Failed to load.");
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId, fetchOverdueSummary]);

  const vals = summary
    ? BUCKETS.map((b) => summary[`bucket_${b.key}`] ?? 0)
    : [0, 0, 0, 0];
  const total = vals.reduce((s, v) => s + v, 0);

  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    const ctx = canvasRef.current.getContext("2d");
    drawPie2D(ctx, vals, total, activeBucket?.key ?? null);
  }, [vals, total, activeBucket, isLoading]);

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const hit = hitTestPie(mx, my, vals, total);
    if (!hit) return;
    const bucket = BUCKETS.find((b) => b.key === hit);
    setActiveBucket((prev) => (prev?.key === hit ? null : bucket));
  }, [vals, total]);

  return (
    <div className="ce-overdue-card">
      <div className="ce-overdue-card__head">
        <h3 className="ce-overdue-card__title">{titlePrefix} overdue applications</h3>
        <p className="ce-overdue-card__sub">
          From <code>sla_tracking</code>: completed_time − due_time &nbsp;·&nbsp; Click a slice for division details
        </p>
      </div>

      {isLoading ? (
        <div className="ce-overdue-state">
          <LoaderCircle size={18} className="ce-overdue-spin" /> Loading chart…
        </div>
      ) : error ? (
        <div className="ce-overdue-error">{error}</div>
      ) : (
        <>
          <div className="ce-overdue-body">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="ce-overdue-canvas"
              onClick={handleCanvasClick}
              style={{ cursor: "pointer" }}
              role="img"
              aria-label="Pie chart of overdue applications by delay range"
            />
            <div className="ce-overdue-legend">
              {BUCKETS.map((b, i) => {
                const pct = total > 0 ? Math.round((vals[i] / total) * 100) : 0;
                return (
                  <div
                    key={b.key}
                    className={`ce-overdue-leg-row${activeBucket?.key === b.key ? " active" : ""}`}
                    style={{ "--lc": b.color, "--lpb": b.bg, "--lpt": b.text }}
                  >
                    <span className="ce-overdue-leg-dot" />
                    <span className="ce-overdue-leg-label">{b.label}</span>
                    <span style={{ fontSize: 11, color: "var(--lpt)", marginRight: 4 }}>{pct}%</span>
                    <span className="ce-overdue-leg-count">{vals[i]}</span>
                  </div>
                );
              })}
              <p className="ce-overdue-hint">Click a pie slice for division details</p>
            </div>
          </div>

          {activeBucket && (
            <DivisionPanel
              userId={userId}
              bucket={activeBucket}
              fetchOverdueByDivision={fetchOverdueByDivision}
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
