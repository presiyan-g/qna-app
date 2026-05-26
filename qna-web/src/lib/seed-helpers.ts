import seedrandom from 'seedrandom';

export type Cadence = 'daily' | 'weekly' | 'custom';

export type QuestionTimeline =
  | { kind: 'closed'; scheduledFor: Date; publishedAt: Date; closesAt: Date }
  | { kind: 'open'; scheduledFor: Date; publishedAt: Date; closesAt: Date }
  | { kind: 'scheduled'; scheduledFor: Date; publishedAt: Date; closesAt: Date };

export function computeQuestionTimeline(args: {
  now: Date;
  index: number; // 0..19
  cadence: Cadence;
}): QuestionTimeline {
  const { now, index, cadence } = args;
  const windowMs =
    cadence === 'weekly' ? 7 * 86400000 : 24 * 3600000;

  if (index < 18) {
    // Spread closed questions across the last 60 days, oldest first.
    // index 0 → ~60 days ago, index 17 → ~3 days ago.
    const daysAgo = 60 - (index * (60 - 3)) / 17;
    const scheduledFor = new Date(now.getTime() - daysAgo * 86400000);
    const publishedAt = new Date(scheduledFor.getTime());
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'closed', scheduledFor, publishedAt, closesAt };
  }
  if (index === 18) {
    // Currently open: published 1 hour ago, closes after the answer window.
    const publishedAt = new Date(now.getTime() - 3600000);
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'open', scheduledFor: publishedAt, publishedAt, closesAt };
  }
  // index 19: scheduled for tomorrow at 09:00 UTC
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);
  return {
    kind: 'scheduled',
    scheduledFor: tomorrow,
    publishedAt: new Date(tomorrow.getTime()),
    closesAt: new Date(tomorrow.getTime() + windowMs),
  };
}

const TIER_THRESHOLDS = [0.20, 0.50, 0.80]; // < 0.20 = tier0, < 0.50 = tier1, < 0.80 = tier2, else tier3

export function pickActivityTier(username: string): 0 | 1 | 2 | 3 {
  const r = seedrandom(`activity:${username}`)();
  if (r < TIER_THRESHOLDS[0]) return 0;
  if (r < TIER_THRESHOLDS[1]) return 1;
  if (r < TIER_THRESHOLDS[2]) return 2;
  return 3;
}

// Probability that a tier user actually answers a given question they were sampled for.
export const PARTICIPATION_BY_TIER = [1.0, 0.70, 0.40, 0.15] as const;

export function shouldAnswer(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
}): boolean {
  const tier = pickActivityTier(args.username);
  const r = seedrandom(`participate:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
  return r < PARTICIPATION_BY_TIER[tier];
}

const CORRECT_RATIO_BY_DIFFICULTY: Record<string, number> = {
  easy: 0.75,
  medium: 0.60,
  hard: 0.40,
};

export function pickCorrectness(
  username: string,
  communitySlug: string,
  questionIndex: number,
  difficulty: string,
): boolean {
  const target = CORRECT_RATIO_BY_DIFFICULTY[difficulty] ?? 0.60;
  const r = seedrandom(
    `correct:${communitySlug}:${questionIndex}:${username}`,
  )();
  return r < target;
}

const LATE_RATIO = 0.05;

export function pickIsLate(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
}): boolean {
  const r = seedrandom(
    `late:${args.communitySlug}:${args.questionIndex}:${args.username}`,
  )();
  return r < LATE_RATIO;
}

// Returns a deterministic answeredAt timestamp inside (publishedAt, closesAt],
// or just after closesAt if isLate.
export function pickAnsweredAt(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
  publishedAt: Date;
  closesAt: Date;
  isLate: boolean;
}): Date {
  if (args.isLate) {
    // 5 min .. 24 h after close.
    const r = seedrandom(`lateat:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
    return new Date(args.closesAt.getTime() + 300_000 + r * (86_400_000 - 300_000));
  }
  const r = seedrandom(`answeredat:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
  const span = args.closesAt.getTime() - args.publishedAt.getTime();
  return new Date(args.publishedAt.getTime() + r * span);
}

// Returns a deterministic wrong-choice position (0..3 excluding the correct one).
export function pickWrongChoicePosition(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
  correctPosition: number;
}): number {
  const r = seedrandom(`wrong:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
  const wrongPositions = [0, 1, 2, 3].filter((p) => p !== args.correctPosition);
  return wrongPositions[Math.floor(r * wrongPositions.length)];
}
