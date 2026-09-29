"use client";

import { useState } from "react";
import {
  ClipboardListIcon,
  BarChartIcon,
  SaveIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  FolderIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  TrophyIcon,
  TargetIcon,
  AlertTriangleIcon,
} from "./Icons";
import { getDefaultDateRange } from "@/lib/dateUtils";
import ModernDatePicker from "./ModernDatePicker";

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

  // 3 Operational Sections (at least 3 rows by default each)
  const [majorWins, setMajorWins] = useState<string[]>(["", "", ""]);
  const [majorPlans, setMajorPlans] = useState<string[]>(["", "", ""]);
  const [constraints, setConstraints] = useState<string[]>(["", "", ""]);

  // Active section tab: "wins" | "plans" | "constraints"
  const [activeConstraintTab, setActiveConstraintTab] = useState<"wins" | "plans" | "constraints">("wins");
  const [viewAllSections, setViewAllSections] = useState<boolean>(false);

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

  const handleUpdateItem = (
    section: "wins" | "plans" | "constraints",
    index: number,
    val: string
  ) => {
    if (section === "wins") {
      setMajorWins((prev) => {
        const next = [...prev];
        next[index] = val;
        return next;
      });
    } else if (section === "plans") {
      setMajorPlans((prev) => {
        const next = [...prev];
        next[index] = val;
        return next;
      });
    } else {
      setConstraints((prev) => {
        const next = [...prev];
        next[index] = val;
        return next;
      });
    }
  };

  const handleAddRow = (section: "wins" | "plans" | "constraints") => {
    if (section === "wins") setMajorWins((prev) => [...prev, ""]);
    else if (section === "plans") setMajorPlans((prev) => [...prev, ""]);
    else setConstraints((prev) => [...prev, ""]);
  };

  const handleRemoveRow = (section: "wins" | "plans" | "constraints", index: number) => {
    const remover = (prev: string[]) => {
      if (prev.length <= 1) {
        return [""];
      }
      return prev.filter((_, i) => i !== index);
    };
    if (section === "wins") setMajorWins(remover);
    else if (section === "plans") setMajorPlans(remover);
    else setConstraints(remover);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedProject = (defaultProjectName || projectName).trim();
    if (!resolvedProject) return showToast("error", "Project name is required.");
    if (!startDate || !endDate) return showToast("error", "Please select both start and end calendar dates.");
    if (startDate > endDate) return showToast("error", "Period start date cannot be later than end date.");

    const cleanWins = majorWins.map((s) => s.trim()).filter(Boolean);
    const cleanPlans = majorPlans.map((s) => s.trim()).filter(Boolean);
    const cleanConstraints = constraints.map((s) => s.trim()).filter(Boolean);

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
          major_wins: cleanWins,
          major_plans: cleanPlans,
          constraints: cleanConstraints,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit report");

      showToast("success", "Progress Report & Constraints successfully published!");
      setProjectName("");
      const refreshedDates = getDefaultDateRange();
      setStartDate(refreshedDates.startDate);
      setEndDate(refreshedDates.endDate);
      setCumulativePlanned("");
      setCumulativeActual("");
      setLastWeekPlanned("");
      setLastWeekActual("");
      setThisWeekPlan("");
      setMajorWins(["", "", ""]);
      setMajorPlans(["", "", ""]);
      setConstraints(["", "", ""]);
      onSuccess();
    } catch (err: unknown) {
      showToast("error", `Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const totalLoggedItems =
    majorWins.filter((s) => s.trim()).length +
    majorPlans.filter((s) => s.trim()).length +
    constraints.filter((s) => s.trim()).length;

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
              <label>
                <CalendarIcon size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 5, color: "var(--ecwc-green)" }} />
                Reporting Period Calendar (From – To)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="period-start" style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                    From Date
                  </label>
                  <ModernDatePicker
                    id="period-start"
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="From Date"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="period-end" style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                    To Date
                  </label>
                  <ModernDatePicker
                    id="period-end"
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    placeholder="To Date"
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

          {/* 4. List of Constraints & Highlights */}
          <div className="constraints-master-section">
            <div className="form-section-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <h3 className="section-title" style={{ fontSize: "1.05rem", margin: 0 }}>
                  <span className="icon" style={{ width: 28, height: 28, background: "rgba(22, 101, 52, 0.12)", color: "var(--ecwc-green)" }}>
                    <AlertTriangleIcon size={16} />
                  </span>
                  List of Constraints
                </h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.76rem", padding: "4px 10px", borderRadius: 8 }}
                    onClick={() => setViewAllSections(!viewAllSections)}
                  >
                    {viewAllSections ? "Single Section View" : "Show All 3 Sections"}
                  </button>
                  <span className="badge-assigned-tag" style={{ fontSize: "0.75rem" }}>
                    {totalLoggedItems} Item{totalLoggedItems !== 1 ? "s" : ""} Total
                  </span>
                </div>
              </div>
              <p className="field-note" style={{ marginTop: 4 }}>
                Review and record operational items for <strong>Major Wins of Last Week</strong>, <strong>Major Plans of This Week</strong>, and the <strong>Constraints List</strong>.
              </p>
            </div>

            {/* 3 Clickable Section Tabs */}
            <div className="constraint-section-nav" role="tablist">
              <button
                type="button"
                id="btn-tab-major-wins"
                role="tab"
                aria-selected={activeConstraintTab === "wins" && !viewAllSections}
                className={`constraint-nav-pill ${activeConstraintTab === "wins" && !viewAllSections ? "active" : ""}`}
                onClick={() => {
                  setActiveConstraintTab("wins");
                  setViewAllSections(false);
                }}
              >
                <TrophyIcon size={15} style={{ color: "#eab308" }} />
                <span>Major Wins of Last Week</span>
                <span className="constraint-pill-count">{majorWins.length}</span>
              </button>

              <button
                type="button"
                id="btn-tab-major-plans"
                role="tab"
                aria-selected={activeConstraintTab === "plans" && !viewAllSections}
                className={`constraint-nav-pill ${activeConstraintTab === "plans" && !viewAllSections ? "active" : ""}`}
                onClick={() => {
                  setActiveConstraintTab("plans");
                  setViewAllSections(false);
                }}
              >
                <TargetIcon size={15} style={{ color: "var(--ecwc-green)" }} />
                <span>Major Plans of This Week</span>
                <span className="constraint-pill-count">{majorPlans.length}</span>
              </button>

              <button
                type="button"
                id="btn-tab-constraints-list"
                role="tab"
                aria-selected={activeConstraintTab === "constraints" && !viewAllSections}
                className={`constraint-nav-pill ${activeConstraintTab === "constraints" && !viewAllSections ? "active" : ""}`}
                onClick={() => {
                  setActiveConstraintTab("constraints");
                  setViewAllSections(false);
                }}
              >
                <AlertTriangleIcon size={15} style={{ color: "#ef4444" }} />
                <span>Constraints List</span>
                <span className="constraint-pill-count">{constraints.length}</span>
              </button>
            </div>

            {/* Section Tables: Render active tab or all 3 */}
            <div className="constraint-tables-container" style={{ marginTop: 16 }}>
              {/* Subsection 1: Major Wins of Last Week */}
              {(viewAllSections || activeConstraintTab === "wins") && (
                <div className="constraint-table-card animate-fade-in" id="section-major-wins">
                  <div className="constraint-table-header-bar">
                    <div className="constraint-table-title-group">
                      <span className="constraint-badge-icon wins">
                        <TrophyIcon size={15} />
                      </span>
                      <div>
                        <h4 className="constraint-subsection-title">Major Wins of Last Week</h4>
                        <span className="constraint-subsection-desc">
                          Key milestones accomplished and completed activities during the past week
                        </span>
                      </div>
                    </div>
                    <span className="constraint-count-pill">{majorWins.length} rows</span>
                  </div>

                  <div className="constraint-table-scroll">
                    <table className="constraint-data-table">
                      <thead>
                        <tr>
                          <th style={{ width: "70px", textAlign: "center" }}>Row #</th>
                          <th>Major Win Description</th>
                          <th style={{ width: "70px", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {majorWins.map((win, idx) => (
                          <tr key={`win-${idx}`}>
                            <td className="td-row-num">
                              <span className="row-num-badge">#{idx + 1}</span>
                            </td>
                            <td className="td-row-input">
                              <input
                                type="text"
                                className="constraint-row-input"
                                placeholder={`Enter major win #${idx + 1} (e.g. Completed asphalt paving from Km 10 to Km 14)`}
                                value={win}
                                onChange={(e) => handleUpdateItem("wins", idx, e.target.value)}
                              />
                            </td>
                            <td className="td-row-action">
                              <button
                                type="button"
                                className="btn-row-delete"
                                title={majorWins.length > 1 ? `Remove Row #${idx + 1}` : "Clear Row"}
                                onClick={() => handleRemoveRow("wins", idx)}
                              >
                                <TrashIcon size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="constraint-table-footer-actions">
                    <button
                      type="button"
                      id="add-row-major-wins"
                      className="btn btn-secondary btn-sm add-constraint-row-btn"
                      onClick={() => handleAddRow("wins")}
                    >
                      <PlusIcon size={14} />
                      <span>+ Add Row</span>
                    </button>
                    <span className="constraint-table-note">
                      At least 3 rows provided. Row numbers are automatically sequenced.
                    </span>
                  </div>
                </div>
              )}

              {/* Subsection 2: Major Plans of This Week */}
              {(viewAllSections || activeConstraintTab === "plans") && (
                <div className="constraint-table-card animate-fade-in" id="section-major-plans">
                  <div className="constraint-table-header-bar">
                    <div className="constraint-table-title-group">
                      <span className="constraint-badge-icon plans">
                        <TargetIcon size={15} />
                      </span>
                      <div>
                        <h4 className="constraint-subsection-title">Major Plans of This Week</h4>
                        <span className="constraint-subsection-desc">
                          Target work items, mobilization steps, and key deliverables scheduled for this week
                        </span>
                      </div>
                    </div>
                    <span className="constraint-count-pill">{majorPlans.length} rows</span>
                  </div>

                  <div className="constraint-table-scroll">
                    <table className="constraint-data-table">
                      <thead>
                        <tr>
                          <th style={{ width: "70px", textAlign: "center" }}>Row #</th>
                          <th>Major Plan Description</th>
                          <th style={{ width: "70px", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {majorPlans.map((plan, idx) => (
                          <tr key={`plan-${idx}`}>
                            <td className="td-row-num">
                              <span className="row-num-badge">#{idx + 1}</span>
                            </td>
                            <td className="td-row-input">
                              <input
                                type="text"
                                className="constraint-row-input"
                                placeholder={`Enter major plan #${idx + 1} (e.g. Pour concrete for bridge deck pier; mobilize 3 bulldozers)`}
                                value={plan}
                                onChange={(e) => handleUpdateItem("plans", idx, e.target.value)}
                              />
                            </td>
                            <td className="td-row-action">
                              <button
                                type="button"
                                className="btn-row-delete"
                                title={majorPlans.length > 1 ? `Remove Row #${idx + 1}` : "Clear Row"}
                                onClick={() => handleRemoveRow("plans", idx)}
                              >
                                <TrashIcon size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="constraint-table-footer-actions">
                    <button
                      type="button"
                      id="add-row-major-plans"
                      className="btn btn-secondary btn-sm add-constraint-row-btn"
                      onClick={() => handleAddRow("plans")}
                    >
                      <PlusIcon size={14} />
                      <span>+ Add Row</span>
                    </button>
                    <span className="constraint-table-note">
                      At least 3 rows provided. Row numbers are automatically sequenced.
                    </span>
                  </div>
                </div>
              )}

              {/* Subsection 3: Constraints List */}
              {(viewAllSections || activeConstraintTab === "constraints") && (
                <div className="constraint-table-card animate-fade-in" id="section-constraints-list">
                  <div className="constraint-table-header-bar">
                    <div className="constraint-table-title-group">
                      <span className="constraint-badge-icon constraints">
                        <AlertTriangleIcon size={15} />
                      </span>
                      <div>
                        <h4 className="constraint-subsection-title">Constraints List</h4>
                        <span className="constraint-subsection-desc">
                          Blockers, material shortages, right-of-way issues, or equipment downtime
                        </span>
                      </div>
                    </div>
                    <span className="constraint-count-pill">{constraints.length} rows</span>
                  </div>

                  <div className="constraint-table-scroll">
                    <table className="constraint-data-table">
                      <thead>
                        <tr>
                          <th style={{ width: "70px", textAlign: "center" }}>Row #</th>
                          <th>Constraint / Blocker Description</th>
                          <th style={{ width: "70px", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {constraints.map((c, idx) => (
                          <tr key={`constraint-${idx}`}>
                            <td className="td-row-num">
                              <span className="row-num-badge">#{idx + 1}</span>
                            </td>
                            <td className="td-row-input">
                              <input
                                type="text"
                                className="constraint-row-input"
                                placeholder={`Enter constraint #${idx + 1} (e.g. Fuel delivery delayed by 3 days; ROW compensation pending)`}
                                value={c}
                                onChange={(e) => handleUpdateItem("constraints", idx, e.target.value)}
                              />
                            </td>
                            <td className="td-row-action">
                              <button
                                type="button"
                                className="btn-row-delete"
                                title={constraints.length > 1 ? `Remove Row #${idx + 1}` : "Clear Row"}
                                onClick={() => handleRemoveRow("constraints", idx)}
                              >
                                <TrashIcon size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="constraint-table-footer-actions">
                    <button
                      type="button"
                      id="add-row-constraints-list"
                      className="btn btn-secondary btn-sm add-constraint-row-btn"
                      onClick={() => handleAddRow("constraints")}
                    >
                      <PlusIcon size={14} />
                      <span>+ Add Row</span>
                    </button>
                    <span className="constraint-table-note">
                      At least 3 rows provided. Row numbers are automatically sequenced.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="form-footer">
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {totalLoggedItems} item{totalLoggedItems !== 1 ? "s" : ""} recorded across Wins, Plans &amp; Constraints
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
