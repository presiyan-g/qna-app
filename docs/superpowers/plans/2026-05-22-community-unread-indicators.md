# Community Unread Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-card indicators to `CommunityListCard` showing how many open questions the viewer hasn't answered and how many broadcasts have been posted since the viewer last visited the community's broadcasts feed; both clear automatically when the viewer acts (answers / visits broadcasts).

**Architecture:** A single new column `community_members.last_seen_broadcasts_at` tracks broadcast unread state per membership. Question unread state is derived from the existing `answers` table without new schema. Two new correlated subqueries inside `communitySummaryFields(userId)` produce `unansweredQuestionCount` and `newBroadcastCount` on every `CommunityWithMembership` read. A new `markBroadcastsSeen` service stamps `last_seen_broadcasts_at = now()` on each member visit to the broadcasts feed page. The card renders two deep-linked pills inline when counts are > 0.

**Tech Stack:** Next.js (server components), Drizzle ORM (PostgreSQL), tsx test runner (node:test), Tailwind, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-22-community-unread-indicators-design.md`.

---

## Repo conventions to follow

- Drizzle migrations live in `qna-web/drizzle/`. Generate with `npm run db:generate` (from `qna-web/`), then run with `npm run db:migrate`. Migration SQL files are numbered and named by drizzle-kit; you can edit the generated file to add a backfill `UPDATE` statement before running `db:migrate`.
- Unit tests are written with `node:test` + `node:assert/strict` and executed via `npm test` (`tsx --test "src/**/*.test.ts"`). All existing tests live next to their source files (e.g., `resource.test.ts`). Tests are pure-helper tests only — there is no DB integration test rig in this slice's scope.
- Services use `'server-only'`, Drizzle, and a `services/<feature>/` folder structure (`<feature>.ts`, `resource.ts`, `validation.ts`, `errors.ts`, `index.ts`).
- Server components are the default; mark `"use client"` only when needed.
- The user prefers to run `git commit` themselves. **Each task ends with a commit step that prints the suggested commit command — do not run `git commit` yourself unless the user explicitly says so. Pause after running tests and present the commit command for the user to execute.**

---

## File map

**Create:**
- `qna-web/drizzle/00NN_<auto-name>.sql` — migration adding `last_seen_broadcasts_at` and backfilling existing rows.

**Modify:**
- `qna-web/src/db/schema/communities.ts` — add `lastSeenBroadcastsAt` to `communityMembers`.
- `qna-web/src/services/communities/resource.ts` — extend `CommunityResourceInput`, `buildCommunityResource`, and `buildCreatedCommunityResource` with two new count fields; tighten `markCommunityJoined` / `markCommunityLeft` if needed.
- `qna-web/src/services/communities/resource.test.ts` — cover the new fields.
- `qna-web/src/services/communities/communities.ts` — extend `CommunityWithMembership`, extend `communitySummaryFields`, set `last_seen_broadcasts_at` in `createCommunity` / `joinCommunity` insert paths, add and export `markBroadcastsSeen`.
- `qna-web/src/services/communities/index.ts` — re-export `markBroadcastsSeen`.
- `qna-web/src/app/communities/[slug]/broadcasts/page.tsx` — call `markBroadcastsSeen` after the member gate.
- `qna-web/src/app/communities/_components/CommunityListCard.tsx` — render the two pills.

**Create (tests for pill labels):**
- `qna-web/src/app/communities/_components/communityCardIndicators.ts` — pure label helpers (singular/plural).
- `qna-web/src/app/communities/_components/communityCardIndicators.test.ts` — unit test for the helpers.

---

## Task 1: Add `last_seen_broadcasts_at` schema column

**Files:**
- Modify: `qna-web/src/db/schema/communities.ts`
- Create: a new generated migration file under `qna-web/drizzle/` (filename assigned by drizzle-kit)

- [ ] **Step 1: Edit the `communityMembers` table to add the column**

In `qna-web/src/db/schema/communities.ts`, locate the `communityMembers` pgTable definition (around lines 87–118) and add `lastSeenBroadcastsAt` after `joinedAt`:

```ts
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
```

(Nullable, no default. The service layer always supplies a value on insert.)

- [ ] **Step 2: Generate the migration**

From `qna-web/`:

```bash
npm run db:generate
```

Expected output: a new `qna-web/drizzle/00NN_<adjective>_<noun>.sql` file is created containing roughly:

```sql
ALTER TABLE "community_members" ADD COLUMN "last_seen_broadcasts_at" timestamp with time zone;
```

Note the exact generated filename — you will reference it in step 3.

- [ ] **Step 3: Add the backfill statement to the generated migration**

Open the new migration file and append a backfill statement after the `ALTER TABLE` line. The final file should contain:

```sql
ALTER TABLE "community_members" ADD COLUMN "last_seen_broadcasts_at" timestamp with time zone;--> statement-breakpoint
UPDATE "community_members" SET "last_seen_broadcasts_at" = "joined_at" WHERE "last_seen_broadcasts_at" IS NULL;
```

The `--> statement-breakpoint` separator matches the style in `0010_tricky_iron_fist.sql` and lets drizzle-kit run them as separate statements.

- [ ] **Step 4: Run the migration**

From `qna-web/`:

```bash
npm run db:migrate
```

Expected: migration applies cleanly; no errors.

- [ ] **Step 5: Verify the column and backfill manually**

Open `npm run db:studio` (or use psql) and confirm:
- `community_members.last_seen_broadcasts_at` exists, type `timestamp with time zone`, nullable.
- For each existing row, `last_seen_broadcasts_at = joined_at`.

- [ ] **Step 6: Commit (pause for user)**

Stage:

```bash
git add qna-web/src/db/schema/communities.ts qna-web/drizzle/
```

Suggested commit (do not run unless the user confirms):

```bash
git commit -m "feat(communities): add last_seen_broadcasts_at column to community_members"
```

---

## Task 2: Extend `CommunityWithMembership` resource type and builder

**Files:**
- Modify: `qna-web/src/services/communities/communities.ts:29-42` (type definitions only — the SQL field changes come in Task 3)
- Modify: `qna-web/src/services/communities/resource.ts`
- Test: `qna-web/src/services/communities/resource.test.ts`

- [ ] **Step 1: Write failing tests for the extended builder**

Replace the contents of `qna-web/src/services/communities/resource.test.ts` with:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Community } from '@/db/schema/communities';
import {
  buildCommunityResource,
  buildCreatedCommunityResource,
  markCommunityJoined,
  markCommunityLeft,
  type CommunityResourceInput,
} from './resource';

describe('community membership resource helpers', () => {
  it('returns a creator community resource without refetching after create', () => {
    const created = buildCreatedCommunityResource({
      community: community(),
      category: null,
    });

    assert.equal(created.memberCount, 1);
    assert.equal(created.liveQuestionCount, 0);
    assert.equal(created.currentUserRole, 'creator');
    assert.equal(created.category, null);
    assert.equal(created.unansweredQuestionCount, 0);
    assert.equal(created.newBroadcastCount, 0);
  });

  it('passes through unanswered and new-broadcast counts on read', () => {
    const resource = buildCommunityResource({
      community: community(),
      category: null,
      memberCount: 10,
      liveQuestionCount: 2,
      currentUserRole: 'member',
      unansweredQuestionCount: 1,
      newBroadcastCount: 3,
    });

    assert.equal(resource.unansweredQuestionCount, 1);
    assert.equal(resource.newBroadcastCount, 3);
  });

  it('increments member count only when join inserts a new membership', () => {
    const base = communityResource({ memberCount: 4, currentUserRole: null });

    assert.equal(markCommunityJoined(base, true).memberCount, 5);
    assert.equal(markCommunityJoined(base, true).currentUserRole, 'member');
    assert.equal(markCommunityJoined(base, false).memberCount, 4);
    assert.equal(markCommunityJoined(base, false).currentUserRole, 'member');
  });

  it('decrements member count only when leave deletes an existing membership', () => {
    const base = communityResource({
      memberCount: 4,
      currentUserRole: 'member',
    });

    assert.equal(markCommunityLeft(base, true).memberCount, 3);
    assert.equal(markCommunityLeft(base, true).currentUserRole, null);
    assert.equal(markCommunityLeft(base, false).memberCount, 4);
    assert.equal(markCommunityLeft(base, false).currentUserRole, null);
  });
});

function communityResource(
  overrides: Partial<CommunityResourceInput> = {},
): CommunityResourceInput {
  return {
    ...community(),
    category: null,
    memberCount: overrides.memberCount ?? 0,
    liveQuestionCount: overrides.liveQuestionCount ?? 0,
    currentUserRole: overrides.currentUserRole ?? null,
    unansweredQuestionCount: overrides.unansweredQuestionCount ?? 0,
    newBroadcastCount: overrides.newBroadcastCount ?? 0,
  };
}

function community(): Community {
  const now = new Date('2026-05-21T12:00:00.000Z');

  return {
    id: 'community_1',
    creatorUserId: 'user_1',
    categoryId: null,
    slug: 'daily-builders',
    name: 'Daily Builders',
    description: 'Build daily.',
    emoji: 'DB',
    cadence: 'daily',
    status: 'active',
    isFeatured: false,
    featuredRank: null,
    createdAt: now,
    updatedAt: now,
  };
}
```

