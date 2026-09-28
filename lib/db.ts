import { neon } from "@neondatabase/serverless";

// Lazy singleton — created on first call so the module can be imported
// during Next.js build without DATABASE_URL being present at build time.
let _sql: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export default getDb;
