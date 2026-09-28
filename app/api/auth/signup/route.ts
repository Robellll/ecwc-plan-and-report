import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
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

    const normalizedRole = role === "department_manager" ? "department_manager" : "project_manager";
    const cleanDepartment = normalizedRole === "department_manager" ? department?.trim() || "Plant & Equipment" : null;
    const cleanProjectName = normalizedRole === "project_manager" ? project_name?.trim() || "General Project" : null;
    const cleanPhone = phone_number?.trim() || null;

    if (normalizedRole === "project_manager" && !project_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Project name is required for Project Managers." },
        { status: 400 }
      );
    }

    const sql = getDb();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = (await sql`
      SELECT id FROM users WHERE LOWER(email) = ${normalizedEmail} LIMIT 1
    `) as any[];

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    const inserted = (await sql`
      INSERT INTO users (name, email, password_hash, role, department, project_name, phone_number)
      VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash}, ${normalizedRole}, ${cleanDepartment}, ${cleanProjectName}, ${cleanPhone})
      RETURNING id, name, email, role, department, project_name, phone_number, created_at
    `) as any[];

    const newUser = inserted[0];
    const sessionUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as "project_manager" | "department_manager",
      department: newUser.department,
      project_name: newUser.project_name,
      phone_number: newUser.phone_number,
    };

    const token = signSession(sessionUser);

    const response = NextResponse.json(
      { success: true, user: sessionUser },
      { status: 201 }
    );

    response.cookies.set({
      ...SESSION_COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
