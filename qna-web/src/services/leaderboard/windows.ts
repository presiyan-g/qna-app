export type LeaderboardWindow = '7d' | '30d' | 'all';

const WINDOW_DAYS: Partial<Record<LeaderboardWindow, number>> = {
  '7d': 7,
  '30d': 30,
};

export function normalizeLeaderboardWindow(
  value: string | null | undefined,
): LeaderboardWindow {
  return value === '7d' || value === '30d' || value === 'all'
    ? value
    : 'all';
}

export function getLeaderboardWindowStart(
  window: LeaderboardWindow,
  now = new Date(),
): Date | null {
  const days = WINDOW_DAYS[window];
  if (!days) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
