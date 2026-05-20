import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/services/auth/api-session';
import {
  BroadcastCursorError,
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params;

  try {
    const page = await listCommunityBroadcasts({
      slug,
      limit: normalizeBroadcastLimit(request.nextUrl.searchParams.get('limit')),
      cursor: request.nextUrl.searchParams.get('cursor'),
    });
    return NextResponse.json(toBroadcastPageResource(page));
  } catch (err) {
    if (err instanceof BroadcastCursorError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof BroadcastNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const [{ slug }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const post = await createBroadcastPost({
      slug,
      userId: session.sub,
      body: toBroadcastBody(json),
      imageUrl: toBroadcastImageUrl(json),
    });
    return NextResponse.json({ post: toBroadcastResource(post) }, { status: 201 });
  } catch (err) {
    return toMutationErrorResponse(err);
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

function toMutationErrorResponse(err: unknown): Response {
  if (err instanceof BroadcastNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof BroadcastPermissionError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof BroadcastValidationError) {
    return NextResponse.json(
      { error: err.message, fieldErrors: err.fieldErrors },
      { status: 422 },
    );
  }
  throw err;
}
