import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  BroadcastAuthenticationRequiredError,
  BroadcastCursorError,
  BroadcastMembershipRequiredError,
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
  createBroadcastPost,
  listCommunityBroadcasts,
  normalizeBroadcastLimit,
  type BroadcastPage,
  type BroadcastPostResource,
} from '@/services/broadcasts';

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

  try {
    const page = await listCommunityBroadcasts({
      slug,
      limit: normalizeBroadcastLimit(request.nextUrl.searchParams.get('limit')),
      cursor: request.nextUrl.searchParams.get('cursor'),
      viewerUserId: session?.sub ?? null,
    });
    return withCors(NextResponse.json(toBroadcastPageResource(page)), origin);
  } catch (err) {
    if (err instanceof BroadcastAuthenticationRequiredError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 401 }),
        origin,
      );
    }
    if (err instanceof BroadcastMembershipRequiredError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 403 }),
        origin,
      );
    }
    if (err instanceof BroadcastCursorError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 400 }),
        origin,
      );
    }
    if (err instanceof BroadcastNotFoundError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 404 }),
        origin,
      );
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }),
      origin,
    );
  }

  try {
    const post = await createBroadcastPost({
      slug,
      userId: session.sub,
      body: toBroadcastBody(json),
      imageUrl: toBroadcastImageUrl(json),
    });
    return withCors(
      NextResponse.json({ post: toBroadcastResource(post) }, { status: 201 }),
      origin,
    );
  } catch (err) {
    return toMutationErrorResponse(err, origin);
  }
}

function toBroadcastBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { body?: unknown }).body;
}

function toBroadcastImageUrl(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { imageUrl?: unknown }).imageUrl;
}

function toBroadcastPageResource(page: BroadcastPage) {
  return {
    items: page.items.map(toBroadcastResource),
    pagination: page.pagination,
  };
}

function toBroadcastResource(post: BroadcastPostResource) {
  return {
    id: post.id,
    communityId: post.communityId,
    author: post.author,
    body: post.body,
    imageUrl: post.imageUrl,
    publishedAt: post.publishedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    canEdit: post.canEdit,
    canDelete: post.canDelete,
  };
}

function toMutationErrorResponse(err: unknown, origin: string | null): Response {
  if (err instanceof BroadcastNotFoundError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 404 }),
      origin,
    );
  }
  if (err instanceof BroadcastPermissionError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 403 }),
      origin,
    );
  }
  if (err instanceof AccountSuspendedError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 403 }),
      origin,
    );
  }
  if (err instanceof BroadcastValidationError) {
    return withCors(
      NextResponse.json(
        { error: err.message, fieldErrors: err.fieldErrors },
        { status: 422 },
      ),
      origin,
    );
  }
  throw err;
}
