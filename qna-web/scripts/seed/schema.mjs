// Mirror of qna-web/src/db/schema/* for use by the plain-Node seed scripts.
// The .ts schema files import 'server-only' and assume the Next.js runtime,
// so they can't be imported by these plain `node` scripts directly.
//
// Intentionally omitted from this mirror:
//   - Foreign-key constraints (the live DB enforces them; the seed inserts
//     parent rows before children, so we don't need them client-side).
//   - Non-unique indexes (the seed only INSERTs; query planning is irrelevant).
//   - Default values and generated columns (the seed always sets every column
//     it cares about explicitly).
//
// Keep in sync when migrations change unique constraints or required column
// shapes. Diff against the .ts originals after any DB schema change.

import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['member', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);
export const communityCadenceEnum = pgEnum('community_cadence', ['daily', 'weekly', 'custom']);
export const communityStatusEnum = pgEnum('community_status', ['active', 'archived']);
export const communityMemberRoleEnum = pgEnum('community_member_role', ['member', 'creator']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const communityCategories = pgTable(
  'community_categories',
  {
    id: uuid('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('community_categories_slug_unique').on(table.slug)],
);

export const communities = pgTable(
  'communities',
  {
    id: uuid('id').primaryKey(),
    creatorUserId: uuid('creator_user_id').notNull(),
    categoryId: uuid('category_id'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    emoji: text('emoji').notNull(),
    coverImageUrl: text('cover_image_url'),
    cadence: communityCadenceEnum('cadence').notNull(),
    status: communityStatusEnum('status').notNull(),
    isFeatured: boolean('is_featured').notNull(),
    featuredRank: integer('featured_rank'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('communities_slug_unique').on(table.slug)],
);

export const communityMembers = pgTable(
  'community_members',
  {
    id: uuid('id').primaryKey(),
    communityId: uuid('community_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: communityMemberRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('community_members_community_user_unique').on(
      table.communityId,
      table.userId,
    ),
  ],
);

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey(),
  communityId: uuid('community_id').notNull(),
  creatorUserId: uuid('creator_user_id').notNull(),
  prompt: text('prompt').notNull(),
  explanation: text('explanation').notNull(),
  imageUrl: text('image_url'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  closesAt: timestamp('closes_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  timeZone: text('time_zone').notNull(),
  points: integer('points').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const questionChoices = pgTable(
  'question_choices',
  {
    id: uuid('id').primaryKey(),
    questionId: uuid('question_id').notNull(),
    label: text('label').notNull(),
    imageUrl: text('image_url'),
    isCorrect: boolean('is_correct').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('question_choices_question_position_unique').on(
      table.questionId,
      table.position,
    ),
  ],
);

export const answers = pgTable(
  'answers',
  {
    id: uuid('id').primaryKey(),
    questionId: uuid('question_id').notNull(),
    userId: uuid('user_id').notNull(),
    selectedChoiceId: uuid('selected_choice_id').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    isLate: boolean('is_late').notNull(),
    pointsAwarded: integer('points_awarded').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('answers_question_user_unique').on(
      table.questionId,
      table.userId,
    ),
  ],
);

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey(),
  questionId: uuid('question_id').notNull(),
  authorUserId: uuid('author_user_id').notNull(),
  parentCommentId: uuid('parent_comment_id'),
  body: text('body').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const broadcastPosts = pgTable('broadcast_posts', {
  id: uuid('id').primaryKey(),
  communityId: uuid('community_id').notNull(),
  authorUserId: uuid('author_user_id').notNull(),
  body: text('body').notNull(),
  imageUrl: text('image_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
