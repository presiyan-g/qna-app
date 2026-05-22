# Mobile Questions And Answers Design

## Goal

Bring the core product loop to mobile: members open a community, see its scheduled questions, pick today's, submit a single multiple-choice answer, and immediately see whether they were right, the correct answer, the explanation, and the points earned.

## Scope

- Real Questions tab in mobile community detail listing all published questions for the community.
- New question detail screen at `/communities/[slug]/questions/[id]` with select-and-submit answering and result/explanation display.
- Home status strip wired to live-question counts across the user's joined communities.
- Required REST adjustments in `qna-web`: CORS wrappers on question and answer routes, and a `liveQuestionCount` field on the community resource.

Out of scope: comments thread (slice 4), leaderboard tab (slice 4), notifications, streaks, question creation or editing (web-only per qna-mobile AGENTS.md).

## Decisions

- **Today scope**: per-community. Status strip aggregates live counts across joined communities; no cross-community feed view.
- **Answer interaction**: select choice, then tap Submit. No tap-to-commit, no confirmation dialog.
- **Images**: render question and choice images when present.
- **Home entry**: My Communities cards still route to community detail (not directly to a question). Status strip is informational only.
- **Questions tab content**: all published questions sorted newest-first, with state badges. Closed questions remain answerable for learning at zero points (matches web).
- **Route shape**: full route, not modal, for deep-link readiness.

## REST contract

Reused (already implemented in qna-web):

- `GET /api/communities/[slug]/questions?limit=20&offset=0` returns `{ items, pagination }`.
- `GET /api/communities/[slug]/questions/[id]` returns the role-aware question detail including `result` when the caller has answered.
- `POST /api/communities/[slug]/questions/[id]/answers` body `{ choiceId }` returns the updated detail with `result`.

Added by this slice:

- All three routes wrapped with the same `corsOptionsResponse` / `withCors` helpers used by community routes. Mobile web export targets the same Vercel-hosted API cross-origin.
- The community resource (list, slug, join responses) gains `liveQuestionCount: number` — count of questions where `published_at <= now() <= closes_at`. Implemented as a correlated subquery in the existing consolidated communities select so the slice-2 query-consolidation work is preserved.

## Mobile service layer

- `services/questions/api.ts` — typed REST client. Methods `list`, `get`, `submitAnswer`. Single `QuestionsApiError` class. Mirrors the auth and communities client shape.
- `services/questions/format.ts` — pure helpers: `formatQuestionState` (`'Scheduled' | 'Live' | 'Closed' | 'Answered'`), `formatPoints`, `formatRelativeTime`.
- `services/home/shell.ts` — gains `buildHomeStatusMessage(myCommunities)` overload that consumes the new `liveQuestionCount`. Anonymous or zero joined: `'Pick a community to start'`. Zero live across joined: `'All caught up today'`. One or more live: `'N question(s) live today'`.

## Screens

### Community detail — Questions tab

Replaces the placeholder copy. Renders each question as a card:

- State badge (LIVE green, SCHEDULED muted, CLOSED line-grey, ANSWERED primary-soft with check).
- Truncated prompt.
- Points and either close-time hint (live), schedule time (scheduled), or answered indicator (answered).
- Tap routes to question detail.

`useFocusEffect` refetches on return so answered state stays current.

### Question detail — new route

`app/communities/[slug]/questions/[id].tsx`. Inherits the default header chip and back navigation.

Top metadata row: community emoji + name, state, close-time hint, points.

Prompt block: question text and optional image rendered via `expo-image`.

**Before answering** (eligible signed-in member, question live or late-answerable):
- Radio-style choice list. Each choice shows label and optional image.
- Sticky `Submit answer` button at the bottom of the scroll. Disabled until a choice is selected and while submitting.
- Inline form error for 422 validation failures.

**After answering** (or revisit):
- Result panel replaces the choice form.
- Header: CORRECT / WRONG / LATE pill, points, answered timestamp.
- Body: "Your answer" + "Correct answer" rows. Late variant adds `LATE — saved for learning, no points`.
- "Why" section with explanation when present.

**Gated states**:
- Anonymous: prompt + choices visible (correct hidden by API). CTA "Sign in to answer" → `/login?returnTo=/communities/[slug]/questions/[id]`.
- Authenticated non-member: prompt visible. CTA "Join community to answer" → community detail with focus on Join.
- Scheduled (not yet live): metadata + prompt placeholder ("Goes live at ..."). No choices.

### Home status strip

Already exists; wording changes to consume `liveQuestionCount`. Non-tappable (per design decision).

## Error handling

- `401` anywhere: clear token via auth context, route to `/login`. Matches existing pattern.
- `403` on detail or submit: render gated empty state with appropriate CTA.
- `404`: "Question not found" panel with Back to community link.
- `409 AnswerUnavailableError`: refetch detail; show result if it now exists, otherwise closed state.
- `422 AnswerValidationError`: inline error under the submit button.
- Network error: error panel with Retry button (matches the pattern used in communities list).

## Testing

- `services/questions/api.test.ts`: list, get, submit, bearer auth, error parsing, URL trailing-slash normalization.
- `services/questions/format.test.ts`: all four state branches (including boundary conditions around `publishedAt`/`closesAt`), points format, relative time.
- `services/home/shell.test.ts`: extend with `liveQuestionCount`-driven branches.
- `qna-web`: one test for the consolidated community query confirming `liveQuestionCount` is computed correctly across live, closed, scheduled, and soft-deleted questions.

## Slice size

Targeted at one focused implementation pass. Breakable into REST/service + UI commits if needed but designed together to avoid rework. CORS and `liveQuestionCount` web changes land before the mobile fetcher consumes them.
