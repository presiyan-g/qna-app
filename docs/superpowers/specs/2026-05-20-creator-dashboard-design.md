# Creator Dashboard Phase 1 Design

## Goal

Add the first creator dashboard slice: a protected cross-community hub for creators and a protected per-community question management drill-down.

This slice pins down the dashboard shape that `PROJECT.md` only names today. When the slice ships, `PROJECT.md` should be updated to record the approved dashboard behavior in the same posture as the leaderboard and broadcasts slices.

## Scope

Phase 1 covers:

- A protected `/dashboard` hub for any signed-in user who is a creator in at least one community.
- A protected per-community drill-down at `/dashboard/communities/[slug]`.
- Question management for creator-owned communities: list, create draft, schedule, edit unpublished questions, and soft-delete unpublished questions.
- Server-side creator-role enforcement for pages, Server Actions, and existing REST creator mutations.
- Auth middleware for protected dashboard routes.
- Product-doc update at shipping time.

This slice does not cover member management, community settings, analytics, broadcast management inside the dashboard, mobile UI, AI question drafting, upload/R2 media, notifications, or platform admin.

## Locked Decisions

- The dashboard has two surfaces: a cross-community hub and a per-community management drill-down.
- Creator management does not get bolted onto the public `/communities/[slug]` page.
- A user qualifies for the dashboard when they have `community_members.role = 'creator'` in at least one active community.
- Anonymous users visiting dashboard routes are redirected to `/login?next=<requested-path>`.
- Signed-in users with no creator memberships see a friendly 403-style screen.
- Creator checks happen server-side in page loaders and Server Actions.
- The existing REST question create endpoint remains creator-gated; this slice does not add mobile-facing question update/delete endpoints.
- Route-protecting middleware/proxy starts in this slice because protected app routes now exist.
- Broadcast controls stay on `/communities/[slug]/broadcasts`; the dashboard may link to broadcasts but does not duplicate broadcast management.

## Proposed Product Decisions For Sign-Off

These choices resolve the open product questions before coding.

### URL Shape

Use `/dashboard` for the cross-community hub and `/dashboard/communities/[slug]` for the per-community drill-down.

`/dashboard` is the simplest creator home URL and matches your direction to use "dashboard". Nesting the drill-down under the dashboard keeps management separate from public community pages while making the relationship obvious. It also leaves `/communities/[slug]/manage` unused, which avoids mixing public community navigation with creator-only operations.

### Hub At-A-Glance Signals

Each hub community card shows a small, computable v1 set:

- member count from `community_members`
- today's question status in GMT: `live`, `scheduled today`, `missing today`, or `closed today`
- next scheduled question time, when one exists
- latest broadcast timestamp and a link to the public broadcast feed, when one exists

Skip comments-needing-attention because comments have no moderation, unread, report, or needs-reply state. Skip correctness, drop-off, answer volume, and trend metrics because analytics are explicitly out of scope.

### Question Editability

Allow editing only before publish.

A question is editable when it is a draft or its publish timestamp is still in the future. Once `published_at <= now()`, prompt, explanation, choices, correct answer, points, and schedule become read-only in Phase 1.

This avoids answer consistency problems for members who have already answered and avoids introducing an audit trail in the first dashboard slice. Fixing typos in published questions is useful, but it belongs with an explicit audit/history policy.

### Question Deletes

Use soft-delete for unpublished questions only.

Creators can delete drafts and future scheduled questions. The app sets `questions.deleted_at` and hides the question from public and dashboard lists. Published questions cannot be deleted in Phase 1 because answers, comments, leaderboard totals, and history depend on them.

Soft-delete matches the comments and broadcasts precedent and gives the data model a safer path for future audit or recovery without exposing recovery UI now.

### Draft State

Introduce a true draft state.

