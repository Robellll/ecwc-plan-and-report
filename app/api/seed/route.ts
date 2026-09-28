import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * GET /api/seed
 * Seeds the database with 3 test accounts:
 *  1. SuperAdmin  (admin@ecwc.et / admin123)
 *  2. Project Manager (pm@ecwc.et / test123)
 *  3. Department Manager (dm@ecwc.et / test123)
 *
 * Safe to call multiple times — uses upsert logic.
 */
export async function GET() {
  try {
    const sql = getDb();

    const accounts = [
      {
        name: "System Administrator",
        email: "admin@ecwc.et",
        password: "admin123",
        role: "superadmin",
        department: null,
        project_name: null,
      },
      {
        name: "Dawit Bekele",
        email: "pm@ecwc.et",
        password: "test123",
        role: "project_manager",
        department: null,
        project_name: "Gelan-Bishoftu Expressway Project",
      },
      {
        name: "Tigist Haile",
        email: "dm@ecwc.et",
        password: "test123",
        role: "department_manager",
        department: "Plant & Equipment",
        project_name: null,
      },
    ];

    const results: Array<{ email: string; status: string }> = [];

    for (const acc of accounts) {
      // Check if user exists
      const existing = (await sql`
        SELECT id FROM users WHERE LOWER(email) = ${acc.email.toLowerCase()} LIMIT 1
      `) as any[];

      if (existing && existing.length > 0) {
        // Update password and role in case they changed
        const passwordHash = hashPassword(acc.password);
        await sql`
          UPDATE users
          SET password_hash = ${passwordHash},
              role = ${acc.role},
              department = ${acc.department},
              project_name = ${acc.project_name},
              name = ${acc.name}
          WHERE LOWER(email) = ${acc.email.toLowerCase()}
        `;
        results.push({ email: acc.email, status: "updated" });
      } else {
        const passwordHash = hashPassword(acc.password);
        await sql`
          INSERT INTO users (name, email, password_hash, role, department, project_name)
          VALUES (${acc.name}, ${acc.email.toLowerCase()}, ${passwordHash}, ${acc.role}, ${acc.department}, ${acc.project_name})
        `;
        results.push({ email: acc.email, status: "created" });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Test accounts seeded successfully.",
      accounts: results,
      credentials: [
        { role: "SuperAdmin", email: "admin@ecwc.et", password: "admin123" },
        { role: "Project Manager", email: "pm@ecwc.et", password: "test123" },
        { role: "Department Manager", email: "dm@ecwc.et", password: "test123" },
      ],
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
