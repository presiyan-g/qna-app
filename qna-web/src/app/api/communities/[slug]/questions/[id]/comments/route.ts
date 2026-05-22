import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  CommentNotFoundError,
  CommentPermissionError,
  CommentValidationError,
  listQuestionComments,
  postComment,
  type QuestionComment,
} from '@/services/comments';

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, id }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  try {
    const comments = await listQuestionComments({
      slug,
      questionId: id,
      userId: session.sub,
    });
    return withCors(
      NextResponse.json({ comments: comments.map(toCommentResource) }),
      origin,
    );
  } catch (err) {
    if (err instanceof CommentNotFoundError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 404 }),
        origin,
      );
    }
    if (err instanceof CommentPermissionError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 403 }),
        origin,
      );
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, id }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
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
      NextResponse.json(
        { error: 'Invalid JSON body.', fieldErrors: {} },
        { status: 422 },
      ),
      origin,
    );
  }

  try {
    const comment = await postComment({
      slug,
      questionId: id,
      userId: session.sub,
      body: toBody(body),
      parentCommentId: toParentCommentId(body),
    });
    return withCors(
      NextResponse.json({ comment: toCommentResource(comment) }, { status: 201 }),
      origin,
    );
  } catch (err) {
    if (err instanceof CommentNotFoundError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 404 }),
        origin,
      );
    }
    if (err instanceof CommentPermissionError) {
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
    if (err instanceof CommentValidationError) {
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
}

function toBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { body?: unknown }).body;
}

function toParentCommentId(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { parentCommentId?: unknown }).parentCommentId;
}

function toCommentResource(comment: QuestionComment): unknown {
  return {
    ...comment,
    deletedAt: comment.deletedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: comment.replies.map(toCommentResource),
  };
}
