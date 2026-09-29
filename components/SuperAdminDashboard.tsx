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
  SearchIcon,
  PlusIcon,
  EditIcon,
  KeyIcon,
  PhoneIcon,
  XCloseIcon,
  LockIcon,
  AlertTriangleIcon,
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
  report_count?: number;
  task_count?: number;
}

interface SuperAdminDashboardProps {
  user: SessionUser;
  reports: Report[];
  loadingReports: boolean;
  onRefreshReports: () => void;
}

const DEPARTMENTS = ["Design", "Plant & Equipment", "Other"];

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "project_manager" | "department_manager" | "superadmin">("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [deleteDataOption, setDeleteDataOption] = useState<"keep" | "purge">("keep");
  const [resettingUser, setResettingUser] = useState<UserRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for Add User
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"project_manager" | "department_manager" | "superadmin">("project_manager");
  const [addProjectName, setAddProjectName] = useState("Seyo Shenen Guder Project");
  const [addDepartment, setAddDepartment] = useState("Design");
  const [addOtherDept, setAddOtherDept] = useState("");
  const [addPhone, setAddPhone] = useState("");

  // Form states for Edit User
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"project_manager" | "department_manager" | "superadmin">("project_manager");
  const [editProjectName, setEditProjectName] = useState("");
  const [editDepartment, setEditDepartment] = useState("Design");
  const [editOtherDept, setEditOtherDept] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Form state for Reset Password
  const [newPassword, setNewPassword] = useState("");

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
      showToast("error", "Failed to load registered users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  // Open Edit Modal with user data
  const handleOpenEdit = (u: UserRecord) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role as any);
    setEditProjectName(u.project_name || "Seyo Shenen Guder Project");
    setEditPhone(u.phone_number || "");
    if (u.department && ["Design", "Plant & Equipment"].includes(u.department)) {
      setEditDepartment(u.department);
      setEditOtherDept("");
    } else if (u.department) {
      setEditDepartment("Other");
      setEditOtherDept(u.department);
    } else {
      setEditDepartment("Design");
      setEditOtherDept("");
    }
  };

  // Submit Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword) {
      showToast("error", "Name, email, and password are required.");
      return;
    }
    if (addPassword.length < 6) {
      showToast("error", "Password must be at least 6 characters.");
      return;
    }

    const resolvedDept = addDepartment === "Other" ? addOtherDept.trim() || "Operations" : addDepartment;

    setActionLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
          project_name: addRole === "project_manager" ? addProjectName.trim() : null,
          department: addRole === "department_manager" ? resolvedDept : null,
          phone_number: addPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `User "${addName}" created successfully.`);
        setShowAddModal(false);
        // Reset form
        setAddName("");
        setAddEmail("");
        setAddPassword("");
        setAddPhone("");
        fetchUsers();
      } else {
        showToast("error", data.error || "Failed to create user.");
      }
    } catch {
      showToast("error", "Error creating user.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      showToast("error", "Name and email are required.");
      return;
    }

    const resolvedDept = editDepartment === "Other" ? editOtherDept.trim() || "Operations" : editDepartment;

    setActionLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          project_name: editRole === "project_manager" ? editProjectName.trim() : null,
          department: editRole === "department_manager" ? resolvedDept : null,
          phone_number: editPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `User "${editName}" updated successfully.`);
        setEditingUser(null);
        fetchUsers();
      } else {
        showToast("error", data.error || "Failed to update user.");
      }
    } catch {
      showToast("error", "Error updating user.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (!newPassword || newPassword.length < 6) {
      showToast("error", "New password must be at least 6 characters.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resettingUser.id,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Password reset for "${resettingUser.name}".`);
        setResettingUser(null);
        setNewPassword("");
      } else {
        showToast("error", data.error || "Failed to reset password.");
      }
    } catch {
      showToast("error", "Error resetting password.");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delete User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userToDelete.id,
          delete_data: deleteDataOption === "purge",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || `User "${userToDelete.name}" deleted successfully.`);
        setUserToDelete(null);
        fetchUsers();
        if (deleteDataOption === "purge") {
          onRefreshReports();
        }
      } else {
        showToast("error", data.error || "Failed to delete user.");
      }
    } catch {
      showToast("error", "Failed to delete user.");
    } finally {
      setActionLoading(false);
    }
  };

  const availableProjects = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => {
      if (r.project_name?.trim()) s.add(r.project_name.trim());
    });
    return Array.from(s);
  }, [reports]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesProject = u.project_name ? u.project_name.toLowerCase().includes(q) : false;
        const matchesDept = u.department ? u.department.toLowerCase().includes(q) : false;
        const matchesPhone = u.phone_number ? u.phone_number.toLowerCase().includes(q) : false;
        return matchesName || matchesEmail || matchesProject || matchesDept || matchesPhone;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

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
            Full enterprise authority — oversight, project analysis, cross-department task tracking, and user account governance.
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
                  Manage ECWC Portal Users
                </h2>
                <p className="field-note">
                  Direct administration over Project Managers, Department Managers, and Super Administrators.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={fetchUsers}
                  disabled={loadingUsers}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowAddModal(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <PlusIcon size={16} />
                  <span>Register User</span>
                </button>
              </div>
            </div>

            {/* User Stats Row */}
            <div className="task-stats-row">
              <div className="task-stat-card">
                <span className="task-stat-num">{totalUsers}</span>
                <span className="task-stat-label">Total Users</span>
              </div>
              <div className="task-stat-card">
                <span className="task-stat-num" style={{ color: "var(--superadmin-accent, #a855f7)" }}>
                  {adminCount}
                </span>
                <span className="task-stat-label">Administrators</span>
              </div>
              <div className="task-stat-card">
                <span className="task-stat-num green">{pmCount}</span>
                <span className="task-stat-label">Project Managers</span>
              </div>
              <div className="task-stat-card">
                <span className="task-stat-num amber">{dmCount}</span>
                <span className="task-stat-label">Department Managers</span>
              </div>
            </div>

            {/* Search and Role Filter Bar */}
            <div className="user-filter-bar">
              <div className="user-search-wrapper">
                <span className="user-search-icon">
                  <SearchIcon size={16} />
                </span>
                <input
                  type="text"
                  className="user-search-input"
                  placeholder="Search by name, email, project, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="user-filter-pills" role="tablist">
                <button
                  type="button"
                  className={`user-filter-pill ${roleFilter === "all" ? "active" : ""}`}
                  onClick={() => setRoleFilter("all")}
                >
                  All Roles <span className="user-pill-count">{totalUsers}</span>
                </button>
                <button
                  type="button"
                  className={`user-filter-pill ${roleFilter === "project_manager" ? "active" : ""}`}
                  onClick={() => setRoleFilter("project_manager")}
                >
                  Project Managers <span className="user-pill-count">{pmCount}</span>
                </button>
                <button
                  type="button"
                  className={`user-filter-pill ${roleFilter === "department_manager" ? "active" : ""}`}
                  onClick={() => setRoleFilter("department_manager")}
                >
                  Department Managers <span className="user-pill-count">{dmCount}</span>
                </button>
                <button
                  type="button"
                  className={`user-filter-pill ${roleFilter === "superadmin" ? "active" : ""}`}
                  onClick={() => setRoleFilter("superadmin")}
                >
                  Super Admins <span className="user-pill-count">{adminCount}</span>
                </button>
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
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <UsersIcon size={48} />
                </div>
                <p>
                  {searchQuery.trim()
                    ? `No users matched "${searchQuery}".`
                    : "No users found in this category."}
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setSearchQuery("")}
                    style={{ marginTop: 12 }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="user-table-wrapper">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>User Account</th>
                      <th>Email &amp; Direct Call</th>
                      <th>Role</th>
                      <th>Assigned Entity / Contact</th>
                      <th>Activity Footprint</th>
                      <th>Registered</th>
                      <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        {/* User Cell */}
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">
                              <UserIcon size={14} />
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span className="user-cell-name">{u.name}</span>
                                {u.id === user.id && (
                                  <span className="user-self-tag">You</span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                ID: #{u.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email & Contact */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <a
                              href={`mailto:${u.email}`}
                              className="user-cell-email"
                              style={{ textDecoration: "none" }}
                              title="Click to send email"
                            >
                              <MailIcon size={12} /> {u.email}
                            </a>
                            {u.phone_number && (
                              <a
                                href={`tel:${u.phone_number.replace(/\s+/g, "")}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: "0.78rem",
                                  color: "var(--ecwc-green)",
                                  textDecoration: "none",
                                  fontWeight: 500,
                                }}
                                title="Click to call directly"
                              >
                                <PhoneIcon size={11} /> {u.phone_number}
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td>{getRoleBadge(u.role)}</td>

                        {/* Department / Project */}
                        <td>
                          <span className="user-cell-detail" style={{ fontWeight: 500 }}>
                            {u.role === "department_manager"
                              ? u.department || "Corporate Dept"
                              : u.role === "project_manager"
                              ? u.project_name || "General Project"
                              : "Full Enterprise Oversight"}
                          </span>
                        </td>

                        {/* Footprint Counts */}
                        <td>
                          <div className="user-activity-chips">
                            <span className="user-activity-chip" title="Submitted progress reports">
                              <FolderIcon size={11} />
                              <span>{u.report_count || 0} reports</span>
                            </span>
                            <span className="user-activity-chip" title="Delegated tasks created">
                              <CheckSquareIcon size={11} />
                              <span>{u.task_count || 0} tasks</span>
                            </span>
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td>
                          <span className="user-cell-date">
                            <CalendarIcon size={11} /> {formatDate(u.created_at)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right", paddingRight: 20 }}>
                          <div className="user-action-group" style={{ justifyContent: "flex-end" }}>
                            {/* Call button if phone exists */}
                            {u.phone_number && (
                              <a
                                href={`tel:${u.phone_number.replace(/\s+/g, "")}`}
                                className="user-action-btn phone"
                                title={`Call ${u.name} (${u.phone_number})`}
                              >
                                <PhoneIcon size={14} />
                              </a>
                            )}

                            {/* Email shortcut */}
                            <a
                              href={`mailto:${u.email}`}
                              className="user-action-btn email"
                              title={`Email ${u.email}`}
                            >
                              <MailIcon size={14} />
                            </a>

                            {/* Edit Details */}
                            <button
                              type="button"
                              className="user-action-btn edit"
                              onClick={() => handleOpenEdit(u)}
                              title={`Edit user profile: ${u.name}`}
                            >
                              <EditIcon size={14} />
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              className="user-action-btn key"
                              onClick={() => {
                                setResettingUser(u);
                                setNewPassword("");
                              }}
                              title={`Reset password for ${u.name}`}
                            >
                              <KeyIcon size={14} />
                            </button>

                            {/* Delete User */}
                            {u.id !== user.id ? (
                              <button
                                type="button"
                                className="user-action-btn delete"
                                onClick={() => {
                                  setUserToDelete(u);
                                  setDeleteDataOption("keep");
                                }}
                                title={`Delete ${u.name}`}
                              >
                                <TrashIcon size={14} />
                              </button>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-muted)",
                                  padding: "0 6px",
                                }}
                              >
                                Current User
                              </span>
                            )}
                          </div>
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

      {/* ──────────────────────────────────────────
          MODAL 1: REGISTER NEW USER
          ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="admin-modal-overlay" onClick={() => !actionLoading && setShowAddModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <PlusIcon size={18} /> Register New User Account
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowAddModal(false)}
                disabled={actionLoading}
              >
                <XCloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="admin-modal-body">
                <div className="admin-modal-field">
                  <label htmlFor="add-name">Full Name</label>
                  <input
                    id="add-name"
                    type="text"
                    className="admin-modal-input"
                    placeholder="e.g. Dawit Bekele"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-modal-field">
                  <label htmlFor="add-email">Email Address</label>
                  <input
                    id="add-email"
                    type="email"
                    className="admin-modal-input"
                    placeholder="xxxxx@gmail.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-modal-field">
                  <label htmlFor="add-password">Initial Password (min 6 characters)</label>
                  <input
                    id="add-password"
                    type="password"
                    className="admin-modal-input"
                    placeholder="••••••••"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-modal-field">
                  <label htmlFor="add-role">Operational Role</label>
                  <select
                    id="add-role"
                    className="admin-modal-select"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as any)}
                  >
                    <option value="project_manager">Project Manager (PM)</option>
                    <option value="department_manager">Department Manager (DM)</option>
                    <option value="superadmin">Super Administrator</option>
                  </select>
                </div>

                {addRole === "project_manager" && (
                  <div className="admin-modal-field animate-fade-in">
                    <label htmlFor="add-project">Assigned Project Name</label>
                    <input
                      id="add-project"
                      type="text"
                      className="admin-modal-input"
                      placeholder="Seyo Shenen Guder Project"
                      value={addProjectName}
                      onChange={(e) => setAddProjectName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {addRole === "department_manager" && (
                  <div className="admin-modal-field animate-fade-in">
                    <label htmlFor="add-dept">Assigned Department</label>
                    <select
                      id="add-dept"
                      className="admin-modal-select"
                      value={addDepartment}
                      onChange={(e) => setAddDepartment(e.target.value)}
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>

                    {addDepartment === "Other" && (
                      <input
                        type="text"
                        className="admin-modal-input"
                        placeholder="Enter department name..."
                        style={{ marginTop: 8 }}
                        value={addOtherDept}
                        onChange={(e) => setAddOtherDept(e.target.value)}
                        required
                      />
                    )}
                  </div>
                )}

                <div className="admin-modal-field">
                  <label htmlFor="add-phone">Phone Number (optional)</label>
                  <input
                    id="add-phone"
                    type="tel"
                    className="admin-modal-input"
                    placeholder="+251 *********"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL 2: EDIT USER DETAILS
          ────────────────────────────────────────── */}
      {editingUser && (
        <div className="admin-modal-overlay" onClick={() => !actionLoading && setEditingUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <EditIcon size={18} /> Edit User Profile: {editingUser.name}
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditingUser(null)}
                disabled={actionLoading}
              >
                <XCloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="admin-modal-body">
                <div className="admin-modal-field">
                  <label htmlFor="edit-name">Full Name</label>
                  <input
                    id="edit-name"
                    type="text"
                    className="admin-modal-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-modal-field">
                  <label htmlFor="edit-email">Email Address</label>
                  <input
                    id="edit-email"
                    type="email"
                    className="admin-modal-input"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-modal-field">
                  <label htmlFor="edit-role">Operational Role</label>
                  <select
                    id="edit-role"
                    className="admin-modal-select"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                  >
                    <option value="project_manager">Project Manager (PM)</option>
                    <option value="department_manager">Department Manager (DM)</option>
                    <option value="superadmin">Super Administrator</option>
                  </select>
                </div>

                {editRole === "project_manager" && (
                  <div className="admin-modal-field animate-fade-in">
                    <label htmlFor="edit-project">Project Name</label>
                    <input
                      id="edit-project"
                      type="text"
                      className="admin-modal-input"
                      placeholder="Seyo Shenen Guder Project"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {editRole === "department_manager" && (
                  <div className="admin-modal-field animate-fade-in">
                    <label htmlFor="edit-dept">Department</label>
                    <select
                      id="edit-dept"
                      className="admin-modal-select"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>

                    {editDepartment === "Other" && (
                      <input
                        type="text"
                        className="admin-modal-input"
                        placeholder="Enter department name..."
                        style={{ marginTop: 8 }}
                        value={editOtherDept}
                        onChange={(e) => setEditOtherDept(e.target.value)}
                        required
                      />
                    )}
                  </div>
                )}

                <div className="admin-modal-field">
                  <label htmlFor="edit-phone">Phone Number</label>
                  <input
                    id="edit-phone"
                    type="tel"
                    className="admin-modal-input"
                    placeholder="+251 *********"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingUser(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL 3: RESET PASSWORD
          ────────────────────────────────────────── */}
      {resettingUser && (
        <div className="admin-modal-overlay" onClick={() => !actionLoading && setResettingUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <KeyIcon size={18} /> Reset Password: {resettingUser.name}
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setResettingUser(null)}
                disabled={actionLoading}
              >
                <XCloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="admin-modal-body">
                <div className="admin-user-preview-card">
                  <div className="user-avatar-sm">
                    <UserIcon size={14} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{resettingUser.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {resettingUser.email} · {resettingUser.role}
                    </div>
                  </div>
                </div>

                <div className="admin-modal-field">
                  <label htmlFor="new-pass">Set New Password (min 6 characters)</label>
                  <input
                    id="new-pass"
                    type="password"
                    className="admin-modal-input"
                    placeholder="Enter new password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    The user will use this new password to sign in immediately.
                  </span>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setResettingUser(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL 4: CONFIRM USER DELETION
          ────────────────────────────────────────── */}
      {/* ──────────────────────────────────────────
          MODAL 4: CONFIRM USER DELETION WITH RETENTION OPTIONS
          ────────────────────────────────────────── */}
      {userToDelete && (
        <div className="admin-modal-overlay" onClick={() => !actionLoading && setUserToDelete(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ borderBottomColor: "rgba(239, 68, 68, 0.3)" }}>
              <h3 className="admin-modal-title" style={{ color: "var(--danger)" }}>
                <AlertTriangleIcon size={20} /> Delete User Account: {userToDelete.name}
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setUserToDelete(null)}
                disabled={actionLoading}
              >
                <XCloseIcon size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              {/* Target User Summary Card */}
              <div className="admin-user-preview-card">
                <div className="user-avatar-sm" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
                  <UserIcon size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{userToDelete.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {userToDelete.email} {userToDelete.phone_number ? `· 📞 ${userToDelete.phone_number}` : ""}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
                    {getRoleBadge(userToDelete.role)}
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      {userToDelete.role === "department_manager"
                        ? userToDelete.department || "Corporate Dept"
                        : userToDelete.role === "project_manager"
                        ? userToDelete.project_name || "General Project"
                        : "Super Admin"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                      ({userToDelete.report_count || 0} reports · {userToDelete.task_count || 0} tasks)
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Retention Checkbox Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Select Deletion &amp; Data Retention Action:
                </label>

                {/* Option 1: Keep Data */}
                <div
                  className={`delete-option-card ${deleteDataOption === "keep" ? "selected-keep" : ""}`}
                  onClick={() => setDeleteDataOption("keep")}
                >
                  <div className="delete-option-radio">
                    <input
                      type="checkbox"
                      id="opt-keep"
                      checked={deleteDataOption === "keep"}
                      onChange={() => setDeleteDataOption("keep")}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <label htmlFor="opt-keep" style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem", cursor: "pointer" }}>
                        Option 1: Keep the data
                      </label>
                      <span className="badge-recommended">Preserve Records</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                      Permanently revoke this user&apos;s login credentials. All their submitted weekly reports, progress numbers, and tasks <strong>remain safe in the database</strong> for corporate accountability and audits.
                    </p>
                  </div>
                </div>

                {/* Option 2: Remove Account and Entire Data */}
                <div
                  className={`delete-option-card ${deleteDataOption === "purge" ? "selected-purge" : ""}`}
                  onClick={() => setDeleteDataOption("purge")}
                >
                  <div className="delete-option-radio">
                    <input
                      type="checkbox"
                      id="opt-purge"
                      checked={deleteDataOption === "purge"}
                      onChange={() => setDeleteDataOption("purge")}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <label htmlFor="opt-purge" style={{ fontWeight: 600, color: "var(--danger)", fontSize: "0.9rem", cursor: "pointer" }}>
                        Option 2: Remove account and entire data
                      </label>
                      <span className="badge-destructive">Complete Purge</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                      Permanently delete this user account <strong>AND completely wipe</strong> all weekly reports, department updates, and tasks created by this user from the system.
                    </p>
                  </div>
                </div>
              </div>

              {deleteDataOption === "purge" && (
                <div className="admin-danger-box animate-fade-in" style={{ marginTop: 2 }}>
                  <AlertTriangleIcon size={18} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: "0.82rem", color: "var(--danger)", margin: 0 }}>
                    <strong>Warning:</strong> Purging entire data will permanently delete all {userToDelete.report_count || 0} report(s) and {userToDelete.task_count || 0} task(s) associated with this account. This cannot be undone.
                  </p>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setUserToDelete(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                style={{
                  background: deleteDataOption === "purge" ? "#b91c1c" : "var(--danger)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TrashIcon size={15} />
                <span>
                  {actionLoading
                    ? "Deleting..."
                    : deleteDataOption === "purge"
                    ? "Purge Account & Entire Data"
                    : "Delete Account (Keep Data)"}
                </span>
              </button>
            </div>
          </div>
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
