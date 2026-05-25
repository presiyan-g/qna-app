import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const communityCadenceEnum = pgEnum('community_cadence', [
  'daily',
  'weekly',
  'custom',
]);
export const communityStatusEnum = pgEnum('community_status', [
  'active',
  'archived',
]);
export const communityMemberRoleEnum = pgEnum('community_member_role', [
  'member',
  'creator',
]);

export const communityCategories = pgTable(
  'community_categories',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('community_categories_slug_unique').on(table.slug),
    index('community_categories_name_idx').on(table.name),
  ],
);

export const communities = pgTable(
  'communities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id').references(() => communityCategories.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    emoji: text('emoji').notNull().default(''),
    coverImageUrl: text('cover_image_url'),
    cadence: communityCadenceEnum('cadence').notNull().default('daily'),
    status: communityStatusEnum('status').notNull().default('active'),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredRank: integer('featured_rank'),
    directoryRank: integer('directory_rank'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('communities_slug_unique').on(table.slug),
    index('communities_creator_user_id_idx').on(table.creatorUserId),
    index('communities_category_id_idx').on(table.categoryId),
    index('communities_created_at_idx').on(table.createdAt),
    index('communities_featured_idx').on(table.isFeatured, table.featuredRank),
    index('communities_directory_rank_idx').on(table.directoryRank),
  ],
);

export const communityMembers = pgTable(
  'community_members',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: communityMemberRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenBroadcastsAt: timestamp('last_seen_broadcasts_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('community_members_community_user_unique').on(
      table.communityId,
      table.userId,
    ),
    index('community_members_user_id_idx').on(table.userId),
    index('community_members_community_id_idx').on(table.communityId),
  ],
);

export type CommunityCategory = typeof communityCategories.$inferSelect;
export type NewCommunityCategory = typeof communityCategories.$inferInsert;
export type Community = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type NewCommunityMember = typeof communityMembers.$inferInsert;
