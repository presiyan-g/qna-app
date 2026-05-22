# Question Preview Result Cues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `QuestionList` cards on `/communities/[slug]` visually reflect the viewer's answer per question — green border + ✓ on the correct choice, red border + ✗ on the viewer's wrong pick, with the correct choice always green-bordered whenever a reveal is allowed.

**Architecture:** Extend `ScheduledCommunityQuestion` with two viewer-aware fields (`viewerAnswer`, `revealedCorrectChoiceId`). `listCommunityQuestionsForCommunity` learns a `viewerUserId` and runs two batched lookups (correct choices, viewer answers) keyed by the result's question IDs. The community detail page passes the viewer's id through. `QuestionList` consumes the new fields via a pure `classifyChoice` helper to apply per-choice border + icon styles.

**Tech Stack:** Next.js (server components), Drizzle ORM (Postgres/Neon), `node:test`, Tailwind, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-22-question-preview-result-cues-design.md`.

---

## Repo conventions to follow

- Unit tests run via `npm test` from `qna-web/` (`tsx --test "src/**/*.test.ts"`).
- TypeScript check: `npx tsc --noEmit -p .` from `qna-web/`. Lint: `npm run lint`.
- Services are `'server-only'` and live in `qna-web/src/services/<feature>/`.
- Server components are default. Add `"use client"` only when needed (this slice doesn't need any).
- **The user prefers to commit themselves.** Each task ends with a commit step that PRINTS the suggested commit command. **Do not run `git commit` yourself unless the user explicitly says so.** Stage the files and stop; the user will commit.

---

## File map

**Create:**
- `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.ts` — pure helper `classifyChoice` returning `'correct' | 'wrong-pick' | 'neutral'`.
- `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.test.ts` — unit tests for the helper.

**Modify:**
- `qna-web/src/services/questions/questions.ts` — add `ViewerAnswerSummary` type, extend `ScheduledCommunityQuestion` with `viewerAnswer` + `revealedCorrectChoiceId`, extend `listCommunityQuestionsForCommunity` (and `listCommunityQuestions` which delegates to it) with `viewerUserId`, add the two batched lookups, attach the new fields.
- `qna-web/src/app/communities/[slug]/page.tsx` — pass `viewerUserId: session?.sub ?? null` into the service call.
- `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx` — call `classifyChoice` per choice, render border/bg + ✓ or ✗ icon, drop the old creator-only `"Correct"` pill, add inline `CheckIcon` and `CrossIcon` SVGs.

---

## Task 1: Pure helper `classifyChoice` (TDD)

**Files:**
- Create: `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.ts`
- Create: `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.test.ts`

- [ ] **Step 1: Write the failing test**

Create `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyChoice } from './questionPreviewChoice';

describe('classifyChoice', () => {
  it('returns "correct" when the choice is the revealed correct one', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c1',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: true },
        revealedCorrectChoiceId: 'c1',
      }),
      'correct',
    );
  });

  it('returns "correct" for the right answer even when the viewer picked something else', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c2',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: false },
        revealedCorrectChoiceId: 'c2',
      }),
      'correct',
    );
  });

  it('returns "correct" on the correct choice for a missed-but-closed question (no viewer answer)', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c3',
        viewerAnswer: null,
        revealedCorrectChoiceId: 'c3',
      }),
      'correct',
    );
  });

  it('returns "wrong-pick" when the viewer picked this choice and it is not the correct one', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c1',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: false },
        revealedCorrectChoiceId: 'c2',
      }),
      'wrong-pick',
    );
  });

  it('returns "neutral" for an untouched choice when the reveal triggered elsewhere', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c4',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: false },
        revealedCorrectChoiceId: 'c2',
      }),
      'neutral',
    );
  });

  it('returns "neutral" when there is no reveal at all', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c1',
        viewerAnswer: null,
        revealedCorrectChoiceId: null,
      }),
      'neutral',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

From `D:\Projects\qna-app\qna-web`:

```bash
npm test -- --test-name-pattern="classifyChoice"
```

Expected: FAIL — module `./questionPreviewChoice` does not exist.

- [ ] **Step 3: Implement the helper**

Create `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.ts`:

```ts
export type ViewerAnswerSummary = {
  selectedChoiceId: string;
  isCorrect: boolean;
};

export type ChoiceClassification = 'correct' | 'wrong-pick' | 'neutral';

export function classifyChoice({
  choiceId,
  viewerAnswer,
  revealedCorrectChoiceId,
}: {
  choiceId: string;
  viewerAnswer: ViewerAnswerSummary | null;
  revealedCorrectChoiceId: string | null;
}): ChoiceClassification {
  if (revealedCorrectChoiceId === choiceId) return 'correct';
  if (viewerAnswer?.selectedChoiceId === choiceId) return 'wrong-pick';
  return 'neutral';
}
```

