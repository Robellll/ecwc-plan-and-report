"use client";

import { useMemo, useState } from "react";
import SCurveChart, { DataPoint } from "./SCurveChart";
import { formatDateRange } from "@/lib/dateUtils";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  PieChartIcon,
  FilterIcon,
  LayersIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  BuildingIcon,
} from "./Icons";

interface DeptUpdateItem {
  id: number;
  department: string;
  notes: string;
}

interface Report {
  id: number;
  project_name: string;
  week_no: number;
  start_date?: string;
  end_date?: string;
  planned_progress: number;
  actual_progress: number;
  created_at: string;
  department_updates: DeptUpdateItem[];
}

interface AnalyticsDashboardProps {
  reports: Report[];
}

export default function AnalyticsDashboard({ reports }: AnalyticsDashboardProps) {
  const [selectedProject, setSelectedProject] = useState<string>("ALL");

  // Extract unique project names
  const projectNames = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.project_name?.trim()) set.add(r.project_name.trim());
    });
    return Array.from(set).sort();
  }, [reports]);

  // Filter reports according to selected project
  const filteredReports = useMemo(() => {
    if (selectedProject === "ALL") return reports;
    return reports.filter((r) => r.project_name.trim() === selectedProject);
  }, [reports, selectedProject]);

  // Calculate project summary cards for health scorecard
  const projectSummaries = useMemo(() => {
    const map = new Map<string, {
      projectName: string;
      latestStartDate?: string;
      latestEndDate?: string;
      latestCreatedAt: string;
      latestPlanned: number;
      latestActual: number;
      totalReports: number;
      totalDeptUpdates: number;
    }>();

    reports.forEach((r) => {
      const name = r.project_name.trim();
      const existing = map.get(name);
      const rTime = new Date(r.end_date || r.created_at).getTime();
      const exTime = existing ? new Date(existing.latestEndDate || existing.latestCreatedAt).getTime() : 0;
      const isNewer = !existing || rTime >= exTime;

      const deptCount = r.department_updates ? r.department_updates.length : 0;

      if (isNewer) {
        map.set(name, {
          projectName: name,
          latestStartDate: r.start_date,
          latestEndDate: r.end_date,
          latestCreatedAt: r.created_at,
          latestPlanned: Number(r.planned_progress),
          latestActual: Number(r.actual_progress),
          totalReports: (existing?.totalReports || 0) + 1,
          totalDeptUpdates: (existing?.totalDeptUpdates || 0) + deptCount,
        });
      } else if (existing) {
        existing.totalReports += 1;
        existing.totalDeptUpdates += deptCount;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [reports]);

  // KPI Metrics Calculation
  const kpis = useMemo(() => {
    const totalProjects = projectNames.length;
    const totalReports = filteredReports.length;

    if (totalReports === 0) {
      return {
        totalProjects: 0,
        totalReports: 0,
        avgVariance: 0,
        avgActual: 0,
        totalDeptNotes: 0,
        onTrackCount: 0,
        delayedCount: 0,
      };
    }

    let varianceSum = 0;
    let actualSum = 0;
    let deptCount = 0;
    let onTrack = 0;
    let delayed = 0;

    filteredReports.forEach((r) => {
      const diff = Number(r.actual_progress) - Number(r.planned_progress);
      varianceSum += diff;
      actualSum += Number(r.actual_progress);
      if (diff >= 0) onTrack++;
      else delayed++;
      if (r.department_updates) deptCount += r.department_updates.length;
    });

    return {
      totalProjects,
      totalReports,
      avgVariance: varianceSum / totalReports,
      avgActual: actualSum / totalReports,
      totalDeptNotes: deptCount,
      onTrackCount: onTrack,
      delayedCount: delayed,
    };
  }, [projectNames, filteredReports]);

  // Chart data transformation
  const chartData: DataPoint[] = useMemo(() => {
    if (selectedProject !== "ALL") {
      // Single project: show each report sorted chronologically
      return filteredReports.map((r) => ({
        week_no: r.week_no,
        start_date: r.start_date,
        end_date: r.end_date,
        planned_progress: Number(r.planned_progress),
        actual_progress: Number(r.actual_progress),
        project_name: r.project_name,
        created_at: r.created_at,
        dept_updates_count: r.department_updates ? r.department_updates.length : 0,
      }));
    }

    // ALL Projects: Aggregate average progress by date period
    const periodMap = new Map<string, {
      start_date?: string;
      end_date?: string;
      created_at?: string;
      plannedTotal: number;
      actualTotal: number;
      count: number;
      deptCount: number;
    }>();

    reports.forEach((r) => {
      const key = r.start_date && r.end_date
        ? `${r.start_date}_${r.end_date}`
        : (r.created_at ? r.created_at.split("T")[0] : `period_${r.week_no}`);
      const current = periodMap.get(key) || {
        start_date: r.start_date,
        end_date: r.end_date,
        created_at: r.created_at,
        plannedTotal: 0,
        actualTotal: 0,
        count: 0,
        deptCount: 0,
      };
      current.plannedTotal += Number(r.planned_progress);
      current.actualTotal += Number(r.actual_progress);
      current.count += 1;
      if (r.department_updates) current.deptCount += r.department_updates.length;
      periodMap.set(key, current);
    });

    const result: DataPoint[] = [];
    periodMap.forEach((v) => {
      result.push({
        start_date: v.start_date,
        end_date: v.end_date,
        created_at: v.created_at,
        planned_progress: Number((v.plannedTotal / v.count).toFixed(1)),
        actual_progress: Number((v.actualTotal / v.count).toFixed(1)),
        project_name: "Corporate Average",
        dept_updates_count: v.deptCount,
      });
    });

    return result;
  }, [reports, filteredReports, selectedProject]);

  return (
    <section className="analytics-section" aria-label="Performance Analytics">
      {/* Section Header & Filter */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <span className="analytics-badge">
            <ActivityIcon size={14} /> Executive Analytics
          </span>
          <h2 className="analytics-main-title">Corporate Performance &amp; S-Curve</h2>
        </div>

        {/* Project Selector */}
        <div className="analytics-filter-wrapper">
          <label htmlFor="analytics-project-filter" className="filter-label">
            <FilterIcon size={14} /> Project Scope:
          </label>
          <select
            id="analytics-project-filter"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="analytics-select"
          >
            <option value="ALL">All Projects (Corporate Aggregate)</option>
            {projectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="kpi-grid">
        {/* KPI 1: Active Projects */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">Active Projects</span>
            <div className="kpi-icon-pill green">
              <LayersIcon size={16} />
            </div>
          </div>
          <div className="kpi-value">{kpis.totalProjects}</div>
          <div className="kpi-subtext">Registered in portal</div>
        </div>

        {/* KPI 2: Total Reports Logged */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">Progress Reports</span>
            <div className="kpi-icon-pill blue">
              <PieChartIcon size={16} />
            </div>
          </div>
          <div className="kpi-value">{kpis.totalReports}</div>
          <div className="kpi-subtext">
            {selectedProject === "ALL" ? "Across all active sites" : `For ${selectedProject}`}
          </div>
        </div>

        {/* KPI 3: Schedule Variance */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">Schedule Variance</span>
            <div className={`kpi-icon-pill ${kpis.avgVariance >= 0 ? "green" : "red"}`}>
              {kpis.avgVariance >= 0 ? <TrendingUpIcon size={16} /> : <TrendingDownIcon size={16} />}
            </div>
          </div>
          <div className={`kpi-value ${kpis.avgVariance >= 0 ? "positive" : "negative"}`}>
            {kpis.avgVariance >= 0 ? "+" : ""}{kpis.avgVariance.toFixed(1)}%
          </div>
          <div className="kpi-subtext">
            {kpis.avgVariance >= 0 ? "Ahead of planned schedule" : "Behind planned target"}
          </div>
        </div>

        {/* KPI 4: Department Updates */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">Dept Updates</span>
            <div className="kpi-icon-pill amber">
              <BuildingIcon size={16} />
            </div>
          </div>
          <div className="kpi-value">{kpis.totalDeptNotes}</div>
          <div className="kpi-subtext">Design &amp; Equipment notes</div>
        </div>
      </div>

      {/* Interactive S-Curve Chart */}
      <SCurveChart
        data={chartData}
        title={
          selectedProject === "ALL"
            ? "Corporate Aggregate S-Curve"
            : `${selectedProject} — Progress Trend`
        }
        subtitle={
          selectedProject === "ALL"
            ? "Average planned vs. actual progress trajectory across all submissions"
            : `Chronological progress tracking across reported periods for ${selectedProject}`
        }
      />

      {/* Project Health Scorecard Matrix (Visible when All Projects is selected) */}
      {selectedProject === "ALL" && projectSummaries.length > 0 && (
        <div className="project-scorecard-section">
          <div className="scorecard-header">
            <h3 className="scorecard-title">Project Schedule Health Scorecard</h3>
            <span className="scorecard-count">{projectSummaries.length} active projects</span>
          </div>

          <div className="project-scorecard-grid">
            {projectSummaries.map((p) => {
              const diff = p.latestActual - p.latestPlanned;
              const isAhead = diff >= 0;
              const isCritical = diff < -5;

              return (
                <div
                  key={p.projectName}
                  className="scorecard-item"
                  onClick={() => setSelectedProject(p.projectName)}
                  role="button"
                  tabIndex={0}
                  title={`Click to filter chart by ${p.projectName}`}
                >
                  <div className="scorecard-item-top">
                    <span className="scorecard-item-name">{p.projectName}</span>
                    <span
                      className={`health-badge ${
                        isAhead ? "ahead" : isCritical ? "critical" : "delayed"
                      }`}
                    >
                      {isAhead ? (
                        <>
                          <CheckCircleIcon size={12} /> Ahead
                        </>
                      ) : (
                        <>
                          <AlertTriangleIcon size={12} /> {isCritical ? "Critical" : "Delayed"}
                        </>
                      )}
                    </span>
                  </div>

                  <div className="scorecard-progress-row">
                    <div className="scorecard-progress-stat">
                      <span className="stat-label">Period:</span>
                      <span className="stat-val" style={{ fontSize: "0.76rem" }}>
                        {formatDateRange(p.latestStartDate, p.latestEndDate, p.latestCreatedAt)}
                      </span>
                    </div>
                    <div className="scorecard-progress-stat">
                      <span className="stat-label">Planned:</span>
                      <span className="stat-val">{p.latestPlanned.toFixed(1)}%</span>
                    </div>
                    <div className="scorecard-progress-stat">
                      <span className="stat-label">Actual:</span>
                      <span className="stat-val actual">{p.latestActual.toFixed(1)}%</span>
                    </div>
                    <div className="scorecard-progress-stat">
                      <span className="stat-label">Variance:</span>
                      <span className={`stat-val ${isAhead ? "positive" : "negative"}`}>
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
