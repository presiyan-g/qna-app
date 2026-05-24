# Meaningful Seed Data — Design

Date: 2026-05-24
Status: Draft (awaiting user review)
Related: [PROJECT.md](../../../PROJECT.md), [AGENTS.md](../../../AGENTS.md), [seed-communities.mjs](../../../qna-web/scripts/seed-communities.mjs), [seed-categories.mjs](../../../qna-web/scripts/seed-categories.mjs)

## 1. Goal

Give the Quorum demo a database that looks like a real, lived-in product when a grader opens it. A single `npm run seed` should produce: ~20 communities with mixed creator origins, ~500 demo users distributed organically across them, ~20 questions per community spread over the last ~60 days (with a mix of closed / open / scheduled), ~5 broadcasts per community, ~25 comment threads per community, and a synthetic answer fan-out that pushes the `answers` table past 10,000 rows so the scalability rubric is satisfied on the table the platform actually pages.

The meaningful text (question prompts, choices, explanations, comments, broadcast bodies) is generated once via OpenRouter into JSON fixtures that live in the repo, hand-reviewed, and committed. The seed script itself reads only from those fixtures — it never makes network calls beyond the DB connection.

## 2. Non-goals (v1)

- Image generation or seeded image URLs for questions, choices, broadcasts, or covers. All image columns stay null. R2 uploads remain a runtime concern.
- Mobile-specific seed paths. The same data backs both clients.
- A persisted `ai_question_drafts` row from the seed. Graders exercise that table by clicking "Draft with AI" themselves.
- AI-driven communities or auto-published AI questions. Every AI-generated question goes through human review before it's committed as a fixture.
- Streaks, denormalized profile scores, or any precomputed leaderboard cache. Leaderboard reads stay derived from `answers.points_awarded` per [PROJECT.md §8](../../../PROJECT.md).
- Quick-login buttons on the login UI for graders. Tracked as a follow-up task; not part of this slice.
- A separate `seed:load` script. One seed produces both the curated layer and the synthetic answer fan-out.
- A seed for the `admin_audit_logs` or `ai_usage` tables. Those populate naturally from in-app actions and are not needed for the demo to look complete.

## 3. Outcome the grader sees

When the grader opens the deployed app:

