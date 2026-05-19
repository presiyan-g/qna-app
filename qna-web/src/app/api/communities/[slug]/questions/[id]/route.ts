import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/services/auth/api-session';
import {
  AnswerPermissionError,
  getQuestionDetail,
  type QuestionDetail,
} from '@/services/answers';
import { QuestionNotFoundError } from '@/services/questions';

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
    const question = await getQuestionDetail({
      slug,
      questionId: id,
      userId: session.sub,
    });
    return NextResponse.json(toQuestionDetailResource(question));
  } catch (err) {
    if (err instanceof QuestionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AnswerPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

function toQuestionDetailResource(question: QuestionDetail) {
  return {
    id: question.id,
    communityId: question.communityId,
    creatorUserId: question.creatorUserId,
    prompt: question.prompt,
    explanation: question.explanation,
    imageUrl: question.imageUrl,
    scheduledFor: question.scheduledFor.toISOString(),
    publishedAt: question.publishedAt?.toISOString() ?? null,
    closesAt: question.closesAt.toISOString(),
    timeZone: question.timeZone,
    points: question.points,
    currentUserRole: question.currentUserRole,
    canAnswer: question.canAnswer,
    canSeeSolution: question.canSeeSolution,
    isClosed: question.isClosed,
    isScheduled: question.isScheduled,
    choices: question.choices,
    result: question.result
      ? {
          ...question.result,
          answeredAt: question.result.answeredAt.toISOString(),
        }
      : null,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}
