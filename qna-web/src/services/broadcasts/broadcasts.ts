import 'server-only';
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { broadcastPosts, type BroadcastPost } from '@/db/schema/broadcasts';
import { users } from '@/db/schema/users';
import { getCommunityBySlug, type CommunityRole } from '@/services/communities';
import {
  decodeBroadcastCursor,
  encodeBroadcastCursor,
  normalizeBroadcastLimit,
} from './cursor';
import { BroadcastNotFoundError, BroadcastPermissionError } from './errors';
import {
  canCreateBroadcastPost,
  canEditBroadcastPost,
  canSoftDeleteBroadcastPost,
} from './policy';
import { validateBroadcastInput } from './validation';

export type BroadcastPostResource = {
  id: string;
  communityId: string;
  author: { id: string; username: string };
  body: string;
  imageUrl: string | null;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  canEdit: boolean;
  canDelete: boolean;
};

export type BroadcastPage = {
  items: BroadcastPostResource[];
  pagination: { limit: number; nextCursor: string | null };
};

type BroadcastRow = {
  post: BroadcastPost;
  authorUsername: string;
};

type BroadcastViewer = {
  userId: string | null;
  communityRole: CommunityRole | null;
};

export async function listCommunityBroadcasts({
  slug,
  limit,
  cursor,
  viewerUserId = null,
}: {
  slug: string;
  limit?: number;
  cursor?: string | null;
  viewerUserId?: string | null;
}): Promise<BroadcastPage> {
  const community = await getCommunityBySlug(slug, viewerUserId);
  const safeLimit = normalizeBroadcastLimit(limit ? String(limit) : null);
  if (!community) {
    throw new BroadcastNotFoundError();
  }

  const decodedCursor = cursor ? decodeBroadcastCursor(cursor) : null;
  const rows = await db
    .select({
      post: broadcastPosts,
      authorUsername: users.username,
    })
    .from(broadcastPosts)
    .innerJoin(users, eq(broadcastPosts.authorUserId, users.id))
    .where(
      and(
        eq(broadcastPosts.communityId, community.id),
        isNull(broadcastPosts.deletedAt),
        decodedCursor
          ? or(
              lt(broadcastPosts.publishedAt, decodedCursor.publishedAt),
              and(
                eq(broadcastPosts.publishedAt, decodedCursor.publishedAt),
                lt(broadcastPosts.id, decodedCursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(broadcastPosts.publishedAt), desc(broadcastPosts.id))
    .limit(safeLimit + 1);

  const pageRows = rows.slice(0, safeLimit);
  const extra = rows[safeLimit]?.post;

  return {
    items: pageRows.map((row) =>
      toBroadcastResource(row, {
        userId: viewerUserId,
        communityRole: community.currentUserRole,
      }),
    ),
    pagination: {
      limit: safeLimit,
      nextCursor: extra
        ? encodeBroadcastCursor({
            publishedAt: pageRows[pageRows.length - 1].post.publishedAt,
            id: pageRows[pageRows.length - 1].post.id,
          })
        : null,
    },
  };
}

export async function getLatestCommunityBroadcast({
  slug,
  viewerUserId = null,
}: {
  slug: string;
  viewerUserId?: string | null;
}): Promise<BroadcastPostResource | null> {
  const community = await getCommunityBySlug(slug, viewerUserId);
  if (!community) return null;

  const [row] = await db
    .select({
      post: broadcastPosts,
      authorUsername: users.username,
    })
    .from(broadcastPosts)
    .innerJoin(users, eq(broadcastPosts.authorUserId, users.id))
    .where(
      and(
        eq(broadcastPosts.communityId, community.id),
        isNull(broadcastPosts.deletedAt),
      ),
    )
    .orderBy(desc(broadcastPosts.publishedAt), desc(broadcastPosts.id))
    .limit(1);

  return row
    ? toBroadcastResource(row, {
        userId: viewerUserId,
        communityRole: community.currentUserRole,
      })
    : null;
}

export async function getCommunityBroadcast({
  slug,
  postId,
  viewerUserId = null,
}: {
  slug: string;
  postId: string;
  viewerUserId?: string | null;
}): Promise<BroadcastPostResource | null> {
  const community = await getCommunityBySlug(slug, viewerUserId);
  if (!community) return null;

  const row = await getBroadcastRow({
    communityId: community.id,
    postId,
    includeDeleted: false,
  });

  return row
    ? toBroadcastResource(row, {
        userId: viewerUserId,
        communityRole: community.currentUserRole,
      })
    : null;
}

export async function createBroadcastPost({
  slug,
  userId,
  body,
  imageUrl,
  now = new Date(),
}: {
  slug: string;
  userId: string;
  body: unknown;
  imageUrl?: unknown;
  now?: Date;
}): Promise<BroadcastPostResource> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new BroadcastNotFoundError();
  if (!canCreateBroadcastPost(community.currentUserRole)) {
    throw new BroadcastPermissionError();
  }

  const input = validateBroadcastInput({ body, imageUrl });
  const [created] = await db
    .insert(broadcastPosts)
    .values({
      communityId: community.id,
      authorUserId: userId,
      body: input.body,
      imageUrl: input.imageUrl,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const row = await getBroadcastRow({
    communityId: community.id,
    postId: created.id,
    includeDeleted: false,
  });
  if (!row) throw new BroadcastNotFoundError();

  return toBroadcastResource(row, {
    userId,
    communityRole: community.currentUserRole,
  });
}

export async function updateBroadcastPost({
  slug,
  postId,
  userId,
  body,
  imageUrl,
  now = new Date(),
}: {
  slug: string;
  postId: string;
  userId: string;
  body: unknown;
  imageUrl?: unknown;
  now?: Date;
}): Promise<BroadcastPostResource> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new BroadcastNotFoundError();

  const row = await getBroadcastRow({
    communityId: community.id,
    postId,
    includeDeleted: false,
  });
  if (!row) throw new BroadcastNotFoundError();

  if (
    !canEditBroadcastPost({
      authorUserId: row.post.authorUserId,
      userId,
      communityRole: community.currentUserRole,
    })
  ) {
    throw new BroadcastPermissionError(
      'Only the broadcast author can edit this post.',
    );
  }

  const input = validateBroadcastInput({ body, imageUrl });
  await db
    .update(broadcastPosts)
    .set({
      body: input.body,
      imageUrl: input.imageUrl,
      updatedAt: now,
    })
    .where(eq(broadcastPosts.id, row.post.id));

  const updated = await getBroadcastRow({
    communityId: community.id,
    postId,
    includeDeleted: false,
  });
  if (!updated) throw new BroadcastNotFoundError();

  return toBroadcastResource(updated, {
    userId,
    communityRole: community.currentUserRole,
  });
}

export async function softDeleteBroadcastPost({
  slug,
  postId,
  userId,
  now = new Date(),
}: {
  slug: string;
  postId: string;
  userId: string;
  now?: Date;
}): Promise<void> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new BroadcastNotFoundError();

  const row = await getBroadcastRow({
    communityId: community.id,
    postId,
    includeDeleted: true,
  });
  if (!row) throw new BroadcastNotFoundError();

  if (
    !canSoftDeleteBroadcastPost({
      authorUserId: row.post.authorUserId,
      userId,
      communityRole: community.currentUserRole,
    })
  ) {
    throw new BroadcastPermissionError();
  }

  if (row.post.deletedAt) return;

  await db
    .update(broadcastPosts)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(broadcastPosts.id, row.post.id));
}

async function getBroadcastRow({
  communityId,
  postId,
  includeDeleted,
}: {
  communityId: string;
  postId: string;
  includeDeleted: boolean;
}): Promise<BroadcastRow | null> {
  const [row] = await db
    .select({
      post: broadcastPosts,
      authorUsername: users.username,
    })
    .from(broadcastPosts)
    .innerJoin(users, eq(broadcastPosts.authorUserId, users.id))
    .where(
      and(
        eq(broadcastPosts.id, postId),
        eq(broadcastPosts.communityId, communityId),
        includeDeleted ? undefined : isNull(broadcastPosts.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

function toBroadcastResource(
  row: BroadcastRow,
  viewer: BroadcastViewer,
): BroadcastPostResource {
  return {
    id: row.post.id,
    communityId: row.post.communityId,
    author: {
      id: row.post.authorUserId,
      username: row.authorUsername,
    },
    body: row.post.body,
    imageUrl: row.post.imageUrl,
    publishedAt: row.post.publishedAt,
    createdAt: row.post.createdAt,
    updatedAt: row.post.updatedAt,
    canEdit: viewer.userId
      ? canEditBroadcastPost({
          authorUserId: row.post.authorUserId,
          userId: viewer.userId,
          communityRole: viewer.communityRole,
        })
      : false,
    canDelete: viewer.userId
      ? canSoftDeleteBroadcastPost({
          authorUserId: row.post.authorUserId,
          userId: viewer.userId,
          communityRole: viewer.communityRole,
        })
      : false,
  };
}
