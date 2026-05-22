import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  createQuestion,
  listCommunityQuestions,
  QuestionPermissionError,
  QuestionsValidationError,
  validateCreateQuestionInput,
  type ScheduledCommunityQuestion,
} from '@/services/questions';

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
  const { searchParams } = request.nextUrl;
  const limit = parsePositiveInt(searchParams.get('limit'), 20);
  const offset = parsePositiveInt(searchParams.get('offset'), 0);
  const questions = await listCommunityQuestions({
    slug,
    userId: session?.sub ?? null,
    limit,
    offset,
  });

  return withCors(
    NextResponse.json({
      items: questions.map(toQuestionResource),
      pagination: { limit, offset },
    }),
    origin,
  );
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
    const input = validateCreateQuestionInput(toCreateQuestionRaw(body));
    const question = await createQuestion({
      slug,
      creatorUserId: session.sub,
      input,
    });
    return withCors(NextResponse.json(toQuestionResource(question), { status: 201 }), origin);
  } catch (err) {
    if (err instanceof QuestionsValidationError) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid question input.', fieldErrors: err.fieldErrors },
          { status: 422 },
        ),
        origin,
      );
    }
    if (err instanceof QuestionPermissionError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 403 }), origin);
    }
    if (err instanceof AccountSuspendedError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 403 }), origin);
    }
    throw err;
  }
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toCreateQuestionRaw(body: unknown) {
  const value = body && typeof body === 'object' ? body : {};
  return value as {
    prompt?: unknown;
    explanation?: unknown;
    imageUrl?: unknown;
    scheduledFor?: unknown;
    choices?: unknown;
  };
}

function toQuestionResource(question: ScheduledCommunityQuestion) {
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
    choiceCount: question.choiceCount,
    choices: question.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      imageUrl: choice.imageUrl,
      position: choice.position,
      isCorrect: choice.isCorrect,
    })),
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}