- [ ] **Step 2: Run the test to verify it fails**

From `qna-web/`:

```bash
npm test -- --test-name-pattern="community membership resource helpers"
```

Expected: type/compile errors (or test failures) because `unansweredQuestionCount` and `newBroadcastCount` don't exist on the resource yet.

- [ ] **Step 3: Extend the `CommunityWithMembership` type**

In `qna-web/src/services/communities/communities.ts`, update the type declaration (around line 29):

```ts
export type CommunityWithMembership = Community & {
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
  unansweredQuestionCount: number;
  newBroadcastCount: number;
};
```

And update `CommunityWithCategoryRow` to match:

```ts
type CommunityWithCategoryRow = {
  community: Community;
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
  unansweredQuestionCount: number;
  newBroadcastCount: number;
};
```

- [ ] **Step 4: Extend `resource.ts` builders**

Replace `qna-web/src/services/communities/resource.ts` with:

```ts
import type {
  Community,
  CommunityCategory,
} from '@/db/schema/communities';
import type { CommunityRole, CommunityWithMembership } from './communities';

export type CommunityResourceInput = Community & {
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
  unansweredQuestionCount: number;
  newBroadcastCount: number;
};

export function buildCommunityResource({
  community,
  category,
  memberCount,
  liveQuestionCount,
  currentUserRole,
  unansweredQuestionCount,
  newBroadcastCount,
}: {
  community: Community;
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
  unansweredQuestionCount: number;
  newBroadcastCount: number;
}): CommunityWithMembership {
  return {
    ...community,
    category,
    memberCount,
    liveQuestionCount,
    currentUserRole,
    unansweredQuestionCount,
    newBroadcastCount,
  };
}

export function buildCreatedCommunityResource({
  community,
  category,
}: {
  community: Community;
  category: CommunityCategory | null;
}): CommunityWithMembership {
  return buildCommunityResource({
    community,
    category,
    memberCount: 1,
    liveQuestionCount: 0,
    currentUserRole: 'creator',
    unansweredQuestionCount: 0,
    newBroadcastCount: 0,
  });
}

export function markCommunityJoined(
  community: CommunityWithMembership,
  inserted: boolean,
): CommunityWithMembership {
  if (community.currentUserRole) return community;

  return {
    ...community,
    memberCount: community.memberCount + (inserted ? 1 : 0),
    currentUserRole: 'member',
  };
}

export function markCommunityLeft(
  community: CommunityWithMembership,
  deleted: boolean,
): CommunityWithMembership {
  return {
    ...community,
    memberCount: Math.max(0, community.memberCount - (deleted ? 1 : 0)),
    currentUserRole: null,
  };
}
```

