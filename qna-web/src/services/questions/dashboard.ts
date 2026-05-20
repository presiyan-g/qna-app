import 'server-only';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  max,
  min,
  or,
} from 'drizzle-orm';
import { db } from '@/db/client';
import { broadcastPosts } from '@/db/schema/broadcasts';
import { communities, communityMembers } from '@/db/schema/communities';
import { questions, type Question } from '@/db/schema/questions';
import { getCommunityBySlug } from '@/services/communities';
import { canAccessCreatorDashboard } from './management-policy';
import { listDashboardQuestions, type CommunityQuestion } from './questions';

export type TodayQuestionStatus =
  | 'live'
  | 'scheduled_today'
  | 'missing_today'
  | 'closed_today';

export type CreatorDashboardCommunity = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  cadence: string;
  memberCount: number;
  todayQuestionStatus: TodayQuestionStatus;
  nextQuestionAt: Date | null;
  latestBroadcastAt: Date | null;
};

export type CreatorCommunityDashboard = {
  community: {
    id: string;
    slug: string;
    name: string;
    emoji: string;
    memberCount: number;
  };
  questions: CommunityQuestion[];
};

type CreatorCommunityRow = typeof communities.$inferSelect;

export async function listCreatorCommunitiesDashboard({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}): Promise<CreatorDashboardCommunity[]> {
  const creatorCommunities = await loadActiveCreatorCommunities(userId);
  const communityIds = creatorCommunities.map((community) => community.id);
  const [memberCounts, questionSignals, latestBroadcasts] = await Promise.all([
    loadMemberCounts(communityIds),
    loadQuestionSignals(communityIds, now),
    loadLatestBroadcastTimes(communityIds),
  ]);

  return creatorCommunities.map((community) => {
    const signal = questionSignals.get(community.id);
    return {
      id: community.id,
      slug: community.slug,
      name: community.name,
      emoji: community.emoji,
      cadence: community.cadence,
      memberCount: memberCounts.get(community.id) ?? 0,
      todayQuestionStatus: signal?.todayQuestionStatus ?? 'missing_today',
      nextQuestionAt: signal?.nextQuestionAt ?? null,
      latestBroadcastAt: latestBroadcasts.get(community.id) ?? null,
    };
  });
}

export async function getCreatorCommunityDashboard({
  slug,
  userId,
  now = new Date(),
}: {
  slug: string;
  userId: string;
  now?: Date;
}): Promise<CreatorCommunityDashboard | null> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community || !canAccessCreatorDashboard(community.currentUserRole)) {
    return null;
  }

  const dashboardQuestions = await listDashboardQuestions({
    communityId: community.id,
    now,
  });

  return {
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
      emoji: community.emoji,
      memberCount: community.memberCount,
    },
    questions: dashboardQuestions,
  };
}

async function loadActiveCreatorCommunities(
  userId: string,
): Promise<CreatorCommunityRow[]> {
  const rows = await db
    .select({ community: communities })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(
      and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.role, 'creator'),
        eq(communities.status, 'active'),
      ),
    )
    .orderBy(desc(communities.createdAt));

  return rows.map((row) => row.community);
}

async function loadMemberCounts(
  communityIds: string[],
): Promise<Map<string, number>> {
  if (communityIds.length === 0) return new Map();

  const rows = await db
    .select({
      communityId: communityMembers.communityId,
      value: count(),
    })
    .from(communityMembers)
    .where(inArray(communityMembers.communityId, communityIds))
    .groupBy(communityMembers.communityId);

  return new Map(rows.map((row) => [row.communityId, Number(row.value)]));
}

async function loadQuestionSignals(
  communityIds: string[],
  now: Date,
): Promise<
  Map<
    string,
    {
      todayQuestionStatus: TodayQuestionStatus;
      nextQuestionAt: Date | null;
    }
  >
> {
  if (communityIds.length === 0) return new Map();

  const today = getUtcDayRange(now);
  const [todayRows, nextRows] = await Promise.all([
    db
      .select()
      .from(questions)
      .where(
        and(
          inArray(questions.communityId, communityIds),
          isNull(questions.deletedAt),
          isNotNull(questions.scheduledFor),
          isNotNull(questions.closesAt),
          or(
            and(
              gte(questions.scheduledFor, today.start),
              lt(questions.scheduledFor, today.end),
            ),
            and(
              gte(questions.closesAt, today.start),
              lt(questions.closesAt, today.end),
            ),
          ),
        ),
      ),
    db
      .select({
        communityId: questions.communityId,
        nextQuestionAt: min(questions.scheduledFor),
      })
      .from(questions)
      .where(
        and(
          inArray(questions.communityId, communityIds),
          isNull(questions.deletedAt),
          isNotNull(questions.scheduledFor),
          gte(questions.scheduledFor, now),
        ),
      )
      .groupBy(questions.communityId),
  ]);

  const todayByCommunity = new Map<string, Question[]>();
  for (const question of todayRows) {
    const existing = todayByCommunity.get(question.communityId) ?? [];
    existing.push(question);
    todayByCommunity.set(question.communityId, existing);
  }

  const nextByCommunity = new Map(
    nextRows.map((row) => [row.communityId, row.nextQuestionAt ?? null]),
  );
  return new Map(
    communityIds.map((communityId) => [
      communityId,
      {
        todayQuestionStatus: getTodayStatus(
          todayByCommunity.get(communityId) ?? [],
          now,
        ),
        nextQuestionAt: nextByCommunity.get(communityId) ?? null,
      },
    ]),
  );
}

async function loadLatestBroadcastTimes(
  communityIds: string[],
): Promise<Map<string, Date>> {
  if (communityIds.length === 0) return new Map();

  const rows = await db
    .select({
      communityId: broadcastPosts.communityId,
      latestBroadcastAt: max(broadcastPosts.publishedAt),
    })
    .from(broadcastPosts)
    .where(
      and(
        inArray(broadcastPosts.communityId, communityIds),
        isNull(broadcastPosts.deletedAt),
      ),
    )
    .groupBy(broadcastPosts.communityId);

  return new Map(
    rows.flatMap((row) =>
      row.latestBroadcastAt ? [[row.communityId, row.latestBroadcastAt]] : [],
    ),
  );
}

function getTodayStatus(questions: Question[], now: Date): TodayQuestionStatus {
  if (
    questions.some(
      (question) =>
        question.publishedAt &&
        question.publishedAt.getTime() <= now.getTime() &&
        question.closesAt &&
        question.closesAt.getTime() > now.getTime(),
    )
  ) {
    return 'live';
  }

  if (
    questions.some(
      (question) =>
        question.scheduledFor &&
        question.scheduledFor.getTime() > now.getTime(),
    )
  ) {
    return 'scheduled_today';
  }

  if (
    questions.some(
      (question) =>
        question.closesAt && question.closesAt.getTime() <= now.getTime(),
    )
  ) {
    return 'closed_today';
  }

  return 'missing_today';
}

function getUtcDayRange(now: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