A draft question has `scheduled_for = null`, `published_at = null`, and `closes_at = null`. It can store a complete multiple-choice question without a publish time. Scheduling a draft sets `scheduled_for`, `published_at`, and `closes_at`, matching the current no-cron model where `published_at` stores the intended publish timestamp.

This requires a Drizzle migration to make `questions.scheduled_for` and `questions.closes_at` nullable and to add `questions.deleted_at`. Existing rows keep their current values.

The nullability is deliberately contained at service boundaries. Public member-facing question reads, answer submission, grading, comments, and leaderboard history must continue to operate only on non-deleted scheduled or published questions where `scheduled_for` and `closes_at` are non-null. Drafts stay dashboard-only until they are scheduled.

Creators should not be forced to schedule far in the future just to save work in progress. A real draft state also gives the dashboard a clear "Needs schedule" bucket.

### REST Surface

Do not add new `PATCH` or `DELETE` question REST endpoints in this slice.

Phase 1 is web-only for editing and deleting questions. Server Actions call the shared service layer. The existing mobile-facing REST question create endpoint stays in place and remains creator-gated. A future mobile-creator slice can add REST `PATCH` and `DELETE` once there is a mobile UI that needs those contracts.

## Dashboard UX

### Hub

`/dashboard` renders server-first:

- top nav
- page title: "Dashboard"
- compact summary counts: creator communities, questions live today, drafts needing schedule
- one card per active creator community
- card actions:
  - `Manage questions` links to `/dashboard/communities/[slug]`
  - `View public community` links to `/communities/[slug]`
  - `Broadcasts` links to `/communities/[slug]/broadcasts`

Cards remain operational rather than analytical. They should help a creator answer "what needs attention today?" without becoming a reporting product.

### Per-Community Management

`/dashboard/communities/[slug]` renders server-first with a client form only where form state is needed:

- back link to `/dashboard`
- community name and public-community link
- question composer that can save a draft or schedule now
- grouped question lists:
  - Drafts
  - Scheduled
  - Published / history
- controls:
  - draft: edit, schedule, delete
  - scheduled future: edit, reschedule, delete
  - published: view-only in this slice, with link to the public question detail page

The public `/communities/[slug]` page should remove or de-emphasize creator-only question composition after this slice, replacing it with a link to dashboard management for creators. Public community pages remain member-facing surfaces.

## Question State Rules

Dashboard state is derived from timestamps and `deleted_at`:

- `draft`: `deleted_at is null`, `scheduled_for is null`, `published_at is null`
- `scheduled`: `deleted_at is null`, `scheduled_for > now`, `published_at > now`
- `live`: `deleted_at is null`, `published_at <= now < closes_at`
- `closed`: `deleted_at is null`, `closes_at <= now`
- `deleted`: `deleted_at is not null`, hidden from normal reads

For existing scheduled questions, `published_at` already equals `scheduled_for`; keep that convention until a future background publishing slice changes it.

## Data Model

Modify `questions`:

| Column | Change | Reason |
| --- | --- | --- |
| `scheduled_for` | nullable | true drafts have no publish time |
| `closes_at` | nullable | true drafts have no answer window |
| `deleted_at` | new nullable timestamptz | soft-delete unpublished questions |

Replace indexes:

- Drop the old `questions_community_schedule_idx` because it overlaps the active-question lookup.
- Add `questions_active_community_schedule_idx` on `(community_id, scheduled_for)` with `WHERE deleted_at IS NULL`.
- Keep `questions_creator_user_id_idx`.

No table is added for audit history in Phase 1.

## Service Design

Extend `qna-web/src/services/questions/` instead of putting dashboard queries in page components.

New or updated responsibilities:

- `state.ts`: derive question state and edit/delete permissions from timestamps.
- `validation.ts`: support draft input and schedule input while preserving existing create validation.
- `questions.ts`: add creator dashboard query and mutations.
- `errors.ts`: keep typed permission, not-found, immutable, and validation errors.

