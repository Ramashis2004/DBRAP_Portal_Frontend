
import { useEffect, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import { fetchSEStatusCounts } from "../api/api";
import "./SEStatusCards.css";

const COLOR_MAP = {
  blue: {
    card: { background: "#eff6ff", border: "1.5px solid #bfdbfe" },
    icon: { background: "#dbeafe", color: "#1d4ed8" },
    count: { color: "#1d4ed8" },
    label: { color: "#1e3a5f" },
    badge: { background: "#dbeafe", color: "#1d4ed8" },
  },
  amber: {
    card: { background: "#fffbeb", border: "1.5px solid #fde68a" },
    icon: { background: "#fef3c7", color: "#b45309" },
    count: { color: "#b45309" },
    label: { color: "#451a03" },
    badge: { background: "#fef3c7", color: "#92400e" },
  },
  purple: {
    card: { background: "#faf5ff", border: "1.5px solid #ddd6fe" },
    icon: { background: "#ede9fe", color: "#7c3aed" },
    count: { color: "#7c3aed" },
    label: { color: "#2e1065" },
    badge: { background: "#ede9fe", color: "#6d28d9" },
  },
  green: {
    card: { background: "#f0fdf4", border: "1.5px solid #bbf7d0" },
    icon: { background: "#dcfce7", color: "#166534" },
    count: { color: "#166534" },
    label: { color: "#14532d" },
    badge: { background: "#dcfce7", color: "#166534" },
  },
  red: {
    card: { background: "#fff1f2", border: "1.5px solid #fecdd3" },
    icon: { background: "#fee2e2", color: "#b91c1c" },
    count: { color: "#b91c1c" },
    label: { color: "#450a0a" },
    badge: { background: "#fee2e2", color: "#b91c1c" },
  },
  orange: {
    card: { background: "#fff7ed", border: "1.5px solid #fed7aa" },
    icon: { background: "#ffedd5", color: "#c2410c" },
    count: { color: "#c2410c" },
    label: { color: "#431407" },
    badge: { background: "#ffedd5", color: "#c2410c" },
  },
  teal: {
    card: { background: "#f0fdfa", border: "1.5px solid #99f6e4" },
    icon: { background: "#ccfbf1", color: "#0f766e" },
    count: { color: "#0f766e" },
    label: { color: "#042f2e" },
    badge: { background: "#ccfbf1", color: "#0f766e" },
  },
  emerald: {
    card: { background: "#ecfdf5", border: "1.5px solid #a7f3d0" },
    icon: { background: "#d1fae5", color: "#065f46" },
    count: { color: "#065f46" },
    label: { color: "#022c22" },
    badge: { background: "#d1fae5", color: "#065f46" },
  },
};

function StatusCard({ item, onClick }) {
  const colors = COLOR_MAP[item.colorKey] || COLOR_MAP.blue;

  return (
    <button
      className="se-status-card"
      onClick={() => onClick(item)}
      style={colors.card}
    >
      <div className="se-status-icon" style={colors.icon}>
        <FileText size={20} />
      </div>

      <div className="se-status-content">
        <p className="se-status-count" style={colors.count}>
          {item.count}
        </p>

        <p className="se-status-label" style={colors.label}>
          {item.label}
        </p>
      </div>

    </button>
  );
}

function TotalCard({ count, onClick }) {
  return (
    <button className="se-status-card total-card" onClick={onClick}>
      <div className="se-status-icon total-icon">
        <FileText size={20} />
      </div>

      <div className="se-status-content">
        <p className="se-status-count total-count">
          {count}
        </p>

        <p className="se-status-label total-label">
          Total No. of Applications
        </p>
      </div>

    </button>
  );
}

export default function SEStatusCards({
  userId,
  onCardClick,
  onTotalClick
}) {
  const [data, setData] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    fetchSEStatusCounts(userId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="se-loading">
        <LoaderCircle className="spin" />
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h3 className="se-summary-title">
        Application Summary
      </h3>

      <div className="se-status-grid">
        <TotalCard
          count={data.totalApplications}
          onClick={onTotalClick}
        />

        {data.statusCounts.map((item) => (
          <StatusCard
            key={item.status}
            item={item}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}