import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';

export function canListQuestionComments({
  communityRole,
  hasAnswered,
  isClosed,
  platformRole = 'member',
}: {
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
  isClosed: boolean;
  platformRole?: PlatformRole;
}): boolean {
  if (platformRole === 'admin') return true;
  if (!communityRole) return false;
  if (communityRole === 'creator') return true;
  return hasAnswered || isClosed;
}

export function canPostQuestionComment({
  communityRole,
  hasAnswered,
  platformRole = 'member',
}: {
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
  platformRole?: PlatformRole;
}): boolean {
  void platformRole;
  if (!communityRole) return false;
  if (communityRole === 'creator') return true;
  return hasAnswered;
}

export function canSoftDeleteQuestionComment({
  authorUserId,
  userId,
  communityRole,
  platformRole = 'member',
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
  platformRole?: PlatformRole;
}): boolean {
  if (platformRole === 'admin') return true;
  return authorUserId === userId || communityRole === 'creator';
}
