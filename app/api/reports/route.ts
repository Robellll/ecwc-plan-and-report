import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const sql = getDb();
    const reports = await sql`
      SELECT
        r.id,
        r.project_name,
        r.week_no,
        r.start_date,
        r.end_date,
        COALESCE(r.cumulative_planned, r.planned_progress, 0) AS cumulative_planned,
        COALESCE(r.cumulative_actual, r.actual_progress, 0) AS cumulative_actual,
        COALESCE(r.cumulative_variance, (COALESCE(r.cumulative_actual, r.actual_progress, 0) - COALESCE(r.cumulative_planned, r.planned_progress, 0)), 0) AS cumulative_variance,
        COALESCE(r.last_week_planned, 0) AS last_week_planned,
        COALESCE(r.last_week_actual, 0) AS last_week_actual,
        COALESCE(r.last_week_variance, 0) AS last_week_variance,
        COALESCE(r.this_week_plan, 0) AS this_week_plan,
        COALESCE(r.planned_progress, r.cumulative_planned, 0) AS planned_progress,
        COALESCE(r.actual_progress, r.cumulative_actual, 0) AS actual_progress,
        COALESCE(r.major_wins, '[]'::jsonb) AS major_wins,
        COALESCE(r.major_plans, '[]'::jsonb) AS major_plans,
        COALESCE(r.constraints, '[]'::jsonb) AS constraints,
        r.author_id,
        u.name AS author_name,
        u.role AS author_role,
        u.phone_number AS author_phone,
        r.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', d.id,
              'department', d.department,
              'notes', d.notes
            ) ORDER BY d.id
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS department_updates
      FROM project_reports r
      LEFT JOIN users u ON u.id = r.author_id
      LEFT JOIN department_updates d ON d.report_id = r.id
      GROUP BY r.id, u.name, u.role, u.phone_number
      ORDER BY COALESCE(r.start_date, r.created_at::date) DESC, r.created_at DESC
    `;
    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    const sql = getDb();
    const body = await request.json();
    const {
      project_name,
      start_date,
      end_date,
      week_no,
      // Cumulative Progress
      cumulative_planned,
      cumulative_actual,
      cumulative_variance,
      // Last Week Progress
      last_week_planned,
      last_week_actual,
      last_week_variance,
      // This Week Plan
      this_week_plan,
      // Backward compatibility fallback
      planned_progress,
      actual_progress,
      department_updates,
      // New sections
      major_wins,
      major_plans,
      constraints,
    } = body;

    if (!project_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Project name is required." },
        { status: 400 }
      );
    }

    // Default dates if not provided
    const resolvedStartDate = start_date || new Date().toISOString().split("T")[0];
    const resolvedEndDate = end_date || new Date().toISOString().split("T")[0];
    const resolvedWeekNo = Number(week_no) || 1;

    const cPlanned = Number(cumulative_planned ?? planned_progress ?? 0);
    const cActual = Number(cumulative_actual ?? actual_progress ?? 0);
    const cVariance = Number(cumulative_variance ?? (cActual - cPlanned));

    const lwPlanned = Number(last_week_planned ?? 0);
    const lwActual = Number(last_week_actual ?? 0);
    const lwVariance = Number(last_week_variance ?? (lwActual - lwPlanned));

    const twPlan = Number(this_week_plan ?? 0);
    const authorId = user ? user.id : null;

    const sanitizeList = (raw: unknown): string[] => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
        .filter((item) => item.length > 0);
    };

    const winsJson = JSON.stringify(sanitizeList(major_wins));
    const plansJson = JSON.stringify(sanitizeList(major_plans));
    const constraintsJson = JSON.stringify(sanitizeList(constraints));

    const insertResult = await sql`
      INSERT INTO project_reports (
        project_name,
        week_no,
        start_date,
        end_date,
        planned_progress,
        actual_progress,
        cumulative_planned,
        cumulative_actual,
        cumulative_variance,
        last_week_planned,
        last_week_actual,
        last_week_variance,
        this_week_plan,
        major_wins,
        major_plans,
        constraints,
        author_id
      )
      VALUES (
        ${project_name.trim()},
        ${resolvedWeekNo},
        ${resolvedStartDate},
        ${resolvedEndDate},
        ${cPlanned},
        ${cActual},
        ${cPlanned},
        ${cActual},
        ${cVariance},
        ${lwPlanned},
        ${lwActual},
        ${lwVariance},
        ${twPlan},
        ${winsJson}::jsonb,
        ${plansJson}::jsonb,
        ${constraintsJson}::jsonb,
        ${authorId}
      )
      RETURNING id
    `;
    const report = (insertResult as Array<{ id: number }>)[0];

    if (Array.isArray(department_updates) && department_updates.length > 0) {
      for (const du of department_updates) {
        if (du.department) {
          await sql`
            INSERT INTO department_updates (report_id, department, notes)
            VALUES (${report.id}, ${du.department}, ${du.notes ?? ""})
          `;
        }
      }
    }

    return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
