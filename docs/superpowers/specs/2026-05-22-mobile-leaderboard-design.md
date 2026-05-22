# Mobile Leaderboard Design

## Goal

Bring the per-community leaderboard to the mobile app as a live Ranks tab inside community detail, mirroring the web data with three time windows and a clear "where do I stand?" affordance for the signed-in viewer.

## Scope

- Replace the Ranks tab stub in `qna-mobile/app/communities/[slug].tsx` with a real list rendering the top 10 entries from the existing web leaderboard service.
- Window switcher exposing `7d` (default) / `30d` / `All-time`. Switching re-fetches.
- Highlight the signed-in viewer's row when they appear in the top 10; show a separate "You: rank N · pts" footer below the list when they do not.
- New mobile REST client + tests for the leaderboard endpoint.
- Web side: extend the leaderboard service and route to (a) accept the viewer's session and return their row, and (b) add CORS for mobile cross-origin calls.

Out of scope: web page UI changes (the existing `/communities/[slug]/leaderboard` page keeps working and ignores the new field), pagination, per-question or per-day breakdowns, streak/badge data, gated visibility (the endpoint stays public).

## Decisions

- **Visibility**: public. Anonymous viewers see the leaderboard exactly as members do. Matches existing web behavior.
- **Default window**: `7d`. Most useful "what's hot right now" view.
- **Top-N cap**: 10 entries, unchanged from web.
- **Viewer presence**: the API always returns `viewerEntry` (when authenticated). It is `null` when the viewer is unauthenticated or has zero scoring answers. When the viewer is in the top 10, `viewerEntry` still echoes their entry (same rank/points/lastScoringAnswerAt) so the mobile UI has a single source of truth for the highlight.
- **Tie-breakers**: unchanged — most points → earliest `lastScoringAnswerAt` → alphabetical username. The viewer's rank uses the same ordering via SQL `RANK()`.
- **Anonymous viewer**: API still serves the leaderboard, but `viewerEntry` is `null` and the mobile UI shows no footer.

## REST contract

Existing endpoint, with this slice's changes:

`GET /api/communities/[slug]/leaderboard?window=7d|30d|all`

- **Changed**: reads the session and threads `viewerUserId` into the service. Adds `OPTIONS` handler + `withCors` wrappers on every response.
- **Response shape** (changed — new `viewerEntry` field):
  ```ts
  {
    community: { id: string; slug: string; name: string };
    window: '7d' | '30d' | 'all';
    entries: LeaderboardEntry[];        // top 10, descending rank
    viewerEntry: LeaderboardEntry | null;
  }
  ```
  with `LeaderboardEntry = { rank: number; userId: string; username: string; points: number; lastScoringAnswerAt: string }`.
- Error responses: `404` if community does not exist (existing behavior). Public — no `401`/`403` from this endpoint.

## Service layer

### Web

- `qna-web/src/services/leaderboard/leaderboard.ts`:
  - `getCommunityLeaderboard` gains optional `viewerUserId?: string | null`.
  - Return type becomes `CommunityLeaderboard & { viewerEntry: LeaderboardEntry | null }` (extend the existing `CommunityLeaderboard` type or wrap; pick whichever keeps existing call sites compiling without churn — preference: extend the type directly with a non-optional `viewerEntry: LeaderboardEntry | null`).
  - Top-10 query stays as-is. After it runs:
    - If `viewerUserId` is `null` → `viewerEntry = null`.
    - Else, if viewer appears in the top-10 result → `viewerEntry = entries.find(e => e.userId === viewerUserId)`.
    - Else, call a new helper `getLeaderboardEntryForUser({ communityId, userId, windowStart, now })` that returns the viewer's `LeaderboardEntry` (with rank) or `null` if they have no scoring answers.
  - The web page at `app/communities/[slug]/leaderboard/page.tsx` keeps working unchanged; it ignores `viewerEntry`.

- `qna-web/src/services/leaderboard/leaderboard.ts` (continued): the new helper uses one SELECT with a CTE / window function so the rank reflects all scorers in the window:
  ```sql
  WITH ranked AS (
    SELECT
      answers.user_id AS user_id,
      users.username AS username,
      SUM(answers.points_awarded) AS points,
      MAX(answers.answered_at) AS last_scoring_at,
      RANK() OVER (
        ORDER BY
          SUM(answers.points_awarded) DESC,
          MAX(answers.answered_at) ASC,
          users.username ASC
      ) AS rank
    FROM answers
    INNER JOIN questions ON answers.question_id = questions.id
    INNER JOIN users ON answers.user_id = users.id
    WHERE
      questions.community_id = $communityId
      AND answers.points_awarded > 0
      [AND answers.answered_at >= $windowStart]
    GROUP BY answers.user_id, users.username
  )
  SELECT * FROM ranked WHERE user_id = $viewerUserId
  ```
  Drizzle ORM: use `db.execute(sql\`...\`)` or build via Drizzle's CTE / window function support. The agent implementing this should pick the cleanest form available in the current Drizzle version used by the project — both are acceptable.

### Mobile

