import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../_utils/cors';
import { getApiSession } from '@/services/auth/api-session';
import { getCommunityBySlug } from '@/services/communities';

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
  const community = await getCommunityBySlug(slug, session?.sub ?? null);

  if (!community) {
    return withCors(
      NextResponse.json({ error: 'Community not found.' }, { status: 404 }),
      origin,
    );
  }

  return withCors(
    NextResponse.json({
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      emoji: community.emoji,
      coverImageUrl: community.coverImageUrl,
      cadence: community.cadence,
      status: community.status,
      creatorUserId: community.creatorUserId,
      category: community.category
        ? {
            id: community.category.id,
            slug: community.category.slug,
            name: community.category.name,
            description: community.category.description,
          }
        : null,
      isFeatured: community.isFeatured,
      featuredRank: community.featuredRank,
      directoryRank: community.directoryRank,
      memberCount: community.memberCount,
      liveQuestionCount: community.liveQuestionCount,
      unansweredQuestionCount: community.unansweredQuestionCount,
      newBroadcastCount: community.newBroadcastCount,
      currentUserRole: community.currentUserRole,
      createdAt: community.createdAt.toISOString(),
      updatedAt: community.updatedAt.toISOString(),
    }),
    origin,
  );
}
