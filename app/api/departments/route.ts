import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
    // Return ONLY departments where an account has actually registered with a department
    const rows = (await sql`
      SELECT DISTINCT TRIM(department) as department
      FROM users
      WHERE department IS NOT NULL 
        AND TRIM(department) != ''
      ORDER BY department ASC
    `) as Array<{ department: string }>;

    const departments = rows.map((r) => r.department).filter(Boolean);
    return NextResponse.json({ success: true, departments });
  } catch (error) {
    console.error("GET /api/departments error:", error);
    return NextResponse.json(
      { success: false, error: String(error), departments: [] },
      { status: 500 }
    );
  }
}
