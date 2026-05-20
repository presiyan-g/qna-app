# Platform Admin Panel Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected platform admin panel for user lookup, admin promotion, user suspension, community archive/restore, and audit logging.

**Architecture:** Add a narrow Drizzle schema migration, then implement admin business logic in `src/services/admin` so pages and Server Actions stay thin. Enforce suspension in shared mutation services, not only in UI, so web Server Actions and REST endpoints behave consistently.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, TypeScript, Drizzle ORM, PostgreSQL, Node `tsx --test`, Tailwind CSS.

---

## File Structure

Create:

- `qna-web/src/db/schema/admin.ts` - `admin_audit_logs` Drizzle table.
- `qna-web/src/services/admin/errors.ts` - admin-specific safe errors.
- `qna-web/src/services/admin/policy.ts` - pure permission and invariant helpers.
- `qna-web/src/services/admin/policy.test.ts` - fast unit tests for admin invariants.
- `qna-web/src/services/admin/validation.ts` - reason and query validation helpers.
- `qna-web/src/services/admin/validation.test.ts` - validation unit tests.
- `qna-web/src/services/admin/admin.ts` - database-backed admin service functions.
- `qna-web/src/services/admin/index.ts` - public service exports.
- `qna-web/src/app/admin/actions.ts` - admin Server Actions.
- `qna-web/src/app/admin/_components/AdminShell.tsx` - shared admin page frame.
- `qna-web/src/app/admin/_components/AdminForms.tsx` - small client action forms.
- `qna-web/src/app/admin/page.tsx` - admin overview.
- `qna-web/src/app/admin/users/page.tsx` - user search page.
- `qna-web/src/app/admin/users/[id]/page.tsx` - user detail and actions.
- `qna-web/src/app/admin/communities/page.tsx` - community oversight page.
- Drizzle-generated migration files under `qna-web/drizzle/` and `qna-web/drizzle/meta/`.

Modify:

- `qna-web/src/db/schema/users.ts` - add `status: 'active' | 'suspended'`.
- `qna-web/src/db/schema/index.ts` - export admin schema.
- `qna-web/src/services/auth/users.ts` - select and expose status through existing user reads.
- `qna-web/src/services/auth/jwt.ts` - keep JWT role claim unchanged; do not add status to token.
- `qna-web/src/services/communities/communities.ts` - block suspended create/join, preserve active-only public reads.
- `qna-web/src/services/answers/answers.ts` - block suspended answer submission and suppress `canAnswer`.
- `qna-web/src/services/comments/comments.ts` - block suspended comment create/delete.
- `qna-web/src/services/broadcasts/broadcasts.ts` - block suspended broadcast mutations and suppress edit/delete affordances.
- `qna-web/src/services/questions/questions.ts` - block suspended creator question mutations.
- `qna-web/src/services/questions/dashboard.ts` - keep archived communities hidden and block suspended creators from dashboard access.
- `qna-web/src/app/actions/*.ts` and relevant REST routes only if service errors need a friendly response status.
- `qna-web/src/app/_components/landing/Nav.tsx` - add admin link for active admins if existing nav structure supports it.

Do not modify mobile app files in this slice. This plan changes web/admin behavior and shared web REST behavior only.

---

### Task 1: Schema For User Status And Audit Logs

**Files:**

- Modify: `qna-web/src/db/schema/users.ts`
- Create: `qna-web/src/db/schema/admin.ts`
- Modify: `qna-web/src/db/schema/index.ts`
- Generate: next Drizzle migration SQL under `qna-web/drizzle/`
- Generate: next Drizzle snapshot under `qna-web/drizzle/meta/`
- Modify: `qna-web/drizzle/meta/_journal.json`

- [ ] **Step 1: Update `users` schema with account status**

In `qna-web/src/db/schema/users.ts`, add `status` after `role`:

```ts
  status: text('status')
    .$type<'active' | 'suspended'>()
    .notNull()
    .default('active'),
```

Keep the existing `role` column unchanged so existing JWT role claims still decode.

- [ ] **Step 2: Add audit log schema**

Create `qna-web/src/db/schema/admin.ts`:

```ts
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
```

- [ ] **Step 3: Export admin schema**

Append to `qna-web/src/db/schema/index.ts`:

```ts
export * from './admin';
```

- [ ] **Step 4: Generate Drizzle migration**

Run:

```bash
npm run db:generate -w qna-web
```

Expected: Drizzle creates migration SQL for `users.status`, `admin_audit_logs`, indexes, and a new snapshot.

- [ ] **Step 5: Inspect generated migration**

