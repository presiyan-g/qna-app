import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/services/auth/api-session';
import {
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
  getCommunityBroadcast,
  softDeleteBroadcastPost,
  updateBroadcastPost,
  type BroadcastPostResource,
} from '@/services/broadcasts';

type RouteContext = {
  params: Promise<{ slug: string; postId: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { slug, postId } = await params;
  const post = await getCommunityBroadcast({ slug, postId });
  if (!post) {
    return NextResponse.json(
      { error: 'Broadcast not found.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ post: toBroadcastResource(post) });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const [{ slug, postId }, session] = await Promise.all([
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
    const post = await updateBroadcastPost({
      slug,
      postId,
      userId: session.sub,
      body: toBroadcastBody(json),
      imageUrl: toBroadcastImageUrl(json),
    });
    return NextResponse.json({ post: toBroadcastResource(post) });
  } catch (err) {
    return toMutationErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const [{ slug, postId }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  try {
    await softDeleteBroadcastPost({ slug, postId, userId: session.sub });
    return new NextResponse(null, { status: 204 });
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