- The browse-communities page shows ~20 communities across all categories, with realistic member counts (50–500), mixed creators (some by admin, some by demo members), and a credible mix of featured / non-featured.
- Opening any community shows recent broadcasts, currently-open + recently-closed questions, and a leaderboard with different top-10 lists for the 7-day, 30-day, and all-time windows.
- Opening a closed question shows the chosen answer (if logged in as a member who answered), the correct answer, an explanation paragraph, and a comments thread with 2–5 top-level comments and a few replies.
- Logging in as the seeded `member@demo.local` account shows a profile with several community memberships, a non-trivial points total, and a history of recent answers.
- Logging in as `creator@demo.local` shows the creator dashboard populated for the 2–3 communities they own, including a scheduled question for tomorrow and the ability to review past published questions.
- Logging in as `admin@demo.local` shows the admin panel with the demo users and communities listed and the audit log empty (since seeding doesn't generate admin actions).

## 4. Architecture

The current single ~440-line [seed-communities.mjs](../../../qna-web/scripts/seed-communities.mjs) is split into a `qna-web/scripts/seed/` module directory plus a one-off `generate-seed-data.mjs` generator. Each module has one responsibility, exports one async function, and returns the IDs the next module needs through a shared `ctx` object.

### 4.1 File layout

```
qna-web/scripts/
  generate-seed-data.mjs       ← one-off OpenRouter generator (not run by `npm run seed`)
  seed-data/                   ← committed AI-generated fixtures
    communities.json
    questions/
      <community-slug>.json
    comments/
      <community-slug>.json
    broadcasts/
      <community-slug>.json
  seed/
    db.mjs                     ← creates Drizzle client, exports PASSWORD_HASH
    schema.mjs                 ← single place that re-declares tables for the script
    fixtures.mjs               ← typed loaders for the JSON files
    ids.mjs                    ← deterministic UUID v5 helpers
    categories.mjs             ← moved from seed-categories.mjs
    users.mjs                  ← seed owner + named test accounts + demo member pool
    communities.mjs            ← communities + memberships (with cross-pollination)
    questions.mjs              ← questions + choices, with date math by cadence
    broadcasts.mjs             ← broadcasts spread across last 30 days
    comments.mjs               ← comment threads with parent/child relationships
    answers.mjs                ← synthetic fan-out across community members
    index.mjs                  ← orchestrator
  db-check.mjs                 ← unchanged
```

The current top-level `seed-categories.mjs` and `seed-communities.mjs` files are deleted as part of this slice; root `package.json` scripts point at `seed/index.mjs`. Deletion is intentional — having two seed entry points invites "which one do I run?" confusion and the risk that someone runs the stale one. Git history preserves what the old seed looked like. The header comment of `seed/index.mjs` notes "Replaces the previous single-file `seed-communities.mjs` (see git history before 2026-05-24)." so the breadcrumb is in the tree without the dead-code risk.

### 4.2 Module contracts

Each `seed/<entity>.mjs` exports one function with the shape:

```js
export async function seedQuestions(db, ctx) { ... return { questionsBySlug }; }
```

`ctx` accumulates outputs from earlier modules. The orchestrator's order:

1. `seedCategories(db)` → `{ categoryBySlug }`
2. `seedUsers(db)` → `{ seedOwner, testAccounts, demoUsers }`
3. `seedCommunities(db, ctx)` → `{ communitiesBySlug, membershipsByCommunitySlug }`
4. `seedQuestions(db, ctx)` → `{ questionsByCommunitySlug, choicesByQuestionId }`
5. `seedBroadcasts(db, ctx)` → `{ broadcastsByCommunitySlug }`
6. `seedComments(db, ctx)` → `{ commentsByQuestionId }`
7. `seedAnswers(db, ctx)` → `{ answerCount }` (synthetic fan-out, last because it's the heaviest)

Each module logs `Seeded <N> <entity>` on completion.

### 4.3 Idempotency via deterministic UUIDs

Every seeded row has its `id` set explicitly to a UUID v5 derived from stable natural keys, computed in `seed/ids.mjs`. The namespace UUID is generated once during implementation (via `uuidv4()`), hardcoded into `seed/ids.mjs`, and never changes — changing it would invalidate every deterministic ID in the seed and force a full wipe.

```js
seedNamespace = '<one-off uuid v4, hardcoded at impl time>';
communityId(slug) = uuidv5(`community:${slug}`, seedNamespace)
userId(username)  = uuidv5(`user:${username}`,  seedNamespace)
questionId(communitySlug, index) = uuidv5(`question:${communitySlug}:${index}`, seedNamespace)
choiceId(questionId, position)   = uuidv5(`choice:${questionId}:${position}`,   seedNamespace)
broadcastId(communitySlug, idx)  = uuidv5(`broadcast:${communitySlug}:${idx}`,  seedNamespace)
commentId(questionId, idx)       = uuidv5(`comment:${questionId}:${idx}`,       seedNamespace)
answerId(questionId, userId)     = uuidv5(`answer:${questionId}:${userId}`,     seedNamespace)
```

Inserts use `onConflictDoUpdate({ target: <table>.id, set: { ...mutableFields } })` so re-runs are no-ops on unchanged data and pick up edits to fixtures.

This also lets every module reference IDs from earlier modules without needing to round-trip through the DB (`SELECT id FROM ...`) to discover them. The seed becomes a single forward pass.

### 4.4 The schema duplication smell

The current seed declares table shapes inline with `pgTable(...)` instead of importing from `qna-web/src/db/schema`. That stays — the seed is a plain ESM script run by Node directly, while `src/db/schema/*.ts` is TypeScript compiled by Next. Importing the real schema would pull `import 'server-only'` and other build-time concerns into a node-cli script.

The fix is to consolidate the re-declaration into one file (`seed/schema.mjs`) instead of duplicating it across every module. Each entity module imports its table from `seed/schema.mjs`. If the real schema and the seed schema drift, only one file in the seed dir needs updating.

A passing comment at the top of `seed/schema.mjs` notes "mirror of `src/db/schema/*` — keep in sync when migrations change column shape."

## 5. Fixtures

### 5.1 `seed-data/communities.json`

Replaces the hardcoded `seededCommunities` array. Array of objects:

```json
{
  "slug": "chess-tactics-daily",
  "name": "Chess Tactics Daily",
  "emoji": "♟",
  "categorySlug": "gaming",
  "description": "...",
  "cadence": "daily",
  "isFeatured": true,
  "featuredRank": 2,
  "targetMembers": 360,
  "creatorUsername": "demo_member_042"
}
```

`creatorUsername` is the only new field versus today.
- If `null`, the seed owner (`quorum_seed`) creates the community.
- Otherwise, the named demo member creates it and is promoted to `creator` role in their membership row. The seed validates the username exists in the demo pool and throws if not.

Roughly 30% of communities have a non-null `creatorUsername`. Specific creators are spread across different `demo_member_NNN` indexes so no single user owns multiple communities (keeps things organic-looking).

### 5.2 `seed-data/questions/<community-slug>.json`

Array of exactly 20 question objects per community:

```json
{
  "prompt": "In a king-and-pawn endgame, ...",
  "explanation": "The key is the opposition: ...",
  "difficulty": "medium",
  "choices": [
    { "label": "Kf6, taking the opposition", "isCorrect": true },
    { "label": "Kxh5", "isCorrect": false },
    { "label": "g4", "isCorrect": false },
    { "label": "Kg5", "isCorrect": false }
  ]
}
```

Order matters: position 0..3 in the JSON becomes `question_choices.position` 0..3. The first item with `isCorrect: true` wins if the model accidentally marks two.

`difficulty` is `"easy" | "medium" | "hard"` and only influences the synthetic answer correctness ratio (§7.3) — it doesn't persist to the DB (no difficulty column in v1).

### 5.3 `seed-data/broadcasts/<community-slug>.json`

Array of exactly 5 broadcast objects per community. The five slots have stable themes so the generator produces a balanced mix:

```json
[
  { "theme": "welcome",     "body": "Welcome to ..." },
  { "theme": "weekly_recap","body": "Here are last week's hardest questions ..." },
  { "theme": "resource",    "body": "If you want to go deeper on ..." },
  { "theme": "winner",      "body": "Shoutout to @demo_member_012 ..." },
  { "theme": "milestone",   "body": "We just crossed 200 members ..." }
]
```

`theme` is consumed only by the generator prompt and the timestamp spread logic (§7.2) — it doesn't persist.

### 5.4 `seed-data/comments/<community-slug>.json`

Array of comment thread objects, one entry per thread. Threads reference questions by index (0..19 corresponding to the question's position in the questions JSON):

```json
{
  "questionIndex": 7,
  "topLevel": { "body": "I went with Kf6 but only because I'd seen this exact endgame ..." },
  "reply":    { "body": "Same — and the opposition rule is one of those things that ..." }
}
```

`reply` is optional. About 25 threads per community, distributed across closed questions only (the generator picks `questionIndex` values that map to closed questions per §7.2).

The seed picks authors at runtime from each community's member pool — fixture stays purely textual.

## 6. Test accounts

Three new named accounts in addition to `quorum-seed`:

| Email | Username | Password | Platform role | Community role |
|---|---|---|---|---|
| `admin@demo.local` | `demo_admin` | `demo1234` | admin | none |
| `creator@demo.local` | `demo_creator` | `demo1234` | member | creator of 2 communities (specifically `daily-ai-builders` and one other flagship — assigned by overriding `creatorUsername` to `demo_creator` for those two entries in `communities.json`) |
| `member@demo.local` | `demo_member` | `demo1234` | member | member of ~6 communities, included in the answer fan-out so the account has a populated leaderboard position and answer history |

`PASSWORD_HASH` for these three is computed at seed time from `"demo1234"` (not the same as the existing demo-member pool hash) and committed as a constant in `seed/users.mjs`. The constant has a comment explaining how to regenerate it (`node -e "console.log(require('bcryptjs').hashSync('demo1234', 10))"`).

These three credentials go into the cover-page "Credentials for testing" cell. The existing admin/creator accounts the user already has are untouched.

## 7. Synthetic data generation logic

### 7.1 Community membership distribution

Today, every demo user is joined to every community up to `targetMembers - 1`. New behavior:

- Each demo user picks 2–5 communities at random (seeded by username for determinism).
- Per-community `targetMembers` is approximated by repeating the random pick across users until each community has at least its target. A fixed seed for the RNG (e.g. `seedrandom('quorum-seed-v1')`) keeps re-runs identical.
- This produces realistic differentiation: not every leaderboard has the same top-10 because not every user is in every community.

### 7.2 Question timeline

The 20 questions per community are spread over the last 60 days:

- **Indexes 0–17** → closed. `scheduled_for` = `publishedAt` = `now - (60 - 3*i) days`, `closesAt` = `publishedAt + answerWindow`. `answerWindow` is 24h for daily, 7d for weekly, 24h for custom. So question 0 was published 60 days ago and closed shortly after, question 17 closed a few days ago.
- **Index 18** → currently open. `publishedAt = now - 1h`, `closesAt = now + (answerWindow - 1h)`. Members landing on the community can answer it.
- **Index 19** → scheduled. `scheduledFor = tomorrow at 09:00 community-creator-time`, `publishedAt = null`, `closesAt = null`. Visible only to the creator in the dashboard.

`creatorUserId` on every question is the community's creator (seed owner OR the `creatorUsername` demo member from the community fixture).

`timeZone` defaults to `'GMT'` to match the schema default. Per-community timezone variation is a YAGNI for v1 seed.

### 7.3 Answer fan-out

For each closed question (indexes 0–17, ~18 per community × 20 communities = 360 questions):

- Sample 40–80% of that community's members to answer. Sample size is deterministic via `seedrandom("quorum-seed-v1:answers:${communitySlug}:${questionIndex}")`.
- Each sampled user gets an "activity tier" (0..3) deterministic per username:
  - tier 0 (20% of users): always answers
  - tier 1 (30%): 70% chance to answer
  - tier 2 (30%): 40% chance to answer
  - tier 3 (20%): 15% chance to answer
- Among answerers, correctness ratio depends on difficulty:
  - easy → 75% correct
  - medium → 60% correct
  - hard → 40% correct
- ~5% of answers are flagged `isLate = true` with `answeredAt` set just after `closesAt`; `pointsAwarded = 0` per the rule in [PROJECT.md §8](../../../PROJECT.md).
- For non-late correct answers: `pointsAwarded = questions.points` (10).
- For non-late wrong answers: `pointsAwarded = 0`.
- `answeredAt` for non-late answers is uniformly distributed across the answer window.
- `selectedChoiceId` for wrong answers is randomly picked from the three incorrect choices.

Back-of-envelope: 360 questions × 200 avg members × 0.6 participation ≈ **43,000 answer rows**. Comfortably past the 10k bar, on the table the rubric cares about most.

`demo_member` (the named test account) is force-included in every community they're a member of so their profile has a populated history.

### 7.4 Comment fan-out

For each `(community, comment-thread)` fixture:

- Top-level author: random member of the community who has already answered the referenced question (constraint: per [PROJECT.md §2.2](../../../PROJECT.md), posting requires having answered).
- Reply author (if present): random member who has also answered, different from the top-level author.
- `createdAt` for top-level: uniformly inside the question's answer window (after `publishedAt`, before `closesAt + 7 days`).
- `createdAt` for reply: between `topLevel.createdAt` and `topLevel.createdAt + 48h`.
- `parentCommentId` on reply = `commentId(questionId, threadIndex * 2)` (the top-level's deterministic ID).
- `deletedAt` always null in v1 seed.

Back-of-envelope: 25 threads × 20 communities × ~1.6 comments/thread ≈ **800 comment rows**.

### 7.5 Broadcast fan-out

For each of the 5 broadcasts per community:

- `authorUserId` = community creator (always — broadcasts are creator-only).
- `publishedAt` spread across the last 30 days at fixed offsets per theme: welcome = day -28, weekly_recap = day -21, resource = day -14, winner = day -7, milestone = day -2.
- `body` straight from the fixture.
- `imageUrl` null.
- `deletedAt` null.

100 broadcast rows total.

## 8. The generator (`generate-seed-data.mjs`)

Separate one-off script. Not run by `npm run seed`. Not run by graders. Run by the project owner once to produce the JSON, hand-reviewed, then committed.

### 8.1 Inputs

- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL` from env (same vars as the existing AI drafts feature).
- A hardcoded list of the 20 community slugs + their topical prompts (each community needs a topic steer like "applied AI architecture" or "king-and-pawn endgames").

### 8.2 What it generates

For each community:
- 20 question-with-choices objects via the existing question-draft prompt path. Loops, validating each draft has exactly 4 choices with exactly one correct, retrying on validation failure (max 3 retries per question).
- 5 broadcast bodies via a new prompt that takes the community description + the theme tag and returns plain-text body.
- 25 comment threads via a new prompt that takes the community description + the question prompt and returns a `topLevel` body and optional `reply`.

### 8.3 Outputs

Writes JSON files to `qna-web/scripts/seed-data/`. Files are pretty-printed with 2-space indent for readable diffs.

### 8.4 Reuse of existing AI plumbing

For questions, the generator imports and calls [qna-web/src/lib/ai/question-drafts.ts](../../../qna-web/src/lib/ai/question-drafts.ts) directly. This keeps prompts in one place — if the in-app AI drafts get tuned, the seed regenerator picks up the same tuning. Comments and broadcasts get new sibling modules under `qna-web/src/lib/ai/seed-prompts/` so the prompt logic is co-located with the existing AI code.

Limits & cooldowns: the generator bypasses the per-user `AI_DAILY_QUOTA` check (that's a runtime concern for end users, not a one-off CLI). It honors `AI_REQUEST_TIMEOUT_MS` and adds its own gentle inter-request delay (250ms) to be polite to OpenRouter.

## 9. Wiring

### 9.1 npm scripts

In root `package.json`:

```json
{
  "scripts": {
    "seed": "node qna-web/scripts/seed/index.mjs",
    "seed:generate": "node qna-web/scripts/generate-seed-data.mjs"
  }
}
```

`seed:generate` requires `OPENROUTER_API_KEY`; `seed` requires only `DATABASE_URL`.

### 9.2 Seed guard

`seed/index.mjs` requires an explicit `ALLOW_SEED=1` env var to run:

```js
if (process.env.ALLOW_SEED !== '1') {
  throw new Error(
    'Refusing to seed without ALLOW_SEED=1. Set it in .env.local or prefix the command.',
  );
}
```

The previous `NODE_ENV === 'production'` check is removed. Quorum currently runs against a single Neon DB which is technically "production" but is still pre-launch — the NODE_ENV check would block the only workflow that actually exists (seed once into the Neon DB before launch, locally with the production `DATABASE_URL`). Replacing it with an unambiguous opt-in env var keeps the safety (`npm run seed` alone does nothing) without the surprise.

After real launch, if the seed should genuinely never run against the live DB again, the right move is either to delete `seed/index.mjs` from the deployed branch or add a sentinel row check at the top (e.g. "refuse to run if `users` table has more than 1000 non-demo rows"). Both are out of scope for this slice.

### 9.3 Dependencies

New runtime deps (root `package.json` or `qna-web/package.json` — whichever the script runs against):

- `uuid` (npm package) — for `uuidv5`. Plain ESM, no native build. Add to `qna-web/package.json` since that's where the seed scripts live.
- `seedrandom` — deterministic RNG. Tiny, pure JS.
- `bcryptjs` — already in `qna-web` deps; reused for the test-account password hash.

No new devDeps for the seed itself.

## 10. Testing

The seed itself is a CLI; the project-test pattern (`npm test -w qna-web`) is unit tests under `src/`. Two narrow test files cover the logic that's worth testing in isolation:

- `qna-web/src/lib/seed-helpers.test.ts` — pure functions extracted from `seed/answers.mjs` (activity tier picker, correctness ratio, lateness picker) tested with the same `seedrandom` seed for deterministic snapshots.
- `qna-web/src/lib/seed-helpers.test.ts` also tests the question timeline math (given today, community cadence, and index, returns the expected scheduled/published/closes triple).

The seed integration itself is verified by running `npm run seed` against a local Neon branch and spot-checking the resulting row counts (covered in the implementation plan, not in this spec).

## 11. Migration impact

None. This slice adds no schema changes — it only writes rows.

## 12. Rollout

1. Land the generator (`generate-seed-data.mjs`) + its prompt modules + run it locally + hand-review + commit `seed-data/`.
2. Land the `seed/` module split + the new entity modules + wire `npm run seed`.
3. Run against a throwaway Neon branch to validate row counts.
4. Update the project's top-level `README.md` with a "Seed the database" section pointing at `npm run seed`.

After deployment (separate, later task), run `seed` once against the production Neon branch.

## 13. Out of scope, tracked

- Quick-login buttons on the login page that POST as one of the three demo accounts. Useful for graders, easy to add, but its own UI slice. Track separately.
- Re-generating the AI fixtures on a schedule. One-off is fine for the capstone window.
- A `seed:wipe` script that truncates demo data before reseeding. Not needed while everything is idempotent on stable IDs; revisit if the data model changes and seeds start drifting.
