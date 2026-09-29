import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();

    // 1. Users table with Role-Based Access Control
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('project_manager', 'department_manager', 'superadmin')),
        department TEXT,
        project_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Update role constraint to include superadmin for existing tables
    await sql`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
    `;
    await sql`
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('project_manager', 'department_manager', 'superadmin'))
    `;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS project_name TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT`;
    // Backfill any existing PMs that don't have project_name set yet
    await sql`
      UPDATE users
      SET project_name = 'Gelan-Bishoftu Expressway Project'
      WHERE role = 'project_manager' AND (project_name IS NULL OR project_name = '')
    `;

    // 2. Project Reports base table
    await sql`
      CREATE TABLE IF NOT EXISTS project_reports (
        id SERIAL PRIMARY KEY,
        project_name TEXT NOT NULL,
        week_no INT NOT NULL,
        planned_progress NUMERIC(5,2) NOT NULL DEFAULT 0,
        actual_progress NUMERIC(5,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Add enhanced multi-tier progress columns if not present
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS cumulative_planned NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS cumulative_actual NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS cumulative_variance NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS last_week_planned NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS last_week_actual NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS last_week_variance NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS this_week_plan NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS author_id INT REFERENCES users(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS start_date DATE`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS end_date DATE`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS major_wins JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS major_plans JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '[]'::jsonb`;

    // Backfill date ranges for existing reports
    await sql`
      UPDATE project_reports
      SET start_date = COALESCE(start_date, (created_at - interval '6 days')::date),
          end_date = COALESCE(end_date, created_at::date)
      WHERE start_date IS NULL OR end_date IS NULL
    `;

    // 3. Department Updates table
    await sql`
      CREATE TABLE IF NOT EXISTS department_updates (
        id SERIAL PRIMARY KEY,
        report_id INT NOT NULL REFERENCES project_reports(id) ON DELETE CASCADE,
        department TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // 4. Inter-departmental Tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        department TEXT NOT NULL,
        project_name TEXT NOT NULL DEFAULT '',
        week_no INT NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE`;
    await sql`
      UPDATE tasks
      SET due_date = COALESCE(due_date, end_date, created_at::date)
      WHERE due_date IS NULL
    `;

    return NextResponse.json({
      success: true,
      message: "Database schema upgraded successfully (users, project_reports, department_updates, tasks).",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
