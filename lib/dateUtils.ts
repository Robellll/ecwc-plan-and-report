/**
 * Date utility helpers for calendar date ranges throughout ECWC Reporting
 */

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  fallbackDate?: string | null
): string {
  let start = startDate;
  let end = endDate;

  if (!start && !end && fallbackDate) {
    try {
      const fb = new Date(fallbackDate);
      const prev = new Date(fb);
      prev.setDate(prev.getDate() - 6);
      start = prev.toISOString().split("T")[0];
      end = fb.toISOString().split("T")[0];
    } catch {
      // ignore
    }
  }

  if (start && end) {
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sMonth = s.toLocaleDateString("en-US", { month: "short" });
        const eMonth = e.toLocaleDateString("en-US", { month: "short" });
        const sYear = s.getFullYear();
        const eYear = e.getFullYear();

        if (sYear === eYear && sMonth === eMonth) {
          return `${sMonth} ${s.getDate()} – ${e.getDate()}, ${sYear}`;
        } else if (sYear === eYear) {
          return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${sYear}`;
        } else {
          return `${sMonth} ${s.getDate()}, ${sYear} – ${eMonth} ${e.getDate()}, ${eYear}`;
        }
      }
    } catch {
      // ignore
    }
    return `${start} – ${end}`;
  }

  if (start) return formatDate(start);
  if (end) return formatDate(end);
  return "Date Period Pending";
}

/**
 * Get default 7-day period (From 6 days ago To Today) formatted as YYYY-MM-DD for <input type="date">
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 6);

  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatYMD(past),
    endDate: formatYMD(today),
  };
}
