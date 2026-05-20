import { NextResponse, type NextRequest } from 'next/server';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import { CommunityNotFoundError, joinCommunity } from '@/services/communities';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const community = await joinCommunity({ slug, userId: session.sub });
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
  } catch (err) {
    if (err instanceof CommunityNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AccountSuspendedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
