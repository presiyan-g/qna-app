# Admin moderation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let platform admins (`users.role = 'admin'`) enter any community — including communities they have not joined — and moderate user-generated content: edit/delete questions, delete broadcasts, delete comments. Admins never create content on a creator's or member's behalf.

**Architecture:** Approach A — thread an optional `platformRole?: 'member' | 'admin'` parameter through the existing service/policy functions, defaulting to `'member'`. Server actions and page loaders read `session.role` and forward it. UI pages add small admin-aware conditionals and drop non-member redirects for admins. No new abstractions, no new tables. Mirrors the existing pattern already used by `updateCommunity`/`archiveCommunity`.

**Tech Stack:** Next.js App Router (Next 16, React 19), Drizzle ORM, Postgres (Neon), `node:test` via tsx for unit tests, Tailwind for UI. Test runner: `npm run test -w qna-web`. No DB-integration tests exist in this codebase — service-layer correctness for the admin paths is covered via pure-function policy tests plus a manual browser verification pass.

**Commits:** The user manages commits themselves. Do not run `git commit` or `git push` in any task unless the user explicitly asks.

**Reference spec:** [docs/superpowers/specs/2026-05-24-admin-moderation-design.md](../specs/2026-05-24-admin-moderation-design.md).

---

## File map

### Modified — service policies (Phase A)
- `qna-web/src/services/comments/policy.ts`
- `qna-web/src/services/comments/policy.test.ts`
- `qna-web/src/services/broadcasts/policy.ts`
- `qna-web/src/services/broadcasts/policy.test.ts`
- `qna-web/src/services/questions/management-policy.ts`
- `qna-web/src/services/questions/management-policy.test.ts`

### Modified — service implementations (Phase B)
- `qna-web/src/services/comments/comments.ts`
- `qna-web/src/services/comments/thread.ts`
- `qna-web/src/services/broadcasts/broadcasts.ts`
- `qna-web/src/services/questions/questions.ts` (rename `softDeleteUnpublishedQuestion` → `softDeleteQuestion`)
- `qna-web/src/services/questions/index.ts` (export the renamed function)
- `qna-web/src/services/questions/dashboard.ts`
- `qna-web/src/services/answers/answers.ts`

### Modified — server actions (Phase C)
- `qna-web/src/app/actions/questions.ts`
- `qna-web/src/app/actions/broadcasts.ts`
- `qna-web/src/app/actions/comments.ts`

### Modified — pages and components (Phase D)
- `qna-web/src/app/communities/[slug]/page.tsx`
- `qna-web/src/app/communities/[slug]/_components/QuestionsTabBody.tsx`
- `qna-web/src/app/communities/[slug]/_components/QuestionRow.tsx`
- `qna-web/src/app/communities/[slug]/questions/[id]/page.tsx`
- `qna-web/src/app/communities/[slug]/questions/[id]/edit/page.tsx`
- `qna-web/src/app/communities/[slug]/questions/new/page.tsx`
- `qna-web/src/app/communities/[slug]/questions/[id]/_components/CommentThread.tsx`
- `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`
- `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx`
- `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`

### Unchanged but referenced
- `qna-web/src/app/communities/[slug]/layout.tsx` — `canManage` already covers admin.
- `qna-web/src/app/communities/[slug]/_components/CommunityHeader.tsx` — admin sees Join button (by design).
- `qna-web/src/app/communities/[slug]/about/page.tsx` — already public.
- `qna-web/src/app/communities/[slug]/questions/[id]/_components/DeleteQuestionButton.tsx` — already reusable; gating happens at the parent.
- `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx` — already drives Edit/Delete from `canEdit`/`canDelete` on the resource; admin gets `canDelete=true` via the policy change.

---

## Phase A — Service policies

These tasks are pure-function: signature changes plus matching unit tests. TDD applies cleanly.

### Task 1: Admin branch in comments policy

**Files:**
- Modify: `qna-web/src/services/comments/policy.ts`
- Modify: `qna-web/src/services/comments/policy.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `qna-web/src/services/comments/policy.test.ts`:

```typescript
test('admins can list comments regardless of answer state', () => {
  assert.equal(
    canListQuestionComments({
      communityRole: null,
      hasAnswered: false,
      isClosed: false,
      platformRole: 'admin',
    }),
    true,
  );
});

test('admins can soft-delete any comment', () => {
  assert.equal(
    canSoftDeleteQuestionComment({
      authorUserId: 'user_1',
      userId: 'admin_1',
      communityRole: null,
      platformRole: 'admin',
    }),
    true,
  );
});