Note: `ViewerAnswerSummary` is also exported here so the same name can be shared by the server type. Task 2 will re-export the type from the service module (which imports it would create a layer inversion); instead Task 2 will declare an identical type. The component-side and service-side types are structurally compatible.

- [ ] **Step 4: Run the test to verify it passes**

From `qna-web/`:

```bash
npm test -- --test-name-pattern="classifyChoice"
```

Expected: PASS — all six cases.

- [ ] **Step 5: Run full test + typecheck**

From `qna-web/`:

```bash
npm test
npx tsc --noEmit -p .
```

Expected: all green.

- [ ] **Step 6: Stage and stop for the user to commit**

Stage:

```bash
git add qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.ts \
        qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.test.ts
```

**Do not run** `git commit`. Print this suggested commit for the user:

```
feat(questions): add classifyChoice helper for preview result cues
```

---

## Task 2: Service — extend type + viewer-aware lookups, page wiring

These two changes go together. Task 2 alone breaks the call site type (the service signature changes); Task 3 (the page wiring) fixes it. Bundle both into one commit boundary.

**Files:**
- Modify: `qna-web/src/services/questions/questions.ts`
- Modify: `qna-web/src/app/communities/[slug]/page.tsx`

- [ ] **Step 1: Add imports and the `ViewerAnswerSummary` type at the top of `questions.ts`**

At the top of `qna-web/src/services/questions/questions.ts`, add `answers` to the db-schema imports (alongside the existing `questionChoices, questions`) and declare the new type after the existing `SafeQuestionChoice` type (~line 33):

```ts
// add to existing schema imports
import { answers } from '@/db/schema/answers';
```

Then, just after `export type SafeQuestionChoice` (around line 33-38), add:

```ts
export type ViewerAnswerSummary = {
  selectedChoiceId: string;
  isCorrect: boolean;
};
```

- [ ] **Step 2: Extend `ScheduledCommunityQuestion`**

Around line 46:

```ts
export type ScheduledCommunityQuestion = CommunityQuestion & {
  scheduledFor: Date;
  closesAt: Date;
  viewerAnswer: ViewerAnswerSummary | null;
  revealedCorrectChoiceId: string | null;
};
```

- [ ] **Step 3: Extend `listCommunityQuestionsForCommunity` signature**

Replace the function (around lines 73-105) with:

```ts
export async function listCommunityQuestionsForCommunity({
  community,
  viewerUserId = null,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: {
  community: Pick<CommunityWithMembership, 'id' | 'currentUserRole'>;
  viewerUserId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ScheduledCommunityQuestion[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const safeOffset = Math.max(offset, 0);
  const canSeeCorrectAnswers = community.currentUserRole === 'creator';

  const rows = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.communityId, community.id),
        isNull(questions.deletedAt),
        isNotNull(questions.scheduledFor),
        isNotNull(questions.closesAt),
      ),
    )
    .orderBy(desc(questions.scheduledFor))
    .limit(safeLimit)
    .offset(safeOffset);

  const scheduledRows = rows.map(toScheduledQuestion);
  const withChoiceRows = await withChoices(scheduledRows, canSeeCorrectAnswers);

  const baseQuestions: ScheduledCommunityQuestion[] = withChoiceRows.map(
    (q, i) => ({
      ...q,
      scheduledFor: scheduledRows[i].scheduledFor,
      closesAt: scheduledRows[i].closesAt,
      viewerAnswer: null,
      revealedCorrectChoiceId: null,
    }),
  );

  const questionIds = baseQuestions.map((q) => q.id);
  const [correctMap, answerMap] = await Promise.all([
    fetchCorrectChoiceMap(questionIds),
    fetchViewerAnswerMap(questionIds, viewerUserId),
  ]);

  const now = Date.now();
  const isMember =
    community.currentUserRole === 'member' ||
    community.currentUserRole === 'creator';
  const isCreator = community.currentUserRole === 'creator';

  return baseQuestions.map((q) => {
    const viewerAnswer = answerMap.get(q.id) ?? null;
    const closedNow = q.closesAt.getTime() <= now;
    const isRevealed =
      isCreator || viewerAnswer !== null || (closedNow && isMember);
    const revealedCorrectChoiceId = isRevealed
      ? (correctMap.get(q.id) ?? null)
      : null;
    return { ...q, viewerAnswer, revealedCorrectChoiceId };
  });
}
```

`toScheduledQuestion(question: Question)` already exists at the bottom of the file. It takes one argument and asserts `scheduledFor` and `closesAt` are non-null, returning the same row narrowed. The pattern above runs the assertion first, then layers on choices, then layers on the two new viewer-aware fields.

- [ ] **Step 4: Update `listCommunityQuestions` to thread `viewerUserId`**

Around lines 61-71:

