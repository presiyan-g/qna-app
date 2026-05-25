# Notifications Bell Design

## Goal

Surface a bell icon in the web header, between the **Dashboard** link and the `@username` button. The bell shows the 20 most recent question-publish events from communities the signed-in user has joined, excluding questions they authored. An unread badge shows the count of events since the user last clicked the bell. Clicking the bell opens a dropdown and clears the badge to 0.

The bell is a derived view: no separate notifications table, no fan-out on publish. Membership + question publish history is enough to compute everything at read time.

## Non-goals

- Mobile (Expo) bell — separate slice, follows the same pattern as the mobile unread-indicators sequencing.
- Realtime push (websockets/SSE). The bell recomputes on each server render, matching the existing unread-pills behavior.
- Per-item read state ("mark this one as read"). Only a single global "last seen" stamp per user.
- Other notification types — replies, mentions, broadcasts, admin announcements. Out of scope for v1; the data model leaves room for a future materialized `notifications` table if and when those land.
- Notification history beyond 20 items. No "see all" archive page.
- Email or push delivery.
- Logged-out experience. The bell only renders for signed-in users.

## Locked decisions

- **Trigger:** a notification is the event "a question was published in a community the user has joined." Questions whose `creator_user_id = current_user` are excluded — creators are not notified about questions they themselves authored.
- **Clearing:** clicking the bell stamps `users.last_seen_notifications_at = now()` and the badge drops to 0. The dropdown list is **not** emptied — items remain clickable.
- **Retention:** the bell shows up to 20 items, with no time window. Items older than the 20th simply scroll off.
- **New joiners:** when a user joins a community, only questions whose `published_at >= community_members.joined_at` appear in their bell for that community. Joining does not surface pre-existing open questions.
- **Persistence after answer / close:** items stay in the bell after the user answers them or after they close. They render with a muted style and an "Answered" or "Closed" badge so the user has a record of what happened.
- **No realtime:** the bell is server-rendered; the badge and list refresh on page navigation only. No polling, no SSE.
- **Web only:** mobile is a separate slice.

## Data model

Add one column to `users`:

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `last_seen_notifications_at` | `timestamp with time zone` | yes | Bumped to `now()` when the user clicks the bell. NULL means the user has never clicked. |

Migration:

1. Add the column nullable.
2. No backfill. Existing users get NULL, which the query treats as "everything is unread." First click stamps `now()` and behavior is normal from then on.

No new index is required for v1. The bell query is keyed on `community_members.user_id` (already indexed via `community_members_user_id_idx`) and `questions.community_id + published_at` (covered by `questions_active_community_schedule_idx`).

## Service layer

New folder `qna-web/src/services/notifications/`.

### `notifications.ts`

```ts
export type QuestionNotification = {
  questionId: string;
  prompt: string;
  publishedAt: Date;
  closesAt: Date | null;
  communitySlug: string;
  communityName: string;
  communityEmoji: string;
  isUnread: boolean;     // publishedAt > users.last_seen_notifications_at (or stamp is NULL)
  hasAnswered: boolean;  // current user has an answer row for this question
  isClosed: boolean;     // closes_at <= now()
};

export async function listQuestionNotifications(userId: string): Promise<{
  items: QuestionNotification[];
  unreadCount: number;
}>;

export async function markNotificationsSeen(userId: string): Promise<void>;
```

`listQuestionNotifications` runs one query:

- `FROM questions q`
- `INNER JOIN community_members cm ON cm.community_id = q.community_id AND cm.user_id = :userId`
- `INNER JOIN communities c ON c.id = q.community_id`
- `LEFT JOIN answers a ON a.question_id = q.id AND a.user_id = :userId`
- `LEFT JOIN users u ON u.id = :userId` (single row; used only for `last_seen_notifications_at`)
- `WHERE q.deleted_at IS NULL`
- `  AND q.published_at IS NOT NULL`
- `  AND q.published_at <= now()`
- `  AND q.published_at >= cm.joined_at`
- `  AND q.creator_user_id != :userId`
- `ORDER BY q.published_at DESC`
- `LIMIT 20`

Result columns include `q.id`, `q.prompt`, `q.published_at`, `q.closes_at`, `c.slug`, `c.name`, `c.emoji`, `(a.id IS NOT NULL) AS has_answered`, `(u.last_seen_notifications_at IS NULL OR q.published_at > u.last_seen_notifications_at) AS is_unread`.

`isClosed` is derived in JS from `closes_at <= now()` to keep the query simple.

`unreadCount` is computed as `items.filter(i => i.isUnread).length`. Since we already have all 20 rows in memory this avoids a second roundtrip; the badge "9+" cap is applied in the UI.

`markNotificationsSeen`:

```sql
UPDATE users SET last_seen_notifications_at = now(), updated_at = now() WHERE id = :userId
```

