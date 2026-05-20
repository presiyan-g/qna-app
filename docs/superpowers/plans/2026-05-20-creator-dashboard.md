# Creator Dashboard Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected web creator dashboard with a cross-community hub and per-community question management for drafts and unpublished scheduled questions.

**Architecture:** Keep dashboard pages thin and server-first. Put creator authorization, dashboard read models, question state policy, and question mutations in `qna-web/src/services/questions/`; use Server Actions for the web UI and middleware only for auth redirects on `/dashboard`.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, TypeScript, Tailwind, Drizzle ORM, PostgreSQL, Node test runner.

---

## File Structure

| Path | Action | Purpose |
| --- | --- | --- |
| `docs/superpowers/specs/2026-05-20-creator-dashboard-design.md` | Create | Canonical slice design and product decisions. |
| `docs/superpowers/plans/2026-05-20-creator-dashboard.md` | Create | Implementation plan. |
| `PROJECT.md` | Modify when shipping | Record approved dashboard shape. |
| `qna-web/src/db/schema/questions.ts` | Modify | Add `deleted_at`; make draft schedule fields nullable. |
| `qna-web/drizzle/0008_*.sql` | Create | Drizzle-generated migration for question draft/delete fields. |
| `qna-web/drizzle/meta/_journal.json` | Modify | Drizzle migration journal. |
| `qna-web/drizzle/meta/0008_snapshot.json` | Create | Drizzle migration snapshot. |
| `qna-web/src/services/questions/state.ts` | Create | Derive question state and unpublished edit/delete policy. |
| `qna-web/src/services/questions/state.test.ts` | Create | Unit tests for state and policy. |
| `qna-web/src/services/questions/dashboard.ts` | Create | Creator dashboard read models. |
| `qna-web/src/services/questions/management-policy.ts` | Create | Pure creator-role, visibility, and immutable-question policy helpers used by services. |
| `qna-web/src/services/questions/management-policy.test.ts` | Create | RED/GREEN tests for creator filtering, publish immutability, and soft-delete visibility. |
| `qna-web/src/services/questions/validation.ts` | Modify | Add draft/update/schedule validation while preserving create validation. |
| `qna-web/src/services/questions/validation.test.ts` | Modify | Add draft and schedule validation tests. |
| `qna-web/src/services/questions/errors.ts` | Modify | Add immutable-question and not-creator errors if needed. |
| `qna-web/src/services/questions/questions.ts` | Modify | Add draft/update/schedule/soft-delete service functions. |
| `qna-web/src/services/questions/index.ts` | Modify | Export dashboard, state, and mutations. |
| `qna-web/src/services/answers/answers.ts` | Modify | Reject drafts/soft-deleted questions and narrow answerable timestamps to non-null. |
| `qna-web/src/app/actions/questions.ts` | Modify | Add dashboard Server Actions. |
| `qna-web/src/proxy.ts` | Create | Redirect anonymous dashboard visitors to login with `next` using the Next.js 16 route-protection convention. |
| `qna-web/src/middleware.test.ts` | Create | Unit test middleware redirect behavior. |
| `qna-web/src/app/dashboard/page.tsx` | Create | Cross-community creator hub. |
| `qna-web/src/app/dashboard/communities/[slug]/page.tsx` | Create | Per-community question management page. |
| `qna-web/src/app/dashboard/_components/CreatorForbidden.tsx` | Create | Friendly signed-in non-creator screen. |
| `qna-web/src/app/dashboard/_components/DashboardCommunityCard.tsx` | Create | Hub card. |
| `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx` | Create | Draft/schedule/edit form. |
| `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementList.tsx` | Create | Grouped question management list. |
| `qna-web/src/app/communities/[slug]/page.tsx` | Modify | Move creator scheduling CTA toward dashboard management. |
| `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx` | Modify | Format only scheduled/published question timestamps. |
| `qna-web/src/app/communities/[slug]/questions/[id]/page.tsx` | Modify | Keep detail date formatting on non-draft question resources. |
| `qna-web/src/app/communities/[slug]/_components/QuestionComposer.tsx` | Delete | Remove orphaned public-page composer after dashboard form replaces it. |

---

### Task 1: Commit Planning Artifacts After Sign-Off

**Files:**
- Create: `docs/superpowers/specs/2026-05-20-creator-dashboard-design.md`
- Create: `docs/superpowers/plans/2026-05-20-creator-dashboard.md`

- [ ] **Step 1: Review sign-off decisions**

Confirm the approved product decisions:

