import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@parabuains/db/schema';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  }
  return _pool;
}

export const db = drizzle(getPool(), { schema });
export type DB = typeof db;
