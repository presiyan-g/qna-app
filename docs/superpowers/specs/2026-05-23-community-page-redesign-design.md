# Community Page Redesign — Design Spec

**Status:** Approved (brainstorming complete, awaiting user sign-off)
**Date:** 2026-05-23
**Related:** `docs/superpowers/plans/2026-05-22-r2-image-uploads.md` (cover image upload feature this builds on)

## Goal

The community page (`/communities/[slug]`) currently presents the cover image, name/description, membership card, latest broadcast, question list, and creator-dashboard CTA as disconnected blocks with a lot of empty space between them. Replace it with a tabbed, consolidated layout — banner-on-top, header read as a single unit, four content tabs (Questions, Broadcasts, Leaderboard, About), and creator question-management integrated directly into the Questions tab.

## Success criteria

- The community page reads as one coherent screen, not five floating cards.
- A first-time visitor lands on About and immediately understands what the community is for and how to join.
- A member lands on the Questions tab and can answer today's question in one click.
- A creator can create, schedule, and edit questions without ever leaving `/communities/[slug]` (no "Open dashboard" detour).
- Cover images don't appear stretched across the full viewport width — they sit inside a content frame with padding.
- The existing `/dashboard/communities/[slug]` URL keeps working (redirects to the new tab).

## Visitor / member / creator routing

| Viewer | Default route | Tabs visible |
|---|---|---|
| Visitor (not signed in, or signed in but not a member) | `/communities/[slug]` → redirects to `/communities/[slug]/about` | About only (Questions/Broadcasts/Leaderboard show "Join to view" empty state when visited directly) |
| Member | `/communities/[slug]` → Questions tab | Questions, Broadcasts, Leaderboard, About |
| Creator | `/communities/[slug]` → Questions tab | Questions (with creator affordances), Broadcasts, Leaderboard, About |

The visitor redirect happens in `app/communities/[slug]/page.tsx` (the Questions tab). The About page is public.

`/dashboard/communities/[slug]` redirects to `/communities/[slug]` — old URL stays valid, dashboard code is removed.

## Page architecture

Next.js App Router nested layout:

```
app/communities/[slug]/
├── layout.tsx              ← banner + header + tab bar (new — shared across all four tabs)
├── page.tsx                ← Questions tab (was the whole community page)
├── about/
│   └── page.tsx            ← About tab (new)
├── broadcasts/
│   └── page.tsx            ← exists; renders under new layout
├── leaderboard/
│   └── page.tsx            ← exists; renders under new layout
├── questions/
│   ├── new/page.tsx        ← new — replaces dashboard's create flow
│   └── [id]/
│       ├── page.tsx        ← exists (answer view)
│       └── edit/page.tsx   ← new — replaces dashboard's edit flow
```

The layout fetches the community by slug once and renders the banner + header + tab bar. Each tab's page fetches what it needs for its own body. Drizzle queries for the community resource are cheap; the re-fetch in `page.tsx` is acceptable.

## Cover + header (Variant A — inset card banner)

Lives in `app/communities/[slug]/layout.tsx`. Same component renders identically on every tab.

```
┌──────────────────────────────────────────────────┐
│  ← Back to communities                            │
│  ┌──────────────────────────────────────────────┐ │
│  │                                              │ │
│  │           [cover image, 200 px,              │ │
│  │            object-cover, rounded-xl]         │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌────┐ WEB & DESIGN · DAILY CHALLENGE            │
│  │ H  │ The house                       [✓ Joined]│
│  │    │ housing stuff — a daily challenge...      │
│  └────┘ 2 members · 1 open · 3 broadcasts         │
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │ Questions  Broadcasts  Leaderboard  About    │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  [{children} — the active tab's content]          │
└──────────────────────────────────────────────────┘
```

Specifics:

- Cover: `<img>` with `class="h-[200px] w-full rounded-xl border border-line object-cover"`. Sits inside `max-w-[1000px] px-6` content frame.
- If `community.coverImageUrl` is null, the banner is omitted entirely (no placeholder block).
- Avatar: 88×88 rounded square, emoji or initials. Sits next to the header text, NOT overlapping the banner.
- Crumb: `<category name> · <cadence> challenge` (existing format).
- Title: H1, 36-40px, bold.
- Description: muted, max 2 lines clamp.
- Stats row: `<N> members · <N> open · <N> broadcasts`. The "open" count is open + scheduled questions visible to this viewer. Broadcasts count is total non-deleted.
- Action button (top-right of header block): "Join community" (visitor signed in), "Sign in to join" (anonymous), "✓ Joined" with Leave dropdown (member), "You are the creator" pill (creator).

## Tab bar

Implemented as four `<Link>` elements (purely server-rendered, no client state). The active tab is determined by examining `usePathname()` in a small client component that wraps the links — needed only for the active-style underline.

Tab order: **Questions · Broadcasts · Leaderboard · About**. Question count shows as a small pill next to "Questions" (open + scheduled). Broadcasts shows new-since-last-seen count for members.

Visitor's tab bar shows all four labels, but clicking Questions/Broadcasts/Leaderboard takes them to a "Join to view" screen with a single Join button (no actual content). The About tab is the only one with content for visitors.

## Tab content

### Questions tab — `app/communities/[slug]/page.tsx`

Layout: `grid grid-cols-[1fr_280px]` (sidebar on the right). Single column on mobile.

**Main column:**

1. **Creator strip** (visible only when `currentUserRole === 'creator'`):
   ```
   ┌──────────────────────────────────────────┐
   │ ⚒ You're the creator   [+ New question]  │
   └──────────────────────────────────────────┘
   ```
   "+ New question" is a `<Link>` to `/communities/[slug]/questions/new`.

