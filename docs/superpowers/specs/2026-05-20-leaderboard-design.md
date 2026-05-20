# Public Leaderboard Design

## Goal

Add a public, per-community leaderboard that ranks users from existing answer scoring data and exposes the same read model through a mobile-ready REST endpoint.

## Scope

This slice covers the leaderboard read path, web route, REST route, ranking policy, and light product-doc update. It does not create a denormalized scores table or change answer submission.

The leaderboard lives at `/communities/[slug]/leaderboard`. It is public to anonymous visitors and signed-in users. There is no global leaderboard in v1.

## Decisions

- Leaderboards are per community only.
- The page is a first-class community route: `/communities/[slug]/leaderboard`.
- Viewers can choose `7 days`, `30 days`, or `all-time`.
- The selected window is URL-driven with a `window` search parameter so the page stays server-rendered.
- Anonymous traffic can view the leaderboard.
- Every ranked user is shown by public username.
- Rows render usernames as plain text in a profile-link-ready layout for future `/users/[username]`.
- v1 shows the top 10 only, with no pagination.
- `answers.points_awarded` is the source of truth.
- No anonymous-bucketed mode, privacy toggle, streaks, badges, multipliers, denormalized score table, creator analytics, or mobile UI consumption in this slice.

## Ranking Rules

For a community and selected time window:

1. Include only answers for questions in that community.
2. Include only point-awarding answers where `answers.points_awarded > 0`.
3. For `7 days` and `30 days`, include answers with `answered_at >= windowStart`, where `windowStart` is computed from the request time.
4. For `all-time`, do not apply an answer-time lower bound.
5. Sum `answers.points_awarded` per user.
6. Compute each user's most recent scoring answer with `MAX(answers.answered_at)`.
7. Sort by total points descending.
8. Break ties by most-recent scoring answer ascending, so the user who reached the tied score first stays above.
9. Use username ascending as a final deterministic fallback.
10. Return the first 10 rows.

Users with only zero-point answers do not appear in v1 because the tie-break is defined over scoring answers.

## Web UX

The leaderboard page uses the existing community shell styling:

- Back link to the community.
- Community name and a clear "Leaderboard" heading.
- Three server-rendered window links:
  - `?window=7d`
  - `?window=30d`
  - `?window=all`
- A compact top-10 table/card list with rank, username, points, and last scoring answer date.
- Empty state when the community has no scoring answers in the selected window.

The community home page should include a visible link to the leaderboard so the route is discoverable without relying on a manually typed URL.

## REST API

Add:

`GET /api/communities/[slug]/leaderboard?window=7d|30d|all`

Responses:

- `200` with `{ community, window, entries }` for active communities.
- `404` when the community slug does not exist or is archived.
- Invalid or missing `window` falls back to `all` to match a forgiving public read endpoint.

Entry shape:

```json
{
  "rank": 1,
  "userId": "uuid",
  "username": "daily-builder",
  "points": 40,
  "lastScoringAnswerAt": "2026-05-20T08:30:00.000Z"
}
```

## Policy Edges

The existing model does not enforce leaderboard visibility, so the service must:

- Avoid auth and membership requirements for reads.
- Resolve only active communities.
- Never expose email, platform role, password hash, membership role, selected choices, correctness details, or per-answer history.
- Derive all totals from `answers.points_awarded`.

## Product Docs

Update `PROJECT.md` scoring rules to capture the v1 leaderboard behavior:

- per-community public leaderboard
- windows: 7 days, 30 days, all-time
- top 10 only
- tie-break by earliest most-recent scoring answer

## Testing

Focused automated tests should cover:

- supported `window` parameter normalization
- unsupported `window` values falling back to `all`
- window start calculation for 7-day and 30-day views
- ranking tie-break by earlier most-recent scoring answer
- top-10 truncation

Full verification should include `npm run test -w qna-web`, `npm run lint -w qna-web`, and `npm run build -w qna-web`.
