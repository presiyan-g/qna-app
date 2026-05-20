import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const broadcastPosts = pgTable(
  'broadcast_posts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    imageUrl: text('image_url'),
    publishedAt: timestamp('published_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('broadcast_posts_community_published_idx').on(
      table.communityId,
      table.publishedAt.desc(),
      table.id.desc(),
    ),
    index('broadcast_posts_author_user_id_idx').on(table.authorUserId),
    index('broadcast_posts_deleted_at_idx').on(table.deletedAt),
  ],
);

export type BroadcastPost = typeof broadcastPosts.$inferSelect;
export type NewBroadcastPost = typeof broadcastPosts.$inferInsert;