Open the migration SQL file created by Step 4 and confirm it contains these operations:

```sql
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;
CREATE TABLE "admin_audit_logs" (
```

Also confirm it does not drop or recreate existing application tables.

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test -w qna-web
```

Expected: existing tests pass. If TypeScript fails because user fixtures do not include `status`, update only those fixtures with `status: 'active'`.

- [ ] **Step 7: Commit**

```bash
git add qna-web/src/db/schema/users.ts qna-web/src/db/schema/admin.ts qna-web/src/db/schema/index.ts qna-web/drizzle
git commit -m "feat(admin): add user status and audit log schema"
```

---

### Task 2: Admin Policy And Validation Tests

**Files:**

- Create: `qna-web/src/services/admin/errors.ts`
- Create: `qna-web/src/services/admin/policy.ts`
- Create: `qna-web/src/services/admin/policy.test.ts`
- Create: `qna-web/src/services/admin/validation.ts`
- Create: `qna-web/src/services/admin/validation.test.ts`
- Create: `qna-web/src/services/admin/index.ts`

- [ ] **Step 1: Write admin error classes**

Create `qna-web/src/services/admin/errors.ts`:

```ts
export class AdminPermissionError extends Error {
  constructor(message = 'Admin access required.') {
    super(message);
    this.name = 'AdminPermissionError';
  }
}

export class AdminInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminInvariantError';
  }
}

export class AdminNotFoundError extends Error {
  constructor(message = 'Admin target not found.') {
    super(message);
    this.name = 'AdminNotFoundError';
  }
}

export class AdminValidationError extends Error {
  constructor(
    public fieldErrors: Partial<Record<'reason' | 'q' | 'status', string>>,
  ) {
    super('Invalid admin input.');
    this.name = 'AdminValidationError';
  }
}

export class AccountSuspendedError extends Error {
  constructor(message = 'Your account is suspended for this action.') {
    super(message);
    this.name = 'AccountSuspendedError';
  }
}
```

- [ ] **Step 2: Write failing policy tests**

Create `qna-web/src/services/admin/policy.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AccountSuspendedError,
  AdminInvariantError,
  AdminPermissionError,
} from './errors';
import {
  assertActiveAdmin,
  assertCanSuspendTargetUser,
  assertUserCanMutate,
  canAccessAdmin,
} from './policy';

describe('canAccessAdmin', () => {
  it('allows only active platform admins', () => {
    assert.equal(canAccessAdmin({ role: 'admin', status: 'active' }), true);
    assert.equal(canAccessAdmin({ role: 'member', status: 'active' }), false);
    assert.equal(canAccessAdmin({ role: 'admin', status: 'suspended' }), false);
    assert.equal(canAccessAdmin(null), false);
  });
});

describe('assertActiveAdmin', () => {
  it('throws for members and suspended admins', () => {
    assert.doesNotThrow(() =>
      assertActiveAdmin({ role: 'admin', status: 'active' }),
    );
    assert.throws(
      () => assertActiveAdmin({ role: 'member', status: 'active' }),
      AdminPermissionError,
    );
    assert.throws(
      () => assertActiveAdmin({ role: 'admin', status: 'suspended' }),
      AdminPermissionError,
    );
  });
});

describe('assertUserCanMutate', () => {
  it('blocks suspended users from product mutations', () => {
    assert.doesNotThrow(() => assertUserCanMutate({ status: 'active' }));
    assert.throws(
      () => assertUserCanMutate({ status: 'suspended' }),
      AccountSuspendedError,
    );
  });
});

describe('assertCanSuspendTargetUser', () => {
  it('blocks self-suspension', () => {
    assert.throws(
      () =>
        assertCanSuspendTargetUser({
          actorUserId: 'u1',
          targetUserId: 'u1',
          targetRole: 'member',
          activeAdminCount: 2,
        }),
      AdminInvariantError,
    );
  });

  it('blocks suspending the last active admin', () => {
    assert.throws(
      () =>
        assertCanSuspendTargetUser({
          actorUserId: 'u1',
          targetUserId: 'u2',
          targetRole: 'admin',
          activeAdminCount: 1,
        }),
      AdminInvariantError,
    );
  });

  it('allows suspending a member or a non-last admin', () => {
    assert.doesNotThrow(() =>
      assertCanSuspendTargetUser({
        actorUserId: 'u1',
        targetUserId: 'u2',
        targetRole: 'member',
        activeAdminCount: 1,
      }),
    );
    assert.doesNotThrow(() =>
      assertCanSuspendTargetUser({
        actorUserId: 'u1',
        targetUserId: 'u2',
        targetRole: 'admin',
        activeAdminCount: 2,
      }),
    );
  });
});
```

- [ ] **Step 3: Write failing validation tests**

Create `qna-web/src/services/admin/validation.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdminValidationError } from './errors';
import {
  normalizeAdminQuery,
  normalizeAdminReason,
  normalizeCommunityStatusFilter,
} from './validation';