- [ ] **Step 5: Update the `toCommunityWithMembership` mapper**

In `qna-web/src/services/communities/communities.ts` (around lines 319–329), update the mapper to forward the new fields:

```ts
function toCommunityWithMembership(
  row: CommunityWithCategoryRow,
): CommunityWithMembership {
  return buildCommunityResource({
    community: row.community,
    category: row.category,
    memberCount: Number(row.memberCount),
    liveQuestionCount: Number(row.liveQuestionCount),
    currentUserRole: row.currentUserRole,
    unansweredQuestionCount: Number(row.unansweredQuestionCount),
    newBroadcastCount: Number(row.newBroadcastCount),
  });
}
```

At this point the file will fail to compile because `communitySummaryFields` still returns the old shape — that's expected, Task 3 fixes it. Tests in this task will not pass yet.

- [ ] **Step 6: Hold tests until Task 3**

The full `npm test` will not pass yet because `communities.ts` has a temporary type mismatch (Task 3 fixes it). Move directly to Task 3 without committing — Tasks 2 and 3 commit together at the end of Task 3.

---

## Task 3: Add the two count subqueries to `communitySummaryFields`

**Files:**
- Modify: `qna-web/src/services/communities/communities.ts`

- [ ] **Step 1: Add imports for `answers` and `broadcastPosts`**

