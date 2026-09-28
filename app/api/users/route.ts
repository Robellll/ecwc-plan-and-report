import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/auth";

/**
 * GET /api/users
 * Returns all users. Restricted to superadmin role.
 */
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user || user.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    const sql = getDb();
    const users = await sql`
      SELECT id, name, email, role, department, project_name, phone_number, created_at
      FROM users
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users
 * Deletes a user by id. Restricted to superadmin role.
 * Body: { id: number }
 */
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = getSessionUserFromRequest(request);
    if (!currentUser || currentUser.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required." },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const sql = getDb();
    await sql`DELETE FROM users WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    console.error("DELETE /api/users error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
