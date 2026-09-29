"use client";

import ProgressBar from "./ProgressBar";
import {
  PaletteIcon,
  WrenchIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  TrophyIcon,
  TargetIcon,
  AlertTriangleIcon,
} from "./Icons";
import { formatDateRange } from "@/lib/dateUtils";

interface DeptUpdateItem {
  id: number;
  department: string;
  notes: string;
}

export interface Report {
  id: number;
  project_name: string;
  week_no: number;
  start_date?: string;
  end_date?: string;
  planned_progress: number;
  actual_progress: number;
  cumulative_planned?: number;
  cumulative_actual?: number;
  cumulative_variance?: number;
  last_week_planned?: number;
  last_week_actual?: number;
  last_week_variance?: number;
  this_week_plan?: number;
  major_wins?: string[];
  major_plans?: string[];
  constraints?: string[];
  author_name?: string;
  author_role?: string;
  created_at: string;
  department_updates: DeptUpdateItem[];
}

function getDeptIcon(dept: string) {
  switch (dept) {
    case "Design":
      return <PaletteIcon size={15} />;
    case "Plant & Equipment":
      return <WrenchIcon size={15} />;
    default:
      return <TagIcon size={15} />;
  }
}

export default function ReportCard({ report }: { report: Report }) {
  const cPlanned = Number(report.cumulative_planned ?? report.planned_progress ?? 0);
  const cActual = Number(report.cumulative_actual ?? report.actual_progress ?? 0);
  const cVariance = Number(report.cumulative_variance ?? (cActual - cPlanned));

  const hasLastWeek = report.last_week_planned !== undefined || report.last_week_actual !== undefined;
  const lwPlanned = Number(report.last_week_planned ?? 0);
  const lwActual = Number(report.last_week_actual ?? 0);
  const lwVariance = Number(report.last_week_variance ?? (lwActual - lwPlanned));

  const hasThisWeekPlan = report.this_week_plan !== undefined && Number(report.this_week_plan) > 0;

  return (
    <article className="report-card" id={`report-card-${report.id}`}>
      <div className="report-card-header">
        <div>
          <div className="report-card-title">{report.project_name}</div>
          <div className="report-card-meta">
            <span className="report-card-week" title="Reporting Period">
              <CalendarIcon size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 5 }} />
              {formatDateRange(report.start_date, report.end_date, report.created_at)}
            </span>
            {report.author_name && (
              <span className="report-author-tag">
                <UserIcon size={12} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 3 }} />
                {report.author_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Cumulative Visual Progress */}
      <div className="report-progress-wrapper">
        <div className="progress-tier-title">Cumulative Progress to Date</div>
        <ProgressBar planned={cPlanned} actual={cActual} />
      </div>

      {/* Detailed Multi-Tier Progress Metrics */}
      <div className="multi-tier-metrics-row">
        {/* Cumulative */}
        <div className="tier-metric-item">
          <span className="tier-metric-label">Cumulative Variance</span>
          <span className={`tier-metric-val ${cVariance >= 0 ? "positive" : "negative"}`}>
            {cVariance >= 0 ? "+" : ""}{cVariance.toFixed(1)}%
          </span>
        </div>

        {/* Previous Period Progress */}
        {hasLastWeek && (lwPlanned > 0 || lwActual > 0) && (
          <div className="tier-metric-item">
            <span className="tier-metric-label">Previous Period (Act vs Pln)</span>
            <span className="tier-metric-val">
              {lwActual.toFixed(1)}% / {lwPlanned.toFixed(1)}%
              <span className={`tier-mini-var ${lwVariance >= 0 ? "positive" : "negative"}`}>
                ({lwVariance >= 0 ? "+" : ""}{lwVariance.toFixed(1)}%)
              </span>
            </span>
          </div>
        )}

        {/* Upcoming Period Target */}
        {hasThisWeekPlan && (
          <div className="tier-metric-item highlight">
            <span className="tier-metric-label">
              <ClockIcon size={11} style={{ display: "inline", marginRight: 3 }} />
              Upcoming Target
            </span>
            <span className="tier-metric-val accent">
              {Number(report.this_week_plan).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Constraints & Operational Highlights Sections */}
      {((report.major_wins && report.major_wins.length > 0) ||
        (report.major_plans && report.major_plans.length > 0) ||
        (report.constraints && report.constraints.length > 0)) && (
        <div className="report-constraints-container">
          {/* Major Wins */}
          {report.major_wins && report.major_wins.length > 0 && (
            <div className="report-constraint-block wins">
              <div className="report-constraint-header">
                <span className="report-constraint-tag wins">
                  <TrophyIcon size={13} />
                  <span>Major Wins of Last Week</span>
                </span>
                <span className="report-constraint-count">{report.major_wins.length} logged</span>
              </div>
              <table className="report-constraint-table">
                <tbody>
                  {report.major_wins.map((win, idx) => (
                    <tr key={`card-win-${idx}`}>
                      <td className="report-td-num">#{idx + 1}</td>
                      <td className="report-td-text">{win}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Major Plans */}
          {report.major_plans && report.major_plans.length > 0 && (
            <div className="report-constraint-block plans">
              <div className="report-constraint-header">
                <span className="report-constraint-tag plans">
                  <TargetIcon size={13} />
                  <span>Major Plans of This Week</span>
                </span>
                <span className="report-constraint-count">{report.major_plans.length} planned</span>
              </div>
              <table className="report-constraint-table">
                <tbody>
                  {report.major_plans.map((plan, idx) => (
                    <tr key={`card-plan-${idx}`}>
                      <td className="report-td-num">#{idx + 1}</td>
                      <td className="report-td-text">{plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Constraints List */}
          {report.constraints && report.constraints.length > 0 && (
            <div className="report-constraint-block constraints">
              <div className="report-constraint-header">
                <span className="report-constraint-tag constraints">
                  <AlertTriangleIcon size={13} />
                  <span>Constraints List</span>
                </span>
                <span className="report-constraint-count">{report.constraints.length} reported</span>
              </div>
              <table className="report-constraint-table">
                <tbody>
                  {report.constraints.map((c, idx) => (
                    <tr key={`card-c-${idx}`}>
                      <td className="report-td-num">#{idx + 1}</td>
                      <td className="report-td-text">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Department Updates Accordion (historical compatibility) */}
      {report.department_updates && report.department_updates.length > 0 && (
        <div className="dept-accordion" role="list">
          {report.department_updates.map((du) => (
            <div className="dept-accordion-item" key={du.id} role="listitem">
              <div className="dept-accordion-header">
                <span className="dept-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", color: "var(--ecwc-green)" }}>
                  {getDeptIcon(du.department)}
                </span>
                {du.department}
              </div>
              {du.notes && (
                <div className="dept-accordion-body">{du.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
