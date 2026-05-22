import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  CommentNotFoundError,
  CommentPermissionError,
  softDeleteComment,
} from '@/services/comments';

type RouteContext = {
  params: Promise<{ slug: string; id: string; commentId: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, id, commentId }, session] = await Promise.all([
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
    await softDeleteComment({
      slug,
      questionId: id,
      commentId,
      userId: session.sub,
    });
    return withCors(new NextResponse(null, { status: 204 }), origin);
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
    throw err;
  }
}