```ts
export async function listCommunityQuestions({
  slug,
  userId = null,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: ListCommunityQuestionsOptions): Promise<ScheduledCommunityQuestion[]> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) return [];

  return listCommunityQuestionsForCommunity({
    community,
    viewerUserId: userId,
    limit,
    offset,
  });
}
```

- [ ] **Step 5: Add the two batched lookups at the bottom of `questions.ts`**

Append these helpers near `withChoices` (after line 366):

```ts
async function fetchCorrectChoiceMap(
  questionIds: string[],
): Promise<Map<string, string>> {
  if (questionIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: questionChoices.id,
      questionId: questionChoices.questionId,
    })
    .from(questionChoices)
    .where(
      and(
        inArray(questionChoices.questionId, questionIds),
        eq(questionChoices.isCorrect, true),
      ),
    );
  return new Map(rows.map((r) => [r.questionId, r.id]));
}

async function fetchViewerAnswerMap(
  questionIds: string[],
  viewerUserId: string | null,
): Promise<Map<string, ViewerAnswerSummary>> {
  if (!viewerUserId || questionIds.length === 0) return new Map();
  const rows = await db
    .select({
      questionId: answers.questionId,
      selectedChoiceId: answers.selectedChoiceId,
      isCorrect: answers.isCorrect,
    })
    .from(answers)
    .where(
      and(
        eq(answers.userId, viewerUserId),
        inArray(answers.questionId, questionIds),
      ),
    );
  return new Map(
    rows.map((r) => [
      r.questionId,
      { selectedChoiceId: r.selectedChoiceId, isCorrect: r.isCorrect },
    ]),
  );
}
```

- [ ] **Step 6: Wire `viewerUserId` into the page**

In `qna-web/src/app/communities/[slug]/page.tsx`, around line 24-30, change:

```ts
const [questions, latestBroadcast] = await Promise.all([
  listCommunityQuestionsForCommunity({ community }),
  getLatestCommunityBroadcastForCommunity({
    community,
    viewerUserId: session?.sub ?? null,
  }),
]);
```

to:

```ts
const [questions, latestBroadcast] = await Promise.all([
  listCommunityQuestionsForCommunity({
    community,
    viewerUserId: session?.sub ?? null,
  }),
  getLatestCommunityBroadcastForCommunity({
    community,
    viewerUserId: session?.sub ?? null,
  }),
]);
```

- [ ] **Step 7: Update `listCommunityQuestions` callers if needed**

Run a quick grep to confirm no other call site needs to pass `viewerUserId` explicitly (the `?? null` default keeps existing callers compiling):

From `D:\Projects\qna-app`:

```bash
grep -rn "listCommunityQuestionsForCommunity\|listCommunityQuestions" qna-web/src --include="*.ts" --include="*.tsx"
```

For every match outside `services/questions/`, confirm the call still compiles. Existing callers that don't pass `viewerUserId` rely on the default `null` (== "no viewer reveal"). The dashboard / management paths use `listDashboardQuestions` instead, which is unaffected.

- [ ] **Step 8: Run typecheck and tests**

From `qna-web/`:

```bash
npx tsc --noEmit -p .
npm test
```

Expected: clean typecheck, all tests pass (no new tests added in this task — the helper from Task 1 already passes and existing tests are unaffected).

- [ ] **Step 9: Stage and stop for the user to commit**

Stage:

```bash
git add qna-web/src/services/questions/questions.ts \
        qna-web/src/app/communities/[slug]/page.tsx
```

Do not run `git commit`. Suggested message:

```
feat(questions): attach viewerAnswer and revealedCorrectChoiceId to schedule previews
```

---

## Task 3: UI — `QuestionList` per-choice border + icon

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx` with:

```tsx
import Link from 'next/link';
import type { ScheduledCommunityQuestion } from '@/services/questions';
import {
  classifyChoice,
  type ChoiceClassification,
} from './questionPreviewChoice';

