import 'server-only';
import { and, eq, sum } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { communities, communityMembers } from '@/db/schema/communities';
import { users } from '@/db/schema/users';
import {
  buildPublicUserProfile,
  type PublicUserProfile,
} from './summary';

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

  const [memberships, pointsRow] = await Promise.all([
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
  ]);

  return buildPublicUserProfile({
    user,
    memberships,
    totalPoints: pointsRow[0]?.points ?? 0,
  });
}
