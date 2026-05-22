import 'server-only';
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { AccountSuspendedError, assertUserCanMutate } from '@/services/admin';
import { findUserStatusById } from '@/services/auth';
import {
  communities,
  communityCategories,
  communityMembers,
  type Community,
  type CommunityCategory,
} from '@/db/schema/communities';
import { questions } from '@/db/schema/questions';
import {
  CommunityConflictError,
  CommunityMembershipError,
  CommunityNotFoundError,
  CommunityValidationError,
} from './errors';
import {
  buildCommunityResource,
  buildCreatedCommunityResource,
  markCommunityJoined,
  markCommunityLeft,
} from './resource';
import type { CreateCommunityInput } from './validation';

export type CommunityRole = 'member' | 'creator';

export type CommunityWithMembership = Community & {
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
};

type CommunityWithCategoryRow = {
  community: Community;
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
};

type ListCommunitiesOptions = {
  limit?: number;
  offset?: number;
  userId?: string | null;
};

type SearchCommunitiesOptions = ListCommunitiesOptions & {
  q?: string | null;
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;

export async function listCommunities({
  limit = DEFAULT_LIMIT,
  offset = 0,
  userId = null,
}: ListCommunitiesOptions = {}): Promise<CommunityWithMembership[]> {
  return searchCommunities({ limit, offset, userId });
}

export async function searchCommunities({
  q = null,
  limit = DEFAULT_LIMIT,
  offset = 0,
  userId = null,
}: SearchCommunitiesOptions = {}): Promise<CommunityWithMembership[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const safeOffset = Math.max(offset, 0);
  const query = q?.trim();
  const summaryFields = communitySummaryFields(userId);
  const where = query
    ? and(
        eq(communities.status, 'active'),
        ilike(communities.name, `%${query}%`),
      )
    : eq(communities.status, 'active');

  const rows = await db
    .select({
      community: communities,
      category: communityCategories,
      ...summaryFields,
    })
    .from(communities)
    .leftJoin(
      communityCategories,
      eq(communities.categoryId, communityCategories.id),
    )
    .where(where)
    .orderBy(desc(communities.createdAt))
    .limit(safeLimit)
    .offset(safeOffset);

  return rows.map(toCommunityWithMembership);
}

export async function listMyCommunities({
  userId,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<CommunityWithMembership[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const safeOffset = Math.max(offset, 0);
  const summaryFields = communitySummaryFields(userId);

  const rows = await db
    .select({
      community: communities,
      category: communityCategories,
      ...summaryFields,
      joinedAt: communityMembers.joinedAt,
    })
    .from(communities)
    .innerJoin(
      communityMembers,
      and(
        eq(communityMembers.communityId, communities.id),
        eq(communityMembers.userId, userId),
      ),
    )
    .leftJoin(
      communityCategories,
      eq(communities.categoryId, communityCategories.id),
    )
    .where(eq(communities.status, 'active'))
    .orderBy(desc(communityMembers.joinedAt))
    .limit(safeLimit)
    .offset(safeOffset);

  return rows.map(toCommunityWithMembership);
}

export async function listCommunityCategories(): Promise<CommunityCategory[]> {
  return db
    .select()
    .from(communityCategories)
    .orderBy(asc(communityCategories.name));
}

export async function listFeaturedCommunities({
  limit = 8,
  userId = null,
}: {
  limit?: number;
  userId?: string | null;
} = {}): Promise<CommunityWithMembership[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const summaryFields = communitySummaryFields(userId);
  const rows = await db
    .select({
      community: communities,
      category: communityCategories,
      ...summaryFields,
    })
    .from(communities)
    .leftJoin(
      communityCategories,
      eq(communities.categoryId, communityCategories.id),
    )
    .where(
      and(eq(communities.status, 'active'), eq(communities.isFeatured, true)),
    )
    .orderBy(asc(communities.featuredRank), desc(communities.createdAt))
    .limit(safeLimit);

  return rows.map(toCommunityWithMembership);
}

export async function getCommunityBySlug(
  slug: string,
  userId?: string | null,
): Promise<CommunityWithMembership | null> {
  const summaryFields = communitySummaryFields(userId ?? null);
  const [row] = await db
    .select({
      community: communities,
      category: communityCategories,
      ...summaryFields,
    })
    .from(communities)
    .leftJoin(
      communityCategories,
      eq(communities.categoryId, communityCategories.id),
    )
    .where(and(eq(communities.slug, slug), eq(communities.status, 'active')))
    .limit(1);

  if (!row) return null;
  return toCommunityWithMembership(row);
}

export async function createCommunity({
  creatorUserId,
  input,
}: {
  creatorUserId: string;
  input: CreateCommunityInput;
}): Promise<CommunityWithMembership> {
  await assertAccountCanMutate(creatorUserId);

  let category: CommunityCategory | null = null;
  if (input.categoryId) {
    const [found] = await db
      .select()
      .from(communityCategories)
      .where(eq(communityCategories.id, input.categoryId))
      .limit(1);
    if (!found) {
      throw new CommunityValidationError({
        categoryId: 'Choose a valid category.',
      });
    }
    category = found;
  }

  try {
    const [community] = await db
      .insert(communities)
      .values({
        creatorUserId,
        categoryId: input.categoryId,
        slug: input.slug,
        name: input.name,
        description: input.description,
        emoji: input.emoji,
        cadence: input.cadence,
      })
      .returning();

    await db.insert(communityMembers).values({
      communityId: community.id,
      userId: creatorUserId,
      role: 'creator',
    });

    return buildCreatedCommunityResource({
      community,
      category,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new CommunityConflictError('slug');
    }
    throw err;
  }
}

export async function joinCommunity({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}): Promise<CommunityWithMembership> {
  await assertAccountCanMutate(userId);

  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new CommunityNotFoundError();

  const [inserted] = await db
    .insert(communityMembers)
    .values({
      communityId: community.id,
      userId,
      role: 'member',
    })
    .onConflictDoNothing({
      target: [communityMembers.communityId, communityMembers.userId],
    })
    .returning({ id: communityMembers.id });

  return markCommunityJoined(community, Boolean(inserted));
}

export async function leaveCommunity({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}): Promise<CommunityWithMembership> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new CommunityNotFoundError();

  if (community.currentUserRole === 'creator') {
    throw new CommunityMembershipError(
      'Community creators cannot leave their own community.',
    );
  }

  const deleted = await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, community.id),
        eq(communityMembers.userId, userId),
        eq(communityMembers.role, 'member'),
      ),
    )
    .returning({ id: communityMembers.id });

  return markCommunityLeft(community, deleted.length > 0);
}

