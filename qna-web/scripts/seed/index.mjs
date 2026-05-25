// Quorum seed orchestrator.
// Replaces the previous single-file seed-communities.mjs (see git history before 2026-05-24).

import { makeDb } from './db.mjs';
import { seedCategories } from './categories.mjs';
import { seedUsers } from './users.mjs';
import { seedCommunities } from './communities.mjs';
import { seedQuestions } from './questions.mjs';
import { seedBroadcasts } from './broadcasts.mjs';
import { seedAnswers } from './answers.mjs';
import { seedComments } from './comments.mjs';

async function main() {
  if (process.env.ALLOW_SEED !== '1') {
    throw new Error(
      'Refusing to seed without ALLOW_SEED=1. Set it in qna-web/.env.local or prefix the command (PowerShell: $env:ALLOW_SEED="1"; npm run seed).',
    );
  }

  const db = makeDb();

  const ctx = {};
  Object.assign(ctx, await seedCategories(db));
  Object.assign(ctx, await seedUsers(db));
  Object.assign(ctx, await seedCommunities(db, ctx));
  Object.assign(ctx, await seedQuestions(db, ctx));
  await seedBroadcasts(db, ctx);
  Object.assign(ctx, await seedAnswers(db, ctx));
  await seedComments(db, ctx);

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
