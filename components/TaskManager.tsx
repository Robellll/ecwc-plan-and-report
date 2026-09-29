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
  TrashIcon,
} from "./Icons";
import { SessionUser } from "./AuthModal";
import { formatDate } from "@/lib/dateUtils";
import ModernDatePicker from "./ModernDatePicker";

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  remarks?: string | null;
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

export interface NewTaskRow {
  id: string;
  department: string;
  title: string;
  completed: boolean;
  remarks: string;
}

export default function TaskManager({ user, availableProjects = [] }: TaskManagerProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Synchronized registered departments from DB (only departments with accounts)
  const [registeredDepartments, setRegisteredDepartments] = useState<string[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [filterDept, setFilterDept] = useState<string>(
    user.role === "department_manager" && user.department ? user.department : "ALL"
  );
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // PM 3-Column Task Table state
  const isPM = user.role === "project_manager" || user.role === "superadmin";
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [taskRows, setTaskRows] = useState<NewTaskRow[]>([
    { id: "row-1", department: "", title: "", completed: false, remarks: "" },
  ]);

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

  // Fetch only departments that have created an account on the portal
  const fetchDepartments = useCallback(async () => {
    setLoadingDepts(true);
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        setRegisteredDepartments(data.departments);
        // Sync row department if previously unset
        setTaskRows((prev) =>
          prev.map((r) =>
            !r.department && data.departments.length > 0 ? { ...r, department: data.departments[0] } : r
          )
        );
      }
    } catch (err) {
      console.error("Failed to load registered departments:", err);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

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
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Multi-row task table actions
  const handleAddRow = () => {
    setTaskRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        department: registeredDepartments[0] || "",
        title: "",
        completed: false,
        remarks: "",
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    setTaskRows((prev) => {
      if (prev.length <= 1) {
        return [
          {
            id: `row-${Date.now()}`,
            department: registeredDepartments[0] || "",
            title: "",
            completed: false,
            remarks: "",
          },
        ];
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleRowChange = (idx: number, field: keyof NewTaskRow, value: any) => {
    setTaskRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // Submit batch of tasks from the 3-column table
  const handleCreateTasks = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registeredDepartments.length === 0) {
      return showToast(
        "error",
        "No departments have registered an account on the portal yet. A department must register before tasks can be assigned."
      );
    }

    const validRows = taskRows.filter((r) => r.title.trim().length > 0);
    if (validRows.length === 0) {
      return showToast("error", "Please write at least one task before dispatching.");
    }

    for (const r of validRows) {
      if (!r.department.trim()) {
        return showToast("error", "Please select a registered department for all tasks.");
      }
    }

    setSubmitting(true);
    try {
      const resolvedProject = (user.project_name || projectName).trim() || "General Project";
      const payloadTasks = validRows.map((r) => ({
        title: r.title.trim(),
        description: r.title.trim(),
        remarks: r.remarks.trim(),
        department: r.department.trim(),
        project_name: resolvedProject,
        due_date: dueDate,
        week_no: 1,
        completed: r.completed,
        status: r.completed ? "completed" : "pending",
      }));

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: resolvedProject,
          due_date: dueDate,
          tasks: payloadTasks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create tasks");

      showToast(
        "success",
        `${payloadTasks.length} task${payloadTasks.length !== 1 ? "s" : ""} successfully dispatched to registered department(s)!`
      );

      // Reset to 1 clean row
      setTaskRows([
        {
          id: `row-${Date.now()}`,
          department: registeredDepartments[0] || "",
          title: "",
          completed: false,
          remarks: "",
        },
      ]);
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

  const handleToggleComplete = async (taskId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    await handleStatusChange(taskId, nextStatus);
  };

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
              ? "Delegate and assign operational milestones directly to registered department managers."
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
            {showCreateForm ? "Hide Task Table" : "+ Create & Delegate Task"}
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

      {/* Create Task Section: 3-Column Table (PM only) */}
      {isPM && showCreateForm && (
        <form onSubmit={handleCreateTasks} className="task-create-card animate-fade-in">
          <div className="task-card-top-bar">
            <div>
              <h3 className="task-card-title">
                <PlusIcon size={16} /> Create Task Section
              </h3>
              <p className="task-card-subtitle">
                3-Column Delegation Table: Select a registered department, write task with completion status, and record remarks.
              </p>
            </div>
            {registeredDepartments.length === 0 ? (
              <span className="badge-assigned-tag" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                ⚠️ No departments registered yet
              </span>
            ) : (
              <span className="badge-assigned-tag" style={{ background: "rgba(22, 101, 52, 0.1)", color: "var(--ecwc-green)" }}>
                ✓ {registeredDepartments.length} registered department{registeredDepartments.length !== 1 ? "s" : ""} available
              </span>
            )}
          </div>

          {/* Project & Due date bar */}
          <div className="task-table-scope-bar">
            {user.project_name ? (
              <div className="scope-field">
                <span className="scope-label">Assigned Project Scope:</span>
                <div className="assigned-project-box" style={{ padding: "6px 12px" }}>
                  <FolderIcon size={14} style={{ color: "var(--ecwc-green)", flexShrink: 0 }} />
                  <span className="assigned-project-title" style={{ fontSize: "0.85rem" }}>
                    {user.project_name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="scope-field">
                <label className="scope-label" htmlFor="task-scope-proj">
                  Project Scope:
                </label>
                <input
                  id="task-scope-proj"
                  type="text"
                  className="modern-scope-input"
                  placeholder="e.g. Gelan-Bishoftu Expressway Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
            )}

            <div className="scope-field" style={{ minWidth: 230 }}>
              <label className="scope-label" htmlFor="task-batch-due-date">
                <CalendarIcon size={12} style={{ display: "inline", marginRight: 4, color: "var(--ecwc-green)" }} />
                Target Due Date:
              </label>
              <ModernDatePicker
                id="task-batch-due-date"
                value={dueDate}
                onChange={(val) => setDueDate(val)}
                placeholder="Target Due Date"
              />
            </div>
          </div>

          {/* 3-Column Task Table */}
          <div className="task-creation-table-wrapper">
            <table className="task-creation-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Department</th>
                  <th style={{ width: "42%" }}>Write Task &amp; Check if Completed Later</th>
                  <th style={{ width: "26%" }}>Remarks</th>
                  {taskRows.length > 1 && <th style={{ width: "4%", textAlign: "center" }}></th>}
                </tr>
              </thead>
              <tbody>
                {taskRows.map((row, idx) => (
                  <tr key={row.id} className="task-create-tr">
                    {/* Column 1: Department Dropdown Section */}
                    <td className="task-td-dept">
                      <div className="modern-select-wrapper">
                        <select
                          className="modern-table-select"
                          value={row.department}
                          onChange={(e) => handleRowChange(idx, "department", e.target.value)}
                          required
                          disabled={registeredDepartments.length === 0}
                        >
                          {registeredDepartments.length === 0 ? (
                            <option value="">(No registered departments)</option>
                          ) : (
                            <>
                              <option value="">— Select Department —</option>
                              {registeredDepartments.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                      {registeredDepartments.length === 0 && (
                        <span className="field-note-warn">
                          Department must have an account registered on the portal.
                        </span>
                      )}
                    </td>

                    {/* Column 2: Write task with check box to check if it's completed later */}
                    <td className="task-td-title">
                      <div className="task-write-cell">
                        <textarea
                          className="modern-task-textarea"
                          rows={2}
                          placeholder="Write task to be delegated (e.g. Expedite structural drawing revision for Block B)..."
                          value={row.title}
                          onChange={(e) => handleRowChange(idx, "title", e.target.value)}
                          required
                        />
                        <label className="task-checkbox-wrap">
                          <input
                            type="checkbox"
                            className="modern-task-checkbox"
                            checked={row.completed}
                            onChange={(e) => handleRowChange(idx, "completed", e.target.checked)}
                          />
                          <span className="task-checkbox-text">
                            {row.completed ? "✓ Marked as Completed" : "Check if completed (or check later)"}
                          </span>
                        </label>
                      </div>
                    </td>

                    {/* Column 3: Remarks */}
                    <td className="task-td-remarks">
                      <textarea
                        className="modern-task-textarea remarks"
                        rows={2}
                        placeholder="Add remarks, technical notes, or follow-up instructions..."
                        value={row.remarks}
                        onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                      />
                    </td>

                    {/* Row Remove Button (if > 1 row) */}
                    {taskRows.length > 1 && (
                      <td className="task-td-action">
                        <button
                          type="button"
                          className="btn-row-delete"
                          title="Remove Row"
                          onClick={() => handleRemoveRow(idx)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Controls */}
          <div className="task-table-footer-controls">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddRow}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <PlusIcon size={14} />
              <span>+ Add Task Row</span>
            </button>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreateForm(false)}
              >
                Close Table
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || registeredDepartments.length === 0}
              >
                {submitting ? <span className="spinner" /> : <CheckCircleIcon size={16} />}
                {submitting ? "Dispatching…" : "Dispatch Task(s)"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters (PM has synchronized department filter; both have status filter) */}
      <div className="task-filters-bar">
        {isPM && (
          <div className="filter-group">
            <span className="filter-title">
              <FilterIcon size={13} /> Department:
            </span>
            <div className="modern-select-wrapper filter-select-wrap">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="modern-filter-select"
              >
                <option value="ALL">All Departments</option>
                {registeredDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="filter-group">
          <span className="filter-title">
            <ClockIcon size={13} /> Status:
          </span>
          <div className="modern-select-wrapper filter-select-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="modern-filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List / Board */}
      {loading ? (
        <div className="task-loading-state">
          <span className="spinner" style={{ width: 24, height: 24 }} />
          <span>Synchronizing tasks…</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-task-state">
          <p>No tasks found for the current selection.</p>
          {isPM && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setShowCreateForm(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
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

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Completion checkbox directly on card header */}
                  <label className="task-card-complete-toggle" title="Check if completed">
                    <input
                      type="checkbox"
                      className="modern-task-checkbox"
                      checked={task.status === "completed"}
                      onChange={() => handleToggleComplete(task.id, task.status)}
                    />
                    <span className="checkbox-mini-label">
                      {task.status === "completed" ? "Completed" : "Complete"}
                    </span>
                  </label>

                  <span className={`task-status-badge ${task.status}`}>
                    {task.status === "completed" && <CheckCircleIcon size={12} />}
                    {task.status === "in_progress" && <ClockIcon size={12} />}
                    {task.status === "pending" && <AlertCircleIcon size={12} />}
                    <span>{task.status.replace("_", " ")}</span>
                  </span>
                </div>
              </div>

              <h4 className="task-title">{task.title}</h4>
              {task.description && task.description !== task.title && (
                <p className="task-description">{task.description}</p>
              )}

              {task.remarks && (
                <div className="task-card-remarks">
                  <span className="remarks-tag">Remarks:</span>
                  <span className="remarks-content">{task.remarks}</span>
                </div>
              )}

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

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.type === "success" ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  );
}