```md
- Hub route: /dashboard
- Drill-down route: /dashboard/communities/[slug]
- Hub card signals: member count, today's GMT question status, next scheduled question, latest broadcast timestamp/link
- Draft data model: scheduled_for, published_at, closes_at are null for drafts
- Edits: drafts and future scheduled questions only
- Deletes: soft-delete drafts and future scheduled questions only
- REST: no new PATCH/DELETE question endpoints in this web dashboard slice
```

- [ ] **Step 2: Commit the docs**

Run:

```bash
git add docs/superpowers/specs/2026-05-20-creator-dashboard-design.md docs/superpowers/plans/2026-05-20-creator-dashboard.md
git commit -m "docs: add creator dashboard spec and plan"
```

Expected: the commit contains only the two planning docs.

---

### Task 2: Question State Helper

**Files:**
- Create: `qna-web/src/services/questions/state.test.ts`
- Create: `qna-web/src/services/questions/state.ts`
- Modify: `qna-web/src/services/questions/index.ts`

- [ ] **Step 1: Write failing state tests**

Create `state.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canManageUnpublishedQuestion,
  getQuestionLifecycleState,
} from './state';

const now = new Date('2026-05-20T12:00:00.000Z');

describe('getQuestionLifecycleState', () => {
  it('derives draft, scheduled, live, closed, and deleted states', () => {
    assert.equal(getQuestionLifecycleState(row({}), now), 'draft');
    assert.equal(
      getQuestionLifecycleState(
        row({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          publishedAt: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
        now,
      ),
      'scheduled',
    );
    assert.equal(
      getQuestionLifecycleState(
        row({
          scheduledFor: '2026-05-20T10:00:00.000Z',
          publishedAt: '2026-05-20T10:00:00.000Z',
          closesAt: '2026-05-21T10:00:00.000Z',
        }),
        now,
      ),
      'live',
    );
    assert.equal(
      getQuestionLifecycleState(
        row({
          scheduledFor: '2026-05-18T10:00:00.000Z',
          publishedAt: '2026-05-18T10:00:00.000Z',
          closesAt: '2026-05-19T10:00:00.000Z',
        }),
        now,
      ),
      'closed',
    );
    assert.equal(
      getQuestionLifecycleState(row({ deletedAt: '2026-05-20T11:00:00.000Z' }), now),
      'deleted',
    );
  });
});

describe('canManageUnpublishedQuestion', () => {
  it('allows draft and future scheduled rows only', () => {
    assert.equal(canManageUnpublishedQuestion(row({}), now), true);
    assert.equal(
      canManageUnpublishedQuestion(
        row({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          publishedAt: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
        now,
      ),
      true,
    );
    assert.equal(
      canManageUnpublishedQuestion(
        row({
          scheduledFor: '2026-05-20T10:00:00.000Z',
          publishedAt: '2026-05-20T10:00:00.000Z',
          closesAt: '2026-05-21T10:00:00.000Z',
        }),
        now,
      ),
      false,
    );
  });
});

function row(values: {
  scheduledFor?: string;
  publishedAt?: string;
  closesAt?: string;
  deletedAt?: string;
}) {
  return {
    scheduledFor: values.scheduledFor ? new Date(values.scheduledFor) : null,
    publishedAt: values.publishedAt ? new Date(values.publishedAt) : null,
    closesAt: values.closesAt ? new Date(values.closesAt) : null,
    deletedAt: values.deletedAt ? new Date(values.deletedAt) : null,
  };
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -w qna-web -- src/services/questions/state.test.ts
```

Expected: FAIL because `state.ts` does not exist.

- [ ] **Step 3: Implement state helper**

Create `state.ts`:

```ts
export type QuestionLifecycleState =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'closed'
  | 'deleted';

export type QuestionStateTimestamps = {
  scheduledFor: Date | null;
  publishedAt: Date | null;
  closesAt: Date | null;
  deletedAt?: Date | null;
};

export function getQuestionLifecycleState(
  question: QuestionStateTimestamps,
  now = new Date(),
): QuestionLifecycleState {
  if (question.deletedAt) return 'deleted';
  if (!question.scheduledFor && !question.publishedAt && !question.closesAt) {
    return 'draft';
  }
  if (question.publishedAt && question.publishedAt.getTime() > now.getTime()) {
    return 'scheduled';
  }
  if (question.closesAt && question.closesAt.getTime() <= now.getTime()) {
    return 'closed';
  }
  return 'live';
}

export function canManageUnpublishedQuestion(
  question: QuestionStateTimestamps,
  now = new Date(),
): boolean {
  const state = getQuestionLifecycleState(question, now);
  return state === 'draft' || state === 'scheduled';
}
```

