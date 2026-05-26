import 'server-only';
import { and, eq, gte, sum } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { communities, communityMembers } from '@/db/schema/communities';
import { questions } from '@/db/schema/questions';
import { users } from '@/db/schema/users';
import {
  buildPublicUserProfile,
  buildStreakRibbon,
  type PublicUserProfile,
} from './summary';

const STREAK_WINDOW_DAYS = 30;

export async function getPublicUserProfileByUsername(
  username: string,
): Promise<PublicUserProfile | null> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return null;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      joinedAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .limit(1);

  if (!user) return null;

  // Pull the streak window oldest-day cutoff. We over-fetch by a day to
  // tolerate clock skew between the app server and the DB.
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - (STREAK_WINDOW_DAYS + 1));

  const [memberships, pointsRow, streakRows] = await Promise.all([
    db
      .select({
        id: communities.id,
        slug: communities.slug,
        name: communities.name,
        role: communityMembers.role,
        joinedAt: communityMembers.joinedAt,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(
        and(
          eq(communityMembers.userId, user.id),
          eq(communities.status, 'active'),
        ),
      ),
    db
      .select({
        points: sum(answers.pointsAwarded).mapWith(Number).as('points'),
      })
      .from(answers)
      .where(eq(answers.userId, user.id))
      .limit(1),
    db
      .select({
        answeredAt: answers.answeredAt,
        communityId: questions.communityId,
      })
      .from(answers)
      .innerJoin(questions, eq(answers.questionId, questions.id))
      .where(
        and(eq(answers.userId, user.id), gte(answers.answeredAt, cutoff)),
      ),
  ]);

  const streak = buildStreakRibbon({
    events: streakRows,
    now,
    windowDays: STREAK_WINDOW_DAYS,
  });

  return buildPublicUserProfile({
    user,
    memberships,
    totalPoints: pointsRow[0]?.points ?? 0,
    streak,
  });
}
