import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const url = new URL(request.url);
    const department = url.searchParams.get("department");
    const status = url.searchParams.get("status");

    let query;
    if (department && status) {
      query = sql`
        SELECT t.*, u.name as creator_name, u.role as creator_role, u.phone_number as creator_phone
        FROM tasks t
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.department = ${department} AND t.status = ${status}
        ORDER BY t.created_at DESC
      `;
    } else if (department) {
      query = sql`
        SELECT t.*, u.name as creator_name, u.role as creator_role, u.phone_number as creator_phone
        FROM tasks t
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.department = ${department}
        ORDER BY t.created_at DESC
      `;
    } else if (status) {
      query = sql`
        SELECT t.*, u.name as creator_name, u.role as creator_role, u.phone_number as creator_phone
        FROM tasks t
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.status = ${status}
        ORDER BY t.created_at DESC
      `;
    } else {
      query = sql`
        SELECT t.*, u.name as creator_name, u.role as creator_role, u.phone_number as creator_phone
        FROM tasks t
        LEFT JOIN users u ON u.id = t.created_by
        ORDER BY t.created_at DESC
      `;
    }

    const tasks = await query;
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    const body = await request.json();
    const sql = getDb();
    const createdBy = user ? user.id : null;

    // Check if batch tasks submitted
    if (Array.isArray(body.tasks)) {
      const createdTasks = [];
      for (const t of body.tasks) {
        if (!t.title?.trim() || !t.department?.trim()) continue;
        const taskStatus = t.completed || t.status === "completed" ? "completed" : "pending";
        const inserted = (await sql`
          INSERT INTO tasks (
            title,
            description,
            remarks,
            department,
            project_name,
            week_no,
            due_date,
            start_date,
            end_date,
            created_by,
            status
          )
          VALUES (
            ${t.title.trim()},
            ${t.description?.trim() || t.remarks?.trim() || ""},
            ${t.remarks?.trim() || t.description?.trim() || ""},
            ${t.department.trim()},
            ${t.project_name?.trim() || body.project_name?.trim() || "General Project"},
            ${Number(t.week_no || body.week_no) || 1},
            ${t.due_date || null},
            ${t.start_date || null},
            ${t.end_date || null},
            ${createdBy},
            ${taskStatus}
          )
          RETURNING *
        `) as any[];
        if (inserted && inserted[0]) createdTasks.push(inserted[0]);
      }
      return NextResponse.json({ success: true, tasks: createdTasks }, { status: 201 });
    }

    const { title, description, remarks, department, project_name, week_no, due_date, start_date, end_date, status, completed } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Task title is required." },
        { status: 400 }
      );
    }

    if (!department?.trim()) {
      return NextResponse.json(
        { success: false, error: "Target department is required." },
        { status: 400 }
      );
    }

    const resolvedDueDate = due_date || null;
    const resolvedStartDate = start_date || null;
    const resolvedEndDate = end_date || null;
    const resolvedStatus = completed || status === "completed" ? "completed" : (status || "pending");

    const inserted = (await sql`
      INSERT INTO tasks (
        title,
        description,
        remarks,
        department,
        project_name,
        week_no,
        due_date,
        start_date,
        end_date,
        created_by,
        status
      )
      VALUES (
        ${title.trim()},
        ${description?.trim() || remarks?.trim() || ""},
        ${remarks?.trim() || description?.trim() || ""},
        ${department.trim()},
        ${project_name?.trim() || "General Project"},
        ${Number(week_no) || 1},
        ${resolvedDueDate},
        ${resolvedStartDate},
        ${resolvedEndDate},
        ${createdBy},
        ${resolvedStatus}
      )
      RETURNING *
    `) as any[];

    return NextResponse.json({ success: true, task: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
