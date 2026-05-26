import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';

export function canCreateBroadcastPost(
  communityRole: CommunityRole | null,
  platformRole: PlatformRole = 'member',
): boolean {
  void platformRole;
  return communityRole === 'creator';
}

export function canEditBroadcastPost({
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
  void platformRole;
  return communityRole === 'creator' && authorUserId === userId;
}

export function canSoftDeleteBroadcastPost({
  communityRole,
  platformRole = 'member',
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
  platformRole?: PlatformRole;
}): boolean {
  if (platformRole === 'admin') return true;
  return communityRole === 'creator';
}

export function canReadBroadcasts(
  communityRole: CommunityRole | null,
  platformRole: PlatformRole = 'member',
): boolean {
  if (platformRole === 'admin') return true;
  return communityRole === 'member' || communityRole === 'creator';
}
