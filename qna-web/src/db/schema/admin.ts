import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: text('action')
      .$type<
        | 'user_promoted_to_admin'
        | 'user_suspended'
        | 'user_unsuspended'
        | 'community_archived'
        | 'community_placement_updated'
        | 'community_restored'
      >()
      .notNull(),
    targetUserId: uuid('target_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetCommunityId: uuid('target_community_id').references(
      () => communities.id,
      { onDelete: 'set null' },
    ),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('admin_audit_logs_actor_user_id_idx').on(table.actorUserId),
    index('admin_audit_logs_target_user_id_idx').on(table.targetUserId),
    index('admin_audit_logs_target_community_id_idx').on(
      table.targetCommunityId,
    ),
    index('admin_audit_logs_created_at_idx').on(table.createdAt),
  ],
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
