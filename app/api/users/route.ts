import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSessionUserFromRequest, hashPassword } from "@/lib/auth";

/**
 * GET /api/users
 * Returns all users with report and task activity counts. Restricted to superadmin.
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
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.department, 
        u.project_name, 
        u.phone_number, 
        u.created_at,
        COALESCE((SELECT COUNT(*) FROM project_reports pr WHERE pr.author_id = u.id), 0)::int AS report_count,
        COALESCE((SELECT COUNT(*) FROM tasks t WHERE t.created_by = u.id), 0)::int AS task_count
      FROM users u
      ORDER BY u.created_at DESC
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
 * POST /api/users
 * Create a new user account directly by Admin. Restricted to superadmin.
 * Body: { name, email, password, role, department?, project_name?, phone_number? }
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = getSessionUserFromRequest(request);
    if (!currentUser || currentUser.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, department, project_name, phone_number } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedRole = ["project_manager", "department_manager", "superadmin"].includes(role)
      ? role
      : "project_manager";
    const cleanDepartment = normalizedRole === "department_manager" ? department?.trim() || "Plant & Equipment" : null;
    const cleanProjectName = normalizedRole === "project_manager" ? project_name?.trim() || "Seyo Shenen Guder Project" : null;
    const cleanPhone = phone_number?.trim() || null;
    const normalizedEmail = email.trim().toLowerCase();

    const sql = getDb();
    const existing = (await sql`
      SELECT id FROM users WHERE LOWER(email) = ${normalizedEmail} LIMIT 1
    `) as any[];

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    const inserted = (await sql`
      INSERT INTO users (name, email, password_hash, role, department, project_name, phone_number)
      VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash}, ${normalizedRole}, ${cleanDepartment}, ${cleanProjectName}, ${cleanPhone})
      RETURNING id, name, email, role, department, project_name, phone_number, created_at
    `) as any[];

    return NextResponse.json({
      success: true,
      user: {
        ...inserted[0],
        report_count: 0,
        task_count: 0,
      },
      message: `User ${name.trim()} created successfully.`,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users
 * Update user details or reset password. Restricted to superadmin.
 * Body: { id, name?, email?, role?, department?, project_name?, phone_number?, new_password? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getSessionUserFromRequest(request);
    if (!currentUser || currentUser.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, email, role, department, project_name, phone_number, new_password } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required." },
        { status: 400 }
      );
    }

    const sql = getDb();
    const existingList = (await sql`
      SELECT id, email, role FROM users WHERE id = ${id} LIMIT 1
    `) as any[];

    if (!existingList || existingList.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    // Check email collision if changing email
    if (email && email.trim().toLowerCase() !== existingList[0].email.toLowerCase()) {
      const emailCheck = (await sql`
        SELECT id FROM users WHERE LOWER(email) = ${email.trim().toLowerCase()} AND id != ${id} LIMIT 1
      `) as any[];
      if (emailCheck && emailCheck.length > 0) {
        return NextResponse.json(
          { success: false, error: "Email is already taken by another user." },
          { status: 409 }
        );
      }
    }

    const cleanRole = role && ["project_manager", "department_manager", "superadmin"].includes(role)
      ? role
      : existingList[0].role;
    const cleanDepartment = cleanRole === "department_manager" ? department?.trim() || null : null;
    const cleanProjectName = cleanRole === "project_manager" ? project_name?.trim() || null : null;
    const cleanPhone = phone_number !== undefined ? (phone_number?.trim() || null) : undefined;

    // Build update query
    if (new_password) {
      if (new_password.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters." },
          { status: 400 }
        );
      }
      const newHash = hashPassword(new_password);
      await sql`
        UPDATE users
        SET 
          name = COALESCE(${name?.trim() || null}, name),
          email = COALESCE(${email ? email.trim().toLowerCase() : null}, email),
          role = ${cleanRole},
          department = ${cleanDepartment},
          project_name = ${cleanProjectName},
          phone_number = COALESCE(${cleanPhone}, phone_number),
          password_hash = ${newHash}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE users
        SET 
          name = COALESCE(${name?.trim() || null}, name),
          email = COALESCE(${email ? email.trim().toLowerCase() : null}, email),
          role = ${cleanRole},
          department = ${cleanDepartment},
          project_name = ${cleanProjectName},
          phone_number = COALESCE(${cleanPhone}, phone_number)
        WHERE id = ${id}
      `;
    }

    const updated = (await sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.department, 
        u.project_name, 
        u.phone_number, 
        u.created_at,
        COALESCE((SELECT COUNT(*) FROM project_reports pr WHERE pr.author_id = u.id), 0)::int AS report_count,
        COALESCE((SELECT COUNT(*) FROM tasks t WHERE t.created_by = u.id), 0)::int AS task_count
      FROM users u
      WHERE u.id = ${id}
    `) as any[];

    return NextResponse.json({
      success: true,
      user: updated[0],
      message: "User updated successfully.",
    });
  } catch (error) {
    console.error("PATCH /api/users error:", error);
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
