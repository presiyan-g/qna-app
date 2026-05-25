import 'server-only';
import { and, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import {
  communities,
  communityMembers,
} from '@/db/schema/communities';
import { questions } from '@/db/schema/questions';
import { users } from '@/db/schema/users';
import {
  NOTIFICATIONS_LIMIT,
  toQuestionNotification,
  type ListQuestionNotificationsResult,
} from './mapping';

/**
 * Returns the 20 most recent question-publish events from communities the
 * given user has joined, excluding questions they authored. The shape includes
 * per-item `isUnread`, `hasAnswered`, `isClosed` flags for UI rendering.
 *
 * - Filters out soft-deleted questions and unpublished drafts.
 * - Filters out questions published before the user joined the community.
 * - Filters out questions whose `creator_user_id` matches the viewer (creators
 *   are not notified about questions they themselves authored).
 */
export async function listQuestionNotifications(
  userId: string,
): Promise<ListQuestionNotificationsResult> {
  const now = new Date();

  const userRow = await db
    .select({ lastSeenNotificationsAt: users.lastSeenNotificationsAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // User row missing (e.g. deleted between session check and this call):
  // return empty rather than throwing — the nav is best-effort.
  if (userRow.length === 0) {
    return { items: [], unreadCount: 0 };
  }
  const lastSeenNotificationsAt = userRow[0].lastSeenNotificationsAt;

  const rows = await db
    .select({
      questionId: questions.id,
      prompt: questions.prompt,
      publishedAt: questions.publishedAt,
      closesAt: questions.closesAt,
      communitySlug: communities.slug,
      communityName: communities.name,
      communityEmoji: communities.emoji,
      hasAnswered: sql<boolean>`(${answers.id} is not null)`,
    })
    .from(questions)
    .innerJoin(
      communityMembers,
      and(
        eq(communityMembers.communityId, questions.communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .innerJoin(communities, eq(communities.id, questions.communityId))
    .leftJoin(
      answers,
      and(eq(answers.questionId, questions.id), eq(answers.userId, userId)),
    )
    .where(
      and(
        isNull(questions.deletedAt),
        isNotNull(questions.publishedAt),
        sql`${questions.publishedAt} <= now()`,
        sql`${questions.publishedAt} >= ${communityMembers.joinedAt}`,
        ne(questions.creatorUserId, userId),
      ),
    )
    .orderBy(desc(questions.publishedAt))
    .limit(NOTIFICATIONS_LIMIT);

  const items = rows.map((row) =>
    toQuestionNotification(
      {
        questionId: row.questionId,
        prompt: row.prompt,
        // `isNotNull` filter above narrows this in SQL; cast it in TS.
        publishedAt: row.publishedAt as Date,
        closesAt: row.closesAt,
        communitySlug: row.communitySlug,
        communityName: row.communityName,
        communityEmoji: row.communityEmoji,
        hasAnswered: row.hasAnswered,
      },
      { now, lastSeenNotificationsAt },
    ),
  );

  const unreadCount = items.reduce(
    (sum, item) => sum + (item.isUnread ? 1 : 0),
    0,
  );

  return { items, unreadCount };
}

/**
 * Stamps the viewer's `users.last_seen_notifications_at` to `now()`. Called
 * from the bell's "open" click. Idempotent — repeat calls just bump the stamp.
 */
export async function markNotificationsSeen(userId: string): Promise<void> {
  const now = new Date();
  await db
    .update(users)
    .set({ lastSeenNotificationsAt: now, updatedAt: now })
    .where(eq(users.id, userId));
}
