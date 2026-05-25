import { eq, like } from 'drizzle-orm';
import { users } from './schema.mjs';
import { userIdByUsername } from './ids.mjs';
import { DEMO_POOL_PASSWORD_HASH } from './db.mjs';
import { chunkArray } from './util.mjs';

export const SEED_OWNER_USERNAME = 'quorum_seed';
export const SEED_OWNER_EMAIL = 'quorum-seed@local.test';

// Test accounts surfaced to graders via the cover page. Password for all three: demo1234
// Regenerate the hash with:
//   node -e "console.log(require('bcryptjs').hashSync('demo1234', 10))"
// (The bcryptjs lib is already a qna-web dep.)
export const TEST_ACCOUNT_PASSWORD_HASH =
  '$2b$10$wlOmYc1v71Fas10BxAdKNuv.x5FxwJXd0tchBYL8Lt.oMn5aPin/m'; // bcrypt of "demo1234"

export const TEST_ACCOUNTS = [
  {
    email: 'admin@demo.local',
    username: 'demo_admin',
    role: 'admin',
  },
  {
    email: 'creator@demo.local',
    username: 'demo_creator',
    role: 'member',
  },
  {
    email: 'member@demo.local',
    username: 'demo_member',
    role: 'member',
  },
];

const DEMO_POOL_SIZE = 500;

function demoPoolUser(index) {
  const num = String(index + 1).padStart(3, '0');
  return {
    email: `demo-member-${num}@local.test`,
    username: `demo_member_${num}`,
    role: 'member',
  };
}

async function upsertUser(db, user, passwordHash) {
  await db
    .insert(users)
    .values({
      id: userIdByUsername(user.username),
      email: user.email,
      username: user.username,
      passwordHash,
      role: user.role,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        username: user.username,
        role: user.role,
        passwordHash,
      },
    });
}

export async function seedUsers(db) {
  // Seed owner (admin) — single creator of fallback content.
  const seedOwner = {
    email: SEED_OWNER_EMAIL,
    username: SEED_OWNER_USERNAME,
    role: 'admin',
  };
  await upsertUser(db, seedOwner, DEMO_POOL_PASSWORD_HASH);

  // Three named test accounts.
  for (const account of TEST_ACCOUNTS) {
    await upsertUser(db, account, TEST_ACCOUNT_PASSWORD_HASH);
  }

  // Demo member pool — 500 users.
  const demoUsers = Array.from({ length: DEMO_POOL_SIZE }, (_, i) => demoPoolUser(i));
  for (const chunk of chunkArray(demoUsers, 100)) {
    await db
      .insert(users)
      .values(
        chunk.map((u) => ({
          id: userIdByUsername(u.username),
          email: u.email,
          username: u.username,
          passwordHash: DEMO_POOL_PASSWORD_HASH,
          role: u.role,
        })),
      )
      .onConflictDoNothing();
  }

  // Read back IDs the orchestrator will need downstream.
  const seedOwnerRow = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, SEED_OWNER_USERNAME))
    .limit(1);

  const testAccountRows = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(like(users.email, '%@demo.local'));

  const demoUserRows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(like(users.username, 'demo_member_%'));
  demoUserRows.sort((a, b) => a.username.localeCompare(b.username));

  console.log(
    `Seeded users: 1 owner + ${testAccountRows.length} test accounts + ${demoUserRows.length} demo pool.`,
  );

  return {
    seedOwner: seedOwnerRow[0],
    testAccountsByUsername: new Map(testAccountRows.map((u) => [u.username, u])),
    demoUsers: demoUserRows,
  };
}
