import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyPassword, signSession, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const sql = getDb();
    const normalizedEmail = email.trim().toLowerCase();

    const users = (await sql`
      SELECT id, name, email, password_hash, role, department, project_name, phone_number
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1
    `) as any[];

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValid = verifyPassword(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "project_manager" | "department_manager" | "superadmin",
      department: user.department,
      project_name: user.project_name,
      phone_number: user.phone_number,
    };

    const token = signSession(sessionUser);

    const response = NextResponse.json(
      { success: true, user: sessionUser },
      { status: 200 }
    );

    response.cookies.set({
      ...SESSION_COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