At the top of `qna-web/src/services/communities/communities.ts`, alongside the existing schema imports (around lines 6–13), add:

```ts
import { questions } from '@/db/schema/questions';
import { answers } from '@/db/schema/answers';
import { broadcastPosts } from '@/db/schema/broadcasts';
```

(`questions` is already imported — keep it.)

- [ ] **Step 2: Extend `communitySummaryFields`**

Replace the body of `communitySummaryFields(userId)` (around lines 290–317) with:

```ts
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
    unansweredQuestionCount: userId
      ? sql<number>`(
          select count(*)::int
          from ${questions} q
          where q.community_id = ${communities.id}
            and q.deleted_at is null
            and q.published_at is not null
            and q.published_at <= now()
            and q.closes_at > now()
            and exists (
              select 1 from ${communityMembers} cm
              where cm.community_id = ${communities.id}
                and cm.user_id = ${userId}
            )
            and not exists (
              select 1 from ${answers} a
              where a.question_id = q.id
                and a.user_id = ${userId}
            )
        )`
      : sql<number>`0`,
    newBroadcastCount: userId
      ? sql<number>`(
          select count(*)::int
          from ${broadcastPosts} b
          where b.community_id = ${communities.id}
            and b.deleted_at is null
            and b.published_at > coalesce(
              (select last_seen_broadcasts_at
                 from ${communityMembers}
                 where community_id = ${communities.id}
                   and user_id = ${userId}),
              'epoch'
            )
        )`
      : sql<number>`0`,
  };
}
```

The membership `exists (...)` guard inside `unansweredQuestionCount` ensures non-member rows on the discover page return 0 — outsiders never see "you have unanswered questions" for a community they haven't joined.

- [ ] **Step 3: Run tests to verify they pass**

From `qna-web/`:

```bash
npm test
```

Expected: all tests pass, including the new `resource.test.ts` cases added in Task 2.

- [ ] **Step 4: Run typecheck to confirm no compile errors**

From `qna-web/`:

```bash
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 5: Manual sanity check via dev server**

From `qna-web/`:

```bash
npm run dev
```

- Visit `/my-communities` while signed in. Pills do not render yet (Task 7 adds the UI), but the network/console should be clean.
- The `community` objects rendered server-side now carry `unansweredQuestionCount` and `newBroadcastCount` — verify by adding a temporary `console.log(communities)` in `my-communities/page.tsx` if helpful, then remove it.

- [ ] **Step 6: Commit Tasks 2 + 3 together (pause for user)**

Stage:

```bash
git add qna-web/src/services/communities/communities.ts \
        qna-web/src/services/communities/resource.ts \
        qna-web/src/services/communities/resource.test.ts
