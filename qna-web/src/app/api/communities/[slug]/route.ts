import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/services/auth/api-session';
import { getCommunityBySlug } from '@/services/communities';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const [{ slug }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);

  if (!community) {
    return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  }

  return NextResponse.json({
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    emoji: community.emoji,
    cadence: community.cadence,
    status: community.status,
    creatorUserId: community.creatorUserId,
    memberCount: community.memberCount,
    currentUserRole: community.currentUserRole,
    createdAt: community.createdAt.toISOString(),
    updatedAt: community.updatedAt.toISOString(),
  });
}