2. **Live question hero** (if there's one open right now):
   - Status pill ("● Open now · Closes in 6h 32m" — uses existing `closesAt`).
   - Title (large).
   - Points + choices count + scheduled time.
   - Single CTA "Answer now →" linking to the question detail page.

3. **Question list** below the hero. Each row:
   - Date column (e.g., "May 23")
   - Title
   - State badge: Open, Scheduled, Closed (with score), Draft (creator only), Deleted (creator only, dimmed)
   - Click anywhere on the row to navigate:
     - Open/Closed questions → `/communities/[slug]/questions/[id]` (answer/result view)
     - Draft/Scheduled (creator) → `/communities/[slug]/questions/[id]/edit`
     - Scheduled (non-creator) → the answer page (which already shows "this opens at...")

   The list returns all questions creators can see (open + scheduled + draft + closed). For members: only published (open/scheduled/closed) — no drafts.

   This replaces the old `QuestionManagementList` component on the dashboard.

**Sidebar column:** see [Sidebar](#sidebar) section.

### Broadcasts tab — `app/communities/[slug]/broadcasts/page.tsx`

Exists. No content changes — the broadcasts page already has the composer (for creators/members per existing policy), feed, and broadcast cards. The only change is that it now renders inside the new layout, so the banner/header/tab bar appear above its content.

The existing top-of-page heading ("Broadcasts") and the "Back to community" link are removed — the tab bar already labels the section and provides navigation back to the community root via the Questions tab.

### Leaderboard tab — `app/communities/[slug]/leaderboard/page.tsx`

Exists. No content changes. The existing window-selector and ranking table stay. Same heading-removal note as above.

### About tab — `app/communities/[slug]/about/page.tsx` (new)

Single-column content (no sidebar). Contents:

- **Header section** (already in layout; About just appends to it)
- **Full description** (no line clamp — show the whole `community.description`)
- **At a glance**:
  - Cadence: Daily / Weekly / Custom
  - Category: name + description (if categorized)
  - Created: relative time (e.g., "2 months ago")
  - Members: count
  - Total questions: count of non-deleted, non-draft
- **Creator**: small card with the creator's username, avatar, link to their profile
- **Join CTA** (only for visitors and signed-in non-members): a centered prominent card with "Join community" button. Hidden for members and the creator.

About is intentionally minimal for v1 — no nested topics, no FAQ, no rich text. If a community needs more, they put it in `description` (which already supports 280 chars). Future iteration can expand.

## Sidebar

Lives in the Questions tab (and optionally on About for visitors as a Join CTA — see About spec). Right rail, 280px wide. Two cards:

**Card 1 — Latest broadcast:**
- Small "LATEST BROADCAST" label
- Title (or first line of body if no title — broadcasts don't have titles in the current schema, so use truncated body)
- Author + relative time
- Link to the full broadcast

**Card 2 — Leaderboard preview:**
- "LEADERBOARD · ALL-TIME" label
- Top 3 entries: rank + username + points
- "View full leaderboard →" link

About has no sidebar in v1 — the Join CTA already appears in the About body for visitors, and broadcasts/leaderboard previews would distract from the discovery-first purpose of About.

## Creator question authoring

### Create — `/communities/[slug]/questions/new` (new page)

Server-rendered page. Reuses the existing `QuestionManagementForm` component, now embedded under the community layout (so the banner/tabs are visible above the form — context preserved).

Header inside the form area: "Draft a new question". Three submit buttons same as today: Save draft / Schedule / Publish now.

On save: redirect back to `/communities/[slug]` (Questions tab) — the new draft/scheduled question appears in the list.

### Edit — `/communities/[slug]/questions/[id]/edit` (new page)

Same `QuestionManagementForm`, pre-filled with the question's current values. Only accessible to the creator AND only for unpublished questions (draft or scheduled). Published/closed questions don't show an Edit link in the list.

On save: redirect back to `/communities/[slug]`.

If a non-creator hits this URL → 403 (existing `QuestionPermissionError` handling). If the question is published → 422 or redirect to the answer view.

### Old dashboard removal

- Delete `app/dashboard/communities/[slug]/page.tsx`
- Delete `app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx` — code moves into a shared location used by both `new` and `[id]/edit` pages: `app/communities/[slug]/questions/_components/QuestionForm.tsx`
- Delete `app/dashboard/communities/[slug]/_components/QuestionManagementList.tsx` — the list rendering moves into `app/communities/[slug]/page.tsx` (the Questions tab)
- Add `app/dashboard/communities/[slug]/page.tsx` as a single-line redirect:
  ```ts
  import { redirect } from 'next/navigation';
  export default async function LegacyDashboardRedirect({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    redirect(`/communities/${slug}`);
  }
  ```
- `app/dashboard/page.tsx` (top-level dashboard) — out of scope. Keep as-is (it lists the user's creator-owned communities; that's still useful).

## What changes vs. what stays

| Element | Status |
|---|---|
| `/communities/[slug]` URL | unchanged externally; internally now a layout + Questions page |
| Cover image rendering on detail page | restyled to Variant A (inset card) |
| Community card on `/communities` | unchanged (already redesigned in Task 23) |
| `/communities/[slug]/broadcasts` | unchanged content; renders under new layout |
| `/communities/[slug]/leaderboard` | unchanged content; renders under new layout |
| `/communities/[slug]/questions/[id]` (answer view) | unchanged |
| `/dashboard/communities/[slug]` | redirects to `/communities/[slug]` |
| `/dashboard` (top-level) | unchanged |
| Server Actions (`createQuestionDraftAction`, etc.) | unchanged; only the call sites move |
| Drizzle schema | unchanged |

## Out of scope

- Mobile design beyond what natural responsive Tailwind provides (the tabbed layout works on mobile by default — tabs may need horizontal scroll on very narrow screens; acceptable for v1).
- Reordering or hiding tabs per community.
- Per-tab analytics / view counts.
- Rich text / images in the About description (description stays plain text up to 280 chars).
- Bulk question operations (delete N at once, etc.) — if the user later wants these, a separate spec.
- Reordering broadcasts or pinning announcements.
- Moderator role distinct from creator.

## Open questions

None — all decisions in this spec are locked from the brainstorming session.
