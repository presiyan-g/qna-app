import { NextResponse, type NextRequest } from 'next/server';
import {
  getCommunityLeaderboard,
  normalizeLeaderboardWindow,
  type CommunityLeaderboard,
} from '@/services/leaderboard';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const window = normalizeLeaderboardWindow(
    request.nextUrl.searchParams.get('window'),
  );
  const leaderboard = await getCommunityLeaderboard({ slug, window });

  if (!leaderboard) {
    return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  }

  return NextResponse.json(toLeaderboardResource(leaderboard));
}

function toLeaderboardResource(leaderboard: CommunityLeaderboard) {
  return {
    community: leaderboard.community,
    window: leaderboard.window,
    entries: leaderboard.entries.map((entry) => ({
      ...entry,
      lastScoringAnswerAt: entry.lastScoringAnswerAt.toISOString(),
    })),
  };
}
