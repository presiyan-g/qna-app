import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/services/auth/api-session';
import {
  createQuestion,
  listCommunityQuestions,
  QuestionPermissionError,
  QuestionsValidationError,
  validateCreateQuestionInput,
  type CommunityQuestion,
} from '@/services/questions';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
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

  return NextResponse.json({
    items: questions.map(toQuestionResource),
    pagination: { limit, offset },
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const [{ slug }, session] = await Promise.all([
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
    const input = validateCreateQuestionInput(toCreateQuestionRaw(body));
    const question = await createQuestion({
      slug,
      creatorUserId: session.sub,
      input,
    });
    return NextResponse.json(toQuestionResource(question), { status: 201 });
  } catch (err) {
    if (err instanceof QuestionsValidationError) {
      return NextResponse.json(
        { error: 'Invalid question input.', fieldErrors: err.fieldErrors },
        { status: 422 },
      );
    }
    if (err instanceof QuestionPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
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

function toQuestionResource(question: CommunityQuestion) {
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
