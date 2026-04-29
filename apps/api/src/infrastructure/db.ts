import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@parabuains/db';

type Schema = typeof schema;

function createDb(): NodePgDatabase<Schema> {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  return drizzle(pool, { schema });
}

// Lazy singleton — only created on first access
let _db: NodePgDatabase<Schema> | null = null;

export function getDb(): NodePgDatabase<Schema> {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type DB = NodePgDatabase<Schema>;

// Proxy for backwards compat
export const db = new Proxy({} as NodePgDatabase<Schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
