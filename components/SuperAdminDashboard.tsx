"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ReportCard from "./ReportCard";
import TaskManager from "./TaskManager";
import ProjectAnalysisView from "./ProjectAnalysisView";
import {
  ShieldIcon,
  UsersIcon,
  ActivityIcon,
  CheckSquareIcon,
  FolderIcon,
  InboxIcon,
  TrashIcon,
  BuildingIcon,
  LayersIcon,
  UserIcon,
  MailIcon,
  CalendarIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  BarChartIcon,
} from "./Icons";
import { SessionUser } from "./AuthModal";
import { formatDate } from "@/lib/dateUtils";

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

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  project_name: string | null;
  phone_number: string | null;
  created_at: string;
}

interface SuperAdminDashboardProps {
  user: SessionUser;
  reports: Report[];
  loadingReports: boolean;
  onRefreshReports: () => void;
}

export default function SuperAdminDashboard({
  user,
  reports,
  loadingReports,
  onRefreshReports,
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "analysis" | "reports" | "tasks" | "users"
  >("analytics");

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${userName}"? This action cannot be undone.`
      )
    )
      return;

    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `User "${userName}" deleted successfully.`);
        fetchUsers();
      } else {
        showToast("error", data.error || "Failed to delete user.");
      }
    } catch {
      showToast("error", "Failed to delete user.");
    }
  };

  const availableProjects = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => {
      if (r.project_name?.trim()) s.add(r.project_name.trim());
    });
    return Array.from(s);
  }, [reports]);

  // Stats
  const totalUsers = users.length;
  const pmCount = users.filter((u) => u.role === "project_manager").length;
  const dmCount = users.filter((u) => u.role === "department_manager").length;
  const adminCount = users.filter((u) => u.role === "superadmin").length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <span className="user-role-badge superadmin">
            <ShieldIcon size={12} /> Super Admin
          </span>
        );
      case "project_manager":
        return (
          <span className="user-role-badge pm">
            <LayersIcon size={12} /> Project Manager
          </span>
        );
      case "department_manager":
        return (
          <span className="user-role-badge dm">
            <BuildingIcon size={12} /> Dept. Manager
          </span>
        );
      default:
        return <span className="user-role-badge">{role}</span>;
    }
  };

  return (
    <div className="sa-dashboard">
      {/* Dashboard Sub-Header */}
      <div className="dashboard-banner sa-theme">
        <div className="banner-left">
          <div className="role-chip sa">
            <ShieldIcon size={14} />
            <span>Super Administrator</span>
          </div>
          <h2 className="banner-title">Welcome, {user.name}</h2>
          <p className="banner-sub">
            Full system oversight — analytics, reports, tasks, and user
            management across all projects and departments.
          </p>
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
          className={`nav-pill ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
          role="tab"
          aria-selected={activeTab === "analytics"}
        >
          <ActivityIcon size={16} />
          <span>Executive Analytics</span>
        </button>

        <button
          type="button"
          className={`nav-pill ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
          role="tab"
          aria-selected={activeTab === "reports"}
        >
          <FolderIcon size={16} />
          <span>All Reports ({reports.length})</span>
        </button>

        <button
          type="button"
          className={`nav-pill ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
          role="tab"
          aria-selected={activeTab === "tasks"}
        >
          <CheckSquareIcon size={16} />
          <span>All Tasks</span>
        </button>

        <button
          type="button"
          className={`nav-pill ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
          role="tab"
          aria-selected={activeTab === "users"}
        >
          <UsersIcon size={16} />
          <span>User Management</span>
        </button>
      </div>

      {/* Tab: Project Report Analysis */}
      {activeTab === "analysis" && (
        <div className="tab-pane animate-fade-in">
          <ProjectAnalysisView reports={reports} user={user} />
        </div>
      )}

      {/* Tab 1: Executive Analytics */}
      {activeTab === "analytics" && (
        <div className="tab-pane animate-fade-in">
          <AnalyticsDashboard reports={reports} />
        </div>
      )}

      {/* Tab 2: All Reports */}
      {activeTab === "reports" && (
        <div className="tab-pane animate-fade-in">
          <section className="reports-section" aria-label="All reports">
            <div className="reports-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                <span className="icon">
                  <FolderIcon size={18} />
                </span>
                All Corporation Reports
              </h2>
              {!loadingReports && (
                <span className="reports-count">
                  {reports.length} report{reports.length !== 1 ? "s" : ""} total
                </span>
              )}
            </div>

            {loadingReports ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "48px 0",
                }}
              >
                <span
                  className="spinner"
                  style={{ width: 36, height: 36, borderWidth: 3 }}
                />
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <InboxIcon size={48} />
                </div>
                <p>No reports have been submitted yet.</p>
              </div>
            ) : (
              <div className="reports-grid">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 3: All Tasks */}
      {activeTab === "tasks" && (
        <div className="tab-pane animate-fade-in">
          <TaskManager user={user} availableProjects={availableProjects} />
        </div>
      )}

      {/* Tab 4: User Management */}
      {activeTab === "users" && (
        <div className="tab-pane animate-fade-in">
          <section
            className="user-management-section"
            aria-label="User Management"
          >
            <div className="user-mgmt-header">
              <div>
                <span className="analytics-badge">
                  <UsersIcon size={14} /> System User Administration
                </span>
                <h2
                  className="section-title"
                  style={{ marginBottom: 4, marginTop: 4 }}
                >
                  Registered Users
                </h2>
                <p className="field-note">
                  View and manage all registered accounts across the
                  corporation.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={fetchUsers}
                disabled={loadingUsers}
              >
                Refresh
              </button>
            </div>

            {/* User Stats */}
            <div className="task-stats-row">
              <div className="task-stat-card">
                <span className="task-stat-num">{totalUsers}</span>
                <span className="task-stat-label">Total Users</span>
              </div>
              <div className="task-stat-card">
                <span className="task-stat-num" style={{ color: "var(--superadmin-accent, #a855f7)" }}>
                  {adminCount}
                </span>
                <span className="task-stat-label">Admins</span>
              </div>
              <div className="task-stat-card">
                <span className="task-stat-num green">{pmCount}</span>
                <span className="task-stat-label">Project Mgrs</span>
              </div>
              <div className="task-stat-card">
                <span className="task-stat-num amber">{dmCount}</span>
                <span className="task-stat-label">Dept. Mgrs</span>
              </div>
            </div>

            {/* User Table */}
            {loadingUsers ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px 0",
                }}
              >
                <span
                  className="spinner"
                  style={{ width: 32, height: 32, borderWidth: 3 }}
                />
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <UsersIcon size={48} />
                </div>
                <p>No users registered yet.</p>
              </div>
            ) : (
              <div className="user-table-wrapper">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department / Project</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">
                              <UserIcon size={14} />
                            </div>
                            <span className="user-cell-name">{u.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="user-cell-email">
                            <MailIcon size={12} /> {u.email}
                          </span>
                        </td>
                        <td>{getRoleBadge(u.role)}</td>
                        <td>
                          <span className="user-cell-detail">
                            {u.role === "department_manager"
                              ? u.department || "—"
                              : u.role === "project_manager"
                              ? u.project_name || "—"
                              : "Full Access"}
                          </span>
                          {u.phone_number && (
                            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                              📞 {u.phone_number}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="user-cell-date">
                            <CalendarIcon size={11} />{" "}
                            {formatDate(u.created_at)}
                          </span>
                        </td>
                        <td>
                          {u.id !== user.id ? (
                            <button
                              type="button"
                              className="btn-delete-user"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              title={`Delete ${u.name}`}
                            >
                              <TrashIcon size={14} />
                            </button>
                          ) : (
                            <span className="user-self-tag">You</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.type === "success" ? (
            <CheckCircleIcon size={18} />
          ) : (
            <AlertCircleIcon size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