Update `index.ts`:

```ts
export * from './errors';
export * from './questions';
export * from './state';
export * from './validation';
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm run test -w qna-web -- src/services/questions/state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/services/questions/state.ts qna-web/src/services/questions/state.test.ts qna-web/src/services/questions/index.ts
git commit -m "feat(dashboard): add question state policy"
```

---

### Task 3: Draft Schema Migration

**Files:**
- Modify: `qna-web/src/db/schema/questions.ts`
- Create: `qna-web/drizzle/0008_*.sql`
- Create: `qna-web/drizzle/meta/0008_snapshot.json`
- Modify: `qna-web/drizzle/meta/_journal.json`

- [ ] **Step 1: Update Drizzle question schema**

Modify the `questions` table:

```ts
scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
publishedAt: timestamp('published_at', { withTimezone: true }),
closesAt: timestamp('closes_at', { withTimezone: true }),
deletedAt: timestamp('deleted_at', { withTimezone: true }),
```

Replace the table indexes so the old schedule index does not overlap the active-question index:

```ts
index('questions_active_community_schedule_idx')
  .on(table.communityId, table.scheduledFor)
  .where(sql`${table.deletedAt} is null`),
index('questions_creator_user_id_idx').on(table.creatorUserId),
```

Remove the old index block:

```ts
index('questions_community_schedule_idx').on(
  table.communityId,
  table.scheduledFor,
),
```

- [ ] **Step 2: Generate migration**

Run:

```bash
npm run db:generate -w qna-web
```

Expected: Drizzle creates the next migration that drops `NOT NULL` from `scheduled_for` and `closes_at`, adds `deleted_at`, drops `questions_community_schedule_idx`, and creates the partial `questions_active_community_schedule_idx`.

- [ ] **Step 3: Inspect migration**

Run:

```bash
git diff -- qna-web/src/db/schema/questions.ts qna-web/drizzle
```

