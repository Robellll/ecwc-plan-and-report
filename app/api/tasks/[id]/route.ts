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
    const { status } = body;

    const validStatuses = ["pending", "in_progress", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be pending, in_progress, or completed." },
        { status: 400 }
      );
    }

    const sql = getDb();
    const updated = (await sql`
      UPDATE tasks
      SET status = ${status}, updated_at = now()
      WHERE id = ${taskId}
      RETURNING *
    `) as any[];

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