```

Suggested commit:

```bash
git commit -m "feat(communities): expose unansweredQuestionCount and newBroadcastCount per membership"
```

---

## Task 4: Stamp `last_seen_broadcasts_at` on join and creation

**Files:**
- Modify: `qna-web/src/services/communities/communities.ts`

- [ ] **Step 1: Set the timestamp inside `createCommunity`**

Locate the `createCommunity` function (around lines 193–231) and update the `communityMembers` insert:

```ts
await db.insert(communityMembers).values({
  communityId: community.id,
  userId: creatorUserId,
  role: 'creator',
  lastSeenBroadcastsAt: new Date(),
});
```

- [ ] **Step 2: Set the timestamp inside `joinCommunity`**

Locate the `joinCommunity` function (around lines 233–258) and update the `communityMembers` insert:

```ts
const [inserted] = await db
  .insert(communityMembers)
  .values({
    communityId: community.id,
    userId,
    role: 'member',
    lastSeenBroadcastsAt: new Date(),
  })
  .onConflictDoNothing({
    target: [communityMembers.communityId, communityMembers.userId],
  })
  .returning({ id: communityMembers.id });
```

- [ ] **Step 3: Run typecheck and tests**

From `qna-web/`:

```bash
npx tsc --noEmit -p .
npm test
```

Expected: both pass.

- [ ] **Step 4: Manual smoke test**

Start the dev server and join a community as a fresh test user. Inspect `community_members` via `npm run db:studio` and confirm the row was inserted with `last_seen_broadcasts_at` populated.

- [ ] **Step 5: Commit (pause for user)**

Stage:

```bash
git add qna-web/src/services/communities/communities.ts
```

Suggested commit:

```bash
git commit -m "feat(communities): initialize last_seen_broadcasts_at on join/create"
```

---

## Task 5: Add `markBroadcastsSeen` service and export

**Files:**
- Modify: `qna-web/src/services/communities/communities.ts`
- Modify: `qna-web/src/services/communities/index.ts`

- [ ] **Step 1: Add the function**

At the bottom of `qna-web/src/services/communities/communities.ts`, before the helper functions block (or grouped with the other exported actions, your choice — but above `function communitySummaryFields`), add:

```ts
export async function markBroadcastsSeen({
  userId,
  slug,
}: {
  userId: string;
  slug: string;
}): Promise<void> {
  const [row] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(eq(communities.slug, slug))
    .limit(1);

  if (!row) return;

  await db
    .update(communityMembers)
    .set({ lastSeenBroadcastsAt: new Date() })
    .where(
      and(
        eq(communityMembers.communityId, row.id),
        eq(communityMembers.userId, userId),
      ),
    );
}
```

This is intentionally lenient: non-members produce a zero-row update, never an error. The mutation is idempotent.

- [ ] **Step 2: Re-export from `index.ts`**

In `qna-web/src/services/communities/index.ts`, add `markBroadcastsSeen` to the export list:

```ts
export {
  createCommunity,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
  listCommunityCategories,
  listFeaturedCommunities,
  listCommunities,
  listMyCommunities,
  markBroadcastsSeen,
  searchCommunities,
  type CommunityRole,
  type CommunityWithMembership,
} from './communities';
```

(Note: `listCommunityCategories` is exported from communities.ts — keep its position.) If `listCommunityCategories` does not exist in `./communities`, leave the original export list intact and just add `markBroadcastsSeen` in alphabetical position.

- [ ] **Step 3: Run typecheck and tests**

From `qna-web/`:

```bash
npx tsc --noEmit -p .
npm test
```

Expected: both pass.

- [ ] **Step 4: Commit (pause for user)**

Stage:

```bash
git add qna-web/src/services/communities/communities.ts \
        qna-web/src/services/communities/index.ts
```

Suggested commit:

```bash
git commit -m "feat(communities): add markBroadcastsSeen service"
```

---

## Task 6: Stamp `last_seen_broadcasts_at` on broadcasts page visit

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`

- [ ] **Step 1: Import `markBroadcastsSeen`**

At the top of the file, alongside the other `@/services/communities` import (line 6):

```ts
import { getCommunityBySlug, markBroadcastsSeen } from '@/services/communities';
```

- [ ] **Step 2: Call it once the viewer is confirmed a member**