No throw if zero rows updated (e.g. user was deleted between session check and update).

### `index.ts`

Re-exports `listQuestionNotifications`, `markNotificationsSeen`, and the `QuestionNotification` type.

## Server action

`qna-web/src/app/actions/notifications.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/services/auth';
import { markNotificationsSeen } from '@/services/notifications';

export async function markNotificationsSeenAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await markNotificationsSeen(session.sub);
  revalidatePath('/', 'layout');
}
```

The `revalidatePath('/', 'layout')` invalidates the root layout cache so the next navigation re-renders `Nav` with `unreadCount = 0`. Without it, the badge would only update on hard refresh.

## UI

### `NotificationsBell.tsx` (server component)

`qna-web/src/app/_components/landing/NotificationsBell.tsx`:

```tsx
import { listQuestionNotifications } from '@/services/notifications';
import { NotificationsBellMenu } from './NotificationsBellMenu';

export async function NotificationsBell({ userId }: { userId: string }) {
  const { items, unreadCount } = await listQuestionNotifications(userId);
  return <NotificationsBellMenu items={items} unreadCount={unreadCount} />;
}
```

### `NotificationsBellMenu.tsx` (client component)

`qna-web/src/app/_components/landing/NotificationsBellMenu.tsx`:

- Renders a `<button>` with an outline bell SVG (18×18, `text-ink`, hover `text-primary`).
- When `unreadCount > 0`, overlays a `bg-primary text-paper` pill at `absolute -top-1 -right-1`, displaying `unreadCount` capped at `"9+"`.
- Uses the same dismissal pattern as `UserMenu`: `useRef` + `pointerdown` listener for outside-click; `keydown` listener for `Escape`.
- On open: if `unreadCount > 0`, optimistically set local `unreadCount = 0` and call `markNotificationsSeenAction()`. Optimistic UI ensures the badge clears immediately even if the server action is in flight.

Dropdown markup:

```tsx
<div
  role="menu"
  className="absolute right-0 top-full z-20 mt-2 w-[360px] overflow-hidden rounded-xl border border-line bg-paper shadow-[0_18px_40px_-22px_rgba(31,64,50,0.28)]"
>
  <header className="border-b border-line px-4 py-3">
    <p className="text-sm font-semibold text-ink">Notifications</p>
    <p className="text-xs text-muted">Updates from communities you’ve joined.</p>
  </header>

  {items.length === 0 ? (
    <div className="px-4 py-6 text-center">
      <p className="text-sm text-muted">No notifications yet.</p>
      <Link href="/communities" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
        Discover communities →
      </Link>
    </div>
  ) : (
    <ul className="max-h-[420px] overflow-y-auto">
      {items.map(item => (
        <li key={item.questionId}>
          <Link
            href={`/communities/${item.communitySlug}/questions/${item.questionId}`}
            onClick={close}
            className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-primary-soft ${
              item.isUnread ? 'bg-primary-soft/40' : ''
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>{item.communityEmoji || '•'}</span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[13px] font-semibold ${item.isUnread ? 'text-ink' : 'text-muted'}`}>
                {item.communityName}
              </p>
              <p className={`line-clamp-2 text-[13px] ${item.isUnread ? 'text-ink' : 'text-muted'}`}>
                {item.prompt}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                <span>{formatRelative(item.publishedAt)}</span>
                {item.hasAnswered ? <span className="font-semibold">· Answered</span> : null}
                {!item.hasAnswered && item.isClosed ? <span className="font-semibold">· Closed</span> : null}
              </div>
            </div>
            {item.isUnread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
          </Link>
        </li>
      ))}
    </ul>
  )}

  <footer className="border-t border-line px-4 py-2.5 text-center">
    <Link href="/my-communities" onClick={close} className="text-xs font-semibold text-primary hover:underline">
      Manage your communities
    </Link>
  </footer>
