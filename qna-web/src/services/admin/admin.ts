import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
} from 'drizzle-orm';
import { db } from '@/db/client';
import { adminAuditLogs } from '@/db/schema/admin';
import { communities, communityMembers } from '@/db/schema/communities';
import { users, type User } from '@/db/schema/users';
import {
  AdminNotFoundError,
  AdminPermissionError,
} from './errors';
import {
  assertActiveAdmin,
  assertCanSuspendTargetUser,
} from './policy';
import {
  normalizeAdminQuery,
  normalizeAdminReason,
  normalizeCommunityPlacementInput,
  type CommunityStatusFilter,
  type UserStatusFilter,
} from './validation';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type AdminActor = Pick<User, 'id' | 'role' | 'status'>;
type AdminAuditAction = typeof adminAuditLogs.$inferInsert['action'];

export async function requireAdminActor(userId: string): Promise<AdminActor> {
  const [actor] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!actor) throw new AdminPermissionError();
  assertActiveAdmin(actor);
  return actor;
}

export async function getAdminOverview({
  actorUserId,
}: {
  actorUserId: string;
}) {
  await requireAdminActor(actorUserId);

  const [
    [userCount],
    [suspendedCount],
    [activeCommunityCount],
    [archivedCommunityCount],
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.status, 'suspended')),
    db
      .select({ value: count() })
      .from(communities)
      .where(eq(communities.status, 'active')),
    db
      .select({ value: count() })
      .from(communities)
      .where(eq(communities.status, 'archived')),
  ]);

  return {
    totalUsers: Number(userCount.value),
    suspendedUsers: Number(suspendedCount.value),
    activeCommunities: Number(activeCommunityCount.value),
    archivedCommunities: Number(archivedCommunityCount.value),
  };
}

export async function listAdminAuditLogs({
  actorUserId,
  limit = 10,
  offset = 0,
}: {
  actorUserId: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdminActor(actorUserId);
  const safeLimit = clampLimit(limit);
  const safeOffset = Math.max(offset, 0);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        log: adminAuditLogs,
        actorUsername: users.username,
      })
      .from(adminAuditLogs)
      .innerJoin(users, eq(adminAuditLogs.actorUserId, users.id))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(safeLimit)
      .offset(safeOffset),
    db.select({ value: count() }).from(adminAuditLogs),
  ]);

  return {
    items: rows,
    totalCount: Number(countRows[0]?.value ?? 0),
  };
}

export async function searchAdminUsers({
  actorUserId,
  q,
  status = 'all',
  limit = DEFAULT_LIMIT,
  offset = 0,
}: {
  actorUserId: string;
  q?: unknown;
  status?: UserStatusFilter;
  limit?: number;
  offset?: number;
}) {
  await requireAdminActor(actorUserId);
  const query = normalizeAdminQuery(q);

  const conditions = [];
  if (query) {
    conditions.push(
      or(ilike(users.email, `%${query}%`), ilike(users.username, `%${query}%`)),
    );
  }
  if (status !== 'all') {
    conditions.push(eq(users.status, status));
  }
  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const safeLimit = clampLimit(limit);
  const safeOffset = Math.max(offset, 0);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        user: users,
        membershipCount: count(communityMembers.id),
      })
      .from(users)
      .leftJoin(communityMembers, eq(users.id, communityMembers.userId))
      .where(where)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(safeLimit)
      .offset(safeOffset),
    db.select({ value: count() }).from(users).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      ...row.user,
      membershipCount: Number(row.membershipCount),
    })),
    totalCount: Number(countRows[0]?.value ?? 0),
  };
}

export async function getAdminUserDetail({
  actorUserId,
  targetUserId,
}: {
  actorUserId: string;
  targetUserId: string;
}) {
  await requireAdminActor(actorUserId);

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (!target) throw new AdminNotFoundError('User not found.');

  const memberships = await db
    .select({
      id: communityMembers.id,
      role: communityMembers.role,
      joinedAt: communityMembers.joinedAt,
      communityId: communities.id,
      communitySlug: communities.slug,
      communityName: communities.name,
      communityStatus: communities.status,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(eq(communityMembers.userId, target.id))
    .orderBy(desc(communityMembers.joinedAt));

  return { user: target, memberships };
}

export async function promoteUserToAdmin({
  actorUserId,
  targetUserId,
}: {
  actorUserId: string;
  targetUserId: string;
}) {
  await requireAdminActor(actorUserId);
  const target = await getUserOrThrow(targetUserId);

  if (target.role !== 'admin') {
    await db
      .update(users)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(users.id, target.id));
  }

  await writeAuditLog({
    actorUserId,
    action: 'user_promoted_to_admin',
    targetUserId: target.id,
    reason: 'Promoted from admin panel.',
  });
}

export async function suspendUser({
  actorUserId,
  targetUserId,
  reason,
}: {
  actorUserId: string;
  targetUserId: string;
  reason: unknown;
}) {
  await requireAdminActor(actorUserId);
  const normalizedReason = normalizeAdminReason(reason);
  const target = await getUserOrThrow(targetUserId);
  const activeAdminCount = await countActiveAdmins();

  assertCanSuspendTargetUser({
    actorUserId,
    targetUserId: target.id,
    targetRole: target.role,
    activeAdminCount,
  });

  if (target.status !== 'suspended') {
    await db
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, target.id));
  }

  await writeAuditLog({
    actorUserId,
    action: 'user_suspended',
    targetUserId: target.id,
    reason: normalizedReason,
  });
}

