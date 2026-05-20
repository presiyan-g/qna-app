import type { CommunityRole } from '@/services/communities';
import { QuestionImmutableError } from './errors';
import {
  canManageUnpublishedQuestion,
  type QuestionStateTimestamps,
} from './state';

export function canAccessCreatorDashboard(
  role: CommunityRole | null,
): boolean {
  return role === 'creator';
}

export function assertCanManageQuestion(
  question: QuestionStateTimestamps,
  now = new Date(),
): void {
  if (!canManageUnpublishedQuestion(question, now)) {
    throw new QuestionImmutableError();
  }
}

export function shouldIncludeQuestionInActiveReads(
  question: QuestionStateTimestamps,
): boolean {
  return Boolean(
    !question.deletedAt && question.scheduledFor && question.closesAt,
  );
}
