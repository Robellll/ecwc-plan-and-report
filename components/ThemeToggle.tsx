"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./Icons";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="theme-toggle-placeholder" style={{ width: 100, height: 38 }} />
    );
  }

  const isLight = theme === "light";

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      className="theme-toggle-btn"
      onClick={onToggle}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
    >
      <div className={`theme-toggle-slider ${isLight ? "light" : "dark"}`}>
        <span className="toggle-icon sun">
          <SunIcon size={14} />
        </span>
        <span className="toggle-icon moon">
          <MoonIcon size={14} />
        </span>
        <span className="toggle-thumb" />
      </div>
      <span className="theme-toggle-label">
        {isLight ? "Light" : "Dark"}
      </span>
    </button>
  );
}
