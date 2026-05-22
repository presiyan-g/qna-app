import type { QuestionDetail, QuestionSummary } from './api';

export type QuestionState = 'scheduled' | 'live' | 'closed';

type QuestionLike = Pick<QuestionSummary | QuestionDetail, 'publishedAt' | 'closesAt'>;

export function getQuestionState(question: QuestionLike, now: Date = new Date()): QuestionState {
  if (!question.publishedAt) return 'scheduled';
  const publishedAt = new Date(question.publishedAt).getTime();
  if (Number.isNaN(publishedAt) || publishedAt > now.getTime()) return 'scheduled';
  const closesAt = new Date(question.closesAt).getTime();
  if (!Number.isNaN(closesAt) && closesAt <= now.getTime()) return 'closed';
  return 'live';
}

export function formatQuestionStateLabel(state: QuestionState): string {
  switch (state) {
    case 'scheduled':
      return 'Scheduled';
    case 'live':
      return 'Live';
    case 'closed':
      return 'Closed';
  }
}

export function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points} pts`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const target = value instanceof Date ? value : new Date(value);
  const diffMs = target.getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return '';

  const isPast = diffMs < 0;
  const absMs = Math.abs(diffMs);

  let magnitude: string;
  if (absMs < MINUTE_MS) {
    magnitude = isPast ? 'just now' : 'in a moment';
    return magnitude;
  }
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
