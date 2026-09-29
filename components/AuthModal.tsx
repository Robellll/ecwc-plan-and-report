"use client";

import { useState } from "react";
import {
  LockIcon,
  UserIcon,
  MailIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  BuildingIcon,
  LayersIcon,
  FolderIcon,
  PhoneIcon,
} from "./Icons";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "project_manager" | "department_manager" | "superadmin";
  department?: string | null;
  project_name?: string | null;
  phone_number?: string | null;
}

interface AuthModalProps {
  onSuccess: (user: SessionUser) => void;
  defaultMode?: "signin" | "signup";
}

const DEPARTMENTS = [
  "Design",
  "Plant & Equipment",
  "Other",
];

export default function AuthModal({ onSuccess, defaultMode = "signin" }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"project_manager" | "department_manager">("project_manager");
  const [projectName, setProjectName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [otherDepartment, setOtherDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && !name.trim()) {
      setError("Please provide your full name.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup" && role === "project_manager" && !projectName.trim()) {
      setError("Please enter the Project Name you will manage.");
      return;
    }

    if (mode === "signup" && role === "department_manager" && department === "Other" && !otherDepartment.trim()) {
      setError("Please specify your department name.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const finalDept = department === "Other" ? otherDepartment.trim() : department;
      const payload =
        mode === "signup"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
              role,
              department: role === "department_manager" ? finalDept : null,
              project_name: role === "project_manager" ? projectName.trim() : null,
              phone_number: role === "project_manager" ? (phone.trim() || null) : null,
            }
          : { email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed. Please check your credentials.");
      }

      onSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <div className="auth-glass-card">
        {/* Header Branding */}
        <div className="auth-card-header">
          <div className="auth-logo-pill">
            <span className="badge-dot" />
            <span>ECWC Security Portal</span>
          </div>
          <h2 className="auth-title">
            {mode === "signin" ? "Welcome Back" : "Create ECWC Account"}
          </h2>
          <p className="auth-subtitle">
            {mode === "signin"
              ? "Sign in to access your role-specific dashboard and reports."
              : "Register as a Project Manager or Department Manager to continue."}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={`auth-tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            role="tab"
            aria-selected={mode === "signin"}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            role="tab"
            aria-selected={mode === "signup"}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full Name</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <UserIcon size={16} />
                </span>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="e.g. Dawit Bekele"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <MailIcon size={16} />
              </span>
              <input
                id="auth-email"
                type="email"
                placeholder="xxxxx@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <LockIcon size={16} />
              </span>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
              />
            </div>
          </div>

          {mode === "signup" && (
            <>
              {/* Role Selection */}
              <div className="auth-field">
                <label>Select Your Operational Role</label>
                <div className="auth-role-grid">
                  <div
                    className={`auth-role-option ${role === "project_manager" ? "selected" : ""}`}
                    onClick={() => setRole("project_manager")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="role-option-header">
                      <LayersIcon size={16} className="role-icon" />
                      <span className="role-name">Project Manager</span>
                    </div>
                    <p className="role-desc">
                      Submits weekly progress reports &amp; assigns tasks to departments.
                    </p>
                  </div>

                  <div
                    className={`auth-role-option ${role === "department_manager" ? "selected" : ""}`}
                    onClick={() => setRole("department_manager")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="role-option-header">
                      <BuildingIcon size={16} className="role-icon" />
                      <span className="role-name">Department Manager</span>
                    </div>
                    <p className="role-desc">
                      Reviews department reports &amp; executes assigned project tasks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Project & Phone Inputs if Project Manager */}
              {role === "project_manager" && (
                <>
                  <div className="auth-field auth-project-field animate-fade-in">
                    <label htmlFor="auth-project">Your Assigned Project Name</label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <FolderIcon size={16} />
                      </span>
                      <input
                        id="auth-project"
                        type="text"
                        placeholder="Seyo Shenen Guder Project"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        required
                      />
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                      Your weekly reports and task assignments will automatically be linked to this project.
                    </span>
                  </div>

                  <div className="auth-field auth-phone-field animate-fade-in">
                    <label htmlFor="auth-phone">Phone Number (For Department Follow-up)</label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <PhoneIcon size={16} />
                      </span>
                      <input
                        id="auth-phone"
                        type="tel"
                        placeholder="+251 *********"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                      Allows head office Department Managers to contact you directly regarding operational tasks.
                    </span>
                  </div>
                </>
              )}

              {/* Department Dropdown if Department Manager */}
              {role === "department_manager" && (
                <div className="auth-field auth-department-field animate-fade-in">
                  <label htmlFor="auth-dept">Select Your Department</label>
                  <select
                    id="auth-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="auth-select"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  {department === "Other" && (
                    <div className="auth-input-wrapper animate-fade-in" style={{ marginTop: 10 }}>
                      <span className="auth-input-icon">
                        <BuildingIcon size={16} />
                      </span>
                      <input
                        id="auth-other-dept"
                        type="text"
                        placeholder="Enter your department name..."
                        value={otherDepartment}
                        onChange={(e) => setOtherDepartment(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" />
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Complete Registration"
            )}
          </button>
        </form>

        <div className="auth-card-footer">
          {mode === "signin" ? (
            <p>
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
              >
                Register as PM or DM
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
              >
                Sign In here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