Expected: diff is limited to question draft/delete schema changes and generated Drizzle metadata.

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test -w qna-web -- src/services/questions/state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/db/schema/questions.ts qna-web/drizzle
git commit -m "feat(dashboard): support draft question rows"
```

---

### Task 4: Downstream Nullable Timestamp Handling

**Files:**
- Modify: `qna-web/src/services/questions/questions.ts`
- Modify: `qna-web/src/services/answers/answers.ts`
- Modify: `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx`
- Modify: `qna-web/src/app/communities/[slug]/questions/[id]/page.tsx`

- [ ] **Step 1: Update public question listing to exclude drafts and soft-deleted rows**

In `listCommunityQuestions`, add filters so public/member-facing lists only return active scheduled or published questions:

```ts
import { and, asc, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

// ...
.where(
  and(
    eq(questions.communityId, community.id),
    isNull(questions.deletedAt),
    isNotNull(questions.scheduledFor),
    isNotNull(questions.closesAt),
  ),
)
```

Create a scheduled-question resource type so UI callers can rely on non-null timestamps:

```ts
export type ScheduledCommunityQuestion = CommunityQuestion & {
  scheduledFor: Date;
  closesAt: Date;
};
```

Update `listCommunityQuestions` to return `Promise<ScheduledCommunityQuestion[]>` and narrow rows before `withChoices`.

- [ ] **Step 2: Update answer/detail service to reject drafts and soft-deleted rows**

In `loadQuestionContext`, add `isNull(questions.deletedAt)`, `isNotNull(questions.scheduledFor)`, and `isNotNull(questions.closesAt)` to the question lookup. After loading, narrow with a helper before returning context:

```ts
type AnswerableQuestion = typeof questions.$inferSelect & {
  scheduledFor: Date;
  closesAt: Date;
};

function toAnswerableQuestion(
  question: typeof questions.$inferSelect,
): AnswerableQuestion {
  if (!question.scheduledFor || !question.closesAt || question.deletedAt) {
    throw new QuestionNotFoundError();
  }
  return question as AnswerableQuestion;
}
```

Update `QuestionContext.question` to `AnswerableQuestion` so `submitQuestionAnswer`, `gradeAnswer`, and `toQuestionDetail` keep non-null timestamps.

- [ ] **Step 3: Keep UI date formatting non-null**

Update `QuestionList.tsx` to import `ScheduledCommunityQuestion` instead of `CommunityQuestion`. The existing `formatGmtDate(question.scheduledFor)`, `question.scheduledFor.getTime()`, and `question.closesAt.getTime()` calls should remain unchanged because the prop type is narrowed.

Confirm `QuestionDetail` in `answers.ts` still exposes `scheduledFor: Date` and `closesAt: Date`, so the question detail page continues to format non-null dates without draft checks.

- [ ] **Step 4: Run build gate before moving on**

Run:

```bash
npm run lint -w qna-web
npm run build -w qna-web
```

Expected: both commands exit 0. This task exists specifically so the schema nullability migration does not leave the repository in a broken intermediate state.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/services/questions/questions.ts qna-web/src/services/answers/answers.ts qna-web/src/app/communities/[slug]/_components/QuestionList.tsx qna-web/src/app/communities/[slug]/questions/[id]/page.tsx
git commit -m "feat(dashboard): contain draft question nullability"
```

---

### Task 5: Validation For Drafts, Updates, And Scheduling

**Files:**
- Modify: `qna-web/src/services/questions/validation.test.ts`
- Modify: `qna-web/src/services/questions/validation.ts`

- [ ] **Step 1: Add failing validation tests**

Append tests that cover a complete draft without schedule and schedule-only validation:

```ts
import {
  validateDraftQuestionInput,
  validateScheduleQuestionInput,
} from './validation';

test('validates a complete draft without a schedule', () => {
  const draft = validateDraftQuestionInput({
    prompt: 'Which tool should own database migrations?',
    explanation: 'Drizzle migrations keep schema history reviewable.',
    choices: [
      { label: 'Drizzle', isCorrect: true },
      { label: 'Ad hoc SQL', isCorrect: false },
    ],
  });

  assert.equal(draft.scheduledFor, null);
  assert.equal(draft.closesAt, null);
  assert.equal(draft.points, 10);
  assert.equal(draft.choices.length, 2);
});

test('validates a future GMT schedule', () => {
  const schedule = validateScheduleQuestionInput(
    { scheduledFor: '2026-05-21T12:00' },
    { now: new Date('2026-05-20T12:00:00.000Z') },
  );

  assert.equal(schedule.scheduledFor.toISOString(), '2026-05-21T12:00:00.000Z');
  assert.equal(schedule.closesAt.toISOString(), '2026-05-22T12:00:00.000Z');
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -w qna-web -- src/services/questions/validation.test.ts
```

Expected: FAIL because the new validation exports do not exist.

- [ ] **Step 3: Implement validation exports**

Add types:

```ts
export type DraftQuestionInput = Omit<
  CreateQuestionInput,
  'scheduledFor' | 'closesAt'
> & {
  scheduledFor: null;
  closesAt: null;
};

export type ScheduleQuestionInput = {
  scheduledFor: Date;
  closesAt: Date;
  publishedAt: Date;
  timeZone: 'GMT';
};
```

Add functions:

```ts
export function validateDraftQuestionInput(
  raw: {
    prompt?: unknown;
    explanation?: unknown;
    imageUrl?: unknown;
    choices?: unknown;
  },
): DraftQuestionInput {
  const full = validateQuestionCore(raw);
  return {
    ...full,
    scheduledFor: null,
    closesAt: null,
    timeZone: 'GMT',
    points: DEFAULT_POINTS,
  };
}

export function validateScheduleQuestionInput(
  raw: { scheduledFor?: unknown },
  options: { now?: Date } = {},
): ScheduleQuestionInput {
  const now = options.now ?? new Date();
  const fieldErrors: Record<string, string> = {};
  const scheduledFor = parseGmtDateTime(raw.scheduledFor);

  if (!scheduledFor) {
    fieldErrors.scheduledFor = 'Choose a GMT publish time.';
  } else if (scheduledFor.getTime() < now.getTime() - PAST_SCHEDULE_GRACE_MS) {
    fieldErrors.scheduledFor = 'Choose a GMT time in the future.';
  }

  if (Object.keys(fieldErrors).length > 0 || !scheduledFor) {
    throw new QuestionsValidationError(fieldErrors);
  }

  return {
    scheduledFor,
    publishedAt: scheduledFor,
    closesAt: new Date(
      scheduledFor.getTime() + DEFAULT_ANSWER_WINDOW_HOURS * 60 * 60 * 1000,
    ),
    timeZone: 'GMT',
  };
}
```

Refactor `validateCreateQuestionInput` to reuse the same core prompt/explanation/choice validation and continue requiring a schedule for direct scheduled creation.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm run test -w qna-web -- src/services/questions/validation.test.ts
```

Expected: PASS for both the new draft/schedule tests and the existing scheduled-question creation tests. The refactor must preserve `validateCreateQuestionInput` behavior for required prompt, explanation, future GMT schedule, 2 to 6 choices, exactly one correct answer, 10 default points, and the 24-hour answer window.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/services/questions/validation.ts qna-web/src/services/questions/validation.test.ts
git commit -m "feat(dashboard): add draft question validation"
```

---

### Task 6: Dashboard Read Models And Question Mutations

**Files:**
- Create: `qna-web/src/services/questions/management-policy.test.ts`
- Create: `qna-web/src/services/questions/management-policy.ts`
- Create: `qna-web/src/services/questions/dashboard.ts`
- Modify: `qna-web/src/services/questions/errors.ts`
- Modify: `qna-web/src/services/questions/questions.ts`
- Modify: `qna-web/src/services/questions/index.ts`

- [ ] **Step 1: Write failing management policy tests**

Create `management-policy.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QuestionImmutableError } from './errors';
import {
  assertCanManageQuestion,
  canAccessCreatorDashboard,
  shouldIncludeQuestionInActiveReads,
} from './management-policy';

const now = new Date('2026-05-20T12:00:00.000Z');

describe('canAccessCreatorDashboard', () => {
  it('allows creator memberships only', () => {
    assert.equal(canAccessCreatorDashboard('creator'), true);
    assert.equal(canAccessCreatorDashboard('member'), false);
    assert.equal(canAccessCreatorDashboard(null), false);
  });
});

describe('assertCanManageQuestion', () => {
  it('allows drafts and future scheduled questions', () => {
    assert.doesNotThrow(() => assertCanManageQuestion(question({}), now));
    assert.doesNotThrow(() =>
      assertCanManageQuestion(
        question({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          publishedAt: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
        now,
      ),
    );
  });

  it('rejects live, closed, and soft-deleted questions', () => {
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({
            scheduledFor: '2026-05-20T10:00:00.000Z',
            publishedAt: '2026-05-20T10:00:00.000Z',
            closesAt: '2026-05-21T10:00:00.000Z',
          }),
          now,
        ),
      QuestionImmutableError,
    );
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({
            scheduledFor: '2026-05-18T10:00:00.000Z',
            publishedAt: '2026-05-18T10:00:00.000Z',
            closesAt: '2026-05-19T10:00:00.000Z',
          }),
          now,
        ),
      QuestionImmutableError,
    );
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({ deletedAt: '2026-05-20T11:00:00.000Z' }),
          now,
        ),
      QuestionImmutableError,
    );
  });
});

describe('shouldIncludeQuestionInActiveReads', () => {
  it('excludes drafts and soft-deleted questions from public/member reads', () => {
    assert.equal(shouldIncludeQuestionInActiveReads(question({})), false);
    assert.equal(
      shouldIncludeQuestionInActiveReads(
        question({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
      ),
      true,
    );
    assert.equal(
      shouldIncludeQuestionInActiveReads(
        question({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
          deletedAt: '2026-05-20T11:00:00.000Z',
        }),
      ),
      false,
    );
  });
});

function question(values: {
  scheduledFor?: string;
  publishedAt?: string;
  closesAt?: string;
  deletedAt?: string;
}) {
  return {
    scheduledFor: values.scheduledFor ? new Date(values.scheduledFor) : null,
    publishedAt: values.publishedAt ? new Date(values.publishedAt) : null,
    closesAt: values.closesAt ? new Date(values.closesAt) : null,
    deletedAt: values.deletedAt ? new Date(values.deletedAt) : null,
  };
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -w qna-web -- src/services/questions/management-policy.test.ts
```

Expected: FAIL because `management-policy.ts` and `QuestionImmutableError` do not exist.

- [ ] **Step 3: Add errors and policy helpers**

Add to `errors.ts`:

```ts
export class QuestionImmutableError extends Error {
  constructor() {
    super('Published questions cannot be changed in this dashboard slice.');
    this.name = 'QuestionImmutableError';
  }
}
```

Create `management-policy.ts`:

```ts
import type { CommunityRole } from '@/services/communities';
import { QuestionImmutableError } from './errors';
import {
  canManageUnpublishedQuestion,
  type QuestionStateTimestamps,
} from './state';

export function canAccessCreatorDashboard(
  role: CommunityRole | null,
): boolean {
  return role === 'creator';
}

export function assertCanManageQuestion(
  question: QuestionStateTimestamps,
  now = new Date(),
): void {
  if (!canManageUnpublishedQuestion(question, now)) {
    throw new QuestionImmutableError();
  }
}

export function shouldIncludeQuestionInActiveReads(
  question: QuestionStateTimestamps,
): boolean {
  return Boolean(
    !question.deletedAt &&
      question.scheduledFor &&
      question.closesAt,
  );
}
```

- [ ] **Step 4: Run policy GREEN**

Run:

```bash
npm run test -w qna-web -- src/services/questions/management-policy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add dashboard read service**

Create `dashboard.ts` with exported types:

```ts
export type CreatorDashboardCommunity = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  cadence: string;
  memberCount: number;
  todayQuestionStatus: 'live' | 'scheduled_today' | 'missing_today' | 'closed_today';
  nextQuestionAt: Date | null;
  latestBroadcastAt: Date | null;
};