describe('normalizeAdminReason', () => {
  it('trims valid reasons', () => {
    assert.equal(normalizeAdminReason('  repeated spam  '), 'repeated spam');
  });

  it('rejects blank and very short reasons', () => {
    assert.throws(() => normalizeAdminReason(''), AdminValidationError);
    assert.throws(() => normalizeAdminReason('bad'), AdminValidationError);
  });
});

describe('normalizeAdminQuery', () => {
  it('trims search strings and returns null for blank input', () => {
    assert.equal(normalizeAdminQuery('  test@example.com  '), 'test@example.com');
    assert.equal(normalizeAdminQuery('   '), null);
    assert.equal(normalizeAdminQuery(null), null);
  });
});

describe('normalizeCommunityStatusFilter', () => {
  it('allows active and archived only', () => {
    assert.equal(normalizeCommunityStatusFilter('active'), 'active');
    assert.equal(normalizeCommunityStatusFilter('archived'), 'archived');
    assert.equal(normalizeCommunityStatusFilter(null), 'active');
    assert.throws(
      () => normalizeCommunityStatusFilter('deleted'),
      AdminValidationError,
    );
  });
});
```

- [ ] **Step 4: Run tests and verify they fail**

Run:

```bash
npm run test -w qna-web -- src/services/admin/policy.test.ts src/services/admin/validation.test.ts
```

Expected: FAIL because `policy.ts` and `validation.ts` do not exist.

- [ ] **Step 5: Implement policy helpers**

Create `qna-web/src/services/admin/policy.ts`:

```ts
import {
  AccountSuspendedError,
  AdminInvariantError,
  AdminPermissionError,
} from './errors';

export type PlatformRole = 'member' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export type AdminActor = {
  role: PlatformRole;
  status: AccountStatus;
} | null;

export function canAccessAdmin(actor: AdminActor): boolean {
  return actor?.role === 'admin' && actor.status === 'active';
}

export function assertActiveAdmin(actor: AdminActor): void {
  if (!canAccessAdmin(actor)) {
    throw new AdminPermissionError();
  }
}

export function assertUserCanMutate(user: { status: AccountStatus }): void {
  if (user.status === 'suspended') {
    throw new AccountSuspendedError();
  }
}

export function assertCanSuspendTargetUser({
  actorUserId,
  targetUserId,
  targetRole,
  activeAdminCount,
}: {
  actorUserId: string;
  targetUserId: string;
  targetRole: PlatformRole;
  activeAdminCount: number;
}): void {
  if (actorUserId === targetUserId) {
    throw new AdminInvariantError('You cannot suspend your own account.');
  }

  if (targetRole === 'admin' && activeAdminCount <= 1) {
    throw new AdminInvariantError(
      'At least one active admin must remain on the platform.',
    );
  }
}
```

- [ ] **Step 6: Implement validation helpers**

Create `qna-web/src/services/admin/validation.ts`:

```ts
import { AdminValidationError } from './errors';

export type CommunityStatusFilter = 'active' | 'archived';

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

export function normalizeAdminReason(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AdminValidationError({ reason: 'Enter a reason.' });
  }

  const reason = value.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    throw new AdminValidationError({
      reason: 'Enter a reason with at least 5 characters.',
    });
  }
  if (reason.length > MAX_REASON_LENGTH) {
    throw new AdminValidationError({
      reason: 'Keep the reason under 500 characters.',
    });
  }
  return reason;
}

export function normalizeAdminQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const query = value.trim();
  return query.length > 0 ? query : null;
}

export function normalizeCommunityStatusFilter(
  value: unknown,
): CommunityStatusFilter {
  if (value == null || value === '') return 'active';
  if (value === 'active' || value === 'archived') return value;
  throw new AdminValidationError({
    status: 'Choose active or archived communities.',
  });
}
```

- [ ] **Step 7: Export admin service surface**

Create `qna-web/src/services/admin/index.ts`:

```ts
export {
  AccountSuspendedError,
  AdminInvariantError,
  AdminNotFoundError,
  AdminPermissionError,
  AdminValidationError,
} from './errors';

