"use client";

import { useCallback, useEffect, useState } from "react";
import ProjectManagerDashboard from "@/components/ProjectManagerDashboard";
import DepartmentManagerDashboard from "@/components/DepartmentManagerDashboard";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import AuthModal, { SessionUser } from "@/components/AuthModal";
import ThemeToggle from "@/components/ThemeToggle";
import {
  AlertTriangleIcon,
  LogOutIcon,
  UserIcon,
  BuildingIcon,
  LayersIcon,
  ActivityIcon,
  CheckSquareIcon,
  ShieldIcon,
} from "@/components/Icons";

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

export default function HomePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [migrateError, setMigrateError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Initialize theme preference
  useEffect(() => {
    const saved = localStorage.getItem("ecwc-theme") as "light" | "dark" | null;
    const activeTheme = saved || "light";
    setTheme(activeTheme);
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ecwc-theme", next);
  };

  // Run DB migrations automatically on startup
  const runMigrate = async () => {
    try {
      const res = await fetch("/api/migrate");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch (err) {
      setMigrateError(String(err));
    }
  };

  // Check current session
  const checkAuth = useCallback(async () => {
    setLoadingUser(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      if (data.success) setReports(data.reports);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    runMigrate().then(() => {
      checkAuth();
      fetchReports();
    });
  }, [checkAuth, fetchReports]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  return (
    <main className="app-wrapper">
      {/* Top Navigation Bar */}
      <div className="top-nav-bar">
        <div className="top-brand-indicator">
          <span className="badge-dot" />
          <span>ECWC Project Portal · ኢ.ኮ.ሥ.ኮ</span>
        </div>

        <div className="top-nav-actions">
          {user && (
            <div className="user-profile-badge">
              <span className="user-role-indicator">
                {user.role === "superadmin" ? (
                  <ShieldIcon size={14} style={{ color: "var(--superadmin-accent, #a855f7)" }} />
                ) : user.role === "project_manager" ? (
                  <LayersIcon size={14} style={{ color: "var(--ecwc-green)" }} />
                ) : (
                  <BuildingIcon size={14} style={{ color: "var(--warning)" }} />
                )}
              </span>
              <div className="user-meta-text">
                <span className="user-name-text">{user.name}</span>
                <span className="user-role-text">
                  {user.role === "superadmin"
                    ? "Super Admin"
                    : user.role === "project_manager"
                    ? `PM · ${user.project_name || "Corporate"}`
                    : `${user.department || "Dept"} Manager`}
                </span>
              </div>
              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOutIcon size={14} />
              </button>
            </div>
          )}

          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>

      {/* Logged-In Portal Header */}
      {user && (
        <header className="app-header app-header-compact">
          <div className="logo-container" title="Ethiopian Construction Works Corporation (ECWC / ኢ.ኮ.ሥ.ኮ)">
            <img
              key={theme}
              src={theme === "dark" ? "/ecwc-logo-white.png" : "/ecwc-logo.png"}
              alt="ECWC Logo - Ethiopian Construction Works Corporation"
              className="ecwc-header-logo"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/ecwc-logo.png";
              }}
            />
          </div>

          <div className="badge">
            <span className="badge-dot" />
            <span>ECWC · ኢ.ኮ.ሥ.ኮ</span>
          </div>

          <h1>Project Progress Reports</h1>
          <p className="subtitle">
            Ethiopian Construction Works Corporation | Planning &amp; Operational Performance Tracking
          </p>
          <p className="amharic-sub">የኢትዮጵያ ኮንስትራክሽን ሥራዎች ኮርፖሬሽን</p>
        </header>
      )}

      {/* Migration Error Banner */}
      {migrateError && (
        <div
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            color: "var(--danger)",
            marginBottom: 32,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          role="alert"
        >
          <AlertTriangleIcon size={18} />
          <span>Database setup notice: {migrateError}</span>
        </div>
      )}

      {/* Authentication Gateway or Role Dashboards */}
      {loadingUser ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <span className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
        </div>
      ) : !user ? (
        <div className="welcome-split-layout animate-fade-in">
          {/* Left Column: Company Logo & Corporate Information */}
          <div className="welcome-info-column">
            <div className="welcome-logo-container" title="Ethiopian Construction Works Corporation (ECWC / ኢ.ኮ.ሥ.ኮ)">
              <img
                key={theme}
                src={theme === "dark" ? "/ecwc-logo-white.png" : "/ecwc-logo.png"}
                alt="ECWC Logo - Ethiopian Construction Works Corporation"
                className="welcome-logo-img"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/ecwc-logo.png";
                }}
              />
            </div>

            <div className="welcome-badge">
              <span className="badge-dot" />
              <span>ECWC · ኢ.ኮ.ሥ.ኮ · Enterprise Portal</span>
            </div>

            <h1 className="welcome-title">Project Progress Reports</h1>

            
            <p className="welcome-amharic">የኢትዮጵያ ኮንስትራክሽን ሥራዎች ኮርፖሬሽን</p>

            <div className="welcome-highlights">
              <div className="welcome-highlight-card">
                <div className="welcome-highlight-icon green">
                  <ActivityIcon size={18} />
                </div>
                <div className="welcome-highlight-text">
                  <h4>Executive S-Curve Tracking</h4>
                  <p>Real-time corporate planned vs. actual progress curves across calendar date periods.</p>
                </div>
              </div>

              <div className="welcome-highlight-card">
                <div className="welcome-highlight-icon blue">
                  <LayersIcon size={18} />
                </div>
                <div className="welcome-highlight-text">
                  <h4>Role-Specific Authority</h4>
                  <p>Dedicated consoles for Project Managers and Department Managers.</p>
                </div>
              </div>

              <div className="welcome-highlight-card">
                <div className="welcome-highlight-icon amber">
                  <BuildingIcon size={18} />
                </div>
                <div className="welcome-highlight-text">
                  <h4>Inter-Departmental Actions</h4>
                  <p>Direct milestone assignment to Plant &amp; Equipment, Design, and QA/QC teams.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In & Create Account Section */}
          <div className="welcome-auth-column">
            <AuthModal onSuccess={(newUser) => setUser(newUser)} />
          </div>
        </div>
      ) : user.role === "superadmin" ? (
        <SuperAdminDashboard
          user={user}
          reports={reports}
          loadingReports={loadingReports}
          onRefreshReports={fetchReports}
        />
      ) : user.role === "project_manager" ? (
        <ProjectManagerDashboard
          user={user}
          reports={reports}
          loadingReports={loadingReports}
          onRefreshReports={fetchReports}
        />
      ) : (
        <DepartmentManagerDashboard
          user={user}
          reports={reports}
          loadingReports={loadingReports}
          onRefreshReports={fetchReports}
        />
      )}
    </main>
  );
}