export type CreatorCommunityDashboard = {
  community: {
    id: string;
    slug: string;
    name: string;
    emoji: string;
    memberCount: number;
  };
  questions: CommunityQuestion[];
};
```

Implement:

```ts
export async function listCreatorCommunitiesDashboard({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}): Promise<CreatorDashboardCommunity[]> {
  const creatorCommunities = await loadActiveCreatorCommunities(userId);
  const communityIds = creatorCommunities.map((community) => community.id);
  const [memberCounts, questionSignals, latestBroadcasts] = await Promise.all([
    loadMemberCounts(communityIds),
    loadQuestionSignals(communityIds, now),
    loadLatestBroadcastTimes(communityIds),
  ]);

  return creatorCommunities.map((community) =>
    toCreatorDashboardCommunity({
      community,
      memberCount: memberCounts.get(community.id) ?? 0,
      questionSignal: questionSignals.get(community.id) ?? null,
      latestBroadcastAt: latestBroadcasts.get(community.id) ?? null,
      now,
    }),
  );
}

export async function getCreatorCommunityDashboard({
  slug,
  userId,
  now = new Date(),
}: {
  slug: string;
  userId: string;
  now?: Date;
}): Promise<CreatorCommunityDashboard | null> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community || !canAccessCreatorDashboard(community.currentUserRole)) {
    return null;
  }

  const questions = await listDashboardQuestions({
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
    questions,
  };
}
```

Use Drizzle query APIs and focused private helpers. Dashboard queries must filter by `community_members.role = 'creator'` and exclude `questions.deleted_at` rows.

- [ ] **Step 6: Add mutating service functions**

In `questions.ts`, add:

```ts
export async function createQuestionDraft({
  slug,
  creatorUserId,
  input,
}: {
  slug: string;
  creatorUserId: string;
  input: DraftQuestionInput;
}): Promise<CommunityQuestion>;