export function QuestionList({
  questions,
  slug,
}: {
  questions: ScheduledCommunityQuestion[];
  slug: string;
}) {
  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Questions
        </p>
        <h2 className="mt-3 text-2xl font-bold">No questions scheduled yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The creator has not added the first challenge for this community.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Questions
        </p>
        <h2 className="mt-2 text-2xl font-bold">Community schedule</h2>
      </div>
      {questions.map((question) => (
        <article
          key={question.id}
          className="rounded-lg border border-line bg-card p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-[12px] font-semibold text-primary">
                {getQuestionState(question)}
              </span>
              <h3 className="mt-3 text-xl font-bold leading-snug">
                {question.prompt}
              </h3>
            </div>
            <div className="shrink-0 text-sm text-muted sm:text-right">
              <p className="font-semibold text-ink">
                {formatGmtDate(question.scheduledFor)}
              </p>
              <p>{question.points} points</p>
            </div>
          </div>

          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.choices.map((choice) => {
              const classification = classifyChoice({
                choiceId: choice.id,
                viewerAnswer: question.viewerAnswer,
                revealedCorrectChoiceId: question.revealedCorrectChoiceId,
              });
              return (
                <li
                  key={choice.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${choiceClassName(
                    classification,
                  )}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[12px] font-bold text-muted">
                    {choice.position}
                  </span>
                  <span className="min-w-0 flex-1">{choice.label}</span>
                  {classification === 'correct' ? (
                    <CheckIcon className="text-emerald-600" />
                  ) : classification === 'wrong-pick' ? (
                    <CrossIcon className="text-rose-600" />
                  ) : null}
                </li>
              );
            })}
          </ol>

          {canShowExplanation(question) && (
            <p className="mt-4 rounded-lg border border-line bg-primary-soft p-3 text-sm leading-6 text-muted">
              {question.explanation}
            </p>
          )}

          <Link
            href={`/communities/${slug}/questions/${question.id}`}
            className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-paper"
          >
            Open question
          </Link>
        </article>
      ))}
    </section>
  );
}

function choiceClassName(state: ChoiceClassification): string {
  switch (state) {
    case 'correct':
      return 'border-emerald-400 bg-emerald-50';
    case 'wrong-pick':
      return 'border-rose-400 bg-rose-50';
    case 'neutral':
      return 'border-line bg-paper';
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 12l4 4L19 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getQuestionState(question: ScheduledCommunityQuestion): string {
  const now = Date.now();
  if (question.closesAt.getTime() <= now) return 'Closed';
  if (question.scheduledFor.getTime() > now) return 'Scheduled';
  return 'Published';
}

function canShowExplanation(question: ScheduledCommunityQuestion): boolean {
  return (
    Boolean(question.explanation) &&
    question.choices.some((choice) => choice.isCorrect === true)
  );
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

Notable diffs from the previous version:

- New import: `classifyChoice` and `ChoiceClassification` from `./questionPreviewChoice`.
- Inside the `<li>` mapper, choice rendering goes through `classifyChoice` → border + bg via `choiceClassName(...)` → trailing icon (✓ / ✗ / nothing).
- Removed the old `{choice.isCorrect === true && <span ...>Correct</span>}` pill — the green border + ✓ now carries that signal.
- Added `CheckIcon` and `CrossIcon` inline SVGs near the bottom of the file (alongside the existing helpers).
- Everything else — empty state, status pill, prompt, date/points, explanation panel, "Open question" button — is unchanged.

- [ ] **Step 2: Run typecheck and tests**

From `qna-web/`:

```bash
npx tsc --noEmit -p .
npm test
```

Expected: clean. No new tests in this task — `classifyChoice` is already covered.

- [ ] **Step 3: Manual smoke test (user-facing verification)**

The user will do this themselves. Suggested checklist for them to run after committing:

1. Sign in. Visit `/communities/<slug>` for a community where you've answered at least one open question correctly. Confirm the chosen choice has a green border + ✓ tick.
2. Repeat with a community where you answered incorrectly. Confirm your pick has a red border + ✗, and the correct choice has a green border + ✓.
3. Find a closed question you never answered (or wait until one closes). Confirm only the correct choice has a green border + ✓.
4. Find an open question you haven't answered. Confirm all four choices stay neutral.
5. As a logged-out viewer, visit a community. Confirm choices stay neutral on both open and closed questions.
6. As a creator on your own community, confirm the correct choice always has a green border + ✓.

- [ ] **Step 4: Stage and stop for the user to commit**

Stage:

```bash
git add qna-web/src/app/communities/[slug]/_components/QuestionList.tsx
```

Do not run `git commit`. Suggested message:

```
feat(questions): show per-choice result cues on community schedule previews
```

---

## Final verification

- [ ] **Run the full suite from `qna-web/`:**

```bash
npm test
npx tsc --noEmit -p .
npm run lint
```

Expected: all green. (Note: a pre-existing apostrophe lint warning may exist in `qna-web/src/app/my-communities/page.tsx`; that is unrelated to this feature.)

- [ ] **Cross-check spec coverage:**

  - Two new fields on `ScheduledCommunityQuestion` — Task 2.
  - Service learns `viewerUserId` — Task 2.
  - Two batched lookups — Task 2.
  - Page passes `viewerUserId` — Task 2.
  - `QuestionList` consumes new fields via classifier — Task 3.
  - Old `"Correct"` pill removed — Task 3.
  - `CheckIcon` + `CrossIcon` added — Task 3.
  - `classifyChoice` helper extracted + tested — Task 1.
  - Edge cases (creator, missed, anonymous, late) — handled by the classifier + reveal predicate in Task 2.
