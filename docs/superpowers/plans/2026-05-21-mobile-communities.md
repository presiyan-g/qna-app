# Mobile Communities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build API-backed mobile community discovery and detail screens with join handling and tab scaffolding.

**Architecture:** Add a focused mobile communities REST client, use it from the home, list, and detail screens, and keep tab state local to the dynamic detail route. Web API community routes get the same CORS wrapper as auth routes so mobile web exports can call them cross-origin.

**Tech Stack:** Expo Router, React Native, TypeScript, Node test runner, Next.js API routes.

---

### Task 1: Mobile Communities Client

**Files:**
- Create: `qna-mobile/services/communities/api.ts`
- Create: `qna-mobile/services/communities/api.test.ts`

- [x] Add tests for list, detail, join, bearer auth, error parsing, and trailing slash URL normalization.
- [x] Implement `createCommunitiesClient`.
- [x] Run `npm run test -w qna-mobile`.

### Task 2: Community Cards and Home Fetch

**Files:**
- Modify: `qna-mobile/components/Brand.tsx`
- Modify: `qna-mobile/app/index.tsx`

- [x] Make `CommunityPreviewCard` tappable with `href` and remove the plus mark.
- [x] Fetch `GET /api/communities?limit=3&offset=0` on the home screen and render real slugs.
- [x] Preserve loading, empty, and retry states without blocking the rest of the home screen.

### Task 3: Community List and Detail

**Files:**
- Modify: `qna-mobile/app/communities.tsx`
- Create: `qna-mobile/app/communities/[slug].tsx`
- Modify: `qna-mobile/app/_layout.tsx`

- [x] Replace placeholder list with page-one API data (`limit=24&offset=0`).
- [x] Document pagination scope: this slice intentionally ships page one only; infinite scroll is a later catalog-growth slice.
- [x] Refetch list on screen focus.
- [x] Add detail screen with Join action, logged-out return path, real About tab, and empty Questions/Broadcasts/Leaderboard tabs.
- [x] Add stack screen for `communities/[slug]`.

### Task 4: Auth Return Path

**Files:**
- Modify: `qna-mobile/services/auth/AuthContext.tsx`
- Modify: `qna-mobile/app/login.tsx`
- Modify: `qna-mobile/app/register.tsx`

- [x] Add optional `returnTo` argument to login/register.
- [x] Read `returnTo` from route search params on login/register.
- [x] Preserve `returnTo` when switching between login and register.

### Task 5: Community API CORS

**Files:**
- Modify: `qna-web/src/app/api/communities/route.ts`
- Modify: `qna-web/src/app/api/communities/[slug]/route.ts`
- Modify: `qna-web/src/app/api/communities/[slug]/join/route.ts`

- [x] Add `OPTIONS` handlers.
- [x] Wrap all JSON responses with `withCors`.

### Task 6: Verify

**Commands:**
- `npm run test -w qna-mobile`
- `npm run lint -w qna-mobile`
- `npm run build -w qna-mobile`
- Browser sanity check on Expo web.

- [x] Fix any TypeScript, lint, or export errors.
