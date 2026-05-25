import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  CommunityConflictError,
  CommunityValidationError,
  createCommunity,
  listCommunities,
  validateCreateCommunityInput,
} from '@/services/communities';

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const session = await getApiSession(request);
  const { searchParams } = request.nextUrl;
  const limit = parsePositiveInt(searchParams.get('limit'), 24);
  const offset = parsePositiveInt(searchParams.get('offset'), 0);
  const communities = await listCommunities({
    limit,
    offset,
    userId: session?.sub ?? null,
  });

  return withCors(
    NextResponse.json({
      items: communities.map(toCommunityResource),
      pagination: { limit, offset },
    }),
    origin,
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const session = await getApiSession(request);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }),
      origin,
    );
  }

  try {
    const input = validateCreateCommunityInput(toCreateCommunityRaw(body));
    const community = await createCommunity({
      creatorUserId: session.sub,
      input,
    });
    return withCors(NextResponse.json(toCommunityResource(community), { status: 201 }), origin);
  } catch (err) {
    if (err instanceof CommunityValidationError) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid community input.', fieldErrors: err.fieldErrors },
          { status: 422 },
        ),
        origin,
      );
    }
    if (err instanceof CommunityConflictError) {
      return withCors(
        NextResponse.json(
          { error: err.message, fieldErrors: { name: err.message } },
          { status: 409 },
        ),
        origin,
      );
    }
    if (err instanceof AccountSuspendedError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 403 }), origin);
    }
    throw err;
  }
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toCreateCommunityRaw(body: unknown) {
  const value = body && typeof body === 'object' ? body : {};
  return value as {
    name?: unknown;
    description?: unknown;
    emoji?: unknown;
    cadence?: unknown;
  };
}

function toCommunityResource(
  community: Awaited<ReturnType<typeof listCommunities>>[number],
) {
  return {
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
  };
}