Existing downstream readers must be updated in the same slice so nullable draft fields do not leak into public/member flows:

- Public community question lists exclude drafts and soft-deleted questions.
- Question detail and answer submission reject draft or soft-deleted questions as not found.
- Answer grading only receives questions with non-null `scheduled_for` and `closes_at`.
- UI date formatting only receives scheduled/published question resources with non-null timestamps.

Primary service functions:

- `listCreatorCommunitiesDashboard({ userId, now })`
- `getCreatorCommunityDashboard({ slug, userId, now })`
- `createQuestionDraft({ slug, creatorUserId, input })`
- `updateUnpublishedQuestion({ slug, questionId, creatorUserId, input, now })`
- `scheduleQuestion({ slug, questionId, creatorUserId, scheduledFor, now })`
- `softDeleteUnpublishedQuestion({ slug, questionId, creatorUserId, now })`

Every mutating service resolves the active community, checks `community_members.role = 'creator'`, excludes soft-deleted questions, and rejects published questions.

## Server Actions

Add or extend web Server Actions in `qna-web/src/app/actions/questions.ts`:

- `createQuestionDraftAction`
- `updateQuestionAction`
- `scheduleQuestionAction`
- `deleteQuestionAction`

Anonymous users redirect to `/login?next=/dashboard/communities/[slug]`. Signed-in non-creators receive a form-level permission error or the page-level friendly 403 depending on where the failure happens.

Successful mutations revalidate:

- `/dashboard`
- `/dashboard/communities/[slug]`
- `/communities/[slug]`

## Middleware / Proxy

Add Next.js route-protecting proxy middleware for auth-only route protection. In this repo's Next.js version, the file convention is `qna-web/src/proxy.ts`:

- Match `/dashboard` and `/dashboard/:path*`.
- If the session cookie is absent or invalid, redirect to `/login?next=<pathname-and-search>`.
- If a session exists, allow the request.

The proxy does not check creator role because that requires database access and because the JWT only carries platform role. Page and service checks enforce creator authorization.

## REST API

No new REST endpoints are added for dashboard management.

Keep the existing behavior:

- `GET /api/communities/[slug]/questions` remains a member/mobile read endpoint.
- `POST /api/communities/[slug]/questions` remains creator-gated and can keep scheduling questions directly.

This slice may update the shared service used by REST create so that created questions still have a scheduled timestamp and are not drafts unless the web draft action is used.

## Product Docs

When shipping, update `PROJECT.md` to capture:

- `/dashboard` as the creator hub.
- `/dashboard/communities/[slug]` as the per-community question management route.
- Dashboard Phase 1 manages drafts and unpublished scheduled questions.
- Published questions are view-only in the dashboard.
- Member management, community settings, analytics, dashboard broadcast management, mobile dashboard UI, and platform admin remain separate slices.

## Testing

Focused automated tests should cover:

- question state derivation for draft, scheduled, live, closed, and deleted rows
- edit/delete permission policy for drafts, future scheduled questions, and published questions
- validation for draft saves and schedule timestamps
- creator dashboard service excluding non-creator communities
- public/read-service filtering that prevents draft and soft-deleted questions from reaching member-facing UIs
- middleware redirect target construction

Full verification should include:

```bash
npm run test -w qna-web
npm run lint -w qna-web
npm run build -w qna-web
```

Browser verification should cover anonymous redirect, signed-in non-creator 403, creator hub access, creating a draft, scheduling it, editing a future scheduled question, and rejection of edits after publish.

## Self-Review

- Placeholder scan: all open product questions are resolved with explicit proposals for sign-off.
- Internal consistency: route shape, draft data model, edit/delete policy, middleware, Server Actions, and REST scope align.
- Scope check: the slice is focused on web creator dashboard and question management; member management, settings, analytics, broadcasts, mobile, and admin are excluded.
- Ambiguity check: published question immutability, soft-delete behavior, and true draft timestamp semantics are explicit.
