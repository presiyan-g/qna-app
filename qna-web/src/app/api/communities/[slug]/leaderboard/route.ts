import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../_utils/cors';
import { getApiSession } from '@/services/auth/api-session';
import {
  getCommunityLeaderboard,
  normalizeLeaderboardWindow,
  type CommunityLeaderboard,
  type LeaderboardEntry,
} from '@/services/leaderboard';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  const window = normalizeLeaderboardWindow(
    request.nextUrl.searchParams.get('window'),
  );
  const leaderboard = await getCommunityLeaderboard({
    slug,
    window,
    viewerUserId: session?.sub ?? null,
  });

  if (!leaderboard) {
    return withCors(
      NextResponse.json({ error: 'Community not found.' }, { status: 404 }),
      origin,
    );
  }

  return withCors(
    NextResponse.json(toLeaderboardResource(leaderboard)),
    origin,
  );
}

function toLeaderboardResource(leaderboard: CommunityLeaderboard) {
  return {
    community: leaderboard.community,
    window: leaderboard.window,
    entries: leaderboard.entries.map(toEntryResource),
    viewerEntry: leaderboard.viewerEntry
      ? toEntryResource(leaderboard.viewerEntry)
      : null,
  };
}

function toEntryResource(entry: LeaderboardEntry) {
  return {
    ...entry,
    lastScoringAnswerAt: entry.lastScoringAnswerAt.toISOString(),
  };
}
