import * as schema from '@parabuains/db/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    // biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is required; missing value throws at startup
    _pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  }
  return _pool;
}

export const db = drizzle(getPool(), { schema });
export type DB = typeof db;
