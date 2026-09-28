"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckSquareIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  BuildingIcon,
  UserIcon,
  FilterIcon,
  FolderIcon,
  CalendarIcon,
  PhoneIcon,
} from "./Icons";
import { SessionUser } from "./AuthModal";
import { formatDate } from "@/lib/dateUtils";

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  department: string;
  project_name: string;
  week_no: number;
  due_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: "pending" | "in_progress" | "completed";
  created_by: number | null;
  creator_name?: string | null;
  creator_role?: string | null;
  creator_phone?: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskManagerProps {
  user: SessionUser;
  availableProjects?: string[];
}

const DEPARTMENTS = [
  "Plant & Equipment",
  "Design",
  "Procurement",
  "Civil & Structural Works",
  "Quality Assurance (QA/QC)",
  "Health, Safety & Environment (HSE)",
];

export default function TaskManager({ user, availableProjects = [] }: TaskManagerProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<string>(
    user.role === "department_manager" && user.department ? user.department : "ALL"
  );
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // PM Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [projectName, setProjectName] = useState(user.project_name || availableProjects[0] || "");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/tasks";
      const params = new URLSearchParams();
      if (user.role === "department_manager" && user.department) {
        params.append("department", user.department);
      } else if (filterDept !== "ALL") {
        params.append("department", filterDept);
      }

      if (filterStatus !== "ALL") {
        params.append("status", filterStatus);
      }

      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [user, filterDept, filterStatus]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showToast("error", "Task title is required.");

    setSubmitting(true);
    try {
      const resolvedProject = (user.project_name || projectName).trim() || "General Project";
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          department,
          project_name: resolvedProject,
          due_date: dueDate,
          week_no: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create task");

      showToast("success", "Task successfully assigned to department!");
      setTitle("");
      setDescription("");
      setShowCreateForm(false);
      fetchTasks();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: number, nextStatus: "pending" | "in_progress" | "completed") => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus, updated_at: new Date().toISOString() } : t))
        );
        showToast("success", `Task marked as ${nextStatus.replace("_", " ")}.`);
      }
    } catch (err) {
      showToast("error", "Failed to update task status.");
    }
  };

  const isPM = user.role === "project_manager" || user.role === "superadmin";
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <section className="task-manager-section" aria-label="Task Management">
      {/* Header Bar */}
      <div className="task-manager-header">
        <div>
          <span className="analytics-badge">
            <CheckSquareIcon size={14} />{" "}
            {isPM ? "Task Delegation & Oversight" : "Assigned Department Deliverables"}
          </span>
          <h2 className="section-title" style={{ marginBottom: 4, marginTop: 4 }}>
            {isPM ? "Department Action Items" : `${user.department || "Department"} Task Board`}
          </h2>
          <p className="task-manager-desc">
            {isPM
              ? "Assign key operational milestone targets to Department Managers and track completion."
              : "Review deliverables assigned by Project Managers and update work status."}
          </p>
        </div>

        {isPM && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <PlusIcon size={16} />
            {showCreateForm ? "Cancel Assignment" : "Assign New Task"}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="task-stats-row">
        <div className="task-stat-card">
          <span className="task-stat-num">{tasks.length}</span>
          <span className="task-stat-label">Total Tasks</span>
        </div>
        <div className="task-stat-card">
          <span className="task-stat-num amber">{pendingCount}</span>
          <span className="task-stat-label">Pending</span>
        </div>
        <div className="task-stat-card">
          <span className="task-stat-num blue">{inProgressCount}</span>
          <span className="task-stat-label">In Progress</span>
        </div>
        <div className="task-stat-card">
          <span className="task-stat-num green">{completedCount}</span>
          <span className="task-stat-label">Completed</span>
        </div>
      </div>

      {/* Create Task Form (PM only) */}
      {isPM && showCreateForm && (
        <form onSubmit={handleCreateTask} className="task-create-card animate-fade-in">
          <h3 className="task-card-title">
            <PlusIcon size={16} /> Assign Task to Department Manager
          </h3>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="task-title">Task Title</label>
              <input
                id="task-title"
                type="text"
                placeholder="e.g. Expedite structural drawing revision for Block B"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="task-dept">Assignee Department</label>
              <select
                id="task-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: 14 }}>
            {user.project_name ? (
              <div className="field">
                <label>Project Scope</label>
                <div className="assigned-project-box">
                  <FolderIcon size={14} style={{ color: "var(--ecwc-green)", flexShrink: 0 }} />
                  <span className="assigned-project-title">{user.project_name}</span>
                  <span className="badge-assigned-tag">Your Project</span>
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="task-project">Project Scope</label>
                <input
                  id="task-project"
                  type="text"
                  placeholder="e.g. Modjo-Hawassa Expressway"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="task-due-date">
                <CalendarIcon size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Target Due Date (Calendar)
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="task-desc">Description &amp; Action Notes</label>
            <textarea
              id="task-desc"
              placeholder="Provide technical requirements, milestone details, or urgent actions needed…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? <span className="spinner" /> : <CheckCircleIcon size={16} />}
              {submitting ? "Assigning…" : "Dispatch Task"}
            </button>
          </div>
        </form>
      )}

      {/* Filters (PM only has department filter; both have status filter) */}
      <div className="task-filters-bar">
        {isPM && (
          <div className="filter-group">
            <span className="filter-title">
              <FilterIcon size={13} /> Department:
            </span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="task-filter-select"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <span className="filter-title">Status:</span>
          <div className="filter-pills">
            {["ALL", "pending", "in_progress", "completed"].map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-pill ${filterStatus === st ? "active" : ""}`}
                onClick={() => setFilterStatus(st)}
              >
                {st === "ALL" ? "All" : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-task-state">
          <CheckSquareIcon size={36} style={{ opacity: 0.5, color: "var(--ecwc-green)" }} />
          <p>No tasks found for the current selection.</p>
          {isPM && !showCreateForm && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowCreateForm(true)}
              style={{ marginTop: 10 }}
            >
              Create first task
            </button>
          )}
        </div>
      ) : (
        <div className="task-list-grid">
          {tasks.map((task) => (
            <div key={task.id} className={`task-card ${task.status}`}>
              <div className="task-card-header">
                <span className="task-dept-badge">
                  <BuildingIcon size={12} /> {task.department}
                </span>
                <span className={`task-status-badge ${task.status}`}>
                  {task.status === "completed" && <CheckCircleIcon size={12} />}
                  {task.status === "in_progress" && <ClockIcon size={12} />}
                  {task.status === "pending" && <AlertCircleIcon size={12} />}
                  <span>{task.status.replace("_", " ")}</span>
                </span>
              </div>

              <h4 className="task-title">{task.title}</h4>
              {task.description && <p className="task-description">{task.description}</p>}

              <div className="task-meta-row">
                <span className="task-meta-item">
                  <strong>Project:</strong> {task.project_name}
                </span>
                <span className="task-meta-item" title="Deliverable Due Date">
                  <CalendarIcon size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  <strong>Target Due:</strong> {formatDate(task.due_date || task.created_at)}
                </span>
                {task.creator_name && (
                  <span className="task-meta-item">
                    <UserIcon size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                    {task.creator_name}
                    {task.creator_phone && (
                      <a
                        href={`tel:${task.creator_phone}`}
                        style={{
                          marginLeft: 6,
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                        title={`Call Project Manager at ${task.creator_phone}`}
                      >
                        <PhoneIcon size={10} />
                        {task.creator_phone}
                      </a>
                    )}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="task-card-actions">
                {task.status !== "completed" ? (
                  <>
                    {task.status === "pending" && (
                      <button
                        type="button"
                        className="btn btn-ghost task-action-btn"
                        onClick={() => handleStatusChange(task.id, "in_progress")}
                      >
                        <ClockIcon size={14} /> Start Working
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary task-action-btn"
                      onClick={() => handleStatusChange(task.id, "completed")}
                    >
                      <CheckCircleIcon size={14} /> Mark as Completed
                    </button>
                  </>
                ) : (
                  <div className="task-completed-label">
                    <CheckCircleIcon size={14} /> Deliverable Completed
                    <button
                      type="button"
                      className="task-reopen-btn"
                      onClick={() => handleStatusChange(task.id, "in_progress")}
                    >
                      (Reopen)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.type === "success" ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  );
}
