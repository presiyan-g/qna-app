import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../_utils/cors';
import { getApiSession } from '@/services/auth/api-session';
import {
  listLiveQuestionsForUser,
  type LiveQuestionItem,
} from '@/services/questions';

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const session = await getApiSession(request);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  const limit = parsePositiveInt(request.nextUrl.searchParams.get('limit'), 20);
  const items = await listLiveQuestionsForUser({
    userId: session.sub,
    limit,
  });

  return withCors(
    NextResponse.json({
      items: items.map(toLiveQuestionResource),
      pagination: { limit },
    }),
    origin,
  );
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toLiveQuestionResource(item: LiveQuestionItem) {
  return {
    community: {
      id: item.community.id,
      slug: item.community.slug,
      name: item.community.name,
      description: item.community.description,
      emoji: item.community.emoji,
      coverImageUrl: item.community.coverImageUrl,
      cadence: item.community.cadence,
      status: item.community.status,
      creatorUserId: item.community.creatorUserId,
      category: item.community.category
        ? {
            id: item.community.category.id,
            slug: item.community.category.slug,
            name: item.community.category.name,
            description: item.community.category.description,
          }
        : null,
      isFeatured: item.community.isFeatured,
      featuredRank: item.community.featuredRank,
      directoryRank: item.community.directoryRank,
      memberCount: item.community.memberCount,
      liveQuestionCount: item.community.liveQuestionCount,
      unansweredQuestionCount: item.community.unansweredQuestionCount,
      newBroadcastCount: item.community.newBroadcastCount,
      currentUserRole: item.community.currentUserRole,
      createdAt: item.community.createdAt.toISOString(),
      updatedAt: item.community.updatedAt.toISOString(),
    },
    question: {
      id: item.question.id,
      communityId: item.question.communityId,
      creatorUserId: item.question.creatorUserId,
      prompt: item.question.prompt,
      explanation: item.question.explanation,
      imageUrl: item.question.imageUrl,
      scheduledFor: item.question.scheduledFor.toISOString(),
      publishedAt: item.question.publishedAt?.toISOString() ?? null,
      closesAt: item.question.closesAt.toISOString(),
      timeZone: item.question.timeZone,
      points: item.question.points,
      choiceCount: item.question.choiceCount,
      choices: item.question.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        imageUrl: choice.imageUrl,
        position: choice.position,
        isCorrect: choice.isCorrect,
      })),
      viewerAnswer: item.question.viewerAnswer,
      createdAt: item.question.createdAt.toISOString(),
      updatedAt: item.question.updatedAt.toISOString(),
    },
  };
}
