const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/**
 * Compact relative-time formatter for the notifications bell.
 *
 * Examples (assuming `now` is the second argument or `new Date()`):
 *   now()        → "just now"
 *   30s ago      → "just now"
 *   3m ago       → "3m"
 *   2h ago       → "2h"
 *   3d ago       → "3d"
 *   2w ago       → "2w"
 *   future       → "just now"  (defensive — clock skew, etc.)
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h`;
  if (diff < WEEK_MS) return `${Math.floor(diff / DAY_MS)}d`;
  return `${Math.floor(diff / WEEK_MS)}w`;
}