export async function unsuspendUser({
  actorUserId,
  targetUserId,
  reason = 'Unsuspended from admin panel.',
}: {
  actorUserId: string;
  targetUserId: string;
  reason?: unknown;
}) {
  await requireAdminActor(actorUserId);
  const normalizedReason =
    typeof reason === 'string' && reason.trim()
      ? normalizeAdminReason(reason)
      : 'Unsuspended from admin panel.';
  const target = await getUserOrThrow(targetUserId);

  if (target.status !== 'active') {
    await db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, target.id));
  }

  await writeAuditLog({
    actorUserId,
    action: 'user_unsuspended',
    targetUserId: target.id,
    reason: normalizedReason,
  });
}

export async function searchAdminCommunities({
  actorUserId,
  q,
  status,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: {
  actorUserId: string;
  q?: unknown;
  status: CommunityStatusFilter;
  limit?: number;
  offset?: number;
}) {
  await requireAdminActor(actorUserId);
  const query = normalizeAdminQuery(q);
  const where = and(
    eq(communities.status, status),
    query
      ? or(
          ilike(communities.name, `%${query}%`),
          ilike(communities.slug, `%${query}%`),
        )
      : undefined,
  );

  const safeLimit = clampLimit(limit);
  const safeOffset = Math.max(offset, 0);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        community: communities,
        creatorUsername: users.username,
        memberCount: count(communityMembers.id).mapWith(Number),
      })
      .from(communities)
      .innerJoin(users, eq(communities.creatorUserId, users.id))
      .leftJoin(
        communityMembers,
        eq(communities.id, communityMembers.communityId),
      )
      .where(where)
      .groupBy(communities.id, users.username)
      .orderBy(asc(communities.directoryRank), desc(communities.createdAt))
      .limit(safeLimit)
      .offset(safeOffset),
    db.select({ value: count() }).from(communities).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      ...row.community,
      creatorUsername: row.creatorUsername,
      memberCount: Number(row.memberCount),
    })),
    totalCount: Number(countRows[0]?.value ?? 0),
  };
}

export async function updateCommunityPlacement({
  actorUserId,
  communityId,
  input,
}: {
  actorUserId: string;
  communityId: string;
  input: {
    isFeatured: unknown;
    featuredRank: unknown;
    directoryRank: unknown;
  };
}) {
  await requireAdminActor(actorUserId);
  const placement = normalizeCommunityPlacementInput(input);
  const community = await getCommunityOrThrow(communityId);

  await db
    .update(communities)
    .set({
      isFeatured: placement.isFeatured,
      featuredRank: placement.featuredRank,
      directoryRank: placement.directoryRank,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, community.id));

  await writeAuditLog({
    actorUserId,
    action: 'community_placement_updated',
    targetCommunityId: community.id,
    reason: 'Updated community placement from admin panel.',
  });
}

export async function archiveCommunity({
  actorUserId,
  communityId,
  reason,
}: {
  actorUserId: string;
  communityId: string;
  reason: unknown;
}) {
  await requireAdminActor(actorUserId);
  const normalizedReason = normalizeAdminReason(reason);
  const community = await getCommunityOrThrow(communityId);

  if (community.status !== 'archived') {
    await db
      .update(communities)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(communities.id, community.id));
  }

  await writeAuditLog({
    actorUserId,
    action: 'community_archived',
    targetCommunityId: community.id,
    reason: normalizedReason,
  });
}

export async function restoreCommunity({
  actorUserId,
  communityId,
  reason = 'Restored from admin panel.',
}: {
  actorUserId: string;
  communityId: string;
  reason?: unknown;
}) {
  await requireAdminActor(actorUserId);
  const normalizedReason =
    typeof reason === 'string' && reason.trim()
      ? normalizeAdminReason(reason)
      : 'Restored from admin panel.';
  const community = await getCommunityOrThrow(communityId);

  if (community.status !== 'active') {
    await db
      .update(communities)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(communities.id, community.id));
  }

  await writeAuditLog({
    actorUserId,
    action: 'community_restored',
    targetCommunityId: community.id,
    reason: normalizedReason,
  });
}

async function getUserOrThrow(userId: string): Promise<User> {
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) throw new AdminNotFoundError('User not found.');
  return target;
}

async function getCommunityOrThrow(communityId: string) {
  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);
  if (!community) throw new AdminNotFoundError('Community not found.');
  return community;
}

async function countActiveAdmins(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.status, 'active')));
  return Number(row.value);
}

async function writeAuditLog({
  actorUserId,
  action,
  targetUserId = null,
  targetCommunityId = null,
  reason,
}: {
  actorUserId: string;
  action: AdminAuditAction;
  targetUserId?: string | null;
  targetCommunityId?: string | null;
  reason: string;
}) {
  await db.insert(adminAuditLogs).values({
    actorUserId,
    action,
    targetUserId,
    targetCommunityId,
    reason,
  });
}

function clampLimit(limit: number): number {
  return Math.min(Math.max(limit, 1), MAX_LIMIT);
}