- `qna-mobile/services/leaderboard/api.ts` — new:
  - Types: `LeaderboardWindow` (`'7d' | '30d' | 'all'`), `LeaderboardEntry`, `LeaderboardResult`.
  - `createLeaderboardClient({ apiUrl })` exposes `get(slug, { window?, token? })`.
  - `LeaderboardApiError extends Error` with `status` and `code: 'unauthenticated' | 'forbidden' | 'not_found' | 'network' | 'unknown'` — same discriminator shape we used for broadcasts. (`'unauthenticated'` / `'forbidden'` are unused today but included for shape symmetry.)
- `qna-mobile/services/leaderboard/api.test.ts` — new:
  - List happy path with `window=7d` and bearer.
  - `window` defaults to `'7d'` when not provided.
  - Cursor / window pass-through verified in URL.
  - 404 community-not-found maps to `code: 'not_found'`.
  - `viewerEntry: null` case unpacks correctly.

## Screens

### Community detail — Ranks tab (mobile)

Replace the placeholder copy. `LeaderboardTab` component, in-file, with the same shape as `QuestionsTab` and `BroadcastsTab`:

- State: `selectedWindow: LeaderboardWindow` (default `'7d'`), `entries`, `viewerEntry`, `loading`, `error`.
- `useFocusEffect` triggers a fetch on focus. `selectedWindow` changes trigger a re-fetch.
- Top of tab: three pill buttons in a row (7d / 30d / All-time). Active pill: `palette.primary` background + `palette.paper` text. Inactive: `palette.card` background + `palette.ink` text + `palette.line` border.
- States:
  - **Loading**: `StatePanel` titled "Loading leaderboard...".
  - **Error**: `StatePanel` titled with the error message, Retry button.
  - **Empty** (`entries.length === 0`): `StatePanel` titled "No scores yet" with body "Be the first to answer today's question."
  - **List**: vertical list of `LeaderboardRow` items.
- Out-of-top-10 footer: if `viewerEntry` is set AND `viewerEntry.rank > 10`, render a separator + a single `LeaderboardRow` flagged `isViewer` below the list.

`LeaderboardRow` props: `{ entry: LeaderboardEntry; isViewer: boolean }`. Layout:

- Left: rank pill — circular badge containing the rank number. Top 3 ranks get an accent color (`palette.primary` background, `palette.paper` text); rank ≥ 4 gets neutral (`palette.card` background, `palette.ink` text).
- Center: `@username`.
- Right: points, formatted via `formatPoints(entry.points)` (reuse the helper from `services/questions/format.ts`).
- When `isViewer === true`, the row container picks up a stronger border (`palette.primary`, 1.5 width) and a soft background tint to make it visually pop. No inline "You" label inside the row body — the footer-row case relies on the same `isViewer` styling, so the visual cue is consistent in both top-10 and out-of-top-10 placements.

Above the out-of-top-10 footer row, render a thin separator (`palette.line`, hairline width) plus a small uppercase label "YOUR RANK" in `palette.muted` so the user understands the context shift.

## Error handling matrix

| Caller state                | Endpoint response | Mobile UI                                  |
|-----------------------------|-------------------|--------------------------------------------|
| Anonymous                   | 200 (no `viewerEntry`) | Top 10 list; no footer                |
| Authenticated, in top 10    | 200               | Top 10 list; viewer row highlighted        |
| Authenticated, outside top 10, scored | 200    | Top 10 list + "You: rank N · pts" footer  |
| Authenticated, no scores yet | 200 (`viewerEntry: null`) | Top 10 list; no footer            |
| Community not found         | 404               | "Community not available" panel + Retry    |
| Network / 5xx               | n/a               | "Unable to load leaderboard" + Retry       |

## Testing

- Web: extend `qna-web/src/services/leaderboard/ranking.test.ts` if pure logic moves into the file — but the new viewer query is SQL-side, so route-level smoke is the right level. If the codebase already has route tests for the leaderboard, add cases there; otherwise rely on the existing `ranking.test.ts` + manual smoke. Do not invent a new DB-backed test pattern.
- Mobile: `services/leaderboard/api.test.ts` covers the 5 cases listed above.
- Manual: anonymous open → top 10 + no footer; member in top 3 → row highlighted; member outside top 10 with at least one scoring answer → "You: rank N" footer appears; community with no scoring answers → empty state.

## Files touched

**Web** (`qna-web/`):
- `src/services/leaderboard/leaderboard.ts` — viewer query, return shape.
- `src/app/api/communities/[slug]/leaderboard/route.ts` — session, CORS, response shape.

**Mobile** (`qna-mobile/`):
- `services/leaderboard/api.ts` — new.
- `services/leaderboard/api.test.ts` — new.
- `app/communities/[slug].tsx` — replace Ranks stub with `LeaderboardTab` + `LeaderboardRow` + window switcher styles.

**Docs**:
- `docs/superpowers/specs/2026-05-22-mobile-leaderboard-design.md` — this file.

## Sequencing notes

Web changes ship in the same slice because mobile depends on the new `viewerEntry` field and CORS. Implementation order:

1. Web service-layer extension (viewer query helper, return shape).
2. Web route updates (session + CORS + new field).
3. Mobile leaderboard REST client + tests.
4. Mobile Ranks tab UI wiring.
5. Verification: web tests + lint + build; mobile tests + lint + web export; manual matrix.
