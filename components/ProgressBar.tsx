"use client";

interface ProgressBarProps {
  planned: number;
  actual: number;
}

export default function ProgressBar({ planned, actual }: ProgressBarProps) {
  const diff = actual - planned;
  const diffColor =
    diff >= 0 ? "var(--success)" : "var(--danger)";

  return (
    <div className="progress-bars">
      <div className="progress-bar-row">
        <div className="progress-bar-meta">
          <span className="progress-bar-label">Planned</span>
          <span className="progress-bar-pct" style={{ color: "var(--accent-light)" }}>
            {Number(planned).toFixed(1)}%
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill planned"
            style={{ width: `${Math.min(Number(planned), 100)}%` }}
          />
        </div>
      </div>

      <div className="progress-bar-row">
        <div className="progress-bar-meta">
          <span className="progress-bar-label">Actual</span>
          <span className="progress-bar-pct" style={{ color: "var(--success)" }}>
            {Number(actual).toFixed(1)}%
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill actual"
            style={{ width: `${Math.min(Number(actual), 100)}%` }}
          />
        </div>
      </div>

      {(planned > 0 || actual > 0) && (
        <div style={{ textAlign: "right", fontSize: "0.78rem", fontWeight: 600, color: diffColor, marginTop: 4 }}>
          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}% vs planned
        </div>
      )}
    </div>
  );
}
