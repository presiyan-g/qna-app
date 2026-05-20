import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/services/auth/api-session';
import {
  CommentNotFoundError,
  CommentPermissionError,
  softDeleteComment,
} from '@/services/comments';

type RouteContext = {
  params: Promise<{ slug: string; id: string; commentId: string }>;
};

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const [{ slug, id, commentId }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    await softDeleteComment({
      slug,
      questionId: id,
      commentId,
      userId: session.sub,
    });
    return new NextResponse(null, { status: 204 });
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
