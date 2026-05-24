export function computeRemaining(used: number, dailyQuota: number): number {
  return Math.max(0, dailyQuota - used);
}

export function computeCooldownRetryAfter(
  lastSuccessAt: Date | null,
  cooldownMs: number,
  now: Date,
): number {
  if (!lastSuccessAt) return 0;
  const remaining = lastSuccessAt.getTime() + cooldownMs - now.getTime();
  return remaining > 0 ? remaining : 0;
}

export function isQuotaCounted(row: {
  success: boolean;
  errorCode: string | null;
}): boolean {
  return row.success || row.errorCode === 'safety_blocked';
}
