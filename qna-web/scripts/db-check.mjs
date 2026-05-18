import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '..', '.env.local') });
config({ path: resolve(here, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('FAIL: DATABASE_URL is not set');
  process.exit(1);
}

try {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT version() AS version, current_database() AS db, now() AS now`;
  console.log('OK - connected to Neon');
  console.log(rows[0]);
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
