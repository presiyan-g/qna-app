import 'server-only';
import { and, desc, eq, gte, gt, max, sql, sum } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { questions } from '@/db/schema/questions';
import { users } from '@/db/schema/users';
import { getCommunityBySlug } from '@/services/communities';
import {
  rankLeaderboardRows,
  type LeaderboardEntry,
} from './ranking';
import {
  getLeaderboardWindowStart,
  type LeaderboardWindow,
} from './windows';

export type CommunityLeaderboard = {
  community: {
    id: string;
    slug: string;
    name: string;
  };
  window: LeaderboardWindow;
  entries: LeaderboardEntry[];
};

export async function getCommunityLeaderboard({
  slug,
  window,
  now = new Date(),
}: {
  slug: string;
  window: LeaderboardWindow;
  now?: Date;
}): Promise<CommunityLeaderboard | null> {
  const community = await getCommunityBySlug(slug, null);
  if (!community) return null;

  const windowStart = getLeaderboardWindowStart(window, now);
  const totalPoints = sum(answers.pointsAwarded).mapWith(Number).as('points');
  const lastScoringAnswerAt = max(answers.answeredAt).as(
    'lastScoringAnswerAt',
  );

  const rows = await db
    .select({
      userId: answers.userId,
      username: users.username,
      points: totalPoints,
      lastScoringAnswerAt,
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .innerJoin(users, eq(answers.userId, users.id))
    .where(
      and(
        eq(questions.communityId, community.id),
        gt(answers.pointsAwarded, 0),
        windowStart ? gte(answers.answeredAt, windowStart) : undefined,
      ),
    )
    .groupBy(answers.userId, users.username)
    .orderBy(desc(sql`points`), sql`"lastScoringAnswerAt" asc`, users.username)
    .limit(10);

  return {
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
    },
    window,
    entries: rankLeaderboardRows(
      rows.map((row) => ({
        userId: row.userId,
        username: row.username,
        points: row.points ?? 0,
        lastScoringAnswerAt: row.lastScoringAnswerAt ?? now,
      })),
    ),
  };
}
