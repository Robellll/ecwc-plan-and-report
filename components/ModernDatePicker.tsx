"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from "./Icons";

interface ModernDatePickerProps {
  id?: string;
  value: string; // format "YYYY-MM-DD"
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function ModernDatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  required = false,
  minDate,
  maxDate,
  disabled = false,
  ariaLabel,
}: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  }, [value]);

  // Calendar view state (which month/year is currently being viewed)
  const [viewYear, setViewYear] = useState(() => {
    return selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    return selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  });

  // Sync view when value changes from outside
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  // Close calendar popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Jump to today
  const handleJumpToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const ymd = formatDateToYMD(today);
    onChange(ymd);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Jump +7 days (helpful for PM weekly reports)
  const handleAddWeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    const base = selectedDate ? new Date(selectedDate) : new Date();
    base.setDate(base.getDate() + 7);
    const ymd = formatDateToYMD(base);
    onChange(ymd);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setIsOpen(false);
  };

  // Format date helper
  function formatDateToYMD(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Display label for the trigger input
  const displayLabel = useMemo(() => {
    if (!selectedDate) return "";
    return selectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  // Generate calendar days
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Day of week index for Monday start (0: Mon, 1: Tue ... 6: Sun)
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const daysInCurrentMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      date: Date;
      isCurrentMonth: boolean;
      ymd: string;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const todayYMD = formatDateToYMD(new Date());
    const valYMD = value;

    // Previous month padding days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      const ymd = formatDateToYMD(d);
      cells.push({
        date: d,
        isCurrentMonth: false,
        ymd,
        isToday: ymd === todayYMD,
        isSelected: ymd === valYMD,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const ymd = formatDateToYMD(d);
      cells.push({
        date: d,
        isCurrentMonth: true,
        ymd,
        isToday: ymd === todayYMD,
        isSelected: ymd === valYMD,
      });
    }

    // Next month padding days to fill 5 or 6 rows (multiple of 7)
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - cells.length;
    for (let day = 1; day <= remainingSlots; day++) {
      const d = new Date(viewYear, viewMonth + 1, day);
      const ymd = formatDateToYMD(d);
      cells.push({
        date: d,
        isCurrentMonth: false,
        ymd,
        isToday: ymd === todayYMD,
        isSelected: ymd === valYMD,
      });
    }

    return cells;
  }, [viewYear, viewMonth, value]);

  const handleSelectDay = (ymd: string) => {
    onChange(ymd);
    setIsOpen(false);
  };

  return (
    <div className="modern-datepicker-container" ref={containerRef}>
      {/* Hidden native input for form compatibility & validation */}
      <input
        type="hidden"
        id={id}
        name={id}
        value={value}
        required={required}
      />

      {/* Styled Interactive Trigger Button */}
      <button
        type="button"
        className={`modern-datepicker-trigger ${isOpen ? "active" : ""} ${value ? "has-value" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
      >
        <span className="datepicker-icon-pill">
          <CalendarIcon size={15} />
        </span>
        <span className="datepicker-display-text">
          {displayLabel || <span className="datepicker-placeholder">{placeholder}</span>}
        </span>
        <span className="datepicker-chevron-indicator">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Floating Theme Calendar Popover */}
      {isOpen && (
        <div className="modern-calendar-popover animate-fade-in" role="dialog" aria-modal="true">
          {/* Header: Month & Year + Controls */}
          <div className="calendar-header">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeftIcon size={16} />
            </button>

            <div className="calendar-month-title">
              <span className="month-name">{MONTH_NAMES[viewMonth]}</span>
              <span className="year-name">{viewYear}</span>
            </div>

            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="calendar-weekdays-row">
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className="calendar-weekday-cell">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="calendar-days-grid">
            {calendarCells.map((cell) => (
              <button
                key={cell.ymd}
                type="button"
                className={`calendar-day-btn ${cell.isCurrentMonth ? "in-month" : "out-month"} ${
                  cell.isToday ? "is-today" : ""
                } ${cell.isSelected ? "is-selected" : ""}`}
                onClick={() => handleSelectDay(cell.ymd)}
                title={cell.ymd}
              >
                <span>{cell.date.getDate()}</span>
                {cell.isSelected && <span className="day-selected-check" />}
              </button>
            ))}
          </div>

          {/* Quick Presets Footer */}
          <div className="calendar-footer">
            <button
              type="button"
              className="calendar-quick-btn today"
              onClick={handleJumpToToday}
            >
              Today
            </button>
            <button
              type="button"
              className="calendar-quick-btn week"
              onClick={handleAddWeek}
              title="Select 1 week ahead"
            >
              +7 Days
            </button>
            <button
              type="button"
              className="calendar-quick-btn close"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
