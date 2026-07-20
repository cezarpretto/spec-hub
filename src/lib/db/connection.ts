import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export function getPool(): pg.Pool {
  return pool;
}

export async function query(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult> {
  return pool.query(text, params);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
