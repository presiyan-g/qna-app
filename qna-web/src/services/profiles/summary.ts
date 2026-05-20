export type PublicProfileRole = 'member' | 'creator';

export type PublicProfileUser = {
  id: string;
  username: string;
  joinedAt: Date;
};

export type PublicProfileMembershipInput = {
  id: string;
  slug: string;
  name: string;
  role: PublicProfileRole;
  joinedAt: Date;
};

export type PublicUserProfile = {
  user: PublicProfileUser;
  stats: {
    totalPoints: number;
    communityCount: number;
  };
  communities: Array<{
    id: string;
    slug: string;
    name: string;
    role: PublicProfileRole;
    joinedAt: Date;
  }>;
};

export function buildPublicUserProfile({
  user,
  memberships,
  totalPoints,
}: {
  user: PublicProfileUser;
  memberships: PublicProfileMembershipInput[];
  totalPoints: number;
}): PublicUserProfile {
  const communities = [...memberships].sort(compareProfileCommunities);

  return {
    user,
    stats: {
      totalPoints,
      communityCount: communities.length,
    },
    communities,
  };
}

function compareProfileCommunities(
  a: PublicUserProfile['communities'][number],
  b: PublicUserProfile['communities'][number],
): number {
  if (a.role !== b.role) return a.role === 'creator' ? -1 : 1;
  const joinedDelta = b.joinedAt.getTime() - a.joinedAt.getTime();
  if (joinedDelta !== 0) return joinedDelta;
  return a.name.localeCompare(b.name);
}
