# Community Unread Indicators Design

## Goal

Surface, on every `CommunityListCard`, when a community the user has joined has:

1. an open scheduled question the user has not answered, and / or
2. a broadcast post published since the user last visited that community's broadcasts feed.

Both indications must clear automatically once the user acts on them — answering the question, or visiting the broadcasts feed. No notification system, no bell icon, no email.

## Non-goals

- Global notification surface (bell icon, dropdown).
- Push or email notifications.
- Per-broadcast read tracking (only an aggregate "last seen" timestamp per membership).
- Indicators on the community home page header (`/communities/[slug]`).
- Aggregate badges in the top nav (e.g. "My communities · 3").
- Real-time updates while a page is open. Counts recompute on each request only.
- Mobile UI consumption. Mobile may follow in a later slice with its own design.

## Locked decisions

- The same `CommunityListCard` is used on `/communities` (discover) and `/my-communities`. The pills render on both surfaces; they render only when `currentUserRole !== null`, so logged-out and non-member viewers see nothing different.
- Creators are members (`community_members` row with `role = 'creator'`) and are included in the indicators on their own community. They will see a "1 new question" pill for an open question they scheduled but have not answered themselves. They can clear it by answering or by letting the question close.
- "Open question I haven't answered" is derived from `questions` + `answers` with no new state. No schema change is needed for the question pill.
- Broadcast unread state uses a single nullable timestamp `community_members.last_seen_broadcasts_at`. There is no per-broadcast read table.
- `last_seen_broadcasts_at` is stamped on every visit to `/communities/[slug]/broadcasts` for members (idempotent — overwrite with `now()`).
- On join, `last_seen_broadcasts_at` is initialized to `joined_at`. New joiners therefore see broadcast count = 0 until a creator posts after they joined.
- Existing `community_members` rows are backfilled in the same migration: `last_seen_broadcasts_at = joined_at` for every row.
- Soft-deleted questions (`questions.deleted_at`) and broadcasts (`broadcast_posts.deleted_at`) are excluded from the counts.
- Counts are per-row correlated subqueries inside the existing `communitySummaryFields` block. No new endpoint, no new client fetch.

## Data model

Add one column to `community_members`:

| Column                     | Type                       | Nullable | Notes                                                         |
| -------------------------- | -------------------------- | -------- | ------------------------------------------------------------- |
| `last_seen_broadcasts_at`  | `timestamp with time zone` | yes      | Last time this member visited `/communities/[slug]/broadcasts`. |

Migration steps:

1. Add the column nullable.
2. `UPDATE community_members SET last_seen_broadcasts_at = joined_at WHERE last_seen_broadcasts_at IS NULL`.
3. Leave the column nullable. `joinCommunity` and the existing creator-on-create insert both set it to `now()` going forward (functionally equal to `joined_at`).

No new index is required for v1. The subquery is keyed on `(community_id, user_id)`, which is already covered by the existing `community_members_community_user_unique` unique index.

## Service layer

Files touched: `qna-web/src/services/communities/communities.ts`, `qna-web/src/services/communities/resource.ts` (whatever assembles `CommunityWithMembership`), and a new export.

### Read side: extend `communitySummaryFields(userId)`

Add two new subqueries that return `0` when `userId` is `null` or the user is not a member:

```ts
unansweredQuestionCount: userId
  ? sql<number>`(
      select count(*)::int
      from ${questions} q
      where q.community_id = ${communities.id}
        and q.deleted_at is null
        and q.published_at is not null
        and q.published_at <= now()
        and q.closes_at > now()
        and exists (
          select 1 from ${communityMembers} cm
          where cm.community_id = ${communities.id}
            and cm.user_id = ${userId}
        )
        and not exists (
          select 1 from ${answers} a
          where a.question_id = q.id and a.user_id = ${userId}
        )
    )`
  : sql<number>`0`,

newBroadcastCount: userId
  ? sql<number>`(
      select count(*)::int
      from ${broadcastPosts} b
      where b.community_id = ${communities.id}
        and b.deleted_at is null
        and b.published_at > coalesce(
          (select last_seen_broadcasts_at
             from ${communityMembers}
             where community_id = ${communities.id}
               and user_id = ${userId}),
          'epoch'
        )
    )`
  : sql<number>`0`,
```

The `exists` membership check inside `unansweredQuestionCount` is what makes non-member rows on the discover page return `0` without leaking question state to outsiders. The `coalesce(..., 'epoch')` fallback is defense in depth — backfill makes the column non-null in practice, but future-NULL safety costs nothing.

### Write side: `markBroadcastsSeen`

New exported function in `services/communities/communities.ts`:

```ts
export async function markBroadcastsSeen({
  userId,
  slug,
}: {
  userId: string;
  slug: string;
}): Promise<void>;
```

Behavior:

- Resolve `slug → community_id`. If not found, return silently.
- `UPDATE community_members SET last_seen_broadcasts_at = now() WHERE community_id = ? AND user_id = ?`.
- No throw on zero rows (non-members are no-ops).
- Returns nothing.

This is called once from the `/communities/[slug]/broadcasts` server page render, gated on the viewer being signed in. The call is fire-and-forget from the page's perspective (awaited, but its result is discarded).

