import 'server-only';
import { and, count, eq, gte, max, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { aiUsage } from '@/db/schema/ai-usage';
import { computeRemaining } from './helpers';

export { computeRemaining, computeCooldownRetryAfter, isQuotaCounted } from './helpers';

export type QuotaSnapshot = {
  remaining: number;
  lastQuotaCountedAt: Date | null;
};

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid env var ${name}: expected an integer, got "${raw}"`);
  }
  return parsed;
}

export const AI_DAILY_QUOTA = parseEnvInt('AI_DAILY_QUOTA', 20);
export const AI_COOLDOWN_MS = parseEnvInt('AI_COOLDOWN_MS', 5000);

export async function getQuotaSnapshot(
  userId: string,
  now: Date = new Date(),
): Promise<QuotaSnapshot> {
  const dayStart = startOfUtcDay(now);
  // Per spec §6.3: cooldown starts after any quota-counted call (success or
  // safety_blocked). Transient failures do not affect cooldown timing.
  const quotaCounted = or(
    eq(aiUsage.success, true),
    eq(aiUsage.errorCode, 'safety_blocked'),
  );

  const [row] = await db
    .select({
      used: count(),
      lastAt: max(aiUsage.createdAt),
    })
    .from(aiUsage)
    .where(
      and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, dayStart), quotaCounted),
    );

  const used = row?.used ?? 0;
  const lastAt = row?.lastAt ?? null;
  return {
    remaining: computeRemaining(used, AI_DAILY_QUOTA),
    lastQuotaCountedAt: lastAt,
  };
}

export async function getRemainingForUser(userId: string): Promise<number> {
  const snap = await getQuotaSnapshot(userId);
  return snap.remaining;
}

export async function recordUsage(input: {
  userId: string;
  model: string;
  webSearch: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
  success: boolean;
  errorCode: string | null;
}): Promise<void> {
  await db.insert(aiUsage).values({
    userId: input.userId,
    model: input.model,
    webSearch: input.webSearch,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    success: input.success,
    errorCode: input.errorCode,
  });
}

function startOfUtcDay(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
