import type { CommunityRole } from '@/services/communities';

export function canListQuestionComments({
  communityRole,
  hasAnswered,
  isClosed,
}: {
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
  isClosed: boolean;
}): boolean {
  if (!communityRole) return false;
  if (communityRole === 'creator') return true;
  return hasAnswered || isClosed;
}

export function canPostQuestionComment({
  communityRole,
  hasAnswered,
}: {
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
}): boolean {
  if (!communityRole) return false;
  if (communityRole === 'creator') return true;
  return hasAnswered;
}

export function canSoftDeleteQuestionComment({
  authorUserId,
  userId,
  communityRole,
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
}): boolean {
  return authorUserId === userId || communityRole === 'creator';
}
