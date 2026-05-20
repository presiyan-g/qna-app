# Public Profile Design

## Goal

Add a public user profile page at `/users/[username]` so usernames shown across leaderboards, comments, broadcasts, and signed-in navigation lead somewhere useful.

## Scope

This slice is a read path with link rewires. It adds a web profile route, a shared profile service, a mobile-ready REST endpoint, and links from existing username surfaces.

It does not add profile editing, display names, bios, avatars, uploads, follows, blocks, reports, moderation tooling, streaks, activity feeds, or mobile profile UI.

## Locked Decisions

- Public profile URL is `/users/[username]`.
- Profiles are public to everyone, including anonymous traffic.
- Self-profile view is identical to every other public profile view.
- No editing appears in this slice, including for the signed-in user's own profile.
- No schema changes. v1 reads only from `users`, `community_members`, `communities`, and `answers`.
- v1 has no `display_name`, `bio`, or `avatar_url`; those belong to a future edit-profile slice with its own schema migration.
- Aggregate points derive from `answers.points_awarded`; there is no denormalized totals column.
- Existing username surfaces must link to `/users/[username]`:
  - Leaderboard rows.
  - Comment author names on the question detail page.
  - Broadcast author names on feed and detail views.
  - Web nav `UserMenu` username chip.
  - Web mobile menu username chip.

## Proposed Product Decisions For Sign-Off

These choices resolve the open product questions before coding.

### Profile Content

Show a compact public summary:

- Username.
- Joined date from `users.created_at`.
- Total points from `answers.points_awarded`.
- Active community memberships with:
  - community name
  - community slug link
  - membership role badge: `creator` or `member`
  - joined date from `community_members.joined_at`

Defer per-community score breakdowns, recent activity, answer/comment feeds, and streaks. The v1 content is cheap to derive from the locked table set, directly useful for understanding a person's community footprint, and avoids creating a public activity product before privacy and moderation rules exist.

Community memberships sort by creator role before member role, then most recent join date, then community name. This keeps creator relationships visible while avoiding a per-community score query that would require joining through `questions`.

### Missing Usernames

Use `notFound()` for missing usernames and return `404` from REST.

Prior slices use 404 for missing public entities, and a user profile is an entity lookup rather than a recoverable empty state. The app's global 404 page can carry the friendly tone.

### Anonymous Visibility And Archived Communities

Show only memberships in active communities. Hide archived community memberships from the public profile.

`PROJECT.md` already treats archived communities as hidden from listings. Profiles should not re-expose archived community names through a side door, especially to anonymous viewers. The total point count is the all-time sum of `answers.points_awarded` for the user because the locked v1 table set does not include `questions`, which would be required to scope points by active community. If sign-off requires active-community-only totals, implementation must explicitly allow a `questions` join or defer that stricter total until a score/read-model table exists.

### Future Member-Only Communities

v1 rule: show active communities because all communities are currently public.

Upgrade path: when member-only communities land, the profile service should accept an optional `viewerUserId` and filter memberships through the same community visibility policy used by community pages and listings. If totals need viewer-specific privacy, the data model or query scope must change so points can be attributed to visible communities without leaking private membership through the aggregate number.

### REST Endpoint For Mobile

Ship the REST endpoint in this slice:

`GET /api/users/[username]`

Mobile Profile is listed in `PROJECT.md` §6, and this is a read-only endpoint backed by the same service as the web page. Landing it now keeps the web/mobile contract aligned and avoids a later mobile slice needing to reopen profile read semantics.

## Public Profile Read Model

Service return shape:

```ts
type PublicUserProfile = {
  user: {
    id: string;
    username: string;
    joinedAt: Date;
  };
  stats: {
    totalPoints: number;
    communityCount: number;
  };
  communities: Array<{
    id: string;
    slug: string;
    name: string;
    role: 'member' | 'creator';
    joinedAt: Date;
  }>;
};
```

The REST serializer converts dates to ISO strings and returns the same object shape:

```json
{
  "user": {
    "id": "uuid",
    "username": "daily_builder",
    "joinedAt": "2026-05-20T08:00:00.000Z"
  },
  "stats": {
    "totalPoints": 70,
    "communityCount": 2
  },
  "communities": [
    {
      "id": "uuid",
      "slug": "daily-ai-builders",
      "name": "Daily AI Builders",
      "role": "creator",
      "joinedAt": "2026-05-20T08:10:00.000Z"
    }
  ]
}
```

## Service Design

Create `qna-web/src/services/profiles/`:

- `summary.ts`: pure helpers for building the public profile read model from active memberships and the all-time point total.
- `summary.test.ts`: focused coverage for total points, memberships with no scores, and sort order.
- `profiles.ts`: Drizzle read service that resolves the user by username, loads active memberships, loads the user's total awarded points, and returns the public profile read model.
- `index.ts`: profile service exports.

The service must not expose email, password hash, platform role, answer choices, correctness, per-answer history, or archived community rows.

## Web UX

`/users/[username]` renders server-first:

- Global `Nav` and `Footer`.
- 404 for unknown usernames.
- Header with `@username`, joined date, total points, and active community count.
- A "Communities" section listing active memberships.
- Each community row links to `/communities/[slug]` and shows the role badge and joined date.
- Empty state when the user has no active community memberships.

No "Edit profile" button appears in v1.

## Link Rewires

Update existing surfaces without changing their surrounding product behavior:

- `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`: wrap each row username in `Link` to `/users/${entry.username}`.
- `qna-web/src/app/communities/[slug]/questions/[id]/_components/CommentForm.tsx`: render non-deleted author usernames as links in the `CommentList` / `CommentItem` code that currently lives in this file. Deleted tombstones stay `[deleted]` and do not link.
- `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx`: link broadcast author usernames on both feed and detail pages because the detail page reuses this component.
- `qna-web/src/app/_components/landing/UserMenu.tsx`: turn the username chip into a link to the signed-in user's profile.
- `qna-web/src/app/_components/landing/MobileMenu.tsx`: turn the signed-in mobile drawer username chip into the same profile link.

## REST API

Add:

`GET /api/users/[username]`

Behavior:

- `200` with the public profile resource for existing users.
- `404` when the username does not exist.
- No auth required.

The route is intentionally read-only. Profile mutation endpoints wait for the future edit-profile slice.

## Product Docs

Update `PROJECT.md` §6 or a nearby profile note to record:

- public profile route `/users/[username]`
- anonymous visibility
- v1 public fields
- active-community-only membership visibility
- all-time profile total derived from `answers.points_awarded`
- REST endpoint for mobile profile consumption

## Testing

Focused automated tests should cover:

- profile summary preserves the all-time point total
- active memberships stay visible even when the user has no points
- community sort order
- REST/page serialization date expectations through pure serializers where practical

Full verification should include:

```bash
npm run test -w qna-web
npm run lint -w qna-web
npm run build -w qna-web
```

## Self-Review

- Placeholder scan: no placeholder decisions remain.
- Internal consistency: public visibility, active-community filtering, REST response shape, and web view all use the same service model.
- Scope check: the slice is one coherent read path plus link rewires; profile editing and activity features are explicitly deferred.
- Ambiguity check: missing users, archived communities, future private communities, and REST timing are resolved for sign-off before implementation.