</div>
```

`formatRelative` is a small helper (`<1m`, `Xm`, `Xh`, `Xd`, `Xw`) — lives next to the component since no other surface needs it yet.

### `Nav.tsx` changes

Insert `<NotificationsBell userId={user.id} />` between the `<Link href="/communities/new">Create</Link>` and `<UserMenu username={user.username} />`. (The mockup in the user's request says "between Dashboard and the username" — `Create` already sits between Dashboard and the username in the current layout; the bell goes between `Create` and `UserMenu` to keep the visual hierarchy of CTA → notifications → identity.)

Only render the bell when `user` is non-null (i.e. signed-in viewers). Logged-out and admin viewers are not special-cased — admins see the bell just like any signed-in user.

### `MobileMenu.tsx` changes

Add a "Notifications" section directly under the primary navigation links and before the identity card. Renders the same item list inline (no dropdown — the mobile menu *is* the surface). The bell badge does not appear inside the mobile menu; instead, the menu trigger itself gets a small primary dot when there are unread notifications, so users on mobile see "something new" before opening the menu.

`MobileMenu` is a client component, so the notifications data must be passed in as props from `Nav`. The shape passed in matches `NotificationsBellMenu`'s `items`/`unreadCount` props. On menu open, the same `markNotificationsSeenAction()` fires once.

## Edge cases & invariants

- **User answers a notified question.** Row stays, renders muted with "Answered" badge.
- **Question soft-deleted after user was notified.** Filter `deleted_at IS NULL` drops it on next render. Acceptable.
- **User leaves a community.** `community_members` row is gone; next render drops all questions from that community.
- **User joins a new community.** `joined_at = now()`; bell only picks up questions published from that moment forward. Pre-existing open questions are not in the bell (but are still visible on the community page).
- **First-time user clicks the bell.** `last_seen_notifications_at` was NULL, so the query flagged every row unread; after click it stamps `now()` and the badge is 0.
- **20+ events happened while away.** Badge displays `"9+"`, list shows the most recent 20; older events are not retrievable. Accepted v1 limitation.
- **Question's `creator_user_id != user.id` but user is the community creator.** Filter is on `questions.creator_user_id`, not membership role. A co-creator publishing a question would notify other creators. Fine.
- **Long-open page.** Bell is server-rendered; the badge and list refresh on next navigation, not in-place. No realtime in v1.
- **Race between bell open and a new publish.** User opens bell at `T0`. Server loads the list with `unreadCount = 2`. User clicks; `markNotificationsSeenAction` stamps `last_seen_notifications_at = T0 + 50ms`. Meanwhile a new question publishes at `T0 + 100ms`. Next navigation: the new question shows as unread relative to the stamp. Acceptable — stale-by-one-render is the accepted tradeoff for not coordinating writes.
- **Admin user.** No special treatment. Admin sees notifications for communities they've joined, like any user.
- **Suspended user.** Suspended users can't reach the server (auth middleware redirects). The bell is never rendered for them.
- **Notification points to a closed question with no answer.** Click still routes to `/communities/[slug]/questions/[id]` — the existing question detail route shows the explanation + comments for missed questions (per the answering-grading spec).
- **`revalidatePath('/', 'layout')` cost.** Invalidates the entire root layout, which re-renders `Nav` on next navigation. This is the same cost paid by every other server action that affects nav state. Acceptable.

## Testing

`qna-web/src/services/notifications/notifications.test.ts`:

- Returns empty for a user with no memberships.
- Returns empty for a user whose only memberships have no published questions.
- Excludes questions published before `cm.joined_at`.
- Excludes questions where `creator_user_id = userId`.
- Excludes soft-deleted questions (`deleted_at IS NOT NULL`).
- Excludes future-scheduled questions (`published_at > now()`).
- Excludes questions with `published_at IS NULL` (draft).
- Returns at most 20 rows even with 30 candidates.
- Orders by `published_at DESC`.
- Flags `isUnread = true` when `published_at > last_seen_notifications_at`.
- Flags `isUnread = true` when `last_seen_notifications_at IS NULL`.
- Flags `hasAnswered = true` when the user has an answer row.
- `markNotificationsSeen` stamps `now()` on the user row and is idempotent on repeat calls.

UI-level tests are not in scope for this slice — the existing project convention is service-layer unit tests + manual verification of UI changes.

## Files touched (planning-level)

- `qna-web/src/db/schema/users.ts` — add `lastSeenNotificationsAt`.
- New Drizzle migration under `qna-web/drizzle/` — add column nullable.
- `qna-web/src/services/notifications/notifications.ts` — `listQuestionNotifications`, `markNotificationsSeen`, `QuestionNotification` type.
- `qna-web/src/services/notifications/index.ts` — re-exports.
- `qna-web/src/services/notifications/notifications.test.ts` — unit tests.
- `qna-web/src/app/actions/notifications.ts` — `markNotificationsSeenAction` server action.
- `qna-web/src/app/_components/landing/NotificationsBell.tsx` — server component that fetches.
- `qna-web/src/app/_components/landing/NotificationsBellMenu.tsx` — client dropdown UI.
- `qna-web/src/app/_components/landing/Nav.tsx` — mount the bell between Create and UserMenu, pass notifications data to MobileMenu.
- `qna-web/src/app/_components/landing/MobileMenu.tsx` — accept notifications props, render inline notifications section, show "unread" dot on the trigger button.

## Out of scope (deferred)

- Materialized `notifications` table with per-item read state (will revisit if/when we add reply/mention/broadcast notifications).
- Mobile (Expo) bell — separate slice.
- Realtime push (websockets, SSE, polling).
- Email or push delivery.
- Notification preferences (mute community, mute type).
- A "see all notifications" archive page beyond the 20-item dropdown.
- Notifications for broadcasts, comment replies, mentions, leaderboard milestones, admin actions.
- Sound or browser-notification API integration.