export async function updateUnpublishedQuestion({
  slug,
  questionId,
  creatorUserId,
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  creatorUserId: string;
  input: DraftQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion>;

export async function scheduleQuestion({
  slug,
  questionId,
  creatorUserId,
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  creatorUserId: string;
  input: ScheduleQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion>;

export async function softDeleteUnpublishedQuestion({
  slug,
  questionId,
  creatorUserId,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  creatorUserId: string;
  now?: Date;
}): Promise<void>;
```

Implementation rules:

- Resolve active community with `getCommunityBySlug(slug, creatorUserId)`.
- Throw `QuestionPermissionError` unless `currentUserRole === 'creator'`.
- Load target question by `id`, `communityId`, and `deletedAt is null`.
- Throw `QuestionNotFoundError` when missing.
- Call `assertCanManageQuestion(question, now)` before update, schedule, or soft-delete.
- For updates, replace choices inside a DB transaction if available; if no transaction helper exists, update the question, delete existing choices, insert new choices, and keep errors typed.
- For schedules, set `scheduledFor`, `publishedAt`, `closesAt`, `timeZone`, and `updatedAt`.
- For deletes, set `deletedAt` and `updatedAt`; do not delete choices.

- [ ] **Step 7: Export service APIs**

Update `index.ts`:

```ts
export * from './dashboard';
export * from './errors';
export * from './management-policy';
export * from './questions';
export * from './state';
export * from './validation';
```

- [ ] **Step 8: Run focused tests and lint**

Run:

```bash
npm run test -w qna-web -- src/services/questions/*.test.ts
npm run lint -w qna-web
```

Expected: tests pass and lint has no errors. This includes explicit coverage for creator-role dashboard access, immutable published questions, and soft-delete visibility.

- [ ] **Step 9: Commit**

Run:

```bash
git add qna-web/src/services/questions
git commit -m "feat(dashboard): add creator question services"
```

---

### Task 7: Dashboard Server Actions

**Files:**
- Modify: `qna-web/src/app/actions/questions.ts`

- [ ] **Step 1: Add action state types**

Add:

```ts
export type DashboardQuestionFormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<'prompt' | 'explanation' | 'scheduledFor' | 'choices', string>>;
};
```

- [ ] **Step 2: Add actions**

Implement:

```ts
export async function createQuestionDraftAction(
  slug: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState>;

export async function updateQuestionAction(
  slug: string,
  questionId: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState>;

export async function scheduleQuestionAction(
  slug: string,
  questionId: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState>;

export async function deleteQuestionAction(
  slug: string,
  questionId: string,
): Promise<void>;
```

Behavior:

- Use `getSession()`.
- Redirect anonymous users to `/login?next=/dashboard/communities/${slug}`.
- Convert `FormData` into the same choice array shape used by `createQuestionAction`.
- Map `QuestionsValidationError` to `fieldErrors`.
- Map `QuestionPermissionError`, `QuestionImmutableError`, and `QuestionNotFoundError` to `formError` for form actions.
- Revalidate `/dashboard`, `/dashboard/communities/${slug}`, and `/communities/${slug}` after success.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add qna-web/src/app/actions/questions.ts
git commit -m "feat(dashboard): add question management actions"
```

---

### Task 8: Protected Route Proxy

**Files:**
- Create: `qna-web/src/proxy.ts`
- Create: `qna-web/src/middleware.test.ts`

- [ ] **Step 1: Write failing middleware tests**

Create `middleware.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildLoginRedirectUrl } from './proxy';

describe('buildLoginRedirectUrl', () => {
  it('preserves dashboard path and search in next param', () => {
    const url = buildLoginRedirectUrl(
      new URL('https://qna.test/dashboard/communities/daily-ai?tab=drafts'),
    );

    assert.equal(
      url.toString(),
      'https://qna.test/login?next=%2Fdashboard%2Fcommunities%2Fdaily-ai%3Ftab%3Ddrafts',
    );
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -w qna-web -- src/middleware.test.ts
```

Expected: FAIL because proxy helper does not exist.

- [ ] **Step 3: Implement route proxy**

Create `proxy.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/services/auth';

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) return NextResponse.next();
  return NextResponse.redirect(buildLoginRedirectUrl(request.nextUrl));
}

export function buildLoginRedirectUrl(url: URL): URL {
  const loginUrl = new URL('/login', url.origin);
  loginUrl.searchParams.set('next', `${url.pathname}${url.search}`);
  return loginUrl;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
};
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm run test -w qna-web -- src/middleware.test.ts
npm run lint -w qna-web
```

Expected: tests pass and lint has no errors.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/proxy.ts qna-web/src/middleware.test.ts
git commit -m "feat(dashboard): protect dashboard routes"
```

---

### Task 9: Dashboard Pages And Components

**Files:**
- Create: `qna-web/src/app/dashboard/page.tsx`
- Create: `qna-web/src/app/dashboard/_components/CreatorForbidden.tsx`
- Create: `qna-web/src/app/dashboard/_components/DashboardCommunityCard.tsx`
- Create: `qna-web/src/app/dashboard/communities/[slug]/page.tsx`
- Create: `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx`
- Create: `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementList.tsx`

- [ ] **Step 1: Add friendly forbidden component**

Create a server component with a short message and links to browse/create communities:

```tsx
import Link from 'next/link';

export function CreatorForbidden() {
  return (
    <section className="px-6 py-16 md:px-12">
      <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Creator access
        </p>
        <h1 className="mt-3 text-3xl font-bold">No creator communities yet</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The dashboard is available once you create a community or become a creator in one.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/communities/new" className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-paper">
            Create community
          </Link>
          <Link href="/communities" className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink">
            Browse communities
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add hub page**

`/dashboard/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { listCreatorCommunitiesDashboard } from '@/services/questions';
import { CreatorForbidden } from './_components/CreatorForbidden';
import { DashboardCommunityCard } from './_components/DashboardCommunityCard';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/dashboard');

  const communities = await listCreatorCommunitiesDashboard({
    userId: session.sub,
  });

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      {communities.length === 0 ? (
        <CreatorForbidden />
      ) : (
        <section className="px-6 py-12 md:px-12 md:py-16">
          <div className="mx-auto max-w-[1100px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Creator
            </p>
            <h1 className="mt-2 text-[38px] font-bold leading-tight md:text-[52px]">
              Dashboard
            </h1>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {communities.map((community) => (
                <DashboardCommunityCard key={community.id} community={community} />
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}
```

- [ ] **Step 3: Add hub card**

Render member count, today's status, next question, latest broadcast timestamp, and links to manage, public community, and broadcasts.

- [ ] **Step 4: Add per-community page**

`/dashboard/communities/[slug]/page.tsx` loads `getCreatorCommunityDashboard({ slug, userId })`, renders `CreatorForbidden` when null, and otherwise renders the form and grouped list.

- [ ] **Step 5: Add question management form**

Create a client component using `useActionState`. It supports:

- create draft mode with prompt, explanation, choices, optional schedule
- edit mode for draft/scheduled questions
- schedule form for drafts
- submit buttons labeled `Save draft`, `Schedule question`, and `Save changes`

- [ ] **Step 6: Add grouped question list**

Group by `getQuestionLifecycleState(question, now)` into Drafts, Scheduled, and Published. Drafts and scheduled rows render edit/delete controls. Published rows render a public detail link only.

- [ ] **Step 7: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 8: Commit**

Run:

```bash
git add qna-web/src/app/dashboard
git commit -m "feat(dashboard): add creator dashboard pages"
```

---

### Task 10: Public Community Page Adjustment

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/page.tsx`
- Delete: `qna-web/src/app/communities/[slug]/_components/QuestionComposer.tsx`

- [ ] **Step 1: Replace inline creator composer**

For creators, replace the current sticky `QuestionComposer` panel with a dashboard CTA:

```tsx
<aside className="rounded-lg border border-line bg-card p-5 lg:sticky lg:top-6 lg:self-start">
  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
    Creator
  </p>
  <h2 className="mt-2 text-2xl font-bold">Manage questions</h2>
  <p className="mt-2 text-sm leading-6 text-muted">
    Draft, schedule, and edit upcoming questions from the creator dashboard.
  </p>
  <Link
    href={`/dashboard/communities/${community.slug}`}
    className="mt-5 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper"
  >
    Open dashboard
  </Link>
</aside>
```

Remove the unused `QuestionComposer` import.

- [ ] **Step 2: Delete the orphaned public composer**

Delete `qna-web/src/app/communities/[slug]/_components/QuestionComposer.tsx`. The new dashboard `QuestionManagementForm` replaces it and owns draft/schedule/edit behavior.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add qna-web/src/app/communities/[slug]/page.tsx qna-web/src/app/communities/[slug]/_components/QuestionComposer.tsx
git commit -m "feat(dashboard): move creator question entrypoint"
```

---

### Task 11: Product Docs And Final Verification

**Files:**
- Modify: `PROJECT.md`

- [ ] **Step 1: Update `PROJECT.md`**

Update Sections 4, 6, and 11 with the shipped dashboard shape:

```md
Creator dashboard v1:

- `/dashboard` is the cross-community creator hub.
- `/dashboard/communities/[slug]` is the per-community question management route.
- Creators can save draft questions, schedule drafts, edit unpublished questions, and soft-delete unpublished questions.
- Published questions are view-only in the dashboard.
- Member management, community settings, analytics, dashboard broadcast management, mobile dashboard UI, and platform admin are separate slices.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test -w qna-web
npm run lint -w qna-web
npm run build -w qna-web
```

Expected: all commands exit 0.

- [ ] **Step 3: Browser smoke**

Start the dev server:

```bash
npm run dev -w qna-web
```

Verify in the browser:

- anonymous `/dashboard` redirects to `/login?next=%2Fdashboard`
- signed-in non-creator sees the friendly creator access screen
- creator sees `/dashboard` with creator community cards
- creator opens `/dashboard/communities/[slug]`
- creator creates a draft
- creator schedules the draft
- creator edits a future scheduled question
- creator cannot edit a published question from the UI

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff --stat
```

Expected: only creator dashboard docs, question schema/migration, question services/actions, dashboard routes/components, middleware, community page CTA, and `PROJECT.md` changed.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add PROJECT.md
git commit -m "docs: capture creator dashboard behavior"
```

---

## Self-Review

- Spec coverage: hub route, drill-down route, creator gates, middleware, hub signals, draft model, unpublished edit/delete policy, REST scope, product-doc update, and out-of-scope items are mapped to tasks.
- Placeholder scan: the plan has no unresolved placeholders or deferred implementation markers inside Phase 1.
- Type consistency: `QuestionLifecycleState`, `DashboardQuestionFormState`, `CreatorDashboardCommunity`, and `CreatorCommunityDashboard` are named consistently across tasks.
- Risk note: Task 6 is the densest task because it touches DB reads and mutations; keep state, management-policy, and validation tests green before wiring UI.
