import 'server-only';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { questions } from '@/db/schema/questions';
import {
  addDaysUTC,
  buildCommunityStreakRibbon,
  type CommunityStreakRibbon,
} from './community-streak';

/**
 * Fetch this user's answers in this community over the window and
 * build the ribbon. One indexed query joining answers to questions
 * on community_id, filtered to the user and the window. Cheap on a
 * per-page-load basis.
 *
 * Lives in its own module (rather than alongside the pure builder)
 * so unit tests can import the builder without dragging in
 * server-only DB imports.
 */
export async function getCommunityStreakForViewer({
  communityId,
  userId,
  now = new Date(),
  windowDays = 30,
}: {
  communityId: string;
  userId: string;
  now?: Date;
  windowDays?: number;
}): Promise<CommunityStreakRibbon> {
  const windowStart = addDaysUTC(now, -(windowDays - 1));
  const rows = await db
    .select({
      answeredAt: answers.answeredAt,
      isCorrect: answers.isCorrect,
      isLate: answers.isLate,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .where(
      and(
        eq(answers.userId, userId),
        eq(questions.communityId, communityId),
        gte(answers.answeredAt, windowStart),
      ),
    );

  return buildCommunityStreakRibbon({ events: rows, now, windowDays });
}
