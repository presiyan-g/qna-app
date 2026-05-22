import type { CommunityRole } from '@/services/communities';

export function canCreateBroadcastPost(
  communityRole: CommunityRole | null,
): boolean {
  return communityRole === 'creator';
}

export function canEditBroadcastPost({
  authorUserId,
  userId,
  communityRole,
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
}): boolean {
  return communityRole === 'creator' && authorUserId === userId;
}

export function canSoftDeleteBroadcastPost({
  communityRole,
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
}): boolean {
  return communityRole === 'creator';
}

export function canReadBroadcasts(
  communityRole: CommunityRole | null,
): boolean {
  return communityRole === 'member' || communityRole === 'creator';
}
