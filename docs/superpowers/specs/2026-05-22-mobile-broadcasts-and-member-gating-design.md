# Mobile Broadcasts And Member Gating Design

## Goal

Bring broadcasts (creator posts) to the mobile app as a read-only feed inside the Posts tab of community detail. In the same slice, tighten the visibility model on the web back-end so broadcasts are members-only across both clients — a creator's broadcasts are messages *to* their community, not to the public.

## Scope

- Replace the stub Posts tab in mobile community detail with a real broadcasts feed (first ~20 latest, full content, no pagination beyond first page).
- New mobile REST client and typed errors for broadcasts.
- Web back-end: gate broadcast GET endpoints (list + detail) on community membership; return `403` for non-members so the existence of the community itself is not leaked (`404` is reserved for "community does not exist"). Add CORS wrappers to broadcast routes for mobile cross-origin calls.
- Web client: update the broadcasts page and feed to render the members-only gate when the viewer is not a member.

Out of scope: composing, editing, or deleting broadcasts on mobile (creator workflows stay on web per `qna-mobile/AGENTS.md`); pagination beyond first page; broadcast detail screen on mobile; comments on broadcasts (web does not have them either); revisiting visibility for leaderboard or other surfaces.

## Decisions

- **Visibility model**: broadcasts are members-only. "Member" means anyone with role `member` or `creator` for the community in question. Anonymous viewers and authenticated non-members get a gate, not the content.
- **Gate semantics**: GET list and GET detail return `403 { error: "Membership required." }` when the viewer is authenticated but not a member, and `401 { error: "Authentication required." }` when the viewer is anonymous. Community existence is not leaked — the parent community route is the canonical source for `404`.
- **Mobile feed presentation**: full content per card (author, relative time, body, optional image). No separate detail screen on mobile; the feed is the destination.
- **Pagination**: first page only (`limit=20`). Cursor support stays in the client API but no UI for "load more" yet.
- **Image rendering**: when `imageUrl` is present, render below the body using `expo-image`, full card width, fixed aspect ratio, rounded corners.
- **Shared utility**: extract `formatRelativeTime` from `services/questions/format.ts` to a neutral `services/util/time.ts` so questions and broadcasts both consume it without a feature-to-feature import.

## REST contract

Existing endpoints, with this slice's changes called out:

- `GET /api/communities/[slug]/broadcasts?limit&cursor` — **changed**: now reads the session, resolves viewer's community role, and enforces membership before returning items. Adds `OPTIONS` and `withCors` wrappers.
- `GET /api/communities/[slug]/broadcasts/[postId]` — **changed**: same membership gate. Adds `OPTIONS` and `withCors` wrappers.
- `POST`, `PATCH`, `DELETE` broadcast endpoints — unchanged (already creator-gated). Receive CORS wrappers for symmetry.

Response shape on success is unchanged. New error responses:

- `401 { error: "Authentication required." }` for anonymous requests.
- `403 { error: "Join this community to see broadcasts." }` for authenticated non-members.

Mobile uses the same `Authorization: Bearer <token>` header it already sends elsewhere; web pages resolve the session through the existing server-component path.

## Service layer

### Web

- `qna-web/src/services/broadcasts/broadcasts.ts`:
  - `listCommunityBroadcasts` and `getCommunityBroadcast` already accept `viewerUserId`. Both gain a membership gate that runs after the community lookup. Two new error classes: `BroadcastAuthenticationRequiredError` (no `viewerUserId`) and `BroadcastMembershipRequiredError` (`viewerUserId` set, role is null). Both live in `services/broadcasts/errors.ts`. `BroadcastPermissionError` stays untouched — it remains the "you tried to mutate something you don't own" error.
  - Tests in `broadcasts.test.ts` cover the new gates: anonymous → auth required; non-member → membership required; member → reads succeed; creator → reads succeed.
- `qna-web/src/app/api/communities/[slug]/broadcasts/route.ts` and `[postId]/route.ts`:
  - Read the session before calling the service. Map the new errors to `401`/`403`. Wrap responses with `withCors`. Add `OPTIONS` handler.

### Mobile

- `qna-mobile/services/broadcasts/api.ts` — new typed REST client:
  - Types: `Broadcast`, `BroadcastListResult`, `BroadcastListPagination`.
  - `createBroadcastsClient({ apiUrl })` exposes `list(slug, { limit?, cursor?, token? })` and `get(slug, postId, token?)`. Token is optional but always threaded so the gate works for members.
  - `BroadcastsApiError extends Error` with `status` and optional `code: 'unauthenticated' | 'forbidden' | 'not_found'` so the UI can branch without string-matching.
- `qna-mobile/services/broadcasts/api.test.ts` — tests:
  - List happy path with `limit` and bearer token.
  - List with `cursor` passed through.
  - List unauthenticated → `BroadcastsApiError` with `code: 'unauthenticated'`.
  - List as non-member (403) → `BroadcastsApiError` with `code: 'forbidden'`.
  - 404 community → `BroadcastsApiError` with `code: 'not_found'`.
- `qna-mobile/services/util/time.ts` — new home of `formatRelativeTime`. Consumers in `services/questions/format.ts` and the question detail screen are updated to import from the new path; no re-export shim is left behind.
- `qna-mobile/services/util/time.test.ts` — new; the `formatRelativeTime` cases currently in `services/questions/format.test.ts` move here.

## Screens

