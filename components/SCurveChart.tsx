"use client";
import { useState } from "react";
import { formatShortDate, formatDateRange } from "@/lib/dateUtils";

export interface DataPoint {
  week_no?: number;
  start_date?: string;
  end_date?: string;
  planned_progress: number;
  actual_progress: number;
  project_name?: string;
  created_at?: string;
  dept_updates_count?: number;
}

interface SCurveChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
}

export default function SCurveChart({ data, title = "Progress Tracking (S-Curve)", subtitle }: SCurveChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort chronologically by calendar date
  const getTime = (pt: DataPoint) => {
    if (pt.end_date) return new Date(pt.end_date).getTime();
    if (pt.start_date) return new Date(pt.start_date).getTime();
    if (pt.created_at) return new Date(pt.created_at).getTime();
    return pt.week_no || 0;
  };
  const sortedData = [...data].sort((a, b) => getTime(a) - getTime(b));

  const width = 760;
  const height = 300;
  const padLeft = 55;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  if (sortedData.length === 0) {
    return (
      <div className="scurve-container empty">
        <div className="scurve-header">
          <div>
            <h3 className="scurve-title">{title}</h3>
            {subtitle && <p className="scurve-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="scurve-empty-placeholder">
          <p>No progress data logged yet for this selection.</p>
        </div>
      </div>
    );
  }

  // Calculate X coordinates
  const getX = (index: number) => {
    if (sortedData.length === 1) return padLeft + chartW / 2;
    return padLeft + (index / (sortedData.length - 1)) * chartW;
  };

  // Calculate Y coordinates (0% to 100%)
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return padTop + chartH - (clamped / 100) * chartH;
  };

  // Generate SVG path for a line
  const createPath = (key: "planned_progress" | "actual_progress") => {
    if (sortedData.length === 1) {
      const x = getX(0);
      const y = getY(sortedData[0][key]);
      return `M ${x - 20},${y} L ${x + 20},${y}`;
    }

    return sortedData.reduce((acc, pt, i) => {
      const x = getX(i);
      const y = getY(pt[key]);
      if (i === 0) return `M ${x.toFixed(1)},${y.toFixed(1)}`;
      // Smooth cubic bezier
      const prevX = getX(i - 1);
      const prevY = getY(sortedData[i - 1][key]);
      const cpX1 = prevX + (x - prevX) * 0.45;
      const cpX2 = x - (x - prevX) * 0.45;
      return `${acc} C ${cpX1.toFixed(1)},${prevY.toFixed(1)} ${cpX2.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    }, "");
  };

  const plannedPath = createPath("planned_progress");
  const actualPath = createPath("actual_progress");

  // Generate filled area under actual path
  const areaPath = sortedData.length === 1
    ? ""
    : `${actualPath} L ${getX(sortedData.length - 1).toFixed(1)},${(padTop + chartH).toFixed(1)} L ${getX(0).toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;

  const yTicks = [0, 25, 50, 75, 100];
  const activePt = hoveredIndex !== null ? sortedData[hoveredIndex] : null;

  return (
    <div className="scurve-container">
      <div className="scurve-header">
        <div>
          <h3 className="scurve-title">{title}</h3>
          {subtitle && <p className="scurve-subtitle">{subtitle}</p>}
        </div>
        <div className="scurve-legend">
          <div className="scurve-legend-item">
            <span className="legend-line planned" />
            <span>Planned Progress</span>
          </div>
          <div className="scurve-legend-item">
            <span className="legend-line actual" />
            <span>Actual Progress</span>
          </div>
        </div>
      </div>

      <div className="scurve-svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="scurve-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ecwc-green)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--ecwc-green)" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter for actual path */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--ecwc-green)" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Horizontal Grid lines and Y-axis labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick} className="grid-row">
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray={tick === 0 ? undefined : "4,4"}
                  strokeWidth={tick === 0 ? "1.5" : "1"}
                  opacity={tick === 0 ? 0.8 : 0.5}
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-text"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Area fill under Actual curve */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#actualGradient)"
              className="chart-area"
            />
          )}

          {/* Planned Progress Curve */}
          <path
            d={plannedPath}
            fill="none"
            stroke="var(--warning)"
            strokeWidth="2.5"
            strokeDasharray="6,5"
            strokeLinecap="round"
            className="chart-curve planned"
          />

          {/* Actual Progress Curve */}
          <path
            d={actualPath}
            fill="none"
            stroke="var(--ecwc-green)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#glow)"
            className="chart-curve actual"
          />

          {/* Active Guideline */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              y1={padTop}
              x2={getX(hoveredIndex)}
              y2={padTop + chartH}
              stroke="var(--text-muted)"
              strokeDasharray="3,3"
              strokeWidth="1.2"
              opacity="0.8"
            />
          )}

          {/* Data Points and Interaction Circles */}
          {sortedData.map((pt, i) => {
            const x = getX(i);
            const plannedY = getY(pt.planned_progress);
            const actualY = getY(pt.actual_progress);
            const isHovered = hoveredIndex === i;

            return (
              <g key={i} className="chart-node-group">
                {/* Planned Dot */}
                <circle
                  cx={x}
                  cy={plannedY}
                  r={isHovered ? 5.5 : 4}
                  fill="var(--bg-surface)"
                  stroke="var(--warning)"
                  strokeWidth="2"
                  className="chart-dot planned"
                />

                {/* Actual Dot */}
                <circle
                  cx={x}
                  cy={actualY}
                  r={isHovered ? 7 : 5}
                  fill={isHovered ? "var(--accent-light)" : "var(--ecwc-green)"}
                  stroke="var(--bg-surface)"
                  strokeWidth="2.5"
                  className="chart-dot actual"
                />

                {/* X-axis Calendar Date Label */}
                <text
                  x={x}
                  y={padTop + chartH + 20}
                  textAnchor="middle"
                  className={`chart-axis-text ${isHovered ? "active" : ""}`}
                >
                  {formatShortDate(pt.end_date || pt.created_at) || `Period ${i + 1}`}
                </text>

                {/* Invisible hit area for smooth hover */}
                <rect
                  x={x - 22}
                  y={padTop}
                  width={44}
                  height={chartH + 30}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {activePt && hoveredIndex !== null && (
          <div
            className="scurve-tooltip"
            style={{
              left: `${(getX(hoveredIndex) / width) * 100}%`,
              top: `${(getY(activePt.actual_progress) / height) * 100}%`,
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-week">
                {formatDateRange(activePt.start_date, activePt.end_date, activePt.created_at)}
              </span>
              {activePt.project_name && (
                <span className="tooltip-project">{activePt.project_name}</span>
              )}
            </div>
            <div className="tooltip-row">
              <span className="label">Planned:</span>
              <span className="value planned">{Number(activePt.planned_progress).toFixed(1)}%</span>
            </div>
            <div className="tooltip-row">
              <span className="label">Actual:</span>
              <span className="value actual">{Number(activePt.actual_progress).toFixed(1)}%</span>
            </div>
            <div className="tooltip-variance">
              {(() => {
                const diff = Number(activePt.actual_progress) - Number(activePt.planned_progress);
                const isAhead = diff >= 0;
                return (
                  <span className={`badge-pill ${isAhead ? "badge-success" : "badge-danger"}`}>
                    {isAhead ? `+${diff.toFixed(1)}% Ahead` : `${diff.toFixed(1)}% Lagging`}
                  </span>
                );
              })()}
              {activePt.dept_updates_count !== undefined && activePt.dept_updates_count > 0 && (
                <span className="tooltip-dept-count">
                  {activePt.dept_updates_count} dept note{activePt.dept_updates_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
