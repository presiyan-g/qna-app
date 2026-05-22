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
  viewerEntry: LeaderboardEntry | null;
};

export async function getCommunityLeaderboard({
  slug,
  window,
  viewerUserId = null,
  now = new Date(),
}: {
  slug: string;
  window: LeaderboardWindow;
  viewerUserId?: string | null;
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

  const entries = rankLeaderboardRows(
    rows.map((row) => ({
      userId: row.userId,
      username: row.username,
      points: row.points ?? 0,
      lastScoringAnswerAt: row.lastScoringAnswerAt ?? now,
    })),
  );

  const viewerEntry = await resolveViewerEntry({
    entries,
    communityId: community.id,
    viewerUserId,
    windowStart,
  });

  return {
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
    },
    window,
    entries,
    viewerEntry,
  };
}

async function getLeaderboardEntryForUser({
  communityId,
  viewerUserId,
  windowStart,
}: {
  communityId: string;
  viewerUserId: string;
  windowStart: Date | null;
}): Promise<LeaderboardEntry | null> {
  const rankedAlias = db
    .select({
      userId: answers.userId,
      username: users.username,
      points: sum(answers.pointsAwarded).mapWith(Number).as('points'),
      lastScoringAnswerAt: max(answers.answeredAt).as('lastScoringAnswerAt'),
      rank: sql<number>`RANK() OVER (
        ORDER BY
          SUM(${answers.pointsAwarded}) DESC,
          MAX(${answers.answeredAt}) ASC,
          ${users.username} ASC
      )`.as('rank'),
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .innerJoin(users, eq(answers.userId, users.id))
    .where(
      and(
        eq(questions.communityId, communityId),
        gt(answers.pointsAwarded, 0),
        windowStart ? gte(answers.answeredAt, windowStart) : undefined,
      ),
    )
    .groupBy(answers.userId, users.username)
    .as('ranked');

  const [row] = await db
    .select()
    .from(rankedAlias)
    .where(eq(rankedAlias.userId, viewerUserId))
    .limit(1);

  if (!row) return null;

  return {
    userId: row.userId,
    username: row.username,
    points: Number(row.points ?? 0),
    lastScoringAnswerAt:
      row.lastScoringAnswerAt instanceof Date
        ? row.lastScoringAnswerAt
        : new Date(row.lastScoringAnswerAt ?? 0),
    rank: Number(row.rank),
  };
}

async function resolveViewerEntry({
  entries,
  communityId,
  viewerUserId,
  windowStart,
}: {
  entries: LeaderboardEntry[];
  communityId: string;
  viewerUserId: string | null;
  windowStart: Date | null;
}): Promise<LeaderboardEntry | null> {
  if (!viewerUserId) return null;
  const inTopTen = entries.find((entry) => entry.userId === viewerUserId);
  if (inTopTen) return inTopTen;
  return getLeaderboardEntryForUser({
    communityId,
    viewerUserId,
    windowStart,
  });
}
