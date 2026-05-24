import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';
import { QuestionImmutableError } from './errors';
import {
  canManageUnpublishedQuestion,
  type QuestionStateTimestamps,
} from './state';

export function canAccessCreatorDashboard(
  role: CommunityRole | null,
  platformRole: PlatformRole = 'member',
): boolean {
  return role === 'creator' || platformRole === 'admin';
}

export function assertCanManageQuestion(
  question: QuestionStateTimestamps,
  { platformRole = 'member', now = new Date() }: {
    platformRole?: PlatformRole;
    now?: Date;
  } = {},
): void {
  if (question.deletedAt) throw new QuestionImmutableError();
  if (platformRole === 'admin') return;
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