function communitySummaryFields(userId: string | null) {
  return {
    memberCount: sql<number>`(
      select count(*)::int
      from ${communityMembers}
      where ${communityMembers.communityId} = ${communities.id}
    )`,
    liveQuestionCount: sql<number>`(
      select count(*)::int
      from ${questions}
      where ${questions.communityId} = ${communities.id}
        and ${questions.deletedAt} is null
        and ${questions.publishedAt} is not null
        and ${questions.publishedAt} <= now()
        and ${questions.closesAt} is not null
        and ${questions.closesAt} > now()
    )`,
    currentUserRole: userId
      ? sql<CommunityRole | null>`(
          select ${communityMembers.role}
          from ${communityMembers}
          where ${communityMembers.communityId} = ${communities.id}
            and ${communityMembers.userId} = ${userId}
          limit 1
        )`
      : sql<CommunityRole | null>`null`,
  };
}

function toCommunityWithMembership(
  row: CommunityWithCategoryRow,
): CommunityWithMembership {
  return buildCommunityResource({
    community: row.community,
    category: row.category,
    memberCount: Number(row.memberCount),
    liveQuestionCount: Number(row.liveQuestionCount),
    currentUserRole: row.currentUserRole,
  });
}

function isUniqueViolation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /unique|duplicate key/i.test(msg);
}

async function assertAccountCanMutate(userId: string): Promise<void> {
  const status = await findUserStatusById(userId);
  if (!status) throw new AccountSuspendedError('User account is unavailable.');
  assertUserCanMutate({ status });
}
