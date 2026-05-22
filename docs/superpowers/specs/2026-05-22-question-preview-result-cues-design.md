# Question Preview Result Cues Design

## Goal

On the community detail page (`/communities/[slug]`), the `QuestionList` preview cards should let a viewer recognize their own answer status at a glance — without clicking into the question detail page.

For each multiple-choice item:

- The viewer's selected choice gains a colored border + a small ✓ or ✗ icon depending on whether the answer was correct.
- The correct choice gains a green border + ✓ icon whenever the result is "revealed" (defined below).

No text status chips ("Answered", "Missed", etc.) — purely visual cues on the choices themselves.

## Non-goals

- Showing the explanation paragraph on the schedule preview. Detail page already handles that.
- Adding a "Late" or "Missed" label on the card. The visual treatment alone is the signal.
- Touching the question detail page (`/communities/[slug]/questions/[id]`) — it already surfaces the full result.
- Touching the creator dashboard (`/dashboard/communities/[slug]`) — separate UI, separate slice.
- Mobile (Expo) consumption. Mobile equivalents follow in a later slice.
- Surfacing the viewer's points-awarded on the preview card.

## Locked decisions

- **Reveal predicate** — `revealedCorrectChoiceId` is set when ANY of these holds for a given question + viewer:
  - viewer is the community's creator, OR
  - viewer has submitted an answer for this question, OR
  - the question is closed (`closes_at <= now()`) AND the viewer is a community member (role `member` or `creator`).
  - Otherwise `null`. Anonymous viewers and signed-in non-members never receive the reveal.
- **Viewer answer source** — `viewerAnswer` is sourced from the existing `answers` table (one row per user per question, columns `selected_choice_id`, `is_correct`). Null when the viewer is anonymous or never answered.
- **Late answers** — treated like any other answer. The visual is driven by `viewerAnswer.isCorrect`, not by `answeredAt vs closesAt`. Late status doesn't surface on the preview.
- **Choice `isCorrect` exposure stays unchanged.** Members continue to receive `isCorrect: null` on choices in `withChoices`. The new `revealedCorrectChoiceId` field at the question level is the only mechanism that exposes correctness for the preview.
- **Existing creator-only "Correct" green pill on individual choices is removed.** The new green border + ✓ icon supersedes it; the old pill becomes redundant.
- **Status pill at the top of the card** (`Published / Scheduled / Closed`) stays as-is. It's still useful context independent of the answer state.
- **Explanation block** stays gated by the existing `canShowExplanation` helper, which checks for any `isCorrect === true` choice. Because members keep `isCorrect: null`, the panel remains creator-only on the preview, matching Q3's "no explanation on preview" decision.
- Counts and questions for the preview page are read via `listCommunityQuestionsForCommunity`. That function gains a `viewerUserId: string | null` parameter; `listCommunityQuestions` already has a `userId` parameter and threads it through.

## Data layer

### Type changes

`ScheduledCommunityQuestion` (in `qna-web/src/services/questions/questions.ts`) gains two fields:

```ts
export type ViewerAnswerSummary = {
  selectedChoiceId: string;
  isCorrect: boolean;
};

export type ScheduledCommunityQuestion = CommunityQuestion & {
  scheduledFor: Date;
  closesAt: Date;
  viewerAnswer: ViewerAnswerSummary | null;
  revealedCorrectChoiceId: string | null;
};
```

Both fields are always present. They are `null` when the viewer can't or shouldn't see the reveal.

### Service changes

`listCommunityQuestionsForCommunity({ community, limit, offset })` becomes:

```ts
listCommunityQuestionsForCommunity({
  community,        // unchanged — Pick<CommunityWithMembership, 'id' | 'currentUserRole'>
  viewerUserId,     // new — string | null
  limit,
  offset,
})
```

`listCommunityQuestions({ slug, userId, ... })` already takes a `userId`. It passes that through as `viewerUserId` into `listCommunityQuestionsForCommunity`.

The implementation does its existing work (raw `questions` rows → `withChoices`), then performs up to two additional batched lookups keyed on the resulting `questionIds`:

1. **Correct choices** — `SELECT question_id, id FROM question_choices WHERE question_id IN (...) AND is_correct = true`. Yields a `Map<questionId, choiceId>`.
2. **Viewer answers** — only when `viewerUserId !== null`: `SELECT question_id, selected_choice_id, is_correct FROM answers WHERE user_id = ? AND question_id IN (...)`. Yields a `Map<questionId, ViewerAnswerSummary>`.

Then per question:

```ts
const closedNow = q.closesAt.getTime() <= Date.now();
const isMember =
  community.currentUserRole === 'member' ||
  community.currentUserRole === 'creator';
const viewerAnswer = answerMap.get(q.id) ?? null;

const isRevealed =
  community.currentUserRole === 'creator' ||
  viewerAnswer !== null ||
  (closedNow && isMember);

const revealedCorrectChoiceId = isRevealed
  ? (correctMap.get(q.id) ?? null)
  : null;

return { ...q, viewerAnswer, revealedCorrectChoiceId };
```

### Page wiring

