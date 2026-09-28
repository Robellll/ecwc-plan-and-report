"use client";

import { useState } from "react";
import DepartmentSection, { DeptUpdate } from "./DepartmentSection";
import {
  ClipboardListIcon,
  BarChartIcon,
  BuildingIcon,
  SaveIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  FolderIcon,
  CalendarIcon,
} from "./Icons";
import { getDefaultDateRange } from "@/lib/dateUtils";

interface ReportFormProps {
  onSuccess: () => void;
  defaultProjectName?: string;
}

export default function ReportForm({ onSuccess, defaultProjectName }: ReportFormProps) {
  const initialDates = getDefaultDateRange();
  const [projectName, setProjectName] = useState(defaultProjectName || "");
  const [startDate, setStartDate] = useState<string>(initialDates.startDate);
  const [endDate, setEndDate] = useState<string>(initialDates.endDate);

  // Cumulative Progress (%)
  const [cumulativePlanned, setCumulativePlanned] = useState<string>("");
  const [cumulativeActual, setCumulativeActual] = useState<string>("");

  // Previous Period Progress (%)
  const [lastWeekPlanned, setLastWeekPlanned] = useState<string>("");
  const [lastWeekActual, setLastWeekActual] = useState<string>("");

  // Upcoming Period Target Plan (%)
  const [thisWeekPlan, setThisWeekPlan] = useState<string>("");

  const [deptRows, setDeptRows] = useState<DeptUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const cPlannedNum = Number(cumulativePlanned) || 0;
  const cActualNum = Number(cumulativeActual) || 0;
  const cumulativeVariance = Number((cActualNum - cPlannedNum).toFixed(2));

  const lwPlannedNum = Number(lastWeekPlanned) || 0;
  const lwActualNum = Number(lastWeekActual) || 0;
  const lastWeekVariance = Number((lwActualNum - lwPlannedNum).toFixed(2));

  const twPlanNum = Number(thisWeekPlan) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedProject = (defaultProjectName || projectName).trim();
    if (!resolvedProject) return showToast("error", "Project name is required.");
    if (!startDate || !endDate) return showToast("error", "Please select both start and end calendar dates.");
    if (startDate > endDate) return showToast("error", "Period start date cannot be later than end date.");

    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: resolvedProject,
          start_date: startDate,
          end_date: endDate,
          week_no: 1, // backwards compatibility fallback
          cumulative_planned: cPlannedNum,
          cumulative_actual: cActualNum,
          cumulative_variance: cumulativeVariance,
          last_week_planned: lwPlannedNum,
          last_week_actual: lwActualNum,
          last_week_variance: lastWeekVariance,
          this_week_plan: twPlanNum,
          planned_progress: cPlannedNum,
          actual_progress: cActualNum,
          department_updates: deptRows,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit report");

      showToast("success", "Progress Report successfully logged!");
      setProjectName("");
      const refreshedDates = getDefaultDateRange();
      setStartDate(refreshedDates.startDate);
      setEndDate(refreshedDates.endDate);
      setCumulativePlanned("");
      setCumulativeActual("");
      setLastWeekPlanned("");
      setLastWeekActual("");
      setThisWeekPlan("");
      setDeptRows([]);
      onSuccess();
    } catch (err: unknown) {
      showToast("error", `Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <div className="glass-card">
          <div className="form-card-top">
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              <span className="icon">
                <ClipboardListIcon size={18} />
              </span>
              Submit Progress Report
            </h2>
            <span className="badge-pm">Project Manager Authority</span>
          </div>
          <p className="form-subtitle">
            Record comprehensive performance tracking: Cumulative to-date, Previous Period performance, and Upcoming milestone targets.
          </p>

          {/* Project Name + Date Range Calendar Pickers */}
          <div className="form-grid" style={{ marginTop: 20 }}>
            {defaultProjectName ? (
              <div className="field">
                <label>Assigned Project Scope</label>
                <div className="assigned-project-box">
                  <FolderIcon size={16} style={{ color: "var(--ecwc-green)", flexShrink: 0 }} />
                  <span className="assigned-project-title">{defaultProjectName}</span>
                  <span className="badge-assigned-tag">Registered Project</span>
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="project-name">Project Name</label>
                <input
                  id="project-name"
                  type="text"
                  placeholder="e.g. Dire Dawa Industrial Park Phase 2"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            )}
            <div className="field">
              <label>Reporting Period Calendar (From – To)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label htmlFor="period-start" style={{ fontSize: "0.72rem", opacity: 0.8, marginBottom: 4, display: "block" }}>
                    From Date
                  </label>
                  <input
                    id="period-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="period-end" style={{ fontSize: "0.72rem", opacity: 0.8, marginBottom: 4, display: "block" }}>
                    To Date
                  </label>
                  <input
                    id="period-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* 1. Cumulative Progress */}
          <div className="progress-section-block">
            <div className="progress-section-header">
              <div className="header-left">
                <span className="progress-badge">1. To-Date Overall</span>
                <h3 className="progress-section-heading">Cumulative Progress (Planned vs. Actual vs. Variance)</h3>
              </div>
              <div className={`variance-badge ${cumulativeVariance >= 0 ? "positive" : "negative"}`}>
                {cumulativeVariance >= 0 ? <TrendingUpIcon size={14} /> : <TrendingDownIcon size={14} />}
                <span>Variance: {cumulativeVariance >= 0 ? "+" : ""}{cumulativeVariance.toFixed(1)}%</span>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="cumulative-planned">Cumulative Planned Progress</label>
                <div className="percent-input-wrapper">
                  <input
                    id="cumulative-planned"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0.0"
                    value={cumulativePlanned}
                    onChange={(e) => setCumulativePlanned(e.target.value)}
                    className="percent-input"
                    required
                  />
                  <span className="percent-adornment">%</span>
                </div>
              </div>

              <div className="field">
                <label htmlFor="cumulative-actual">Cumulative Actual Progress</label>
                <div className="percent-input-wrapper">
                  <input
                    id="cumulative-actual"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0.0"
                    value={cumulativeActual}
                    onChange={(e) => setCumulativeActual(e.target.value)}
                    className="percent-input"
                    required
                  />
                  <span className="percent-adornment">%</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* 2. Previous Period Progress */}
          <div className="progress-section-block">
            <div className="progress-section-header">
              <div className="header-left">
                <span className="progress-badge">2. Previous Period</span>
                <h3 className="progress-section-heading">Previous Period Progress (Planned vs. Actual vs. Variance)</h3>
              </div>
              <div className={`variance-badge ${lastWeekVariance >= 0 ? "positive" : "negative"}`}>
                {lastWeekVariance >= 0 ? <TrendingUpIcon size={14} /> : <TrendingDownIcon size={14} />}
                <span>Variance: {lastWeekVariance >= 0 ? "+" : ""}{lastWeekVariance.toFixed(1)}%</span>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="last-week-planned">Previous Period Planned Progress</label>
                <div className="percent-input-wrapper">
                  <input
                    id="last-week-planned"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0.0"
                    value={lastWeekPlanned}
                    onChange={(e) => setLastWeekPlanned(e.target.value)}
                    className="percent-input"
                  />
                  <span className="percent-adornment">%</span>
                </div>
              </div>

              <div className="field">
                <label htmlFor="last-week-actual">Previous Period Actual Progress</label>
                <div className="percent-input-wrapper">
                  <input
                    id="last-week-actual"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0.0"
                    value={lastWeekActual}
                    onChange={(e) => setLastWeekActual(e.target.value)}
                    className="percent-input"
                  />
                  <span className="percent-adornment">%</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* 3. Upcoming Period Progress Plan */}
          <div className="progress-section-block">
            <div className="progress-section-header">
              <div className="header-left">
                <span className="progress-badge highlight">3. Next Target</span>
                <h3 className="progress-section-heading">Upcoming Period Target Plan (%)</h3>
              </div>
            </div>

            <div className="field" style={{ maxWidth: 540 }}>
              <label htmlFor="this-week-plan">Target Planned Execution for Upcoming Period</label>
              <div className="percent-input-wrapper">
                <input
                  id="this-week-plan"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="0.0"
                  value={thisWeekPlan}
                  onChange={(e) => setThisWeekPlan(e.target.value)}
                  className="percent-input"
                />
                <span className="percent-adornment">%</span>
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* 4. Department Updates */}
          <div className="form-section-header">
            <h3 className="section-title" style={{ fontSize: "1rem", marginBottom: 12 }}>
              <span className="icon" style={{ width: 28, height: 28 }}>
                <BuildingIcon size={15} />
              </span>
              Department Updates &amp; Logs
            </h3>
            <p className="field-note">
              Add operational updates for specific units (Plant &amp; Equipment, Design, etc.)
            </p>
          </div>
          <DepartmentSection rows={deptRows} onChange={setDeptRows} />

          {/* Submit Action */}
          <div className="form-footer">
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {deptRows.length} department update{deptRows.length !== 1 ? "s" : ""} included
            </span>
            <button
              id="submit-report-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <SaveIcon size={16} />}
              {loading ? "Publishing…" : "Publish Progress Report"}
            </button>
          </div>
        </div>
      </form>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.type === "success" ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
