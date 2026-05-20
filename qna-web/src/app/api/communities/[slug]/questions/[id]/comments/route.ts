import { NextResponse, type NextRequest } from 'next/server';
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const [{ slug, id }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const comments = await listQuestionComments({
      slug,
      questionId: id,
      userId: session.sub,
    });
    return NextResponse.json({ comments: comments.map(toCommentResource) });
  } catch (err) {
    if (err instanceof CommentNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof CommentPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const [{ slug, id }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.', fieldErrors: {} },
      { status: 422 },
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
    return NextResponse.json({ comment: toCommentResource(comment) }, { status: 201 });
  } catch (err) {
    if (err instanceof CommentNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof CommentPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof AccountSuspendedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof CommentValidationError) {
      return NextResponse.json(
        { error: err.message, fieldErrors: err.fieldErrors },
        { status: 422 },
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
