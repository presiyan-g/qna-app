import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../../../_utils/cors';
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

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
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
      NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }),
      origin,
    );
  }

  try {
    const question = await submitQuestionAnswer({
      slug,
      questionId: id,
      userId: session.sub,
      choiceId: toChoiceId(body),
    });
    return withCors(NextResponse.json(toAnswerResponse(question), { status: 201 }), origin);
  } catch (err) {
    if (err instanceof QuestionNotFoundError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 404 }), origin);
    }
    if (err instanceof AnswerPermissionError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 403 }), origin);
    }
    if (err instanceof AccountSuspendedError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 403 }), origin);
    }
    if (err instanceof AnswerUnavailableError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 409 }), origin);
    }
    if (err instanceof AnswerValidationError) {
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
