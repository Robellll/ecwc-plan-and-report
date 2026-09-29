"use client";

import { useState, useMemo } from "react";
import SCurveChart, { DataPoint } from "./SCurveChart";
import { formatDate, formatDateRange } from "@/lib/dateUtils";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  BarChartIcon,
  CalendarIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  LayersIcon,
  BuildingIcon,
  SearchIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  UserIcon,
  CheckSquareIcon,
} from "./Icons";
import { SessionUser } from "./AuthModal";

export interface DeptUpdateItem {
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
  created_at: string;
  author_name?: string;
  department_updates: DeptUpdateItem[];
}

interface ProjectAnalysisViewProps {
  reports: Report[];
  user: SessionUser;
  onNavigateToCreateReport?: () => void;
}

export default function ProjectAnalysisView({
  reports,
  user,
  onNavigateToCreateReport,
}: ProjectAnalysisViewProps) {
  // If user has a default project name, check if reports exist for it
  const defaultProject = useMemo(() => {
    if (user.project_name && reports.some((r) => r.project_name?.trim() === user.project_name?.trim())) {
      return user.project_name.trim();
    }
    return null;
  }, [user.project_name, reports]);

  const [selectedProject, setSelectedProject] = useState<string | null>(defaultProject);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_TRACK" | "DELAYED" | "AHEAD">("ALL");
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);

  // Group and sort reports by project
  const projectSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        projectName: string;
        reports: Report[];
        latestReport: Report;
        previousReport: Report | null;
        currActual: number;
        currPlanned: number;
        currVariance: number;
        prevActual: number;
        prevPlanned: number;
        prevVariance: number;
        velocity: number;
        healthStatus: "ahead" | "on_track" | "minor_delay" | "critical_delay";
      }
    >();

    reports.forEach((r) => {
      const name = r.project_name?.trim();
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, {
          projectName: name,
          reports: [],
          latestReport: r,
          previousReport: null,
          currActual: 0,
          currPlanned: 0,
          currVariance: 0,
          prevActual: 0,
          prevPlanned: 0,
          prevVariance: 0,
          velocity: 0,
          healthStatus: "on_track",
        });
      }
      map.get(name)!.reports.push(r);
    });

    // Compute metrics for each project
    map.forEach((item) => {
      // Sort chronologically: oldest to newest
      item.reports.sort((a, b) => {
        const timeA = new Date(a.end_date || a.start_date || a.created_at).getTime();
        const timeB = new Date(b.end_date || b.start_date || b.created_at).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (a.week_no || 0) - (b.week_no || 0);
      });

      const count = item.reports.length;
      const latest = item.reports[count - 1];
      const previous = count > 1 ? item.reports[count - 2] : null;

      item.latestReport = latest;
      item.previousReport = previous;

      const currActual = Number(latest.cumulative_actual ?? latest.actual_progress ?? 0);
      const currPlanned = Number(latest.cumulative_planned ?? latest.planned_progress ?? 0);
      const currVariance = Number(
        latest.cumulative_variance !== undefined
          ? latest.cumulative_variance
          : currActual - currPlanned
      );

      const prevActual = previous
        ? Number(previous.cumulative_actual ?? previous.actual_progress ?? 0)
        : Number(latest.last_week_actual ?? 0);
      const prevPlanned = previous
        ? Number(previous.cumulative_planned ?? previous.planned_progress ?? 0)
        : Number(latest.last_week_planned ?? 0);
      const prevVariance = previous
        ? Number(
            previous.cumulative_variance !== undefined
              ? previous.cumulative_variance
              : prevActual - prevPlanned
          )
        : Number(latest.last_week_variance ?? prevActual - prevPlanned);

      const velocity = currActual - prevActual;

      let healthStatus: "ahead" | "on_track" | "minor_delay" | "critical_delay" = "on_track";
      if (currVariance >= 2.0) {
        healthStatus = "ahead";
      } else if (currVariance >= -2.0) {
        healthStatus = "on_track";
      } else if (currVariance >= -5.0) {
        healthStatus = "minor_delay";
      } else {
        healthStatus = "critical_delay";
      }

      item.currActual = currActual;
      item.currPlanned = currPlanned;
      item.currVariance = currVariance;
      item.prevActual = prevActual;
      item.prevPlanned = prevPlanned;
      item.prevVariance = prevVariance;
      item.velocity = velocity;
      item.healthStatus = healthStatus;
    });

    return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [reports]);

  // List of all project names for selector
  const allProjectNames = useMemo(() => {
    return projectSummaries.map((p) => p.projectName);
  }, [projectSummaries]);

  // Filtered project list for Project Selector Grid
  const filteredProjects = useMemo(() => {
    return projectSummaries.filter((p) => {
      const matchesSearch = p.projectName.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "AHEAD") return p.healthStatus === "ahead";
      if (statusFilter === "ON_TRACK") return p.healthStatus === "on_track";
      if (statusFilter === "DELAYED")
        return p.healthStatus === "minor_delay" || p.healthStatus === "critical_delay";
      return true;
    });
  }, [projectSummaries, searchQuery, statusFilter]);

  // Active Project Data
  const currentSummary = useMemo(() => {
    if (!selectedProject) return null;
    return projectSummaries.find((p) => p.projectName === selectedProject) || null;
  }, [selectedProject, projectSummaries]);

  // S-Curve data points for active project
  const scurveData: DataPoint[] = useMemo(() => {
    if (!currentSummary) return [];
    return currentSummary.reports.map((r) => ({
      week_no: r.week_no,
      start_date: r.start_date,
      end_date: r.end_date,
      created_at: r.created_at,
      planned_progress: Number(r.cumulative_planned ?? r.planned_progress ?? 0),
      actual_progress: Number(r.cumulative_actual ?? r.actual_progress ?? 0),
      project_name: r.project_name,
      dept_updates_count: r.department_updates?.length || 0,
    }));
  }, [currentSummary]);

  // Inter-departmental comparison for active project: previous vs current
  const departmentComparison = useMemo(() => {
    if (!currentSummary) return [];
    const currUpdates = currentSummary.latestReport.department_updates || [];
    const prevUpdates = currentSummary.previousReport?.department_updates || [];

    const depts = new Set<string>();
    currUpdates.forEach((u) => depts.add(u.department));
    prevUpdates.forEach((u) => depts.add(u.department));

    return Array.from(depts)
      .sort()
      .map((dept) => {
        const curr = currUpdates.find((u) => u.department === dept);
        const prev = prevUpdates.find((u) => u.department === dept);
        return {
          department: dept,
          currentNotes: curr ? curr.notes : null,
          previousNotes: prev ? prev.notes : null,
        };
      });
  }, [currentSummary]);

  // ─────────────────────────────────────────────────────────────
  // RENDER: STEP 1 - PROJECT SELECTOR GRID
  // ─────────────────────────────────────────────────────────────
  if (!selectedProject || !currentSummary) {
    return (
      <div className="analysis-view animate-fade-in">
        {/* Banner */}
        <div className="analysis-header-card">
          <div className="analysis-header-badge">
            <BarChartIcon size={14} />
            <span>Project Review &amp; Deep Analysis</span>
          </div>
          <h2 className="analysis-title">Select a Project to Review</h2>
          <p className="analysis-subtitle">
            Choose any project below to inspect week-over-week velocity, compare previous vs. current status, analyze S-Curve milestones, and audit departmental execution.
          </p>

          {/* Search & Filter Controls */}
          <div className="analysis-filter-bar">
            <div className="analysis-search-box">
              <SearchIcon size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search project by name..."
                className="analysis-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="analysis-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="analysis-filter-pills">
              <button
                type="button"
                className={`filter-pill ${statusFilter === "ALL" ? "active" : ""}`}
                onClick={() => setStatusFilter("ALL")}
              >
                All Projects ({projectSummaries.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === "ON_TRACK" ? "active" : ""}`}
                onClick={() => setStatusFilter("ON_TRACK")}
              >
                <CheckCircleIcon size={14} />
                <span>On Track</span>
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === "AHEAD" ? "active" : ""}`}
                onClick={() => setStatusFilter("AHEAD")}
              >
                <TrendingUpIcon size={14} />
                <span>Ahead</span>
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === "DELAYED" ? "active" : ""}`}
                onClick={() => setStatusFilter("DELAYED")}
              >
                <AlertTriangleIcon size={14} />
                <span>Delayed</span>
              </button>
            </div>
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="analysis-empty-card">
            <p>No projects match your filter or search query.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="analysis-projects-grid">
            {filteredProjects.map((p) => {
              const isUserProject = user.project_name && p.projectName.toLowerCase() === user.project_name.toLowerCase();
              const dateLabel = formatDateRange(
                p.latestReport.start_date,
                p.latestReport.end_date,
                p.latestReport.created_at
              );

              return (
                <div
                  key={p.projectName}
                  className={`analysis-project-card ${isUserProject ? "user-assigned" : ""}`}
                  onClick={() => setSelectedProject(p.projectName)}
                >
                  <div className="project-card-header">
                    <div className="project-card-title-group">
                      <div className="project-card-icon">
                        <BuildingIcon size={20} />
                      </div>
                      <div>
                        <h3 className="project-card-name">{p.projectName}</h3>
                        <span className="project-card-meta">
                          {p.reports.length} report{p.reports.length !== 1 ? "s" : ""} logged · Week {p.latestReport.week_no}
                        </span>
                      </div>
                    </div>

                    {isUserProject && (
                      <span className="user-project-badge">Your Project</span>
                    )}
                  </div>

                  {/* Status Tag */}
                  <div className="project-status-row">
                    <span className={`status-chip ${p.healthStatus}`}>
                      {p.healthStatus === "ahead" && <TrendingUpIcon size={13} />}
                      {p.healthStatus === "on_track" && <CheckCircleIcon size={13} />}
                      {p.healthStatus === "minor_delay" && <AlertTriangleIcon size={13} />}
                      {p.healthStatus === "critical_delay" && <AlertCircleIcon size={13} />}
                      <span>
                        {p.healthStatus === "ahead"
                          ? `Ahead (+${p.currVariance.toFixed(1)}%)`
                          : p.healthStatus === "on_track"
                          ? `On Track (${p.currVariance >= 0 ? "+" : ""}${p.currVariance.toFixed(1)}%)`
                          : p.healthStatus === "minor_delay"
                          ? `Minor Delay (${p.currVariance.toFixed(1)}%)`
                          : `Critical Delay (${p.currVariance.toFixed(1)}%)`}
                      </span>
                    </span>
                    <span className="project-date-pill">
                      <CalendarIcon size={12} /> {dateLabel}
                    </span>
                  </div>

                  {/* Dual Progress Bar */}
                  <div className="project-progress-block">
                    <div className="progress-labels">
                      <span>Actual Progress</span>
                      <strong>{p.currActual.toFixed(1)}%</strong>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-fill actual"
                        style={{ width: `${Math.min(100, Math.max(0, p.currActual))}%` }}
                      />
                      <div
                        className="progress-marker planned"
                        style={{ left: `${Math.min(100, Math.max(0, p.currPlanned))}%` }}
                        title={`Planned: ${p.currPlanned.toFixed(1)}%`}
                      />
                    </div>
                    <div className="progress-sub-info">
                      <span>Planned: {p.currPlanned.toFixed(1)}%</span>
                      <span className={`gain-indicator ${p.velocity >= 0 ? "positive" : "negative"}`}>
                        {p.velocity >= 0 ? `▲ +${p.velocity.toFixed(1)}%` : `▼ ${p.velocity.toFixed(1)}%`} this week
                      </span>
                    </div>
                  </div>

                  {/* 3 Quick Metrics */}
                  <div className="project-metrics-mini-grid">
                    <div className="mini-metric">
                      <span className="metric-label">Variance</span>
                      <span className={`metric-value ${p.currVariance >= 0 ? "text-success" : "text-danger"}`}>
                        {p.currVariance >= 0 ? `+${p.currVariance.toFixed(1)}%` : `${p.currVariance.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="mini-metric">
                      <span className="metric-label">Previous Week</span>
                      <span className="metric-value">{p.prevActual.toFixed(1)}%</span>
                    </div>
                    <div className="mini-metric">
                      <span className="metric-label">Dept Updates</span>
                      <span className="metric-value">
                        {p.latestReport.department_updates?.length || 0} active
                      </span>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="project-card-footer">
                    <span>Review Detailed Analysis</span>
                    <ChevronRightIcon size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: STEP 2 - PROJECT DEEP-DIVE REVIEW DASHBOARD
  // ─────────────────────────────────────────────────────────────
  const curr = currentSummary.latestReport;
  const prev = currentSummary.previousReport;
  const isAhead = currentSummary.currVariance >= 2.0;
  const isOnTrack = currentSummary.currVariance >= -2.0 && currentSummary.currVariance < 2.0;
  const isDelayed = currentSummary.currVariance < -2.0;

  const currentPeriodLabel = formatDateRange(curr.start_date, curr.end_date, curr.created_at);
  const prevPeriodLabel = prev
    ? formatDateRange(prev.start_date, prev.end_date, prev.created_at)
    : "No prior logged week";

  return (
    <div className="analysis-detail-view animate-fade-in">
      {/* Top Navigation & Project Switcher Bar */}
      <div className="detail-top-nav">
        <button
          type="button"
          id="btn-back-to-all-projects"
          className="btn-back-projects"
          onClick={() => setSelectedProject(null)}
          title="Return to the project grid overview"
        >
          <ArrowLeftIcon size={16} />
          <span>All Projects Grid</span>
        </button>

        <div className="detail-project-selector">
          <label htmlFor="project-quick-switch" className="selector-label">
            Switch Project:
          </label>
          <select
            id="project-quick-switch"
            value={selectedProject || ""}
            onChange={(e) => {
              if (!e.target.value) {
                setSelectedProject(null);
              } else {
                setSelectedProject(e.target.value);
              }
            }}
            className="project-switch-dropdown"
          >
            <option value="">-- All Projects Grid --</option>
            {allProjectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {onNavigateToCreateReport && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onNavigateToCreateReport}
          >
            <ClipboardListIcon size={14} />
            <span>New Weekly Report</span>
          </button>
        )}
      </div>

      {/* Project Banner & Health Overview */}
      <div className="project-summary-banner">
        <div className="banner-main-col">
          <div className="banner-meta-row">
            <span className="meta-tag project-tag">
              <BuildingIcon size={13} /> {selectedProject}
            </span>
            <span className="meta-tag week-tag">
              <CalendarIcon size={13} /> Week {curr.week_no} ({currentPeriodLabel})
            </span>
            {curr.author_name && (
              <span className="meta-tag author-tag">
                <UserIcon size={13} /> Logged by: {curr.author_name}
              </span>
            )}
          </div>
          <h2 className="project-detail-title">{selectedProject}</h2>
          <p className="project-detail-desc">
            Comparative performance review tracking cumulative S-curve variance, weekly milestone progress, and inter-departmental commitments.
          </p>
        </div>

        {/* Global Health Badge Card */}
        <div className={`health-summary-badge-card ${currentSummary.healthStatus}`}>
          <div className="badge-icon-circle">
            {isAhead && <TrendingUpIcon size={24} />}
            {isOnTrack && <CheckCircleIcon size={24} />}
            {isDelayed && <AlertTriangleIcon size={24} />}
          </div>
          <div className="badge-details">
            <span className="health-label">PROJECT HEALTH</span>
            <h4 className="health-headline">
              {isAhead
                ? "Ahead of Schedule"
                : isOnTrack
                ? "On Track with Plan"
                : "Schedule Variance Alert"}
            </h4>
            <p className="health-sub">
              {currentSummary.currVariance >= 0
                ? `Actual progress leads planned schedule by +${currentSummary.currVariance.toFixed(1)}%`
                : `Actual progress trails planned schedule by ${Math.abs(currentSummary.currVariance).toFixed(1)}%`}
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: PREVIOUS VS. CURRENT STATUS COMPARATOR
          ───────────────────────────────────────────────────────────── */}
      <section className="analysis-section" aria-label="Status Comparison">
        <div className="section-title-wrap">
          <div className="section-icon-box green">
            <ActivityIcon size={18} />
          </div>
          <div>
            <h3 className="analysis-section-title">Previous vs. Current Status Comparison</h3>
            <p className="analysis-section-sub">
              Direct side-by-side audit of cumulative milestone progress, schedule variance, and velocity gained between reporting periods.
            </p>
          </div>
        </div>

        <div className="status-comparison-grid">
          {/* Card A: Previous Report */}
          <div className="comparison-card previous">
            <div className="card-badge-pill">
              <CalendarIcon size={12} />
              <span>{prev ? `Previous: Week ${prev.week_no}` : "Base / Initial Status"}</span>
            </div>
            <div className="period-date-text">{prevPeriodLabel}</div>

            <div className="comparison-metrics-list">
              <div className="metric-row">
                <span className="label">Cumulative Actual:</span>
                <span className="val bold">{currentSummary.prevActual.toFixed(1)}%</span>
              </div>
              <div className="metric-progress-track">
                <div
                  className="metric-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(0, currentSummary.prevActual))}%` }}
                />
              </div>

              <div className="metric-row">
                <span className="label">Cumulative Planned:</span>
                <span className="val">{currentSummary.prevPlanned.toFixed(1)}%</span>
              </div>

              <div className="metric-row">
                <span className="label">Schedule Variance:</span>
                <span
                  className={`val font-mono ${
                    currentSummary.prevVariance >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {currentSummary.prevVariance >= 0 ? `+` : ``}
                  {currentSummary.prevVariance.toFixed(1)}%
                </span>
              </div>

              {prev?.this_week_plan !== undefined && prev.this_week_plan > 0 && (
                <div className="metric-row highlight">
                  <span className="label">Target Was:</span>
                  <span className="val">{prev.this_week_plan}% gain</span>
                </div>
              )}
            </div>
          </div>

          {/* Center Column: Velocity & Direction Indicator */}
          <div className="comparison-delta-bridge">
            <div className="bridge-icon-wrapper">
              <span className="arrow-pulse">➔</span>
            </div>

            <div className={`velocity-pill ${currentSummary.velocity >= 0 ? "positive" : "negative"}`}>
              {currentSummary.velocity >= 0 ? (
                <>
                  <TrendingUpIcon size={16} />
                  <span>+{currentSummary.velocity.toFixed(1)}% Progress</span>
                </>
              ) : (
                <>
                  <TrendingDownIcon size={16} />
                  <span>{currentSummary.velocity.toFixed(1)}% Progress</span>
                </>
              )}
            </div>
            <span className="velocity-caption">Weekly Velocity Gain</span>

            {/* Gap improvement indicator */}
            {prev && (
              <div className="gap-trend-badge">
                {currentSummary.currVariance >= currentSummary.prevVariance ? (
                  <span className="trend-text good">
                    ▲ Variance improved by +
                    {(currentSummary.currVariance - currentSummary.prevVariance).toFixed(1)}%
                  </span>
                ) : (
                  <span className="trend-text warning">
                    ▼ Schedule gap widened by{" "}
                    {Math.abs(currentSummary.currVariance - currentSummary.prevVariance).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Card B: Current Report */}
          <div className="comparison-card current">
            <div className="card-badge-pill active">
              <CheckCircleIcon size={12} />
              <span>Current: Week {curr.week_no} (Latest)</span>
            </div>
            <div className="period-date-text">{currentPeriodLabel}</div>

            <div className="comparison-metrics-list">
              <div className="metric-row">
                <span className="label">Cumulative Actual:</span>
                <span className="val bold text-accent">{currentSummary.currActual.toFixed(1)}%</span>
              </div>
              <div className="metric-progress-track">
                <div
                  className="metric-progress-fill actual-current"
                  style={{ width: `${Math.min(100, Math.max(0, currentSummary.currActual))}%` }}
                />
              </div>

              <div className="metric-row">
                <span className="label">Cumulative Planned:</span>
                <span className="val">{currentSummary.currPlanned.toFixed(1)}%</span>
              </div>

              <div className="metric-row">
                <span className="label">Current Variance:</span>
                <span
                  className={`val font-mono bold ${
                    currentSummary.currVariance >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {currentSummary.currVariance >= 0 ? `+` : ``}
                  {currentSummary.currVariance.toFixed(1)}%
                  <span className="variance-tag">
                    {currentSummary.currVariance >= 0 ? " Ahead" : " Delayed"}
                  </span>
                </span>
              </div>

              {curr.this_week_plan !== undefined && curr.this_week_plan > 0 && (
                <div className="metric-row highlight next-plan">
                  <span className="label">Target For Next Week:</span>
                  <span className="val font-semibold">{curr.this_week_plan}% milestone</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: S-CURVE & HISTORICAL PROGRESS TRAJECTORY
          ───────────────────────────────────────────────────────────── */}
      <section className="analysis-section" aria-label="Progress Trajectory">
        <div className="section-title-wrap">
          <div className="section-icon-box blue">
            <BarChartIcon size={18} />
          </div>
          <div>
            <h3 className="analysis-section-title">Progress Trajectory &amp; S-Curve</h3>
            <p className="analysis-section-sub">
              Chronological planned vs. actual progress curves across all {currentSummary.reports.length} recorded reporting periods.
            </p>
          </div>
        </div>

        <div className="scurve-chart-wrapper">
          <SCurveChart
            data={scurveData}
            title={`${selectedProject} S-Curve`}
            subtitle={`Tracking planned vs actual progress from Week ${currentSummary.reports[0].week_no} to Week ${curr.week_no}`}
          />

          {/* Quick Metrics Strip below chart */}
          <div className="chart-metrics-strip">
            <div className="strip-item">
              <span className="strip-label">First Recorded Week</span>
              <span className="strip-value">Week {currentSummary.reports[0].week_no}</span>
            </div>
            <div className="strip-item">
              <span className="strip-label">Starting Progress</span>
              <span className="strip-value">
                {Number(
                  currentSummary.reports[0].cumulative_actual ??
                    currentSummary.reports[0].actual_progress ??
                    0
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="strip-item">
              <span className="strip-label">Current Progress</span>
              <span className="strip-value text-accent">{currentSummary.currActual.toFixed(1)}%</span>
            </div>
            <div className="strip-item">
              <span className="strip-label">Total Gain to Date</span>
              <span className="strip-value text-success">
                +
                {(
                  currentSummary.currActual -
                  Number(
                    currentSummary.reports[0].cumulative_actual ??
                      currentSummary.reports[0].actual_progress ??
                      0
                  )
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="strip-item">
              <span className="strip-label">Total Submissions</span>
              <span className="strip-value">{currentSummary.reports.length} Reports</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: INTER-DEPARTMENTAL STATUS (PREVIOUS VS. CURRENT)
          ───────────────────────────────────────────────────────────── */}
      <section className="analysis-section" aria-label="Department Updates">
        <div className="section-title-wrap">
          <div className="section-icon-box amber">
            <LayersIcon size={18} />
          </div>
          <div>
            <h3 className="analysis-section-title">Inter-Departmental Updates (Previous vs. Current)</h3>
            <p className="analysis-section-sub">
              Verify if bottlenecks raised by specialized execution departments (Plant &amp; Equipment, Design, QA/QC) were resolved between reports.
            </p>
          </div>
        </div>

        {departmentComparison.length === 0 ? (
          <div className="empty-dept-updates-box">
            <p>No department update notes logged for this project yet.</p>
          </div>
        ) : (
          <div className="dept-comparison-table-wrapper">
            <div className="dept-comparison-grid">
              {departmentComparison.map((deptItem) => {
                const isUserDept = Boolean(
                  user.department &&
                  deptItem.department.trim().toLowerCase() === user.department.trim().toLowerCase()
                );

                return (
                  <div
                    key={deptItem.department}
                    className={`dept-comparison-card ${isUserDept ? "user-dept-highlight" : ""}`}
                  >
                    <div className="dept-card-header">
                      <span className="dept-badge">
                        <BuildingIcon size={13} /> {deptItem.department}
                      </span>
                      {isUserDept && (
                        <span className="user-dept-tag">
                          ★ Your Department (Head Office)
                        </span>
                      )}
                    </div>

                  <div className="dept-columns-row">
                    {/* Previous Week Notes */}
                    <div className="dept-note-col previous">
                      <div className="col-title">
                        <span className="dot dot-prev" />
                        <span>Previous Week (Wk {prev ? prev.week_no : "—"})</span>
                      </div>
                      <div className="note-content">
                        {deptItem.previousNotes ? (
                          <p>{deptItem.previousNotes}</p>
                        ) : (
                          <span className="empty-note">No update logged in prior week</span>
                        )}
                      </div>
                    </div>

                    {/* Current Week Notes */}
                    <div className="dept-note-col current">
                      <div className="col-title">
                        <span className="dot dot-curr" />
                        <span>Current Week (Wk {curr.week_no})</span>
                      </div>
                      <div className="note-content">
                        {deptItem.currentNotes ? (
                          <p>{deptItem.currentNotes}</p>
                        ) : (
                          <span className="empty-note">No update logged this week</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: HISTORICAL REPORT AUDIT TRAIL
          ───────────────────────────────────────────────────────────── */}
      <section className="analysis-section" aria-label="Historical Reports Log">
        <div className="section-title-wrap">
          <div className="section-icon-box purple">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h3 className="analysis-section-title">Historical Report Timeline &amp; Submissions</h3>
            <p className="analysis-section-sub">
              Complete chronological audit trail of all weekly reports submitted for {selectedProject}. Click any entry to inspect raw records.
            </p>
          </div>
        </div>

        <div className="timeline-reports-list">
          {currentSummary.reports
            .slice()
            .reverse()
            .map((rep) => {
              const isExpanded = expandedReportId === rep.id;
              const repActual = Number(rep.cumulative_actual ?? rep.actual_progress ?? 0);
              const repPlanned = Number(rep.cumulative_planned ?? rep.planned_progress ?? 0);
              const repVariance = Number(
                rep.cumulative_variance !== undefined
                  ? rep.cumulative_variance
                  : repActual - repPlanned
              );

              return (
                <div
                  key={rep.id}
                  className={`timeline-report-item ${isExpanded ? "expanded" : ""}`}
                >
                  <div
                    className="timeline-item-header"
                    onClick={() => setExpandedReportId(isExpanded ? null : rep.id)}
                  >
                    <div className="timeline-item-left">
                      <span className="week-circle">W{rep.week_no}</span>
                      <div>
                        <h4 className="timeline-item-title">
                          Week {rep.week_no} Report
                          {rep.id === curr.id && <span className="latest-tag">Latest</span>}
                        </h4>
                        <span className="timeline-item-date">
                          {formatDateRange(rep.start_date, rep.end_date, rep.created_at)}
                          {rep.author_name && ` · Submitted by ${rep.author_name}`}
                        </span>
                      </div>
                    </div>

                    <div className="timeline-item-metrics">
                      <div className="t-metric">
                        <span className="t-label">Actual</span>
                        <span className="t-val">{repActual.toFixed(1)}%</span>
                      </div>
                      <div className="t-metric">
                        <span className="t-label">Planned</span>
                        <span className="t-val">{repPlanned.toFixed(1)}%</span>
                      </div>
                      <div className="t-metric">
                        <span className="t-label">Variance</span>
                        <span
                          className={`t-val font-mono ${
                            repVariance >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {repVariance >= 0 ? `+` : ``}
                          {repVariance.toFixed(1)}%
                        </span>
                      </div>
                      <span className="expand-indicator">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="timeline-item-body animate-fade-in">
                      <div className="timeline-expanded-grid">
                        <div className="expanded-block">
                          <h5>Reporting Metadata</h5>
                          <ul>
                            <li>
                              <strong>Submitted At:</strong> {formatDate(rep.created_at)}
                            </li>
                            <li>
                              <strong>Author:</strong> {rep.author_name || "Project Manager"}
                            </li>
                            {rep.last_week_planned !== undefined && (
                              <li>
                                <strong>Last Week Planned:</strong> {rep.last_week_planned}%
                              </li>
                            )}
                            {rep.last_week_actual !== undefined && (
                              <li>
                                <strong>Last Week Actual:</strong> {rep.last_week_actual}%
                              </li>
                            )}
                            {rep.this_week_plan !== undefined && (
                              <li>
                                <strong>Target for Next Week:</strong> {rep.this_week_plan}%
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Major Wins */}
                        {rep.major_wins && rep.major_wins.length > 0 && (
                          <div className="expanded-block">
                            <h5 style={{ color: "#ca8a04" }}>🏆 Major Wins of Last Week ({rep.major_wins.length})</h5>
                            <div className="mini-numbered-list">
                              {rep.major_wins.map((win, idx) => (
                                <div key={idx} className="mini-numbered-item">
                                  <span className="row-num-badge" style={{ marginRight: 6 }}>#{idx + 1}</span>
                                  <span>{win}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Major Plans */}
                        {rep.major_plans && rep.major_plans.length > 0 && (
                          <div className="expanded-block">
                            <h5 style={{ color: "var(--ecwc-green)" }}>🎯 Major Plans of This Week ({rep.major_plans.length})</h5>
                            <div className="mini-numbered-list">
                              {rep.major_plans.map((plan, idx) => (
                                <div key={idx} className="mini-numbered-item">
                                  <span className="row-num-badge" style={{ marginRight: 6 }}>#{idx + 1}</span>
                                  <span>{plan}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Constraints List */}
                        {rep.constraints && rep.constraints.length > 0 && (
                          <div className="expanded-block">
                            <h5 style={{ color: "#dc2626" }}>⚠️ Constraints List ({rep.constraints.length})</h5>
                            <div className="mini-numbered-list">
                              {rep.constraints.map((c, idx) => (
                                <div key={idx} className="mini-numbered-item">
                                  <span className="row-num-badge" style={{ marginRight: 6, background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>#{idx + 1}</span>
                                  <span>{c}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {rep.department_updates && rep.department_updates.length > 0 && (
                          <div className="expanded-block">
                            <h5>Department Notes ({rep.department_updates.length})</h5>
                            <div className="expanded-dept-list">
                              {rep.department_updates.map((du) => (
                                <div key={du.id || du.department} className="mini-dept-note">
                                  <strong>{du.department}:</strong>
                                  <p>{du.notes}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
