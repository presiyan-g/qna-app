import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: DrizzleClient | null = null;

export function getDb(): DrizzleClient {
  if (cachedDb) return cachedDb;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  cachedDb = drizzle(neon(databaseUrl), { schema });
  return cachedDb;
}

export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type DB = typeof db;
