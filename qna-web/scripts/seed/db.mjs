import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';

config({ path: '.env.local' });
config();

// Bcrypt hash for the bulk demo_member_NNN pool.
//
// This is a *non-verifiable* placeholder — by design. The 500 demo users in the
// pool are never intended to be logged into by graders; they exist only to populate
// communities, leaderboards, and answer rows. Using a single non-working hash
// keeps the seed fast (no per-user bcrypt) and makes the security posture explicit:
// no one can log in as any demo_member_NNN account.
//
// To make a specific demo user log-in-able, regenerate the hash with the password
// of your choice via:
//   node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
// and override this constant for that user only.
export const DEMO_POOL_PASSWORD_HASH =
  '$2b$10$H0qbDEKzV5l7j7JMrNlxLOiFKZLeHtYRqH61pUQ3DP9Ls15lBpF8K';

export function makeDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }
  return drizzle(neon(process.env.DATABASE_URL));
}