In `qna-web/src/app/communities/[slug]/page.tsx`, the existing call:

```ts
listCommunityQuestionsForCommunity({ community })
```

becomes:

```ts
listCommunityQuestionsForCommunity({
  community,
  viewerUserId: session?.sub ?? null,
})
```

Nothing else on that page changes.

## UI layer

In `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx`:

### Per-choice rendering

Replace the existing `<li>` body with logic driven by the two new fields. Pseudo-render per choice:

```tsx
const pickedByViewer =
  question.viewerAnswer?.selectedChoiceId === choice.id;
const isCorrectChoice =
  question.revealedCorrectChoiceId === choice.id;

let state: 'correct' | 'wrong-pick' | 'neutral';
if (isCorrectChoice) state = 'correct';
else if (pickedByViewer) state = 'wrong-pick';
else state = 'neutral';

const className = {
  correct:    'border-emerald-400 bg-emerald-50',
  'wrong-pick': 'border-rose-400 bg-rose-50',
  neutral:    'border-line bg-paper',
}[state];

const trailingIcon =
  state === 'correct'    ? <CheckIcon className="text-emerald-600" /> :
  state === 'wrong-pick' ? <CrossIcon className="text-rose-600" /> :
  null;
```

The choice `<li>` keeps:

- Its leading position badge (`1`, `2`, `3`, `4`).
- The choice label text.
- The structural Tailwind classes (`flex items-center gap-2 rounded-lg px-3 py-2 text-sm`) — only the border + bg + trailing element change.

### Removed elements

The existing trailing pill rendered inside the choice when `choice.isCorrect === true`:

```tsx
{choice.isCorrect === true && (
  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
    Correct
  </span>
)}
```

is removed. Replaced by the green border + check icon described above.

### Icons

Two small inline SVGs added at the bottom of `QuestionList.tsx` (matching the inline-SVG pattern already used in `CommunityListCard`'s creator badge):

```tsx
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

`aria-hidden` on both — the choice text already carries the semantic meaning, and the colored border + icon are decorative chrome on a Link-less list item.

### Unchanged elements

- Top status pill (`Published / Scheduled / Closed`).
- Question prompt, scheduled date, points display.
- The `canShowExplanation` panel (still creator-only because members get `isCorrect: null` on choices).
- The "Open question" button at the bottom.

## Edge cases & invariants

- **Open + answered correctly.** `viewerAnswer.selectedChoiceId === revealedCorrectChoiceId`. That single choice gets the `correct` state (green). No other choice is marked.
- **Open + answered incorrectly.** Viewer's pick gets `wrong-pick` (red). Correct choice gets `correct` (green). All others neutral.
- **Open + not answered.** `viewerAnswer = null`, `revealedCorrectChoiceId = null` for non-creators. All choices neutral. Status quo.
- **Closed + missed (member).** `viewerAnswer = null`, `revealedCorrectChoiceId = <correct>`. Only the correct choice gets `correct` (green). No red anywhere.
- **Closed + missed (non-member or anonymous).** Neutral. The "Closed" status pill still shows.
- **Closed + answered.** Same as the open + answered cases.
- **Creator on own community.** Every question gets `revealedCorrectChoiceId`. If they happen to have answered too (rare but possible), their pick gets the matching state.
- **Late answer.** `viewerAnswer.isCorrect` reflects whether their pick was right. The card doesn't say "late"; that detail surfaces on the question detail page.
- **Question soft-deleted.** Existing service already filters `deleted_at is null`. No change.
- **No correct choice configured.** Defensive — `correctMap.get(q.id)` returns undefined, `revealedCorrectChoiceId` becomes `null` even when other reveal conditions are met. Card stays neutral. This shouldn't happen in normal flow (validation requires one correct choice) but the code path is safe.
- **Performance.** Two batched extra queries per page render, both indexed on `(question_id, ...)`. Default page limit is 20 questions; payload is small.

## Files touched (planning-level)

- `qna-web/src/services/questions/questions.ts` — extend `ScheduledCommunityQuestion` type, extend `listCommunityQuestionsForCommunity` and `listCommunityQuestions` signatures, add the two batch lookups, attach the new fields.
- `qna-web/src/app/communities/[slug]/page.tsx` — pass `viewerUserId: session?.sub ?? null` into the service call.
- `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx` — new per-choice visual logic (calls the helper below), remove the old `"Correct"` pill, add `CheckIcon` + `CrossIcon` inline SVGs.
- `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.ts` — small pure helper `classifyChoice({ choice, question })` returning `'correct' | 'wrong-pick' | 'neutral'`.
- `qna-web/src/app/communities/[slug]/_components/questionPreviewChoice.test.ts` — unit test covering all six branches (correct picked by viewer / correct on missed / correct unrelated to viewer / wrong pick by viewer / non-revealed / no viewer answer), following the project's `node:test` pattern.

## Out of scope (deferred)

- Question detail page changes — already shows the full result post-answer.
- Mobile UI mirror — separate slice.
- Adding text labels for late or missed states on the preview.
- Streak indicators, points-awarded on the card, leaderboard delta.
