const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const target = value instanceof Date ? value : new Date(value);
  const diffMs = target.getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return '';

  const isPast = diffMs < 0;
  const absMs = Math.abs(diffMs);

  if (absMs < MINUTE_MS) {
    return isPast ? 'just now' : 'in a moment';
  }

  let magnitude: string;
  if (absMs < HOUR_MS) {
    const minutes = Math.round(absMs / MINUTE_MS);
    magnitude = `${minutes}m`;
  } else if (absMs < DAY_MS) {
    const hours = Math.round(absMs / HOUR_MS);
    magnitude = `${hours}h`;
  } else {
    const days = Math.round(absMs / DAY_MS);
    magnitude = `${days}d`;
  }

  return isPast ? `${magnitude} ago` : `in ${magnitude}`;
}