export {
  assertActiveAdmin,
  assertCanSuspendTargetUser,
  assertUserCanMutate,
  canAccessAdmin,
  type AccountStatus,
  type PlatformRole,
} from './policy';

export {
  normalizeAdminQuery,
  normalizeAdminReason,
  normalizeCommunityStatusFilter,
  type CommunityStatusFilter,
} from './validation';
```

- [ ] **Step 8: Run tests and verify they pass**

Run:

```bash
npm run test -w qna-web -- src/services/admin/policy.test.ts src/services/admin/validation.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add qna-web/src/services/admin
git commit -m "feat(admin): add admin policy helpers"
```

---

### Task 3: Database-Backed Admin Service

**Files:**

- Modify: `qna-web/src/services/admin/admin.ts`
- Modify: `qna-web/src/services/admin/index.ts`
- Test manually with TypeScript build because the project does not currently have DB integration test harnesses.

- [ ] **Step 1: Add service types and imports**

Create `qna-web/src/services/admin/admin.ts` with this header:

```ts
import 'server-only';
import {
  and,
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
  type AccountStatus,
  type PlatformRole,
} from './policy';
import {
  normalizeAdminQuery,
  normalizeAdminReason,
  type CommunityStatusFilter,
} from './validation';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type AdminActor = Pick<User, 'id' | 'role' | 'status'>;
type AdminAuditAction = typeof adminAuditLogs.$inferInsert['action'];
```

- [ ] **Step 2: Add actor loader**

Append:

```ts
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
```

- [ ] **Step 3: Add overview and audit reads**

Append:

```ts
export async function getAdminOverview({ actorUserId }: { actorUserId: string }) {
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

  return db
    .select({
      log: adminAuditLogs,
      actorUsername: users.username,
    })
    .from(adminAuditLogs)
    .innerJoin(users, eq(adminAuditLogs.actorUserId, users.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(safeLimit)
    .offset(Math.max(offset, 0));
}
```

- [ ] **Step 4: Add admin user reads**

Append:

```ts
export async function searchAdminUsers({
  actorUserId,
  q,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: {
  actorUserId: string;
  q?: unknown;
  limit?: number;
  offset?: number;
}) {
  await requireAdminActor(actorUserId);
  const query = normalizeAdminQuery(q);
  const where = query
    ? or(ilike(users.email, `%${query}%`), ilike(users.username, `%${query}%`))
    : undefined;

  const rows = await db
    .select({
      user: users,
      membershipCount: count(communityMembers.id),
    })
    .from(users)
    .leftJoin(communityMembers, eq(users.id, communityMembers.userId))
    .where(where)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(clampLimit(limit))
    .offset(Math.max(offset, 0));

  return rows.map((row) => ({
    ...row.user,
    membershipCount: Number(row.membershipCount),
  }));
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
```

- [ ] **Step 5: Add user mutations with audit logs**

Append:

```ts
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
```

- [ ] **Step 6: Add community reads and mutations**

Append:

```ts
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

  const rows = await db
    .select({
      community: communities,
      creatorUsername: users.username,
      memberCount: count(communityMembers.id).mapWith(Number),
    })
    .from(communities)
    .innerJoin(users, eq(communities.creatorUserId, users.id))
    .leftJoin(communityMembers, eq(communities.id, communityMembers.communityId))
    .where(where)
    .groupBy(communities.id, users.username)
    .orderBy(desc(communities.createdAt))
    .limit(clampLimit(limit))
    .offset(Math.max(offset, 0));

  return rows.map((row) => ({
    ...row.community,
    creatorUsername: row.creatorUsername,
    memberCount: Number(row.memberCount),
  }));
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
```

- [ ] **Step 7: Add private helpers**

Append:

```ts
async function getUserOrThrow(userId: string): Promise<User> {
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
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
```

- [ ] **Step 8: Export database-backed functions**

Update `qna-web/src/services/admin/index.ts`:

```ts
export {
  archiveCommunity,
  getAdminOverview,
  getAdminUserDetail,
  listAdminAuditLogs,
  promoteUserToAdmin,
  requireAdminActor,
  restoreCommunity,
  searchAdminCommunities,
  searchAdminUsers,
  suspendUser,
  unsuspendUser,
} from './admin';
```

Keep existing exports in the file.

- [ ] **Step 9: Run type and test checks**

Run:

```bash
npm run test -w qna-web
npm run build -w qna-web
```

Expected: tests pass and Next build completes.

- [ ] **Step 10: Commit**

```bash
git add qna-web/src/services/admin
git commit -m "feat(admin): add admin service"
```

---

### Task 4: Enforce Suspended Read-Only Mode

**Files:**

- Modify: `qna-web/src/services/auth/users.ts`
- Modify: `qna-web/src/services/communities/communities.ts`
- Modify: `qna-web/src/services/answers/answers.ts`
- Modify: `qna-web/src/services/comments/comments.ts`
- Modify: `qna-web/src/services/broadcasts/broadcasts.ts`
- Modify: `qna-web/src/services/questions/questions.ts`
- Modify: `qna-web/src/services/questions/dashboard.ts`
- Modify REST route error mapping in the routes listed in Step 8.

- [ ] **Step 1: Add a small account-status loader**

In `qna-web/src/services/auth/users.ts`, append:

```ts
export async function findUserStatusById(
  id: string,
): Promise<'active' | 'suspended' | null> {
  const [row] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row?.status ?? null;
}
```

Update `qna-web/src/services/auth/index.ts` to export it:

```ts
export {
  createUser,
  findUserByEmail,
  findUserById,
  findUserStatusById,
} from './users';
```

- [ ] **Step 2: Create shared mutation assertion helper**

In each service mutation file, import:

```ts
import { assertUserCanMutate, AccountSuspendedError } from '@/services/admin';
import { findUserStatusById } from '@/services/auth';
```

Use this helper pattern near the top of each mutation:

```ts
const status = await findUserStatusById(userId);
if (!status) throw new AccountSuspendedError('User account is unavailable.');
assertUserCanMutate({ status });
```

For question services, the user id variable is `creatorUserId`; use that value.

- [ ] **Step 3: Guard community create and join**

In `createCommunity()` and `joinCommunity()` in `qna-web/src/services/communities/communities.ts`, run the status assertion before inserting or joining.

Expected behavior:

- suspended user creating a community throws `AccountSuspendedError`
- suspended user joining a community throws `AccountSuspendedError`
- public community list remains readable

- [ ] **Step 4: Guard answer submission and suppress canAnswer**

In `submitQuestionAnswer()` in `qna-web/src/services/answers/answers.ts`, assert status before loading or inserting an answer.

In `getQuestionDetail()`, load status and pass an `isSuspended` boolean into `toQuestionDetail`. Change:

```ts
const canAnswer = !isScheduled && !hasAnswer;
```

to:

```ts
const canAnswer = !isSuspended && !isScheduled && !hasAnswer;
```

Expected behavior: suspended users can read question detail but see `canAnswer: false` and POST answer fails.

- [ ] **Step 5: Guard comments**

In `postComment()` and `softDeleteComment()` in `qna-web/src/services/comments/comments.ts`, assert status before validating or updating comments.

Expected behavior: suspended users can list comments when normal read rules allow it, but cannot post or delete.

- [ ] **Step 6: Guard broadcasts**

In `createBroadcastPost()`, `updateBroadcastPost()`, and `softDeleteBroadcastPost()` in `qna-web/src/services/broadcasts/broadcasts.ts`, assert status before validation/update.

In `toBroadcastResource()`, ensure a suspended viewer does not receive `canEdit` or `canDelete`. The simple implementation is to pass `viewer.status` through `BroadcastViewer` and require `viewer.status !== 'suspended'` before calculating edit/delete.

Expected behavior: suspended creators can read broadcasts but cannot mutate them, and UI affordances disappear.

- [ ] **Step 7: Guard question management**

In `createQuestion()`, `createQuestionDraft()`, `updateUnpublishedQuestion()`, `scheduleQuestion()`, and `softDeleteUnpublishedQuestion()` in `qna-web/src/services/questions/questions.ts`, assert `creatorUserId` is active before loading the community or writing.

In `getCreatorCommunityDashboard()` and `listCreatorCommunitiesDashboard()` in `qna-web/src/services/questions/dashboard.ts`, return no dashboard access for suspended users:

```ts
const status = await findUserStatusById(userId);
if (status !== 'active') return [];
```

For `getCreatorCommunityDashboard()`, return `null` when status is not active.

- [ ] **Step 8: Map suspension errors in action/API boundaries**

Where an action already catches permission errors, include `AccountSuspendedError` and return the same form-level error style.

For REST routes that call guarded services, map `AccountSuspendedError` to status `403`:

```ts
if (err instanceof AccountSuspendedError) {
  return NextResponse.json({ error: err.message }, { status: 403 });
}
```

At minimum update:

- `qna-web/src/app/api/communities/route.ts`
- `qna-web/src/app/api/communities/[slug]/join/route.ts`
- `qna-web/src/app/api/communities/[slug]/questions/route.ts`
- `qna-web/src/app/api/communities/[slug]/questions/[id]/answers/route.ts`
- `qna-web/src/app/api/communities/[slug]/questions/[id]/comments/route.ts`
- `qna-web/src/app/api/communities/[slug]/questions/[id]/comments/[commentId]/route.ts`
- `qna-web/src/app/api/communities/[slug]/broadcasts/route.ts`
- `qna-web/src/app/api/communities/[slug]/broadcasts/[postId]/route.ts`

- [ ] **Step 9: Run focused tests and build**

Run:

```bash
npm run test -w qna-web
npm run build -w qna-web
```

Expected: tests pass and build completes.

- [ ] **Step 10: Commit**

```bash
git add qna-web/src/services qna-web/src/app/actions qna-web/src/app/api
git commit -m "feat(admin): enforce suspended account read-only mode"
```

---

### Task 5: Admin Server Actions

**Files:**

- Create: `qna-web/src/app/admin/actions.ts`

- [ ] **Step 1: Create action state types**

Create `qna-web/src/app/admin/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import {
  AdminInvariantError,
  AdminNotFoundError,
  AdminPermissionError,
  AdminValidationError,
  archiveCommunity,
  promoteUserToAdmin,
  restoreCommunity,
  suspendUser,
  unsuspendUser,
} from '@/services/admin';

export type AdminActionState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<'reason', string>>;
};

const INITIAL_OK: AdminActionState = { ok: true };
```

- [ ] **Step 2: Add user actions**

Append:

```ts
export async function promoteUserToAdminAction(
  targetUserId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  await promoteUserToAdmin({ actorUserId: session.sub, targetUserId });
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function suspendUserAction(
  targetUserId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  try {
    await suspendUser({
      actorUserId: session.sub,
      targetUserId,
      reason: formData.get('reason'),
    });
  } catch (err) {
    return toAdminActionError(err);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${targetUserId}`);
  return INITIAL_OK;
}

export async function unsuspendUserAction(
  targetUserId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  await unsuspendUser({ actorUserId: session.sub, targetUserId });
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${targetUserId}`);
}
```

- [ ] **Step 3: Add community actions**

Append:

```ts
export async function archiveCommunityAction(
  communityId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  try {
    await archiveCommunity({
      actorUserId: session.sub,
      communityId,
      reason: formData.get('reason'),
    });
  } catch (err) {
    return toAdminActionError(err);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/communities');
  revalidatePath('/communities');
  return INITIAL_OK;
}

export async function restoreCommunityAction(
  communityId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  await restoreCommunity({ actorUserId: session.sub, communityId });
  revalidatePath('/admin');
  revalidatePath('/admin/communities');
  revalidatePath('/communities');
}
```

- [ ] **Step 4: Add action error mapper**

Append:

```ts
function toAdminActionError(err: unknown): AdminActionState {
  if (err instanceof AdminValidationError) {
    return { ok: false, fieldErrors: err.fieldErrors };
  }
  if (
    err instanceof AdminInvariantError ||
    err instanceof AdminNotFoundError ||
    err instanceof AdminPermissionError
  ) {
    return { ok: false, formError: err.message };
  }
  throw err;
}
```

- [ ] **Step 5: Run build**

Run:

```bash
npm run build -w qna-web
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add qna-web/src/app/admin/actions.ts
git commit -m "feat(admin): add admin server actions"
```

---

### Task 6: Admin Pages And Forms

**Files:**

- Create: `qna-web/src/app/admin/_components/AdminShell.tsx`
- Create: `qna-web/src/app/admin/_components/AdminForms.tsx`
- Create: `qna-web/src/app/admin/page.tsx`
- Create: `qna-web/src/app/admin/users/page.tsx`
- Create: `qna-web/src/app/admin/users/[id]/page.tsx`
- Create: `qna-web/src/app/admin/communities/page.tsx`
- Modify: `qna-web/src/app/_components/landing/Nav.tsx`

- [ ] **Step 1: Add shared admin shell**

Create `qna-web/src/app/admin/_components/AdminShell.tsx`:

```tsx
import Link from 'next/link';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';

export function AdminShell({
  title,
  eyebrow = 'Admin',
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[34px] font-bold leading-tight md:text-[48px]">
            {title}
          </h1>
          <nav className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <Link className="rounded-lg border border-line bg-card px-3 py-2" href="/admin">
              Overview
            </Link>
            <Link className="rounded-lg border border-line bg-card px-3 py-2" href="/admin/users">
              Users
            </Link>
            <Link className="rounded-lg border border-line bg-card px-3 py-2" href="/admin/communities">
              Communities
            </Link>
          </nav>
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Add client forms**

Create `qna-web/src/app/admin/_components/AdminForms.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import {
  archiveCommunityAction,
  suspendUserAction,
  type AdminActionState,
} from '../actions';

const initialState: AdminActionState = { ok: false };

export function SuspendUserForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(
    suspendUserAction.bind(null, userId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-line bg-card p-4">
      <label className="block text-sm font-bold" htmlFor="suspend-reason">
        Suspension reason
      </label>
      <textarea
        id="suspend-reason"
        name="reason"
        className="min-h-24 w-full rounded-lg border border-line bg-paper p-3 text-sm"
        required
      />
      {state.fieldErrors?.reason ? (
        <p className="text-sm font-bold text-red-700">{state.fieldErrors.reason}</p>
      ) : null}
      {state.formError ? (
        <p className="text-sm font-bold text-red-700">{state.formError}</p>
      ) : null}
      <button
        className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        Suspend user
      </button>
    </form>
  );
}

export function ArchiveCommunityForm({ communityId }: { communityId: string }) {
  const [state, formAction, isPending] = useActionState(
    archiveCommunityAction.bind(null, communityId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-line bg-card p-4">
      <label className="block text-sm font-bold" htmlFor={`archive-reason-${communityId}`}>
        Archive reason
      </label>
      <textarea
        id={`archive-reason-${communityId}`}
        name="reason"
        className="min-h-20 w-full rounded-lg border border-line bg-paper p-3 text-sm"
        required
      />
      {state.fieldErrors?.reason ? (
        <p className="text-sm font-bold text-red-700">{state.fieldErrors.reason}</p>
      ) : null}
      {state.formError ? (
        <p className="text-sm font-bold text-red-700">{state.formError}</p>
      ) : null}
      <button
        className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        Archive community
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Add overview page**

Create `qna-web/src/app/admin/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getAdminOverview, listAdminAuditLogs } from '@/services/admin';
import { AdminShell } from './_components/AdminShell';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  const [overview, logs] = await Promise.all([
    getAdminOverview({ actorUserId: session.sub }),
    listAdminAuditLogs({ actorUserId: session.sub, limit: 10 }),
  ]);

  return (
    <AdminShell title="Platform admin">
      <div className="grid gap-3 sm:grid-cols-4">
        <Summary label="Users" value={overview.totalUsers} />
        <Summary label="Suspended" value={overview.suspendedUsers} />
        <Summary label="Active communities" value={overview.activeCommunities} />
        <Summary label="Archived" value={overview.archivedCommunities} />
      </div>
      <section className="mt-8 rounded-lg border border-line bg-card p-5">
        <h2 className="text-xl font-bold">Recent admin actions</h2>
        <div className="mt-4 space-y-3">
          {logs.map(({ log, actorUsername }) => (
            <div key={log.id} className="border-t border-line pt-3 text-sm first:border-t-0 first:pt-0">
              <p className="font-bold">{log.action.replaceAll('_', ' ')}</p>
              <p className="text-ink/70">
                {actorUsername} · {log.createdAt.toLocaleString('en-US')} · {log.reason}
              </p>
            </div>
          ))}
          {logs.length === 0 ? <p className="text-sm text-ink/70">No admin actions yet.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString('en-US')}</p>
    </div>
  );
}
```

- [ ] **Step 4: Add user search page**

Create `qna-web/src/app/admin/users/page.tsx` with a server-rendered search form, results, and links to detail pages. Use `searchAdminUsers({ actorUserId: session.sub, q: searchParams.q })`, redirect anonymous users to `/login?next=/admin/users`, and render each result with username, email, role, status, joined date, membership count, and a `/admin/users/${user.id}` link.

- [ ] **Step 5: Add user detail page**

Create `qna-web/src/app/admin/users/[id]/page.tsx` with `getAdminUserDetail()`. Render user fields and memberships. Wire:

```tsx
<form action={promoteUserToAdminAction.bind(null, detail.user.id)}>
  <button type="submit">Promote to admin</button>
</form>
```

Render `<SuspendUserForm userId={detail.user.id} />` when status is active. Render an unsuspend form bound to `unsuspendUserAction` when status is suspended.

- [ ] **Step 6: Add community oversight page**

Create `qna-web/src/app/admin/communities/page.tsx` with search/filter form. Use:

```ts
const status = normalizeCommunityStatusFilter(searchParams.status);
const communities = await searchAdminCommunities({
  actorUserId: session.sub,
  q: searchParams.q,
  status,
});
```

Render active rows with `<ArchiveCommunityForm communityId={community.id} />`. Render archived rows with a restore form bound to `restoreCommunityAction`.

- [ ] **Step 7: Add admin nav link**

In `qna-web/src/app/_components/landing/Nav.tsx`, if the current session role is `admin`, add an `Admin` link to `/admin`. Do not show the link for members.

- [ ] **Step 8: Run build**

Run:

```bash
npm run build -w qna-web
```

Expected: build succeeds. If server components complain about non-serializable form bindings, move those forms into `AdminForms.tsx`.

- [ ] **Step 9: Commit**

```bash
git add qna-web/src/app/admin qna-web/src/app/_components/landing/Nav.tsx
git commit -m "feat(admin): add admin panel pages"
```

---

### Task 7: Archived Community Visibility Audit

**Files:**

- Inspect: `qna-web/src/services/communities/communities.ts`, `qna-web/src/services/profiles/profiles.ts`, `qna-web/src/services/leaderboard/leaderboard.ts`, `qna-web/src/services/broadcasts/broadcasts.ts`, `qna-web/src/services/answers/answers.ts`, `qna-web/src/services/questions/questions.ts`, `qna-web/src/services/questions/dashboard.ts`.
- Modify every inspected non-admin read that can expose archived communities.

- [ ] **Step 1: Search for community reads without active filter**

Run:

```bash
rg -n "from\\(communities\\)|innerJoin\\(communities|leftJoin\\(communities|getCommunityBySlug|communities\\.status" qna-web/src
```

Expected: list all community read sites.

- [ ] **Step 2: Confirm public read services hide archived communities**

For each public/member/creator read, confirm one of these is true:

- it calls `getCommunityBySlug()`, which filters `communities.status = 'active'`
- it explicitly filters `eq(communities.status, 'active')`
- it is an admin service under `src/services/admin`

If a non-admin read lacks an active filter, add `eq(communities.status, 'active')` to its Drizzle `where`.

- [ ] **Step 3: Confirm profile memberships hide archived communities**

Inspect `qna-web/src/services/profiles/profiles.ts` and ensure membership query includes:

```ts
eq(communities.status, 'active')
```

Expected: archived communities do not appear on public profile pages.

- [ ] **Step 4: Confirm creator dashboard hides archived communities**

Inspect `qna-web/src/services/questions/dashboard.ts` and ensure creator community load includes:

```ts
eq(communities.status, 'active')
```

Expected: archived communities do not appear in creator dashboard.

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm run test -w qna-web
npm run build -w qna-web
```

Expected: pass.

- [ ] **Step 6: Commit if changes were needed**

When every inspected read already filters archived communities, run:

```bash
git status --short
```

Expected: no files changed for this task.

When one or more archived-community leaks were fixed, run:

```bash
git add qna-web/src/services
git commit -m "fix(admin): hide archived communities from product reads"
```

---

### Task 8: Final Verification

**Files:**

- No planned code changes. Fix any verification failure before completing this task.

- [ ] **Step 1: Run the full automated checks**

Run:

```bash
npm run test -w qna-web
npm run build -w qna-web
```

Expected: tests pass and build succeeds.

- [ ] **Step 2: Apply local migration if using a local database**

Run only when `DATABASE_URL` points at the intended local/dev database:

```bash
npm run db:migrate -w qna-web
```

Expected: migration applies `users.status` and `admin_audit_logs`.

- [ ] **Step 3: Start web dev server**

Run:

```bash
npm run dev -w qna-web -- --port 3001
```

Expected: Next.js starts on `http://localhost:3001`.

- [ ] **Step 4: Manual admin verification**

In the browser:

- Log in as an active admin.
- Visit `http://localhost:3001/admin`.
- Search for a user by email or username.
- Promote a member to admin.
- Suspend a non-admin user with a reason.
- Confirm an audit log row appears on `/admin`.
- Open an active community on `/admin/communities`.
- Archive it with a reason.
- Confirm it disappears from `/communities`.
- Restore it from archived filter.
- Confirm it appears again.

- [ ] **Step 5: Manual suspended-user verification**

In the browser or REST client:

- Log in as the suspended user.
- Confirm login succeeds.
- Attempt to join a community.
- Attempt to answer a question.
- Attempt to post a comment.
- If the user is a creator, attempt a question or broadcast mutation.

Expected: read access works and each mutation returns a friendly forbidden/form error.

- [ ] **Step 6: Final git status**

Run:

```bash
git status --short
```

Expected: no unstaged implementation changes except intentional local logs or unrelated user changes that existed before the plan.