### Mobile — community detail Posts tab

`qna-mobile/app/communities/[slug].tsx` replaces the stub `broadcasts` tab body with a new in-file `BroadcastsTab` component that mirrors the existing `QuestionsTab` pattern:

- Holds `items`, `loading`, `error` state.
- `useFocusEffect` fires `broadcastsClient.list(slug, { limit: 20, token })` on focus.
- States:
  - **Loading**: `StatePanel` with "Loading posts...".
  - **Error — unauthenticated**: `StatePanel` titled "Sign in to see posts" with primary `BrandButton` linking to `/login?returnTo=...`.
  - **Error — forbidden** (authenticated non-member): `StatePanel` titled "Join this community to see posts" with body "Membership unlocks broadcasts from the creator." No button inside the panel; the Join button already sits in the community header above the tabs, so the gate text directs attention there.
  - **Error — other**: `StatePanel` with the message and a Retry button.
  - **Empty**: `StatePanel` titled "No posts yet" with body "Creators will share updates here."
  - **List**: vertical list of `BroadcastCard` items.

`BroadcastCard`:

- Header row: author identicon/initials + `@username` + `formatRelativeTime(publishedAt)`.
- Body: full text, `Text` with appropriate `numberOfLines` removed so the card grows.
- Image (optional): `expo-image` below the body, full card width, `aspectRatio: 16/9`, `contentFit: 'cover'`, rounded corners matching the brand card radius.

### Web — broadcasts page

`qna-web/src/app/communities/[slug]/broadcasts/page.tsx` and its `_components/BroadcastFeed.tsx`:

- The server component already resolves the viewer's role for the community via `getCommunityBySlug`. Use it: if the viewer is not a member, render a `StatePanel`-equivalent block ("Join to see posts from <community>") above an unauthenticated CTA (Sign in / Join). Reuse the existing community-not-joined patterns already present elsewhere in `qna-web`.
- Do not call the service for items when the gate would fail; render the gate view directly.

## Error handling matrix

| Caller state                | List/Detail response   | Mobile UI                              | Web UI                                  |
|-----------------------------|------------------------|----------------------------------------|-----------------------------------------|
| Anonymous                   | 401                    | "Sign in to see posts" + login CTA     | Server-rendered gate, Sign in / Join    |
| Authenticated, non-member   | 403                    | "Join this community to see posts"     | Server-rendered gate with Join CTA      |
| Member or creator           | 200                    | Feed                                   | Feed                                    |
| Community not found         | 404                    | "Community not available" (rare)       | 404 page (existing)                     |
| Network / 5xx               | n/a                    | "Unable to load posts" + Retry         | Existing error boundary                 |

## Testing

- Web: extend `qna-web/src/services/broadcasts/broadcasts.test.ts` (or its policy-adjacent peers) with the gate cases. Route-level tests stay light since the service tests carry the logic — but add a route-level test for the `withCors` wrapping if the codebase already has a pattern for it.
- Web: add `canReadBroadcasts(communityRole)` to `services/broadcasts/policy.ts` (returns `true` for `'member' | 'creator'`) and cover it in `policy.test.ts` for symmetry with the existing `canCreate/Edit/SoftDelete` helpers. The service layer calls this helper rather than open-coding the role check.
- Mobile: `services/broadcasts/api.test.ts` covers the five cases listed above.
- Mobile: existing test suites remain green; `formatRelativeTime` move keeps its current tests under the new path.
- Manual: anonymous user opens Posts tab → gate; logs in but not joined → gate with join CTA; joins → feed appears with images; creator's own broadcast renders identically.

## Files touched

Web (`qna-web/`):

- `src/services/broadcasts/broadcasts.ts` — gate logic + new error types.
- `src/services/broadcasts/errors.ts` — new error classes.
- `src/services/broadcasts/broadcasts.test.ts` — new test cases.
- `src/app/api/communities/[slug]/broadcasts/route.ts` — session-aware GET, CORS.
- `src/app/api/communities/[slug]/broadcasts/[postId]/route.ts` — session-aware GET, CORS.
- `src/app/communities/[slug]/broadcasts/page.tsx` — member gate render.
- `src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx` — adjust to expect gated-or-list rendering.

Mobile (`qna-mobile/`):

- `services/broadcasts/api.ts` — new.
- `services/broadcasts/api.test.ts` — new.
- `services/util/time.ts` — new.
- `services/util/time.test.ts` — new (move tests from `services/questions/format.test.ts`).
- `services/questions/format.ts` — drop `formatRelativeTime`, re-export from `services/util/time.ts` if any consumer still imports from this path; otherwise update consumers.
- `app/communities/[slug].tsx` — replace stub Posts tab with `BroadcastsTab` + `BroadcastCard`.

Docs:

- `docs/superpowers/specs/2026-05-22-mobile-broadcasts-and-member-gating-design.md` — this file.

## Sequencing notes

Web changes ship in the same slice as mobile because mobile cannot be made stricter than web (the API is the source of truth). Ordering during implementation:

1. Web service-layer gate + tests.
2. Web route updates + CORS.
3. Web page-level gate render.
4. Mobile `formatRelativeTime` extraction (keeps subsequent diffs clean).
5. Mobile broadcasts REST client + tests.
6. Mobile community detail Posts tab wiring.
7. Verification: web tests, mobile tests, web lint, mobile lint, mobile typecheck, mobile web export.
