import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  CommunityMembershipError,
  CommunityNotFoundError,
  joinCommunity,
  leaveCommunity,
} from '@/services/communities';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const session = await getApiSession(request);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  const { slug } = await params;

  try {
    const community = await joinCommunity({ slug, userId: session.sub });
    return withCors(
      NextResponse.json({
        id: community.id,
        slug: community.slug,
        name: community.name,
        description: community.description,
        emoji: community.emoji,
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
        memberCount: community.memberCount,
        currentUserRole: community.currentUserRole,
        createdAt: community.createdAt.toISOString(),
        updatedAt: community.updatedAt.toISOString(),
      }),
      origin,
    );
  } catch (err) {
    if (err instanceof CommunityNotFoundError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 404 }), origin);
    }
    if (err instanceof AccountSuspendedError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 403 }), origin);
    }
    throw err;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const session = await getApiSession(request);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  const { slug } = await params;

  try {
    const community = await leaveCommunity({ slug, userId: session.sub });
    return withCors(
      NextResponse.json({
        id: community.id,
        slug: community.slug,
        name: community.name,
        description: community.description,
        emoji: community.emoji,
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
        memberCount: community.memberCount,
        currentUserRole: community.currentUserRole,
        createdAt: community.createdAt.toISOString(),
        updatedAt: community.updatedAt.toISOString(),
      }),
      origin,
    );
  } catch (err) {
    if (err instanceof CommunityNotFoundError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 404 }), origin);
    }
    if (err instanceof CommunityMembershipError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 409 }), origin);
    }
    if (err instanceof AccountSuspendedError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 403 }), origin);
    }
    throw err;
  }
}