test('admins still cannot post comments', () => {
  assert.equal(
    canPostQuestionComment({
      communityRole: null,
      hasAnswered: false,
      platformRole: 'admin',
    }),
    false,
  );
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -w qna-web -- --test-name-pattern="comments|admin"`
Expected: type-check or assertion errors — policy functions don't accept `platformRole` yet.

- [ ] **Step 3: Update `policy.ts`**

`PlatformRole` already lives in `@/services/admin` (see `services/admin/policy.ts`). Import it from there — do **not** redefine it locally. The same rule applies to every policy file in this plan.

Replace contents of `qna-web/src/services/comments/policy.ts`:

```typescript
import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';

export function canListQuestionComments({
  communityRole,
  hasAnswered,
  isClosed,
  platformRole = 'member',
}: {
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
  isClosed: boolean;
  platformRole?: PlatformRole;
}): boolean {
  if (platformRole === 'admin') return true;
  if (!communityRole) return false;
  if (communityRole === 'creator') return true;
  return hasAnswered || isClosed;
}

export function canPostQuestionComment({
  communityRole,
  hasAnswered,
  platformRole: _platformRole = 'member',
}: {
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
  platformRole?: PlatformRole;
}): boolean {
  if (!communityRole) return false;
  if (communityRole === 'creator') return true;
  return hasAnswered;
}

export function canSoftDeleteQuestionComment({
  authorUserId,
  userId,
  communityRole,
  platformRole = 'member',
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
  platformRole?: PlatformRole;
}): boolean {
  if (platformRole === 'admin') return true;
  return authorUserId === userId || communityRole === 'creator';
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm run test -w qna-web`
Expected: All comments policy tests pass (existing + new). No other tests should regress.

---

### Task 2: Admin branch in broadcasts policy

**Files:**
- Modify: `qna-web/src/services/broadcasts/policy.ts`
- Modify: `qna-web/src/services/broadcasts/policy.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `qna-web/src/services/broadcasts/policy.test.ts`:

```typescript
test('admins can soft-delete any broadcast', () => {
  assert.equal(
    canSoftDeleteBroadcastPost({
      authorUserId: 'user_1',
      userId: 'admin_1',
      communityRole: null,
      platformRole: 'admin',
    }),
    true,
  );
});

test('admins can read broadcasts in non-joined communities', () => {
  assert.equal(canReadBroadcasts(null, 'admin'), true);
});

test('admins still cannot create or edit broadcasts', () => {
  assert.equal(canCreateBroadcastPost(null, 'admin'), false);
  assert.equal(
    canEditBroadcastPost({
      authorUserId: 'user_1',
      userId: 'admin_1',
      communityRole: null,
      platformRole: 'admin',
    }),
    false,
  );
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -w qna-web -- --test-name-pattern="broadcasts|admin"`
Expected: type or assertion errors.

- [ ] **Step 3: Update `policy.ts`**

Import `PlatformRole` from the canonical location (`@/services/admin`). Do not redefine it locally.

Replace contents of `qna-web/src/services/broadcasts/policy.ts`:

```typescript
import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';

export function canCreateBroadcastPost(
  communityRole: CommunityRole | null,
  _platformRole: PlatformRole = 'member',
): boolean {
  return communityRole === 'creator';
}

export function canEditBroadcastPost({
  authorUserId,
  userId,
  communityRole,
  platformRole: _platformRole = 'member',
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
  platformRole?: PlatformRole;
}): boolean {
  return communityRole === 'creator' && authorUserId === userId;
}

export function canSoftDeleteBroadcastPost({
  communityRole,
  platformRole = 'member',
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
  platformRole?: PlatformRole;
}): boolean {
  if (platformRole === 'admin') return true;
  return communityRole === 'creator';
}

export function canReadBroadcasts(
  communityRole: CommunityRole | null,
  platformRole: PlatformRole = 'member',
): boolean {
  if (platformRole === 'admin') return true;
  return communityRole === 'member' || communityRole === 'creator';
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm run test -w qna-web`
Expected: all broadcasts policy tests pass; no other regressions.

---

### Task 3: Admin bypass in question management-policy

**Files:**
- Modify: `qna-web/src/services/questions/management-policy.ts`
- Modify: `qna-web/src/services/questions/management-policy.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `qna-web/src/services/questions/management-policy.test.ts`:

```typescript
describe('assertCanManageQuestion (admin bypass)', () => {
  it('does not throw for admin against a published, live question', () => {
    assert.doesNotThrow(() =>
      assertCanManageQuestion(
        question({
          scheduledFor: '2026-05-20T10:00:00.000Z',
          publishedAt: '2026-05-20T10:00:00.000Z',
          closesAt: '2026-05-21T10:00:00.000Z',
        }),
        { platformRole: 'admin', now },
      ),
    );
  });

  it('does not throw for admin against a closed question', () => {
    assert.doesNotThrow(() =>
      assertCanManageQuestion(
        question({
          scheduledFor: '2026-05-18T10:00:00.000Z',
          publishedAt: '2026-05-18T10:00:00.000Z',
          closesAt: '2026-05-19T10:00:00.000Z',
        }),
        { platformRole: 'admin', now },
      ),
    );
  });

  it('still throws for admin against a soft-deleted question', () => {
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({ deletedAt: '2026-05-20T11:00:00.000Z' }),
          { platformRole: 'admin', now },
        ),
      QuestionImmutableError,
    );
  });
});
```

The existing tests pass a positional `now` argument. They need to be migrated to the new object-arg shape — apply this find/replace inside the existing `describe('assertCanManageQuestion', ...)` block:
- `assertCanManageQuestion(question({...}), now)` → `assertCanManageQuestion(question({...}), { now })`

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -w qna-web -- --test-name-pattern="management-policy|admin"`
Expected: failures — `assertCanManageQuestion` second arg is currently `Date`, not an options object.

- [ ] **Step 3: Update `management-policy.ts`**

Import `PlatformRole` from `@/services/admin`. Do not redefine it locally.

Replace contents of `qna-web/src/services/questions/management-policy.ts`:

```typescript
import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';
import { QuestionImmutableError } from './errors';
import {
  canManageUnpublishedQuestion,
  type QuestionStateTimestamps,
} from './state';

export function canAccessCreatorDashboard(
  role: CommunityRole | null,
  platformRole: PlatformRole = 'member',
): boolean {
  return role === 'creator' || platformRole === 'admin';
}

export function assertCanManageQuestion(
  question: QuestionStateTimestamps,
  { platformRole = 'member', now = new Date() }: {
    platformRole?: PlatformRole;
    now?: Date;
  } = {},
): void {
  if (question.deletedAt) throw new QuestionImmutableError();
  if (platformRole === 'admin') return;
  if (!canManageUnpublishedQuestion(question, now)) {
    throw new QuestionImmutableError();
  }
}

export function shouldIncludeQuestionInActiveReads(
  question: QuestionStateTimestamps,
): boolean {
  return Boolean(
    !question.deletedAt && question.scheduledFor && question.closesAt,
  );
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm run test -w qna-web`
Expected: management-policy tests pass (existing migrated tests + new admin-bypass tests). `canAccessCreatorDashboard` admin behavior is implicitly covered since it now returns true for admin even with null role — verify with the next step.

- [ ] **Step 5: Add admin coverage for `canAccessCreatorDashboard`**

Append inside the existing `describe('canAccessCreatorDashboard', ...)` block in `qna-web/src/services/questions/management-policy.test.ts`:

```typescript
it('allows admins regardless of community role', () => {
  assert.equal(canAccessCreatorDashboard(null, 'admin'), true);
  assert.equal(canAccessCreatorDashboard('member', 'admin'), true);
});
```

- [ ] **Step 6: Run tests and confirm pass**

Run: `npm run test -w qna-web`
Expected: all green.

---

## Phase B — Service implementations

### Task 4: Forward platformRole through comments service

**Files:**
- Modify: `qna-web/src/services/comments/comments.ts`
- Modify: `qna-web/src/services/comments/thread.ts`

- [ ] **Step 1: Update `thread.ts` viewer type**

In `qna-web/src/services/comments/thread.ts`, change the `viewer` shape to carry `platformRole`. Replace the relevant section:

```typescript
import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';
import { canSoftDeleteQuestionComment } from './policy';

// ... existing types ...

type Viewer = {
  userId: string;
  communityRole: CommunityRole | null;
  platformRole: PlatformRole;
};

export function buildCommentThread(
  rows: CommentThreadRow[],
  viewer: Viewer,
): QuestionComment[] {
  const comments = rows.map((row) => toCommentResource(row, viewer));
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const topLevel: QuestionComment[] = [];

  for (const comment of comments) {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId)?.replies.push(comment);
    } else {
      topLevel.push(comment);
    }
  }

  for (const comment of topLevel) {
    comment.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return topLevel.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function toCommentResource(
  row: CommentThreadRow,
  viewer: Viewer,
): QuestionComment {
  const isDeleted = Boolean(row.deletedAt);

  return {
    id: row.id,
    questionId: row.questionId,
    parentCommentId: row.parentCommentId,
    author: isDeleted
      ? null
      : {
          id: row.authorUserId,
          username: row.authorUsername,
        },
    body: isDeleted ? null : row.body,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canDelete:
      !isDeleted &&
      canSoftDeleteQuestionComment({
        authorUserId: row.authorUserId,
        userId: viewer.userId,
        communityRole: viewer.communityRole,
        platformRole: viewer.platformRole,
      }),
    replies: [],
  };
}
```

Keep the rest of the file unchanged.

- [ ] **Step 2: Update `comments.ts` to accept and forward `platformRole`**

In `qna-web/src/services/comments/comments.ts`:

(a) Add `import type { PlatformRole } from '@/services/admin';` next to the existing `@/services/admin` import line (the comments service already imports `AccountSuspendedError, assertUserCanMutate` from there — extend that import).

(b) Update `listQuestionComments` signature and body — admins must bypass the membership requirement:

```typescript
export async function listQuestionComments({
  slug,
  questionId,
  userId,
  platformRole = 'member',
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: PlatformRole;
  now?: Date;
}): Promise<QuestionComment[]> {
  const context = await loadCommentQuestionContext({
    slug,
    questionId,
    userId,
    now,
  });

  if (
    !canListQuestionComments({
      communityRole: context.communityRole,
      hasAnswered: context.hasAnswered,
      isClosed: context.isClosed,
      platformRole,
    })
  ) {
    throw new CommentPermissionError();
  }

  const rows = await db
    .select({
      comment: comments,
      authorUsername: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorUserId, users.id))
    .where(eq(comments.questionId, context.question.id))
    .orderBy(desc(comments.createdAt));

  return buildCommentThread(
    rows.map(toCommentThreadRow),
    {
      userId,
      communityRole: context.communityRole,
      platformRole,
    },
  );
}
```

(c) Update `softDeleteComment` to accept and forward `platformRole`:

```typescript
export async function softDeleteComment({
  commentId,
  userId,
  platformRole = 'member',
  slug,
  questionId,
  now = new Date(),
}: {
  commentId: string;
  userId: string;
  platformRole?: PlatformRole;
  slug?: string;
  questionId?: string;
  now?: Date;
}): Promise<void> {
  await assertAccountCanMutate(userId);

  const where = and(
    eq(comments.id, commentId),
    questionId ? eq(questions.id, questionId) : undefined,
    slug ? eq(communities.slug, slug) : undefined,
    slug ? eq(communities.status, 'active') : undefined,
  );

  const [row] = await db
    .select({
      comment: comments,
      communityRole: communityMembers.role,
    })
    .from(comments)
    .innerJoin(questions, eq(comments.questionId, questions.id))
    .innerJoin(communities, eq(questions.communityId, communities.id))
    .leftJoin(
      communityMembers,
      and(
        eq(communityMembers.communityId, questions.communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .where(where)
    .limit(1);

  if (!row) throw new CommentNotFoundError();

  if (
    !canSoftDeleteQuestionComment({
      authorUserId: row.comment.authorUserId,
      userId,
      communityRole: row.communityRole,
      platformRole,
    })
  ) {
    throw new CommentPermissionError(
      'Only the comment author, community creator, or platform admin can delete comments.',
    );
  }

  if (row.comment.deletedAt) return;

  await db
    .update(comments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(comments.id, commentId));
}
```

Note: the previous code rejected when `row.communityRole` was null. With admin support, that check is removed — `canSoftDeleteQuestionComment` is now the single decision point.

(d) `postComment` is unchanged for admins (they cannot post). Leave its signature alone.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean. If type errors surface in callers (e.g. `CommentThread.tsx`), they will be fixed in Task 15.

- [ ] **Step 4: Run unit tests**

Run: `npm run test -w qna-web`
Expected: all green. Existing comment policy tests still pass.

---

### Task 5: Forward platformRole through broadcasts service

**Files:**
- Modify: `qna-web/src/services/broadcasts/broadcasts.ts`

- [ ] **Step 1: Update `broadcasts.ts`**

In `qna-web/src/services/broadcasts/broadcasts.ts`:

(a) Import `PlatformRole` from `@/services/admin` (extend the existing `AccountSuspendedError, assertUserCanMutate` import line):
```typescript
import {
  AccountSuspendedError,
  assertUserCanMutate,
  type PlatformRole,
} from '@/services/admin';
```

(b) Extend the `BroadcastViewer` type and pipeline:
```typescript
type BroadcastViewer = {
  userId: string | null;
  communityRole: CommunityRole | null;
  accountStatus: 'active' | 'suspended' | null;
  platformRole: PlatformRole;
};
```

(c) Update `listCommunityBroadcasts`, `getLatestCommunityBroadcast`, `getLatestCommunityBroadcastForCommunity`, and `getCommunityBroadcast` to accept and forward `viewerPlatformRole` (defaulting to `'member'`). Example for `listCommunityBroadcasts`:

```typescript
export async function listCommunityBroadcasts({
  slug,
  limit,
  cursor,
  viewerUserId = null,
  viewerPlatformRole = 'member',
}: {
  slug: string;
  limit?: number;
  cursor?: string | null;
  viewerUserId?: string | null;
  viewerPlatformRole?: PlatformRole;
}): Promise<BroadcastPage> {
  const community = await getCommunityBySlug(slug, viewerUserId);
  const safeLimit = normalizeBroadcastLimit(limit ? String(limit) : null);
  if (!community) {
    throw new BroadcastNotFoundError();
  }
  assertCanReadBroadcasts({
    viewerUserId,
    communityRole: community.currentUserRole,
    platformRole: viewerPlatformRole,
  });
  const viewerStatus = viewerUserId
    ? await findUserStatusById(viewerUserId)
    : null;

  // ... existing query body unchanged ...

  return {
    items: pageRows.map((row) =>
      toBroadcastResource(row, {
        userId: viewerUserId,
        communityRole: community.currentUserRole,
        accountStatus: viewerStatus,
        platformRole: viewerPlatformRole,
      }),
    ),
    pagination: {
      // unchanged
    },
  };
}
```

Apply the same `viewerPlatformRole` plumbing to:
- `getLatestCommunityBroadcast` → passes through to `getLatestCommunityBroadcastForCommunity`.
- `getLatestCommunityBroadcastForCommunity` → builds viewer with `platformRole`.
- `getCommunityBroadcast` → builds viewer with `platformRole` and forwards into `assertCanReadBroadcasts`.

(d) Update `softDeleteBroadcastPost` to accept and forward `platformRole`:

```typescript
export async function softDeleteBroadcastPost({
  slug,
  postId,
  userId,
  platformRole = 'member',
  now = new Date(),
}: {
  slug: string;
  postId: string;
  userId: string;
  platformRole?: PlatformRole;
  now?: Date;
}): Promise<void> {
  await assertAccountCanMutate(userId);

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
      platformRole,
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
```

(e) Update `toBroadcastResource` so `canDelete` reflects admin powers. Replace the body:

```typescript
function toBroadcastResource(
  row: BroadcastRow,
  viewer: BroadcastViewer,
): BroadcastPostResource {
  const activeViewerUserId =
    viewer.accountStatus === 'active' ? viewer.userId : null;
  const adminCanModerate =
    viewer.platformRole === 'admin' && viewer.accountStatus !== 'suspended';

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
    canEdit: activeViewerUserId
      ? canEditBroadcastPost({
          authorUserId: row.post.authorUserId,
          userId: activeViewerUserId,
          communityRole: viewer.communityRole,
          platformRole: viewer.platformRole,
        })
      : false,
    canDelete:
      activeViewerUserId
        ? canSoftDeleteBroadcastPost({
            authorUserId: row.post.authorUserId,
            userId: activeViewerUserId,
            communityRole: viewer.communityRole,
            platformRole: viewer.platformRole,
          })
        : adminCanModerate,
  };
}
```

(f) Update `assertCanReadBroadcasts` to accept platformRole and short-circuit for admin:

```typescript
function assertCanReadBroadcasts({
  viewerUserId,
  communityRole,
  platformRole,
}: {
  viewerUserId: string | null;
  communityRole: CommunityRole | null;
  platformRole: PlatformRole;
}): void {
  if (!viewerUserId) {
    throw new BroadcastAuthenticationRequiredError();
  }
  if (!canReadBroadcasts(communityRole, platformRole)) {
    throw new BroadcastMembershipRequiredError();
  }
}
```

(g) `createBroadcastPost` and `updateBroadcastPost` are unchanged for admins (they cannot create/edit).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean within the broadcasts service. Type errors in callers will be fixed in Phase C.

- [ ] **Step 3: Run unit tests**

Run: `npm run test -w qna-web`
Expected: all green.

---

### Task 6: Forward platformRole through questions service + rename `softDeleteUnpublishedQuestion`

**Files:**
- Modify: `qna-web/src/services/questions/questions.ts`
- Modify: `qna-web/src/services/questions/index.ts`
- Modify: `qna-web/src/services/questions/dashboard.ts`

- [ ] **Step 1: Update `questions.ts` — `loadQuestionForManagement` admin path**

Replace `loadQuestionForManagement` and its callers' inputs with `userId` + optional `platformRole`. In `qna-web/src/services/questions/questions.ts`:

(a) Import `PlatformRole` from `@/services/admin` (extend the existing import line):
```typescript
import {
  AccountSuspendedError,
  assertUserCanMutate,
  type PlatformRole,
} from '@/services/admin';
```

The existing `assertCanManageQuestion` import from `./management-policy` stays.

(b) Replace `loadQuestionForManagement`:

```typescript
async function loadQuestionForManagement({
  slug,
  questionId,
  userId,
  platformRole,
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole: PlatformRole;
}): Promise<{ question: Question; community: CommunityWithMembership }> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new QuestionPermissionError();
  if (community.currentUserRole !== 'creator' && platformRole !== 'admin') {
    throw new QuestionPermissionError();
  }

  const [question] = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.communityId, community.id),
        isNull(questions.deletedAt),
      ),
    )
    .limit(1);
  if (!question) throw new QuestionNotFoundError();

  return { question, community };
}
```

(c) Update `updateUnpublishedQuestion`. Rename its parameter from `creatorUserId` to `userId` and add `platformRole`:

```typescript
export async function updateUnpublishedQuestion({
  slug,
  questionId,
  userId,
  platformRole = 'member',
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: PlatformRole;
  input: DraftQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion> {
  await assertAccountCanMutate(userId);

  const { question } = await loadQuestionForManagement({
    slug,
    questionId,
    userId,
    platformRole,
  });

  const [updated] = await db
    .update(questions)
    .set({
      prompt: input.prompt,
      explanation: input.explanation,
      imageUrl: input.imageUrl,
      points: input.points,
      updatedAt: now,
    })
    .where(eq(questions.id, question.id))
    .returning();

  await db.delete(questionChoices).where(eq(questionChoices.questionId, question.id));
  await insertQuestionChoices(question.id, input.choices);

  const [resource] = await withChoices([updated], true);
  return resource;
}
```

(d) Update `scheduleQuestion`. Same rename + `platformRole`, and forward to `assertCanManageQuestion` with the new options shape:

```typescript
export async function scheduleQuestion({
  slug,
  questionId,
  userId,
  platformRole = 'member',
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: PlatformRole;
  input: ScheduleQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion> {
  await assertAccountCanMutate(userId);

  const { question, community } = await loadQuestionForManagement({
    slug,
    questionId,
    userId,
    platformRole,
  });
  assertCanManageQuestion(question, { platformRole, now });

  const closesAt = computeQuestionClosesAt({
    cadence: community.cadence as CommunityCadence,
    scheduledFor: input.scheduledFor,
    requestedClosesAt: input.requestedClosesAt,
  });

  const [updated] = await db
    .update(questions)
    .set({
      scheduledFor: input.scheduledFor,
      publishedAt: input.publishedAt,
      closesAt,
      timeZone: input.timeZone,
      updatedAt: now,
    })
    .where(eq(questions.id, question.id))
    .returning();

  const [resource] = await withChoices([updated], true);
  return resource;
}
```

(e) Rename `softDeleteUnpublishedQuestion` → `softDeleteQuestion` and broaden:

```typescript
export async function softDeleteQuestion({
  slug,
  questionId,
  userId,
  platformRole = 'member',
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: PlatformRole;
  now?: Date;
}): Promise<void> {
  await assertAccountCanMutate(userId);

  const { question } = await loadQuestionForManagement({
    slug,
    questionId,
    userId,
    platformRole,
  });

  if (platformRole !== 'admin') {
    assertCanManageQuestion(question, { platformRole, now });
  }

  await db
    .update(questions)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(questions.id, question.id));
}
```

(f) `createQuestion` and `createQuestionDraft` are unchanged. They keep the `creatorUserId` parameter name (admin does not call these).

- [ ] **Step 2: Update barrel export**

In `qna-web/src/services/questions/index.ts`, find the export listing the old name and replace `softDeleteUnpublishedQuestion` with `softDeleteQuestion`. If you cannot remember the exact list, run:

Run: `grep -n "softDeleteUnpublishedQuestion\|softDeleteQuestion" qna-web/src/services/questions/index.ts`

Then update each occurrence accordingly.

- [ ] **Step 3: Update `dashboard.ts` — admin can access creator dashboard**

In `qna-web/src/services/questions/dashboard.ts`, modify `getCreatorCommunityDashboard`:

```typescript
export async function getCreatorCommunityDashboard({
  slug,
  userId,
  platformRole = 'member',
  now = new Date(),
}: {
  slug: string;
  userId: string;
  platformRole?: 'member' | 'admin';
  now?: Date;
}): Promise<CreatorCommunityDashboard | null> {
  const status = await findUserStatusById(userId);
  if (status !== 'active') return null;

  const community = await getCommunityBySlug(slug, userId);
  if (
    !community ||
    !canAccessCreatorDashboard(community.currentUserRole, platformRole)
  ) {
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
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: type errors in `qna-web/src/app/actions/questions.ts` (it still imports the old name and passes `creatorUserId`). Those are addressed in Task 8.

- [ ] **Step 5: Run unit tests**

Run: `npm run test -w qna-web`
Expected: management-policy tests pass. Other tests unaffected.

---

### Task 7: getQuestionDetail admin path

**Files:**
- Modify: `qna-web/src/services/answers/answers.ts`

- [ ] **Step 1: Update `QuestionDetail` shape and `getQuestionDetail`**

In `qna-web/src/services/answers/answers.ts`:

(a) Change the `QuestionDetail` type — make `currentUserRole` nullable and add `viewerCanModerate`:

```typescript
export type QuestionDetail = {
  id: string;
  communityId: string;
  creatorUserId: string;
  prompt: string;
  explanation: string | null;
  imageUrl: string | null;
  scheduledFor: Date;
  publishedAt: Date | null;
  closesAt: Date;
  timeZone: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
  currentUserRole: CommunityRole | null;
  viewerCanModerate: boolean;
  canAnswer: boolean;
  canSeeSolution: boolean;
  isClosed: boolean;
  isScheduled: boolean;
  choices: AnswerChoiceResource[];
  result: AnswerResultResource | null;
};
```

(b) Update `QuestionContext`:

```typescript
type QuestionContext = {
  question: AnswerableQuestion;
  currentUserRole: CommunityRole | null;
  platformRole: 'member' | 'admin';
  choices: (typeof questionChoices.$inferSelect)[];
  existingAnswer: Answer | null;
};
```

(c) Replace `getQuestionDetail` signature and `loadQuestionContext`:

```typescript
export async function getQuestionDetail({
  slug,
  questionId,
  userId,
  platformRole = 'member',
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: 'member' | 'admin';
  now?: Date;
}): Promise<QuestionDetail> {
  const [context, status] = await Promise.all([
    loadQuestionContext({ slug, questionId, userId, platformRole }),
    findUserStatusById(userId),
  ]);
  return toQuestionDetail(context, now, status === 'suspended');
}

// ...

async function loadQuestionContext({
  slug,
  questionId,
  userId,
  platformRole,
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole: 'member' | 'admin';
}): Promise<QuestionContext> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new QuestionNotFoundError();
  if (!community.currentUserRole && platformRole !== 'admin') {
    throw new AnswerPermissionError();
  }

  const [question] = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.communityId, community.id),
        isNull(questions.deletedAt),
        isNotNull(questions.scheduledFor),
        isNotNull(questions.closesAt),
      ),
    )
    .limit(1);
  if (!question) throw new QuestionNotFoundError();
  const answerableQuestion = toAnswerableQuestion(question);

  const [choices, existingAnswer] = await Promise.all([
    db
      .select()
      .from(questionChoices)
      .where(eq(questionChoices.questionId, answerableQuestion.id))
      .orderBy(asc(questionChoices.position)),
    getExistingAnswer(answerableQuestion.id, userId),
  ]);

  return {
    question: answerableQuestion,
    currentUserRole: community.currentUserRole,
    platformRole,
    choices,
    existingAnswer,
  };
}
```

(d) Update `submitQuestionAnswer` to pass through `platformRole` to the loader call. Pass the literal `'member'`, because admins do not submit answers — keep the path strict:

```typescript
const context = await loadQuestionContext({
  slug,
  questionId,
  userId,
  platformRole: 'member',
});
```

(e) Update `toQuestionDetail`:

```typescript
function toQuestionDetail(
  context: QuestionContext,
  now: Date,
  isSuspended: boolean,
): QuestionDetail {
  const { question, choices, existingAnswer, platformRole } = context;
  const isAdmin = platformRole === 'admin';
  const hasAnswer = Boolean(existingAnswer);
  const isClosed = question.closesAt.getTime() <= now.getTime();
  const isScheduled = question.scheduledFor.getTime() > now.getTime();
  const viewerCanModerate =
    !isSuspended &&
    (context.currentUserRole === 'creator' || isAdmin);
  const canSeeSolution =
    viewerCanModerate || hasAnswer || isClosed;
  const canAnswer =
    !isSuspended && !isAdmin && !isScheduled && !hasAnswer && context.currentUserRole !== null;
  const resourceChoices = choices.map((choice) =>
    toChoiceResource(choice, canSeeSolution),
  );
  const result = existingAnswer
    ? toAnswerResult(existingAnswer, choices, resourceChoices)
    : null;

  return {
    ...question,
    currentUserRole: context.currentUserRole,
    viewerCanModerate,
    explanation: canSeeSolution ? question.explanation : null,
    canAnswer,
    canSeeSolution,
    isClosed,
    isScheduled,
    choices: resourceChoices,
    result,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: type errors will surface in `qna-web/src/app/communities/[slug]/questions/[id]/page.tsx` (uses `question.currentUserRole === 'creator'`) and `CommentThread.tsx`. They are fixed in Phase D.

- [ ] **Step 3: Run unit tests**

Run: `npm run test -w qna-web`
Expected: all green.

---

## Phase C — Server actions

### Task 8: Forward `session.role` from server actions

**Files:**
- Modify: `qna-web/src/app/actions/questions.ts`
- Modify: `qna-web/src/app/actions/broadcasts.ts`
- Modify: `qna-web/src/app/actions/comments.ts`

- [ ] **Step 1: Update `actions/questions.ts`**

In `qna-web/src/app/actions/questions.ts`:

(a) Update the import:
```typescript
import {
  createQuestion,
  createQuestionDraft,
  QuestionImmutableError,
  QuestionNotFoundError,
  QuestionPermissionError,
  QuestionsValidationError,
  scheduleQuestion,
  softDeleteQuestion,
  updateUnpublishedQuestion,
  validateCreateQuestionInput,
  validateDraftQuestionInput,
  validateScheduleQuestionInput,
} from '@/services/questions';
```

(b) Replace `updateQuestionAction` to pass `userId` + `platformRole`:

```typescript
export async function updateQuestionAction(
  slug: string,
  questionId: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/communities/${slug}`);

  try {
    const input = validateDraftQuestionInput({
      prompt: formData.get('prompt'),
      explanation: formData.get('explanation'),
      imageUrl: formData.get('imageUrl'),
      choices: toChoiceInputs(formData),
    });

    await updateUnpublishedQuestion({
      slug,
      questionId,
      userId: session.sub,
      platformRole: session.role,
      input,
    });
  } catch (err) {
    return toDashboardQuestionFormError(err);
  }

  revalidateCommunityQuestionPaths(slug);
  redirect(`/communities/${slug}?saved=updated`);
}
```

(c) Replace `scheduleQuestionAction` similarly — pass `userId` + `platformRole`:

```typescript
export async function scheduleQuestionAction(
  slug: string,
  questionId: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/communities/${slug}`);

  try {
    const input = validateScheduleQuestionInput({
      scheduledFor: formData.get('scheduledFor'),
      closesAt: formData.get('closesAt'),
    });

    await scheduleQuestion({
      slug,
      questionId,
      userId: session.sub,
      platformRole: session.role,
      input,
    });
  } catch (err) {
    return toDashboardQuestionFormError(err);
  }

  revalidateCommunityQuestionPaths(slug);
  return { ok: true };
}
```

(d) Replace `deleteQuestionAction`:

```typescript
export async function deleteQuestionAction(
  slug: string,
  questionId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/communities/${slug}`);

  await softDeleteQuestion({
    slug,
    questionId,
    userId: session.sub,
    platformRole: session.role,
  });

  revalidateCommunityQuestionPaths(slug);
  redirect(`/communities/${slug}?saved=deleted`);
}
```

(e) Leave `createQuestionAction`, `createQuestionDraftAction`, `createScheduledQuestionAction`, `publishQuestionNowAction` unchanged — they remain creator-only.

- [ ] **Step 2: Update `actions/broadcasts.ts`**

Replace `deleteBroadcastAction`:

```typescript
export async function deleteBroadcastAction(
  slug: string,
  postId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  await softDeleteBroadcastPost({
    slug,
    postId,
    userId: session.sub,
    platformRole: session.role,
  });

  revalidateBroadcastPaths(slug, postId);
}
```

Leave `createBroadcastAction` and `updateBroadcastAction` unchanged.

- [ ] **Step 3: Update `actions/comments.ts`**

Replace `deleteCommentAction`:

```typescript
export async function deleteCommentAction(
  slug: string,
  questionId: string,
  commentId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  await softDeleteComment({
    slug,
    questionId,
    commentId,
    userId: session.sub,
    platformRole: session.role,
  });

  revalidatePath(`/communities/${slug}/questions/${questionId}`);
}
```

Leave `postCommentAction` unchanged.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: the action files are clean. Remaining errors are in pages (Phase D).

- [ ] **Step 5: Run unit tests**

Run: `npm run test -w qna-web`
Expected: all green.

---

## Phase D — Pages and components

### Task 9: Admin access in the community Questions tab

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/page.tsx`