### Type changes

```ts
export type CommunityWithMembership = Community & {
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
  unansweredQuestionCount: number;   // new — always present, 0 for non-members / anon
  newBroadcastCount: number;         // new — always present, 0 for non-members / anon
};
```

The resource builder (`buildCommunityResource`) is extended to thread both counts through.

### Join / creation paths

- `createCommunity`: the creator's `community_members` insert sets `last_seen_broadcasts_at` to `now()` explicitly so the creator's pill starts at 0.
- `joinCommunity`: same — set `last_seen_broadcasts_at` to `now()` (equivalent to `joined_at`) in the insert values.

These two changes make sure no fresh member is ever surprised by a flood of historical broadcasts.

## UI

### `CommunityListCard` changes

File: `qna-web/src/app/communities/_components/CommunityListCard.tsx`.

Render a new row directly below the description (`p.mt-4 text-sm leading-6 text-muted`) and above the existing `<footer>`. The row is only mounted when `currentUserRole !== null` AND (`unansweredQuestionCount > 0` OR `newBroadcastCount > 0`).

Pseudo-markup:

```tsx
{community.currentUserRole !== null &&
 (community.unansweredQuestionCount > 0 || community.newBroadcastCount > 0) ? (
  <div className="mt-4 flex flex-wrap gap-2">
    {community.unansweredQuestionCount > 0 ? (
      <Link
        href={`/communities/${community.slug}`}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        {community.unansweredQuestionCount === 1
          ? '1 new question'
          : `${community.unansweredQuestionCount} new questions`}
      </Link>
    ) : null}
    {community.newBroadcastCount > 0 ? (
      <Link
        href={`/communities/${community.slug}/broadcasts`}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden />
        {community.newBroadcastCount === 1
          ? '1 new broadcast'
          : `${community.newBroadcastCount} new broadcasts`}
      </Link>
    ) : null}
  </div>
) : null}
```

The pills use existing tokens (`bg-primary-soft`, `text-primary`, `border-line`, `text-ink`) — no new design tokens.

### Mark-as-seen hookup

In `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`:

- After resolving the session and the community, if there is a session, `await markBroadcastsSeen({ userId: session.sub, slug })` before rendering.
- This stamp happens server-side on every visit; the next time the user lands on `/my-communities`, the broadcast pill for that community will be gone.

If the broadcasts page is currently a server component that doesn't already touch `session`, this slice adds the `getSession()` read there.

## Edge cases & invariants

- **Question closes between requests.** Counts recompute every server render. The pill simply disappears next time the page loads. Acceptable for v1 — there is no realtime push.
- **Late answer.** Late answers create a row in `answers` and the question is closed by then. The pill already dropped to 0 when the question closed; the late answer doesn't bring it back. Late-answer scoring is unaffected.
- **Soft-deleted question / broadcast.** Both filters exclude `deleted_at IS NOT NULL`. A creator soft-deleting cleared content clears it from the indicator.
- **User leaves and rejoins.** `leaveCommunity` deletes the `community_members` row. A subsequent `joinCommunity` creates a fresh row with `last_seen_broadcasts_at = now()` — the rejoin starts clean. (Same as a brand-new joiner.)
- **Membership lookup race.** `markBroadcastsSeen` updates zero rows for a non-member (harmless). The page itself still renders the public feed; the timestamp update is best-effort.
- **Two concurrent visits to the broadcasts page.** Both stamp `now()`; the later one wins. Idempotent.
- **Discover page subquery cost.** Two additional correlated subqueries per row, in addition to the existing `memberCount` and `liveQuestionCount`. At the current 24-rows-per-page ceiling this is fine. If list pages grow, consider rewriting `communitySummaryFields` as a single CTE in a separate refactor.
- **Creator hides their question pill?** Not in v1. Locked decision is that creators see the same pill as members. If product changes its mind, the change is a single `and role = 'member'` clause inside `unansweredQuestionCount`.

## Files touched (planning-level)

- `qna-web/src/db/schema/communities.ts` — add `lastSeenBroadcastsAt` to `communityMembers`.
- New Drizzle migration under `qna-web/drizzle/` (or wherever migrations live) — add column + backfill.
- `qna-web/src/services/communities/communities.ts` — extend `communitySummaryFields`, set `last_seen_broadcasts_at` on insert paths, add `markBroadcastsSeen`.
- `qna-web/src/services/communities/resource.ts` (or equivalent) — extend `CommunityWithMembership` type and resource builder.
- `qna-web/src/services/communities/index.ts` — re-export `markBroadcastsSeen`.
- `qna-web/src/app/communities/_components/CommunityListCard.tsx` — render the two pills.
- `qna-web/src/app/communities/[slug]/broadcasts/page.tsx` — call `markBroadcastsSeen` for signed-in viewers.

## Out of scope (deferred)

- Bell icon / global notification surface.
- Push notifications, email digests, in-app toasts.
- Per-broadcast read tracking (intersection observer, per-row reads table).
- Indicator on the community home page header.
- Aggregate count badge in the top nav.
- Mobile (Expo) consumption of these counts — separate slice.
- Realtime push of new questions / broadcasts via websockets or SSE.
