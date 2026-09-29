import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * GET /api/reset
 * Resets the entire portal to zero:
 * - Truncates all department updates
 * - Truncates all weekly project reports and resets sequence to 1
 * - Truncates all delegated tasks and resets sequence to 1
 * - Clears all test user accounts except the primary Super Admin (admin@ecwc.et)
 * - Ensures admin@ecwc.et / admin@1031 is ready for system administration
 */
export async function GET() {
  try {
    const sql = getDb();

    // 1. Wipe all report updates, tasks, and reports
    await sql`TRUNCATE TABLE department_updates CASCADE`;
    await sql`TRUNCATE TABLE tasks CASCADE`;
    await sql`TRUNCATE TABLE project_reports RESTART IDENTITY CASCADE`;

    // 2. Reset sequences
    try {
      await sql`ALTER SEQUENCE IF EXISTS tasks_id_seq RESTART WITH 1`;
      await sql`ALTER SEQUENCE IF EXISTS department_updates_id_seq RESTART WITH 1`;
      await sql`ALTER SEQUENCE IF EXISTS project_reports_id_seq RESTART WITH 1`;
    } catch (seqErr) {
      console.warn("Sequence reset warning (ignored):", seqErr);
    }

    // 3. Remove all non-admin users (deletes all accounts except primary admin)
    await sql`DELETE FROM users WHERE LOWER(email) != 'admin@ecwc.et'`;

    // 4. Ensure Super Admin account is intact with admin@ecwc.et / admin@1031
    const passwordHash = hashPassword("admin@1031");
    await sql`
      INSERT INTO users (name, email, password_hash, role, department, project_name, phone_number)
      VALUES (
        'System Administrator',
        'admin@ecwc.et',
        ${passwordHash},
        'superadmin',
        NULL,
        NULL,
        NULL
      )
      ON CONFLICT (email) DO UPDATE
      SET name = 'System Administrator',
          password_hash = ${passwordHash},
          role = 'superadmin',
          department = NULL,
          project_name = NULL,
          phone_number = NULL
    `;

    return NextResponse.json({
      success: true,
      message: "Portal successfully reset to zero. Ready for fresh user registrations.",
      details: {
        reports_count: 0,
        tasks_count: 0,
        test_accounts_removed: true,
        admin_account: "admin@ecwc.et",
      },
    });
  } catch (error) {
    console.error("GET /api/reset error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
