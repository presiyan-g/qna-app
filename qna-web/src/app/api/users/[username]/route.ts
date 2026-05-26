import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../_utils/cors';
import {
  getPublicUserProfileByUsername,
  type PublicUserProfile,
} from '@/services/profiles';

type RouteContext = {
  params: Promise<{ username: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const { username } = await params;
  const profile = await getPublicUserProfileByUsername(username);

  if (!profile) {
    return withCors(
      NextResponse.json({ error: 'User not found.' }, { status: 404 }),
      origin,
    );
  }

  return withCors(NextResponse.json(toPublicProfileResource(profile)), origin);
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
    // Streak is already a plain JSON-friendly shape (ISO date strings +
    // numeric levels) — see services/profiles/summary.ts. We pass it
    // through so the mobile profile can render the same 30-day activity
    // ribbon that the web profile does.
    streak: profile.streak,
  };
}