Inside `CommunityBroadcastsPage`, after the `viewerIsMember` check passes — i.e. after the `if (!viewerIsMember) { ... }` block — and **before** the `listCommunityBroadcasts` call (around line 105), insert:

```ts
if (session?.sub) {
  await markBroadcastsSeen({ userId: session.sub, slug });
}
```

The `viewerIsMember` gate above this guarantees the viewer is a member; the inner `session?.sub` guard is defense in depth for the type system. Order matters: stamping happens **before** the feed render so a refresh of the same page does not bring the indicator back.

- [ ] **Step 3: Run typecheck and tests**

From `qna-web/`:

```bash
npx tsc --noEmit -p .
npm test
```

Expected: both pass.

- [ ] **Step 4: Manual smoke test**

1. Start the dev server: `npm run dev`.
2. Sign in as a member of a community that has at least one broadcast.
3. In `db:studio`, note the current `last_seen_broadcasts_at` for your membership.
4. Visit `/communities/<slug>/broadcasts`.
5. Refresh `db:studio` and confirm `last_seen_broadcasts_at` advanced to the visit time.

- [ ] **Step 5: Commit (pause for user)**

Stage:

```bash
git add qna-web/src/app/communities/[slug]/broadcasts/page.tsx
```

Suggested commit:

```bash
git commit -m "feat(broadcasts): mark broadcasts seen on member page visit"
```

---

## Task 7: Render the unread indicator pills on `CommunityListCard`

**Files:**
- Create: `qna-web/src/app/communities/_components/communityCardIndicators.ts`
- Create: `qna-web/src/app/communities/_components/communityCardIndicators.test.ts`
- Modify: `qna-web/src/app/communities/_components/CommunityListCard.tsx`

- [ ] **Step 1: Write the failing test for label helpers**

Create `qna-web/src/app/communities/_components/communityCardIndicators.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatNewQuestionsLabel,
  formatNewBroadcastsLabel,
} from './communityCardIndicators';

describe('communityCardIndicators', () => {
  it('singular/plural new question label', () => {
    assert.equal(formatNewQuestionsLabel(1), '1 new question');
    assert.equal(formatNewQuestionsLabel(2), '2 new questions');
    assert.equal(formatNewQuestionsLabel(5), '5 new questions');
  });

  it('singular/plural new broadcast label', () => {
    assert.equal(formatNewBroadcastsLabel(1), '1 new broadcast');
    assert.equal(formatNewBroadcastsLabel(2), '2 new broadcasts');
    assert.equal(formatNewBroadcastsLabel(7), '7 new broadcasts');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

From `qna-web/`:

```bash
npm test -- --test-name-pattern="communityCardIndicators"
```

Expected: FAIL — module `./communityCardIndicators` does not exist.

- [ ] **Step 3: Implement the helpers**

Create `qna-web/src/app/communities/_components/communityCardIndicators.ts`:

```ts
export function formatNewQuestionsLabel(count: number): string {
  return count === 1 ? '1 new question' : `${count} new questions`;
}

