import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray } from 'drizzle-orm';
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
import {
  CommunityConflictError,
  CommunityNotFoundError,
} from './errors';
import type { CreateCommunityInput } from './validation';

export type CommunityRole = 'member' | 'creator';

export type CommunityWithMembership = Community & {
  category: CommunityCategory | null;
  memberCount: number;
  currentUserRole: CommunityRole | null;
};

type CommunityWithCategoryRow = {
  community: Community;
  category: CommunityCategory | null;
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

  return withMembershipSummaries(rows, userId);
}

export async function listFeaturedCommunities({
  limit = 8,
  userId = null,
}: {
  limit?: number;
  userId?: string | null;
} = {}): Promise<CommunityWithMembership[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const rows = await db
    .select({
      community: communities,
      category: communityCategories,
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

  return withMembershipSummaries(rows, userId);
}

export async function getCommunityBySlug(
  slug: string,
  userId?: string | null,
): Promise<CommunityWithMembership | null> {
  const [row] = await db
    .select({
      community: communities,
      category: communityCategories,
    })
    .from(communities)
    .leftJoin(
      communityCategories,
      eq(communities.categoryId, communityCategories.id),
    )
    .where(and(eq(communities.slug, slug), eq(communities.status, 'active')))
    .limit(1);

  if (!row) return null;
  const [community] = await withMembershipSummaries([row], userId ?? null);
  return community;
}

export async function createCommunity({
  creatorUserId,
  input,
}: {
  creatorUserId: string;
  input: CreateCommunityInput;
}): Promise<CommunityWithMembership> {
  await assertAccountCanMutate(creatorUserId);

  try {
    const [community] = await db
      .insert(communities)
      .values({
        creatorUserId,
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

    const created = await getCommunityBySlug(community.slug, creatorUserId);
    if (!created) throw new CommunityNotFoundError();
    return created;
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

  await db
    .insert(communityMembers)
    .values({
      communityId: community.id,
      userId,
      role: 'member',
    })
    .onConflictDoNothing({
      target: [communityMembers.communityId, communityMembers.userId],
    });

  const joined = await getCommunityBySlug(slug, userId);
  if (!joined) throw new CommunityNotFoundError();
  return joined;
}

async function withMembershipSummaries(
  rows: CommunityWithCategoryRow[],
  userId: string | null,
): Promise<CommunityWithMembership[]> {
  const ids = rows.map((row) => row.community.id);
  if (ids.length === 0) return [];

  const countRows = await db
    .select({
      communityId: communityMembers.communityId,
      value: count(),
    })
    .from(communityMembers)
    .where(inArray(communityMembers.communityId, ids))
    .groupBy(communityMembers.communityId);

  const counts = new Map(
    countRows.map((row) => [row.communityId, Number(row.value)]),
  );

  const membershipRows = userId
    ? await db
        .select({
          communityId: communityMembers.communityId,
          role: communityMembers.role,
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.userId, userId),
            inArray(communityMembers.communityId, ids),
          ),
        )
    : [];

  const roles = new Map(
    membershipRows.map((row) => [row.communityId, row.role]),
  );

  return rows.map((row) => ({
    ...row.community,
    category: row.category,
    memberCount: counts.get(row.community.id) ?? 0,
    currentUserRole: roles.get(row.community.id) ?? null,
  }));
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
