import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema.js';
import { join } from 'path';

let db: PostgresJsDatabase<typeof schema> | null = null;
let client: ReturnType<typeof postgres> | null = null;

function getDbUrl(): string {
  if (process.env.REPORTER_DB_URL) {
    return process.env.REPORTER_DB_URL;
  }
  const user = process.env.REPORTER_DB_USER || 'reporter';
  const password = process.env.REPORTER_DB_PASSWORD || 'reporter';
  const host = process.env.REPORTER_DB_HOST || 'localhost';
  const port = process.env.REPORTER_DB_PORT || '5432';
  const database = process.env.REPORTER_DB_NAME || 'reporter';
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export async function initializeDatabase(): Promise<PostgresJsDatabase<typeof schema>> {
  if (db) return db;

  const url = getDbUrl();
  client = postgres(url, { max: 10 });
  db = drizzle(client, { schema });

  try {
    await migrate(db, { migrationsFolder: join(__dirname, '../drizzle') });
  } catch (err) {
    console.warn('Migration warning (migrations may not exist yet):', err);
  }

  return db;
}

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}