export function formatNewBroadcastsLabel(count: number): string {
  return count === 1 ? '1 new broadcast' : `${count} new broadcasts`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

From `qna-web/`:

```bash
npm test -- --test-name-pattern="communityCardIndicators"
```

Expected: PASS.

- [ ] **Step 5: Add the pills to the card**

Replace the contents of `qna-web/src/app/communities/_components/CommunityListCard.tsx` with:

```tsx
import Link from 'next/link';
import type { CommunityWithMembership } from '@/services/communities';
import {
  joinCommunityAction,
  leaveCommunityAction,
} from '@/app/actions/communities';
import {
  formatNewBroadcastsLabel,
  formatNewQuestionsLabel,
} from './communityCardIndicators';

export function CommunityListCard({
  community,
  signedIn,
}: {
  community: CommunityWithMembership;
  signedIn: boolean;
}) {
  const joinAction = joinCommunityAction.bind(null, community.slug);
  const leaveAction = leaveCommunityAction.bind(null, community.slug);

  const showIndicators =
    community.currentUserRole !== null &&
    (community.unansweredQuestionCount > 0 ||
      community.newBroadcastCount > 0);

  return (
    <article className="flex min-h-[220px] flex-col justify-between rounded-lg border border-line bg-card p-5">
      <div>
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-sm font-bold text-primary">
              {community.emoji || community.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <Link
                href={`/communities/${community.slug}`}
                className="text-[17px] font-bold leading-tight hover:underline"
              >
                {community.name}
              </Link>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                {community.memberCount.toLocaleString('en-US')} members
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            {formatLabel(community.cadence)}
          </span>
        </header>

        {community.category ? (
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {community.category.name}
          </p>
        ) : null}

        <p className="mt-4 text-sm leading-6 text-muted">
          {community.description || 'A recurring challenge community.'}
        </p>

        {showIndicators ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {community.unansweredQuestionCount > 0 ? (
              <Link
                href={`/communities/${community.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  aria-hidden
                />
                {formatNewQuestionsLabel(community.unansweredQuestionCount)}
              </Link>
            ) : null}
            {community.newBroadcastCount > 0 ? (
              <Link
                href={`/communities/${community.slug}/broadcasts`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-ink"
                  aria-hidden
                />
                {formatNewBroadcastsLabel(community.newBroadcastCount)}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <footer className="mt-5 flex items-center gap-2">
        <Link
          href={`/communities/${community.slug}`}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-primary-soft"
        >
          View
        </Link>
        {community.currentUserRole === 'creator' ? (
          <span className="inline-flex items-center gap-1.5 px-1 py-2 text-sm font-semibold text-muted">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 8l4 3 5-7 5 7 4-3-2 11H5L3 8z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            Your community
          </span>
        ) : community.currentUserRole === 'member' ? (
          <>
            <span className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">
              Joined
            </span>
            <form action={leaveAction}>
              <button
                type="submit"
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
              >
                Leave
              </button>
            </form>
          </>
        ) : signedIn ? (
          <form action={joinAction}>
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper"
            >
              Join
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper"
          >
            Sign in to join
          </Link>
        )}
      </footer>
    </article>
  );
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
```

- [ ] **Step 6: Run typecheck and tests**

From `qna-web/`:

```bash
npx tsc --noEmit -p .
npm test
```

Expected: both pass.

- [ ] **Step 7: Manual end-to-end smoke test**

1. `npm run dev`.
2. Sign in as a user who is a member of at least one community that has an open question they have NOT answered.
3. Visit `/my-communities`. Confirm the matching card shows a `1 new question` (or `N new questions`) pill, linking to `/communities/<slug>`.
4. Answer the question. Refresh `/my-communities`. Confirm the question pill is gone.
5. Have a creator (a separate session) post a broadcast. Refresh `/my-communities`. Confirm a `1 new broadcast` pill appears.
6. Click the broadcast pill. Confirm it navigates to `/communities/<slug>/broadcasts`. Go back to `/my-communities` and confirm the broadcast pill is gone.
7. Visit `/communities` (discover) while signed in. Confirm pills appear only on cards where you're already a member; non-member cards show nothing extra.
8. Open `/communities` while signed out. Confirm no pills render.

- [ ] **Step 8: Commit (pause for user)**

Stage:

```bash
git add qna-web/src/app/communities/_components/communityCardIndicators.ts \
        qna-web/src/app/communities/_components/communityCardIndicators.test.ts \
        qna-web/src/app/communities/_components/CommunityListCard.tsx
```

Suggested commit:

```bash
git commit -m "feat(communities): render unread question and broadcast pills on community card"
```

---

## Final verification

- [ ] **Run the full test suite from `qna-web/`:**

```bash
npm test
npx tsc --noEmit -p .
npm run lint
```

Expected: all green.

- [ ] **Manual regression sweep:**
  - Discover page renders for signed-out users without errors.
  - `/my-communities` renders for signed-in users with mixed state (some communities with pills, some without).
  - Joining a community from `/communities` does not surface stale historical broadcasts as "new."
  - Leaving and rejoining a community results in a fresh `last_seen_broadcasts_at` and zero broadcast pill until a new post lands.
  - Creator view of own community still shows the question pill when the creator hasn't answered their own open question.
