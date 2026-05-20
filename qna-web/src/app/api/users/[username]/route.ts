import { NextResponse } from 'next/server';
import {
  getPublicUserProfileByUsername,
  type PublicUserProfile,
} from '@/services/profiles';

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { username } = await params;
  const profile = await getPublicUserProfileByUsername(username);

  if (!profile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json(toPublicProfileResource(profile));
}

function toPublicProfileResource(profile: PublicUserProfile) {
  return {
    user: {
      ...profile.user,
      joinedAt: profile.user.joinedAt.toISOString(),
    },
    stats: profile.stats,
    communities: profile.communities.map((community) => ({
      ...community,
      joinedAt: community.joinedAt.toISOString(),
    })),
  };
}