- [ ] **Step 1: Allow admins past the non-member redirect and use the dashboard fetch path**

Replace `qna-web/src/app/communities/[slug]/page.tsx`:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCreatorCommunityDashboard,
  listCommunityQuestionsForCommunity,
} from '@/services/questions';
import { CommunitySidebar } from './_components/CommunitySidebar';
import { QuestionsTabBody } from './_components/QuestionsTabBody';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
};

const SAVED_MESSAGES: Record<string, string> = {
  draft: 'Draft saved.',
  scheduled: 'Question scheduled.',
  published: 'Question published.',
  updated: 'Question updated.',
  deleted: 'Question deleted.',
};

export default async function CommunityQuestionsTab({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, search, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) {
    redirect('/communities');
  }

  const isAdmin = session?.role === 'admin';
  const isCreator = community.currentUserRole === 'creator';
  const isMember =
    community.currentUserRole === 'member' || isCreator;

  if (!isMember && !isAdmin) {
    redirect(`/communities/${slug}/about`);
  }

  let questions;
  if (isCreator || isAdmin) {
    const dashboard = await getCreatorCommunityDashboard({
      slug,
      userId: session!.sub,
      platformRole: session!.role,
    });
    questions = dashboard?.questions ?? [];
  } else {
    questions = await listCommunityQuestionsForCommunity({
      community,
      viewerUserId: session?.sub ?? null,
    });
  }

  const savedMessage = search.saved ? SAVED_MESSAGES[search.saved] : null;

  return (
    <div className="flex flex-col gap-4">
      {savedMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <span className="font-semibold">✓ {savedMessage}</span>
          <Link
            href={`/communities/${slug}`}
            className="text-xs font-semibold uppercase tracking-wider text-green-700 hover:underline"
          >
            Dismiss
          </Link>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <QuestionsTabBody
          slug={slug}
          questions={questions}
          viewerRole={community.currentUserRole}
          isAdmin={isAdmin}
        />
        <CommunitySidebar
          community={community}
          viewerUserId={session?.sub ?? null}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: errors in `QuestionsTabBody.tsx` (doesn't accept `isAdmin` yet) — fixed in Task 10.

---

### Task 10: `QuestionsTabBody` and `QuestionRow` accept `isAdmin`

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/_components/QuestionsTabBody.tsx`
- Modify: `qna-web/src/app/communities/[slug]/_components/QuestionRow.tsx`

- [ ] **Step 1: Update `QuestionsTabBody.tsx`**

Replace the component signature and forward `isAdmin` into each row. Only change the props and the row rendering — leave the live-question hero and other JSX untouched:

```tsx
export function QuestionsTabBody({
  slug,
  questions,
  viewerRole,
  isAdmin = false,
}: {
  slug: string;
  questions: CommunityQuestion[];
  viewerRole: CommunityRole | null;
  isAdmin?: boolean;
}) {
  const sorted = [...questions].sort(sortByMostRecentFirst);
  const liveQuestion = sorted.find((q) => getQuestionLifecycleState(q) === 'live');
  const otherQuestions = sorted.filter((q) => q.id !== liveQuestion?.id);

  return (
    <div className="flex flex-col gap-5">
      {viewerRole === 'creator' && (
        <div className="flex items-center justify-between rounded-lg bg-primary-soft px-4 py-3">
          <p className="text-sm font-semibold text-primary">
            You&apos;re the creator — drafts and scheduling live here.
          </p>
          <Link
            href={`/communities/${slug}/questions/new`}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper hover:brightness-95"
          >
            + New question
          </Link>
        </div>
      )}

      {liveQuestion && <LiveQuestionHero slug={slug} question={liveQuestion} />}

      {otherQuestions.length === 0 && !liveQuestion ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-sm text-muted">
          No questions yet.
        </div>
      ) : (
        <ul className="grid gap-3">
          {otherQuestions.map((question) => (
            <li key={question.id}>
              <QuestionRow
                slug={slug}
                question={question}
                viewerRole={viewerRole}
                isAdmin={isAdmin}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

The "+ New question" CTA stays creator-only (admin condition is intentionally omitted per spec).

- [ ] **Step 2: Update `QuestionRow.tsx`**

Replace the `QuestionRow` props and `getRowHref`:

```tsx
export function QuestionRow({
  slug,
  question,
  viewerRole,
  isAdmin = false,
}: {
  slug: string;
  question: QuestionRowQuestion;
  viewerRole: CommunityRole | null;
  isAdmin?: boolean;
}) {
  const state = getQuestionLifecycleState(question);
  const href = getRowHref({ slug, questionId: question.id, state, viewerRole, isAdmin });
  const dateLine = question.scheduledFor ?? question.publishedAt;

  return (
    <Link
      href={href}
      className="grid grid-cols-[64px_1fr_auto] items-center gap-4 rounded-lg border border-line bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="text-xs font-semibold text-muted">
        {dateLine ? formatDateBlock(dateLine) : '—'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink">
          {question.prompt}
        </p>
      </div>
      <StateBadge state={state} />
    </Link>
  );
}

// ... StateBadge unchanged ...

function getRowHref({
  slug,
  questionId,
  state,
  viewerRole,
  isAdmin,
}: {
  slug: string;
  questionId: string;
  state: string;
  viewerRole: CommunityRole | null;
  isAdmin: boolean;
}): string {
  const canEditUnpublished =
    viewerRole === 'creator' || isAdmin;
  if (canEditUnpublished && (state === 'draft' || state === 'scheduled')) {
    return `/communities/${slug}/questions/${questionId}/edit`;
  }
  return `/communities/${slug}/questions/${questionId}`;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: page.tsx errors clear; remaining failures are in the question detail page (Task 11).

---

### Task 11: Question detail page admin moderation view

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/questions/[id]/page.tsx`

- [ ] **Step 1: Forward `platformRole` and broaden the rendering**

Replace `qna-web/src/app/communities/[slug]/questions/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AnswerPermissionError,
  type AnswerChoiceResource,
  type QuestionDetail,
  getQuestionDetail,
} from '@/services/answers';
import { getSession } from '@/services/auth';
import { QuestionNotFoundError } from '@/services/questions';
import { AnswerForm } from './_components/AnswerForm';
import { CommentThread } from './_components/CommentThread';
import { DeleteQuestionButton } from './_components/DeleteQuestionButton';

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function QuestionDetailPage({ params }: PageProps) {
  const [{ slug, id }, session] = await Promise.all([params, getSession()]);
  if (!session) redirect('/login');

  let question: QuestionDetail;
  try {
    question = await getQuestionDetail({
      slug,
      questionId: id,
      userId: session.sub,
      platformRole: session.role,
    });
  } catch (err) {
    if (err instanceof QuestionNotFoundError) notFound();
    if (err instanceof AnswerPermissionError) {
      return <PermissionScreen slug={slug} message={err.message} />;
    }
    throw err;
  }

  const canModerate = question.viewerCanModerate;
  const isCreator = question.currentUserRole === 'creator';
  const showAnswerForm =
    question.canAnswer && question.currentUserRole !== null;

  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href={`/communities/${slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        Back to community
      </Link>

      <article className="mt-8 rounded-lg border border-line bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-[12px] font-semibold text-primary">
              {getQuestionState(question)}
            </span>
            <h1 className="mt-4 text-[32px] font-bold leading-tight md:text-[44px]">
              {question.prompt}
            </h1>
          </div>
          <div className="shrink-0 text-sm text-muted sm:text-right">
            <p className="font-semibold text-ink">
              {formatGmtDate(question.scheduledFor)}
            </p>
            <p>{question.points} points</p>
          </div>
        </div>
        {canModerate && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="mr-auto text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              {isCreator ? 'Creator actions' : 'Admin actions'}
            </span>
            <Link
              href={`/communities/${slug}/questions/${id}/edit`}
              className="cursor-pointer rounded-full border border-primary/25 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Edit
            </Link>
            <DeleteQuestionButton slug={slug} questionId={id} />
          </div>
        )}
        {question.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.imageUrl}
            alt=""
            className="mt-6 max-h-[420px] w-full rounded-lg border border-line object-contain"
          />
        )}
      </article>

      <div className="mt-6 grid gap-6">
        {question.result ? (
          <ResultPanel question={question} />
        ) : showAnswerForm ? (
          <AnswerForm
            slug={slug}
            questionId={question.id}
            choices={question.choices}
            isLate={question.isClosed}
          />
        ) : !canModerate ? (
          <div className="rounded-lg border border-line bg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Not open yet
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              This question opens on schedule
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Come back after {formatGmtDate(question.scheduledFor)} to
              submit your answer.
            </p>
          </div>
        ) : null}

        {!question.result && question.canSeeSolution && (
          <SolutionPanel question={question} />
        )}

        <CommentThread slug={slug} question={question} userId={session.sub} />
      </div>
    </div>
  );
}

function PermissionScreen({
  slug,
  message,
}: {
  slug: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-card p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Members only
      </p>
      <h1 className="mt-3 text-3xl font-bold">Join to answer</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
      <Link
        href={`/communities/${slug}`}
        className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-paper"
      >
        Go to community
      </Link>
    </div>
  );
}

function ResultPanel({ question }: { question: QuestionDetail }) {
  if (!question.result) return null;
  const result = question.result;

  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Result
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            {result.isCorrect ? 'Correct answer' : 'Wrong answer'}
          </h2>
        </div>
        <span className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-paper">
          {result.pointsAwarded} points awarded
        </span>
      </div>

      {result.isLate && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          This answer was submitted after the close time, so it earned 0 points.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <AnswerSummary title="Your answer" choice={result.selectedChoice} />
        <AnswerSummary title="Correct answer" choice={result.correctChoice} />
      </div>

      <SolutionPanel question={question} framed={false} />
    </section>
  );
}

function SolutionPanel({
  question,
  framed = true,
}: {
  question: QuestionDetail;
  framed?: boolean;
}) {
  const correctChoice = question.choices.find((choice) => choice.isCorrect);
  const className = framed
    ? 'rounded-lg border border-line bg-card p-5'
    : 'mt-5 border-t border-line pt-5';

  return (
    <section className={className}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Explanation
      </p>
      {correctChoice && (
        <p className="mt-3 text-sm font-semibold text-ink">
          Correct answer: {correctChoice.label}
        </p>
      )}
      <p className="mt-3 text-sm leading-6 text-muted">
        {question.explanation ?? 'The explanation unlocks after you answer.'}
      </p>
    </section>
  );
}

function AnswerSummary({
  title,
  choice,
}: {
  title: string;
  choice: AnswerChoiceResource;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {title}
      </p>
      <div className="mt-2 flex items-start gap-3">
        {choice.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={choice.imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md border border-line object-cover"
          />
        )}
        <p className="text-sm leading-6 text-ink">
          <span className="font-bold">{choice.position}.</span> {choice.label}
        </p>
      </div>
    </div>
  );
}

function getQuestionState(question: QuestionDetail): string {
  if (question.result) return 'Answered';
  if (question.isClosed) return 'Closed';
  if (question.isScheduled) return 'Scheduled';
  return 'Open';
}

function formatGmtDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(value);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: errors clear in this file. CommentThread still has type drift — Task 15 fixes it.

---

### Task 12: Question edit page admin access

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/questions/[id]/edit/page.tsx`

- [ ] **Step 1: Allow admin to load the dashboard payload**

Replace `qna-web/src/app/communities/[slug]/questions/[id]/edit/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { getCreatorCommunityDashboard } from '@/services/questions';
import { QuestionForm } from '../../_components/QuestionForm';

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function EditQuestionPage({ params }: PageProps) {
  const [{ slug, id }, session] = await Promise.all([params, getSession()]);
  if (!session) {
    redirect(`/login?next=/communities/${slug}/questions/${id}/edit`);
  }
  const community = await getCommunityBySlug(slug, session.sub);
  if (!community) notFound();

  const isAdmin = session.role === 'admin';
  if (community.currentUserRole !== 'creator' && !isAdmin) {
    redirect(`/communities/${slug}`);
  }

  const dashboard = await getCreatorCommunityDashboard({
    slug,
    userId: session.sub,
    platformRole: session.role,
  });
  const question = dashboard?.questions.find((q) => q.id === id);
  if (!question) notFound();

  return (
    <section className="max-w-[720px]">
      <h2 className="text-2xl font-bold">Edit question</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Update the prompt, choices, or schedule.
      </p>
      <div className="mt-6">
        <QuestionForm
          slug={slug}
          communityId={community.id}
          cadence={community.cadence}
          question={{
            id: question.id,
            prompt: question.prompt,
            explanation: question.explanation,
            imageUrl: question.imageUrl,
            scheduledFor: question.scheduledFor?.toISOString() ?? null,
            closesAt: question.closesAt?.toISOString() ?? null,
            choices: question.choices.map((c) => ({
              label: c.label,
              imageUrl: c.imageUrl,
              isCorrect: c.isCorrect,
            })),
          }}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean.

---

### Task 13: Guard `/questions/new` from admins

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/questions/new/page.tsx`

- [ ] **Step 1: Inspect current page**

Run: `head -80 qna-web/src/app/communities/[slug]/questions/new/page.tsx`

Confirm the existing creator-only loader. The page already checks `community.currentUserRole === 'creator'` and redirects otherwise. Admins fall through this check and are sent to `/communities/[slug]` — no change is required. Skip the rest of this task.

- [ ] **Step 2: Verify no admin-specific change is needed**

If the inspection in Step 1 shows the page already redirects when `currentUserRole !== 'creator'`, leave the file untouched. Otherwise (if the redirect was removed somewhere) add at the top of the loader, right after `getCommunityBySlug`:

```tsx
if (community.currentUserRole !== 'creator') {
  redirect(`/communities/${slug}`);
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean.

---

### Task 14: Broadcasts pages allow admin

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`
- Modify: `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx`

- [ ] **Step 1: Update `broadcasts/page.tsx`**

Replace `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug, markBroadcastsSeen } from '@/services/communities';
import {
  listCommunityBroadcasts,
  normalizeBroadcastLimit,
  type BroadcastPostResource,
} from '@/services/broadcasts';
import { BroadcastComposer } from './_components/BroadcastComposer';
import {
  BroadcastFeed,
  type SerializedBroadcastPost,
} from './_components/BroadcastFeed';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string; limit?: string }>;
};

export default async function CommunityBroadcastsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, query, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  const isAdmin = session?.role === 'admin';
  const isMember =
    community.currentUserRole === 'member' || community.currentUserRole === 'creator';
  if (!isMember && !isAdmin) {
    redirect(`/communities/${slug}/about`);
  }

  if (session?.sub && isMember) {
    await markBroadcastsSeen({ userId: session.sub, slug });
  }

  const page = await listCommunityBroadcasts({
    slug,
    limit: normalizeBroadcastLimit(query.limit ?? null),
    cursor: query.cursor ?? null,
    viewerUserId: session?.sub ?? null,
    viewerPlatformRole: session?.role,
  });

  return (
    <>
      {community.currentUserRole === 'creator' && (
        <section className="rounded-lg border border-line bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Creator
          </p>
          <h2 className="mt-2 text-2xl font-bold">Post a broadcast</h2>
          <div className="mt-5">
            <BroadcastComposer slug={community.slug} communityId={community.id} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <BroadcastFeed
          slug={community.slug}
          communityId={community.id}
          posts={page.items.map(serializeBroadcast)}
        />
      </section>

      {page.pagination.nextCursor && (
        <div className="mt-8">
          <Link
            href={`/communities/${community.slug}/broadcasts?cursor=${encodeURIComponent(page.pagination.nextCursor)}`}
            className="inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
          >
            Older posts
          </Link>
        </div>
      )}
    </>
  );
}

function serializeBroadcast(
  post: BroadcastPostResource,
): SerializedBroadcastPost {
  return {
    ...post,
    publishedAt: post.publishedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 2: Update `broadcasts/[postId]/page.tsx`**

Replace `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCommunityBroadcast,
  type BroadcastPostResource,
} from '@/services/broadcasts';
import {
  BroadcastFeed,
  type SerializedBroadcastPost,
} from '../_components/BroadcastFeed';

type PageProps = {
  params: Promise<{ slug: string; postId: string }>;
};

export default async function BroadcastDetailPage({ params }: PageProps) {
  const [{ slug, postId }, session] = await Promise.all([params, getSession()]);

  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  const isAdmin = session?.role === 'admin';
  const isMember =
    community.currentUserRole === 'member' || community.currentUserRole === 'creator';
  if (!isMember && !isAdmin) {
    redirect(`/communities/${slug}/about`);
  }

  const post = await getCommunityBroadcast({
    slug,
    postId,
    viewerUserId: session?.sub ?? null,
    viewerPlatformRole: session?.role,
  });
  if (!post) notFound();

  return (
    <section>
      <BroadcastFeed
        slug={slug}
        communityId={post.communityId}
        posts={[serializeBroadcast(post)]}
        showOpenLink={false}
      />
    </section>
  );
}

function serializeBroadcast(
  post: BroadcastPostResource,
): SerializedBroadcastPost {
  return {
    ...post,
    publishedAt: post.publishedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
```

Note: `getCommunityBroadcast` did not previously accept `viewerPlatformRole`. Task 5 added it. If it didn't, return to Task 5 and add the parameter.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean for these files.

---

### Task 15: CommentThread admin-aware

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/questions/[id]/_components/CommentThread.tsx`

- [ ] **Step 1: Update CommentThread**

Replace `qna-web/src/app/communities/[slug]/questions/[id]/_components/CommentThread.tsx`:

```tsx
import { getSession } from '@/services/auth';
import {
  CommentPermissionError,
  listQuestionComments,
  type QuestionComment,
} from '@/services/comments';
import type { QuestionDetail } from '@/services/answers';
import {
  CommentForm,
  CommentList,
  type SerializedQuestionComment,
} from './CommentForm';

export async function CommentThread({
  slug,
  question,
  userId,
}: {
  slug: string;
  question: QuestionDetail;
  userId: string;
}) {
  const session = await getSession();
  const platformRole = session?.role ?? 'member';
  const isAdmin = platformRole === 'admin';
  const isCreator = question.currentUserRole === 'creator';
  const canRead =
    isAdmin || isCreator || Boolean(question.result) || question.isClosed;
  const canPost = isCreator || Boolean(question.result);

  if (!canRead) {
    return (
      <section className="rounded-lg border border-dashed border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Discussion
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          Answer to unlock the discussion
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The comment thread opens after you submit an answer.
        </p>
      </section>
    );
  }

  let comments: QuestionComment[] = [];
  try {
    comments = await listQuestionComments({
      slug,
      questionId: question.id,
      userId,
      platformRole,
    });
  } catch (err) {
    if (err instanceof CommentPermissionError) {
      return (
        <section className="rounded-lg border border-line bg-card p-5">
          <p className="text-sm font-semibold text-muted">{err.message}</p>
        </section>
      );
    }
    throw err;
  }

  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Discussion
          </p>
          <h2 className="mt-2 text-2xl font-bold">Question thread</h2>
        </div>
        {!canPost && !isAdmin && (
          <p className="max-w-[280px] text-sm leading-6 text-muted sm:text-right">
            You can read this closed discussion. Submit an answer to post.
          </p>
        )}
        {isAdmin && !canPost && (
          <p className="max-w-[280px] text-sm leading-6 text-muted sm:text-right">
            Admin view — read-only.
          </p>
        )}
      </div>

      {canPost && (
        <div className="mt-5">
          <CommentForm slug={slug} questionId={question.id} />
        </div>
      )}

      <CommentList
        slug={slug}
        questionId={question.id}
        comments={comments.map(serializeComment)}
        canPost={canPost}
      />
    </section>
  );
}

function serializeComment(comment: QuestionComment): SerializedQuestionComment {
  return {
    ...comment,
    deletedAt: comment.deletedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: comment.replies.map(serializeComment),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean.

---

### Task 16: Leaderboard page allows admin

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`

- [ ] **Step 1: Drop the non-member redirect for admins**

In `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`, replace the existing `if (community.currentUserRole === null)` block with:

```tsx
const isAdmin = session?.role === 'admin';
const isMember =
  community.currentUserRole === 'member' || community.currentUserRole === 'creator';
if (!isMember && !isAdmin) {
  redirect(`/communities/${slug}/about`);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean.

---

## Phase E — Full verification

### Task 17: Type-check, unit tests, lint, manual browser verification

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test -w qna-web`
Expected: all green.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit -p qna-web/tsconfig.json`
Expected: clean.

- [ ] **Step 3: Run lint**

Run: `npm run lint -w qna-web`
Expected: no new errors. Pre-existing warnings unrelated to admin moderation are acceptable.

- [ ] **Step 4: Promote a test user to admin (manual)**

If a test admin doesn't already exist, run a one-shot SQL update against the dev database — for example:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Skip this step if you already have an admin user available.

- [ ] **Step 5: Manual browser verification checklist**

The dev server already runs on `http://localhost:3000`. Sign in as the admin user (a user with `role = 'admin'` who is NOT a member of the target community) and verify:

- Open `/communities/<some-other-slug>` (a community you haven't joined). The Questions tab loads. Drafts and scheduled questions are visible (when present).
- Click into a published question. The page shows: question prompt, all choices with the correct one revealed, the explanation, and Edit + Delete buttons. No "Submit answer" form. Comments are visible. No comment composer.
- Click Edit. The edit form opens. Change the prompt. Save. The change persists after reload.
- Return to the question list and click Delete on a different question. The dialog opens; confirm. The question disappears from the list and the direct URL 404s.
- Visit `/communities/<slug>/broadcasts`. All posts show with a Delete button. No "Post a broadcast" composer.
- Delete one broadcast. It disappears from the feed.
- On any question's detail page, click Delete on a comment. The comment becomes a tombstone. No "Post a comment" form is visible.
- Visit `/communities/<slug>/leaderboard`. The leaderboard loads (no redirect).
- Sign out and sign in as a regular non-member. Visit the same community URL. Verify you are redirected to `/about` (non-admin behavior is unchanged).

If any check fails, return to the relevant task and fix.

---

## Self-review

**Spec coverage:** every spec section has a task —
- "Admin can edit any question incl closed/published" → Tasks 3, 6, 8, 12.
- "Admin can delete any question" → Tasks 3, 6, 8, 11.
- "Admin can delete any broadcast" → Tasks 2, 5, 8, 14.
- "Admin can delete any comment" → Tasks 1, 4, 8, 15.
- "Admin sees questions tab in non-joined community" → Tasks 6 (dashboard service), 9 (page), 10 (component).
- "Admin sees correct answer + explanation + comments on question detail" → Tasks 7, 11, 15.
- "No answer form, no composer for admin" → Tasks 11, 14, 15.
- "No new question CTA for admin" → Task 10.
- "Existing answers untouched on edit" → no code change required; covered by leaving grading logic alone (mentioned in Task 6 + verification step).
- "Web only, no mobile" → no mobile tasks.
- "No audit logging" → no tasks added for `admin_audit_logs`.
- "Header keeps Join button" → CommunityHeader untouched (noted in file map).

**Placeholder scan:** none. Every code block is complete.

**Type consistency:** `platformRole`/`viewerPlatformRole` parameter names are consistent within each service (services use `platformRole`; the broadcasts read APIs use `viewerPlatformRole` to disambiguate from the actor's role on writes). `viewerCanModerate` and `currentUserRole | null` align across Task 7 and Task 11. `softDeleteQuestion` and its export are renamed in Task 6 and consumed in Task 8.
