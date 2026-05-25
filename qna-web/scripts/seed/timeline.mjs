// Mirror of qna-web/src/lib/seed-helpers.ts — keep in sync.
//
// The seed/index.mjs orchestrator runs via plain `node` and cannot import
// .ts files directly. The TS file is the source of truth for the test suite
// (which proves the math); this .mjs is the runtime copy for the seeder.

import seedrandom from 'seedrandom';

export function computeQuestionTimeline({ now, index, cadence }) {
  const windowMs = cadence === 'weekly' ? 7 * 86400000 : 24 * 3600000;
  if (index < 18) {
    const daysAgo = 60 - (index * (60 - 3)) / 17;
    const scheduledFor = new Date(now.getTime() - daysAgo * 86400000);
    const publishedAt = new Date(scheduledFor.getTime());
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'closed', scheduledFor, publishedAt, closesAt };
  }
  if (index === 18) {
    const publishedAt = new Date(now.getTime() - 3600000);
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'open', scheduledFor: publishedAt, publishedAt, closesAt };
  }
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);
  return { kind: 'scheduled', scheduledFor: tomorrow, publishedAt: null, closesAt: null };
}

export function pickActivityTier(username) {
  const r = seedrandom(`activity:${username}`)();
  if (r < 0.20) return 0;
  if (r < 0.50) return 1;
  if (r < 0.80) return 2;
  return 3;
}

export const PARTICIPATION_BY_TIER = [1.0, 0.70, 0.40, 0.15];

export function shouldAnswer({ username, communitySlug, questionIndex }) {
  const tier = pickActivityTier(username);
  const r = seedrandom(`participate:${communitySlug}:${questionIndex}:${username}`)();
  return r < PARTICIPATION_BY_TIER[tier];
}

export function pickCorrectness(username, communitySlug, questionIndex, difficulty) {
  const targets = { easy: 0.75, medium: 0.60, hard: 0.40 };
  const target = targets[difficulty] ?? 0.60;
  const r = seedrandom(`correct:${communitySlug}:${questionIndex}:${username}`)();
  return r < target;
}

export function pickIsLate({ username, communitySlug, questionIndex }) {
  const r = seedrandom(`late:${communitySlug}:${questionIndex}:${username}`)();
  return r < 0.05;
}

export function pickAnsweredAt({ username, communitySlug, questionIndex, publishedAt, closesAt, isLate }) {
  if (isLate) {
    const r = seedrandom(`lateat:${communitySlug}:${questionIndex}:${username}`)();
    return new Date(closesAt.getTime() + 300_000 + r * (86_400_000 - 300_000));
  }
  const r = seedrandom(`answeredat:${communitySlug}:${questionIndex}:${username}`)();
  const span = closesAt.getTime() - publishedAt.getTime();
  return new Date(publishedAt.getTime() + r * span);
}

export function pickWrongChoicePosition({ username, communitySlug, questionIndex, correctPosition }) {
  const r = seedrandom(`wrong:${communitySlug}:${questionIndex}:${username}`)();
  const wrongPositions = [0, 1, 2, 3].filter((p) => p !== correctPosition);
  return wrongPositions[Math.floor(r * wrongPositions.length)];
}
