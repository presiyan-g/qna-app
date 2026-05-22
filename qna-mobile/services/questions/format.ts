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
