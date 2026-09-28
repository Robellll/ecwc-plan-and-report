"use client";

import { useState, useMemo } from "react";
import TaskManager from "./TaskManager";
import ReportCard from "./ReportCard";
import ProjectAnalysisView, { Report } from "./ProjectAnalysisView";
import {
  BuildingIcon,
  CheckSquareIcon,
  FolderIcon,
  InboxIcon,
  FilterIcon,
  BarChartIcon,
} from "./Icons";
import { SessionUser } from "./AuthModal";

interface DepartmentManagerDashboardProps {
  user: SessionUser;
  reports: Report[];
  loadingReports: boolean;
  onRefreshReports: () => void;
}

export default function DepartmentManagerDashboard({
  user,
  reports,
  loadingReports,
}: DepartmentManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"analysis" | "tasks" | "reports">("analysis");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  const deptName = user.department || "Plant & Equipment";

  // Filter reports that have updates for this department or match project
  const relevantReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesProject = projectFilter === "ALL" || r.project_name === projectFilter;
      const hasDeptUpdate = r.department_updates?.some(
        (du) => du.department.toLowerCase() === deptName.toLowerCase()
      );
      return matchesProject && (hasDeptUpdate || projectFilter !== "ALL");
    });
  }, [reports, deptName, projectFilter]);

  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.project_name?.trim()) set.add(r.project_name.trim());
    });
    return Array.from(set);
  }, [reports]);

  return (
    <div className="dm-dashboard">
      {/* Dashboard Sub-Header */}
      <div className="dashboard-banner dm-theme">
        <div className="banner-left">
          <div className="role-chip dm">
            <BuildingIcon size={14} />
            <span>{deptName} Manager · Head Office Oversight</span>
          </div>
          <h2 className="banner-title">Welcome, {user.name}</h2>
          <p className="banner-sub">
            Corporate head office oversight: review all project milestone trajectories, compare previous vs. current progress, and follow up on {deptName} operational execution.
          </p>
        </div>

        <div className="banner-actions">
          <button
            type="button"
            className={`btn ${activeTab === "analysis" ? "btn-secondary" : "btn-primary"} btn-sm`}
            onClick={() => setActiveTab("analysis")}
          >
            <BarChartIcon size={14} />
            <span>Report Analysis</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="dashboard-nav-pills" role="tablist">
        <button
          type="button"
          className={`nav-pill ${activeTab === "analysis" ? "active" : ""}`}
          onClick={() => setActiveTab("analysis")}
          role="tab"
          aria-selected={activeTab === "analysis"}
        >
          <BarChartIcon size={16} />
          <span>Report Analysis</span>
        </button>

        <button
          type="button"
          className={`nav-pill ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
          role="tab"
          aria-selected={activeTab === "tasks"}
        >
          <CheckSquareIcon size={16} />
          <span>Assigned Tasks &amp; Actions</span>
        </button>

        <button
          type="button"
          className={`nav-pill ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
          role="tab"
          aria-selected={activeTab === "reports"}
        >
          <FolderIcon size={16} />
          <span>Department Reports Feed ({relevantReports.length})</span>
        </button>
      </div>

      {/* Tab: Project Report Analysis */}
      {activeTab === "analysis" && (
        <div className="tab-pane animate-fade-in">
          <ProjectAnalysisView reports={reports} user={user} />
        </div>
      )}

      {/* Tab 1: Tasks */}
      {activeTab === "tasks" && (
        <div className="tab-pane animate-fade-in">
          <TaskManager user={user} />
        </div>
      )}

      {/* Tab 2: Reports Review */}
      {activeTab === "reports" && (
        <div className="tab-pane animate-fade-in">
          <section className="reports-section" aria-label="Department reports">
            <div className="reports-header">
              <div>
                <h2 className="section-title" style={{ marginBottom: 4 }}>
                  <span className="icon">
                    <BuildingIcon size={18} />
                  </span>
                  {deptName} Progress Feed
                </h2>
                <p className="field-note">
                  Review submitted project reports and notes relevant to your department.
                </p>
              </div>

              {/* Project Filter */}
              <div className="analytics-filter-wrapper">
                <label htmlFor="dm-project-filter" className="filter-label">
                  <FilterIcon size={14} /> Project:
                </label>
                <select
                  id="dm-project-filter"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="analytics-select"
                >
                  <option value="ALL">All Projects with {deptName} Updates</option>
                  {uniqueProjects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingReports ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              </div>
            ) : relevantReports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <InboxIcon size={48} />
                </div>
                <p>No project reports found matching {deptName} for the selected filter.</p>
              </div>
            ) : (
              <div className="reports-grid">
                {relevantReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
