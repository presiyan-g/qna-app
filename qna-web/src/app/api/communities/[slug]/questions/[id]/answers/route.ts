import { NextResponse, type NextRequest } from 'next/server';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  AnswerPermissionError,
  AnswerUnavailableError,
  AnswerValidationError,
  submitQuestionAnswer,
  type QuestionDetail,
} from '@/services/answers';
import { QuestionNotFoundError } from '@/services/questions';

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

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
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const question = await submitQuestionAnswer({
      slug,
      questionId: id,
      userId: session.sub,
      choiceId: toChoiceId(body),
    });
    return NextResponse.json(toAnswerResponse(question), { status: 201 });
  } catch (err) {
    if (err instanceof QuestionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AnswerPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof AccountSuspendedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof AnswerUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof AnswerValidationError) {
      return NextResponse.json(
        { error: err.message, fieldErrors: err.fieldErrors },
        { status: 422 },
      );
    }
    throw err;
  }
}

function toChoiceId(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { choiceId?: unknown }).choiceId;
}

function toAnswerResponse(question: QuestionDetail) {
  return {
    questionId: question.id,
    canAnswer: question.canAnswer,
    isClosed: question.isClosed,
    isScheduled: question.isScheduled,
    result: question.result
      ? {
          ...question.result,
          answeredAt: question.result.answeredAt.toISOString(),
        }
      : null,
    explanation: question.explanation,
    choices: question.choices,
  };
}
