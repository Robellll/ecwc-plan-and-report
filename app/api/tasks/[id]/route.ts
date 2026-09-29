import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: "Invalid task ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, completed, remarks } = body;

    let targetStatus = status;
    if (completed !== undefined) {
      targetStatus = completed ? "completed" : "pending";
    }

    const validStatuses = ["pending", "in_progress", "completed"];
    if (targetStatus && !validStatuses.includes(targetStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be pending, in_progress, or completed." },
        { status: 400 }
      );
    }

    const sql = getDb();
    let updated: any[];
    if (targetStatus && remarks !== undefined) {
      updated = (await sql`
        UPDATE tasks
        SET status = ${targetStatus}, remarks = ${remarks}, updated_at = now()
        WHERE id = ${taskId}
        RETURNING *
      `) as any[];
    } else if (targetStatus) {
      updated = (await sql`
        UPDATE tasks
        SET status = ${targetStatus}, updated_at = now()
        WHERE id = ${taskId}
        RETURNING *
      `) as any[];
    } else if (remarks !== undefined) {
      updated = (await sql`
        UPDATE tasks
        SET remarks = ${remarks}, updated_at = now()
        WHERE id = ${taskId}
        RETURNING *
      `) as any[];
    } else {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, task: updated[0] });
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
