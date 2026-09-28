"use client";

import { useState, useMemo } from "react";
import ReportForm from "./ReportForm";
import ReportCard from "./ReportCard";
import TaskManager from "./TaskManager";
import {
  FolderIcon,
  InboxIcon,
  ClipboardListIcon,
  CheckSquareIcon,
} from "./Icons";
import { SessionUser } from "./AuthModal";

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
  cumulative_planned?: number;
  cumulative_actual?: number;
  cumulative_variance?: number;
  last_week_planned?: number;
  last_week_actual?: number;
  last_week_variance?: number;
  this_week_plan?: number;
  created_at: string;
  author_name?: string;
  department_updates: DeptUpdateItem[];
}

interface ProjectManagerDashboardProps {
  user: SessionUser;
  reports: Report[];
  loadingReports: boolean;
  onRefreshReports: () => void;
}

export default function ProjectManagerDashboard({
  user,
  reports,
  loadingReports,
  onRefreshReports,
}: ProjectManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"report" | "tasks" | "feed">("report");

  const availableProjects = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => {
      if (r.project_name?.trim()) s.add(r.project_name.trim());
    });
    if (user.project_name?.trim()) {
      s.add(user.project_name.trim());
    }
    return Array.from(s);
  }, [reports, user.project_name]);

  // Filter reports for this PM's project if specified
  const pmReports = useMemo(() => {
    if (user.project_name) {
      const filtered = reports.filter(
        (r) => r.project_name?.trim().toLowerCase() === user.project_name?.trim().toLowerCase()
      );
      return filtered.length > 0 ? filtered : reports;
    }
    return reports;
  }, [reports, user.project_name]);

  return (
    <div className="pm-dashboard">
      {/* Dashboard Sub-Header */}
      <div className="dashboard-banner pm-theme">
        <div className="banner-left">
          <div className="role-chip pm">
            <span className="badge-dot" /> Project Manager
            {user.project_name && <span className="role-project-tag">· {user.project_name}</span>}
          </div>
          <h2 className="banner-title">Welcome back, {user.name}</h2>
          <p className="banner-sub">
            {user.project_name ? (
              <>Managing: <strong>{user.project_name}</strong> · Log weekly progress and delegate operational milestones to specialized departments.</>
            ) : (
              "Log weekly project progress and delegate operational milestones to specialized departments."
            )}
          </p>
        </div>
      </div>

      {/* Navigation Pills: Only 3 options */}
      <div className="dashboard-nav-pills" role="tablist">
        <button
          type="button"
          className={`nav-pill ${activeTab === "report" ? "active" : ""}`}
          onClick={() => setActiveTab("report")}
          role="tab"
          aria-selected={activeTab === "report"}
        >
          <ClipboardListIcon size={16} />
          <span>New Progress Report</span>
        </button>

        <button
          type="button"
          className={`nav-pill ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
          role="tab"
          aria-selected={activeTab === "tasks"}
        >
          <CheckSquareIcon size={16} />
          <span>Task Delegation</span>
        </button>

        <button
          type="button"
          className={`nav-pill ${activeTab === "feed" ? "active" : ""}`}
          onClick={() => setActiveTab("feed")}
          role="tab"
          aria-selected={activeTab === "feed"}
        >
          <FolderIcon size={16} />
          <span>Submitted Reports ({pmReports.length})</span>
        </button>
      </div>

      {/* Tab 1: Submit Weekly Report */}
      {activeTab === "report" && (
        <div className="tab-pane animate-fade-in">
          <ReportForm
            defaultProjectName={user.project_name || undefined}
            onSuccess={() => {
              onRefreshReports();
              setActiveTab("feed");
            }}
          />
        </div>
      )}

      {/* Tab 2: Task Delegation */}
      {activeTab === "tasks" && (
        <div className="tab-pane animate-fade-in">
          <TaskManager user={user} availableProjects={availableProjects} />
        </div>
      )}

      {/* Tab 3: Submitted Reports Feed */}
      {activeTab === "feed" && (
        <div className="tab-pane animate-fade-in">
          <section className="reports-section" aria-label="Submitted reports">
            <div className="reports-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                <span className="icon">
                  <FolderIcon size={18} />
                </span>
                {user.project_name ? `${user.project_name} Reports` : "Submitted Reports"}
              </h2>
              {!loadingReports && (
                <span className="reports-count">
                  {pmReports.length} report{pmReports.length !== 1 ? "s" : ""} logged
                </span>
              )}
            </div>

            {loadingReports ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              </div>
            ) : pmReports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <InboxIcon size={48} />
                </div>
                <p>No reports logged yet. Click &quot;New Progress Report&quot; to publish your first one!</p>
              </div>
            ) : (
              <div className="reports-grid">
                {pmReports.map((report) => (
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
