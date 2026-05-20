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
  return Boolean(communityRole && (hasAnswered || isClosed));
}

export function canPostQuestionComment({
  communityRole,
  hasAnswered,
}: {
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
}): boolean {
  return Boolean(communityRole && hasAnswered);
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
