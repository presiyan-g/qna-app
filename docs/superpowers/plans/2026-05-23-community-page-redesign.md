# Community Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected card layout of `/communities/[slug]` with a tabbed, single-cohesive-screen design: banner + consolidated header on top, four tabs (Questions / Broadcasts / Leaderboard / About), creator question-management integrated into the Questions tab, old `/dashboard/communities/[slug]` route folded into the new layout.

**Architecture:** Next.js App Router nested layout. New `app/communities/[slug]/layout.tsx` owns the banner + header + tab bar and wraps every child route. The existing community `page.tsx` becomes the Questions tab body (default tab). A new `about/page.tsx` becomes the About tab. Existing `broadcasts/` and `leaderboard/` routes already live under this segment and just need their duplicate page chrome stripped. Creator authoring moves to two new sub-routes `questions/new` and `questions/[id]/edit`, reusing the relocated question form. The old `/dashboard/communities/[slug]` URL becomes a redirect.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Drizzle ORM, TypeScript, `node:test` for unit tests.

**Prerequisite:** The R2 image uploads branch (`feat/r2-image-uploads`) must be merged to master first — this plan builds on the cover image plumbing. Start this work on a fresh branch off master.

---

## Background and conventions

Read once before starting:

- `qna-web/AGENTS.md` — server-first rendering, services own DB access, `'use client'` only where needed.
- The codebase uses Tailwind colors `bg-paper`, `text-ink`, `bg-primary`, `bg-primary-soft`, `border-line`, `text-muted`, `bg-card`. Match them.
- Tests use `node:test` + `assert/strict` with `tsx --test`, run via `npm test` from `qna-web/`.
- Path quoting on PowerShell: wrap `[slug]` in single quotes (`'qna-web/src/app/communities/[slug]/page.tsx'`) when used in shell commands — square brackets are wildcards otherwise.
- Existing question state helper: `getQuestionLifecycleState(question)` from `@/services/questions` returns `'draft' | 'scheduled' | 'open' | 'closed'` (verify against actual return type in `qna-web/src/services/questions/state.ts`).
- Existing creator dashboard data fetcher: `getCreatorCommunityDashboard({ slug, userId })` returns `{ community, questions }` with ALL questions including drafts.
- Existing public question listing: `listCommunityQuestionsForCommunity({ community, viewerUserId })` returns only published questions.

## File structure

**New files:**

- `qna-web/src/app/communities/[slug]/layout.tsx` — Banner + header + tab bar wrapping all children.
- `qna-web/src/app/communities/[slug]/_components/CommunityHeader.tsx` — The banner (Variant A inset card) + avatar + crumb + title + description + stats + action button.
- `qna-web/src/app/communities/[slug]/_components/CommunityTabs.tsx` — Client component. Four `<Link>` tabs with active-state styling via `usePathname()`.
- `qna-web/src/app/communities/[slug]/_components/CommunitySidebar.tsx` — Latest broadcast preview + leaderboard top-3 card. Used on the Questions tab.
- `qna-web/src/app/communities/[slug]/_components/QuestionsTabBody.tsx` — Server component. Renders the creator strip (if creator), live question hero, and the question list.
- `qna-web/src/app/communities/[slug]/_components/QuestionRow.tsx` — Server component. One row in the question list. Routes destination by lifecycle state.
- `qna-web/src/app/communities/[slug]/about/page.tsx` — About tab page.
- `qna-web/src/app/communities/[slug]/questions/_components/QuestionForm.tsx` — Relocated from dashboard. Reusable form for new + edit.
- `qna-web/src/app/communities/[slug]/questions/new/page.tsx` — Create-question page.
- `qna-web/src/app/communities/[slug]/questions/[id]/edit/page.tsx` — Edit-question page.

**Modified files:**

- `qna-web/src/app/communities/[slug]/page.tsx` — Becomes the Questions tab body. Visitor redirect lives here.
- `qna-web/src/app/communities/[slug]/broadcasts/page.tsx` — Remove duplicate back link + heading.
- `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx` — Remove duplicate back link.
- `qna-web/src/app/communities/[slug]/leaderboard/page.tsx` — Remove duplicate back link + heading.
- `qna-web/src/app/dashboard/communities/[slug]/page.tsx` — Replace with a redirect.

**Deleted files:**

- `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx` — superseded by relocated `QuestionForm.tsx`.
- `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementList.tsx` — its row-rendering logic moves into `QuestionRow.tsx`.

---

## Phase 0: Branch + prerequisites

### Task 1: Create the working branch

**Files:** none (git only).

- [ ] **Step 1: Verify uploads branch is merged**

```powershell
git -C D:\Projects\qna-app fetch origin
git -C D:\Projects\qna-app log origin/master --oneline -5
```

Expected: the most recent commit on `origin/master` should be the R2 uploads merge commit. If not, STOP — that work must merge first.

- [ ] **Step 2: Create branch from master**

```powershell
git -C D:\Projects\qna-app checkout master
git -C D:\Projects\qna-app pull
git -C D:\Projects\qna-app checkout -b feat/community-page-redesign
```

- [ ] **Step 3: Confirm clean state**

```powershell
git -C D:\Projects\qna-app status
```

Expected: "nothing to commit, working tree clean" on `feat/community-page-redesign`.

No commit (no changes yet).

---

## Phase 1: Layout shell

### Task 2: CommunityHeader component (banner + meta)

**Files:**
- Create: `qna-web/src/app/communities/[slug]/_components/CommunityHeader.tsx`

This is a server component. It renders the inset banner + avatar + crumb + title + description + stats row + action button. It does NOT render the tab bar (that's its own component). It does NOT render a back-to-communities link (the layout puts that above).

- [ ] **Step 1: Write the component**

```tsx
import Link from 'next/link';
import { joinCommunityAction, leaveCommunityAction } from '@/app/actions/communities';
import type { CommunityWithMembership } from '@/services/communities';

export function CommunityHeader({
  community,
  signedIn,
}: {
  community: CommunityWithMembership;
  signedIn: boolean;
}) {
  return (
    <div>
      {community.coverImageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={community.coverImageUrl}
          alt=""
          className="h-[200px] w-full rounded-xl border border-line object-cover"
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-[88px_1fr_auto] sm:items-end sm:gap-6">
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-primary-soft text-3xl font-bold text-primary">
          {community.emoji || community.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {community.category
              ? `${community.category.name} · ${formatLabel(community.cadence)} challenge`
              : `${formatLabel(community.cadence)} challenge`}
          </p>
          <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight md:text-[42px]">
            {community.name}
          </h1>
          {community.description && (
            <p className="mt-2 line-clamp-2 max-w-[640px] text-sm leading-6 text-muted">
              {community.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span>
              <b className="font-semibold text-ink">{community.memberCount.toLocaleString('en-US')}</b>{' '}
              members
            </span>
            <span aria-hidden>·</span>
            <span>
              <b className="font-semibold text-ink">{community.liveQuestionCount.toLocaleString('en-US')}</b>{' '}
              open
            </span>
          </div>
        </div>

        <CommunityHeaderAction community={community} signedIn={signedIn} />
      </div>
    </div>
  );
}

function CommunityHeaderAction({
  community,
  signedIn,
}: {
  community: CommunityWithMembership;
  signedIn: boolean;
}) {
  if (community.currentUserRole === 'creator') {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper">
        You are the creator
      </span>
    );
  }
  if (community.currentUserRole === 'member') {
    const leaveAction = leaveCommunityAction.bind(null, community.slug);
    return (
      <form action={leaveAction} className="flex items-center gap-2">
        <span className="rounded-full bg-primary-soft px-5 py-2.5 text-sm font-semibold text-primary">
          ✓ Joined
        </span>
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          Leave
        </button>
      </form>
    );
  }
  if (signedIn) {
    const joinAction = joinCommunityAction.bind(null, community.slug);
    return (
      <form action={joinAction}>
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper"
        >
          Join community
        </button>
      </form>
    );
  }
  return (
    <Link
      href="/login"
      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper"
    >
      Sign in to join
    </Link>
  );
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
```

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

Expected: clean.

- [ ] **Step 3: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/_components/CommunityHeader.tsx
```

No commit (user commits themselves at chunks of their choosing).

---

### Task 3: CommunityTabs client component

**Files:**
- Create: `qna-web/src/app/communities/[slug]/_components/CommunityTabs.tsx`

Client component. Reads `usePathname()` to underline the active tab.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CommunityWithMembership } from '@/services/communities';

type Tab = {
  key: 'questions' | 'broadcasts' | 'leaderboard' | 'about';
  label: string;
  href: (slug: string) => string;
  count?: number;
  isActive: (pathname: string, slug: string) => boolean;
};

export function CommunityTabs({
  community,
}: {
  community: CommunityWithMembership;
}) {
  const pathname = usePathname();
  const slug = community.slug;

  const tabs: Tab[] = [
    {
      key: 'questions',
      label: 'Questions',
      href: (s) => `/communities/${s}`,
      count: community.liveQuestionCount > 0 ? community.liveQuestionCount : undefined,
      isActive: (p, s) =>
        p === `/communities/${s}` ||
        p.startsWith(`/communities/${s}/questions`),
    },
    {
      key: 'broadcasts',
      label: 'Broadcasts',
      href: (s) => `/communities/${s}/broadcasts`,
      count:
        community.currentUserRole !== null && community.newBroadcastCount > 0
          ? community.newBroadcastCount
          : undefined,
      isActive: (p, s) => p.startsWith(`/communities/${s}/broadcasts`),
    },
    {
      key: 'leaderboard',
      label: 'Leaderboard',
      href: (s) => `/communities/${s}/leaderboard`,
      isActive: (p, s) => p.startsWith(`/communities/${s}/leaderboard`),
    },
    {
      key: 'about',
      label: 'About',
      href: (s) => `/communities/${s}/about`,
      isActive: (p, s) => p.startsWith(`/communities/${s}/about`),
    },
  ];

  return (
    <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = tab.isActive(pathname, slug);
        return (
          <Link
            key={tab.key}
            href={tab.href(slug)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  active ? 'bg-primary text-paper' : 'bg-primary-soft text-primary'
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 3: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/_components/CommunityTabs.tsx
```

---

### Task 4: layout.tsx

**Files:**
- Create: `qna-web/src/app/communities/[slug]/layout.tsx`

Server component. Fetches the community, renders Nav + back link + CommunityHeader + CommunityTabs + children + Footer.

- [ ] **Step 1: Write the layout**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { CommunityHeader } from './_components/CommunityHeader';
import { CommunityTabs } from './_components/CommunityTabs';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function CommunityLayout({ children, params }: LayoutProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-10 md:px-12 md:py-12">
        <div className="mx-auto max-w-[1000px]">
          <Link
            href="/communities"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Back to communities
          </Link>

          <div className="mt-4">
            <CommunityHeader community={community} signedIn={!!session} />
          </div>

          <CommunityTabs community={community} />

          <div className="mt-8">{children}</div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
```

Note on re-fetching: child pages (page.tsx, broadcasts/page.tsx, etc.) currently fetch the community themselves. That's a duplicate Drizzle round-trip per request. We accept this for simplicity in v1. If profiling shows it matters, wrap `getCommunityBySlug` in React's `cache()` later.

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 3: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/layout.tsx
```

---

### Task 5: Trim duplicate chrome from Broadcasts and Leaderboard pages

The layout now provides Nav, back link, header, and tab bar. Sub-pages must remove their copies so we don't double up.

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`
- Modify: `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx`
- Modify: `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`

- [ ] **Step 1: Strip the broadcasts list page**

Read `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`. Remove:
- The `<main>`, `<Nav>`, `<Footer>` wrappers (the layout owns them now).
- The `<Link href={...}>Back to community</Link>` element.
- The `<section className="px-6 py-12...">` outer container and the `<div className="mx-auto max-w-...">` (the layout has them).
- The page-level "Broadcasts" heading if present.

The page should now export ONLY the inner content (composer + feed). Wrap in a `<>` fragment if needed. Imports of Nav, Footer, Link (if Link is no longer used) get removed.

- [ ] **Step 2: Strip the broadcast detail page**

Same treatment for `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx`:
- Remove Nav/Footer/main wrappers.
- Remove the back link.
- Remove the page-level "Community update" heading and the breadcrumb-style "Broadcast" label.
- Keep the `BroadcastFeed` render.

- [ ] **Step 3: Strip the leaderboard page**

Same for `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`:
- Remove Nav/Footer/main wrappers.
- Remove the back link.
- Remove duplicate heading.
- Keep the window selector and ranking table.

- [ ] **Step 4: Add visitor redirect at the top of each sub-page**

The spec gates Questions/Broadcasts/Leaderboard behind membership. To avoid implementing per-page "join to view" empty states, redirect visitors from each sub-page to `/about`. In each of the three pages from Steps 1-3, add this guard near the top of the default export, right after loading the community:

```tsx
const community = await getCommunityBySlug(slug, session?.sub ?? null);
if (!community) notFound();
if (community.currentUserRole === null) {
  redirect(`/communities/${slug}/about`);
}
```

If a page didn't previously fetch the community, add the fetch. (Adjust imports — `redirect` and `notFound` from `next/navigation`, `getCommunityBySlug` from `@/services/communities`, `getSession` from `@/services/auth`.) Leaderboard may have been intentionally public previously — if you want to keep that, skip the leaderboard guard. Default to gating it; users without membership can always click "About" and "Join community" from there.

- [ ] **Step 5: Type-check + visual sanity**

```powershell
Set-Location qna-web; npx tsc --noEmit; npm test; Set-Location ..
```

Expected: clean, 106/106 tests pass. (No tests cover these pages — the type check is the safety net.)

- [ ] **Step 6: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/broadcasts/
git add qna-web/src/app/communities/'[slug]'/leaderboard/
```

---

## Phase 2: Questions tab

### Task 6: CommunitySidebar component

**Files:**
- Create: `qna-web/src/app/communities/[slug]/_components/CommunitySidebar.tsx`

Server component. Renders two cards (latest broadcast + leaderboard top 3). Sits in the right rail of the Questions tab.

- [ ] **Step 1: Identify the existing services to call**

Read the head of `qna-web/src/services/broadcasts/index.ts` and `qna-web/src/services/leaderboard/index.ts` to find the functions that fetch (a) the latest broadcast for a community and (b) the top-N leaderboard entries. The community page currently uses `getLatestCommunityBroadcastForCommunity` — use that for broadcasts. For leaderboard, find the equivalent (e.g., `getCommunityLeaderboard` or similar; grep `qna-web/src/services/leaderboard/` for the public list function).

- [ ] **Step 2: Write the component**

```tsx
import Link from 'next/link';
import type { CommunityWithMembership } from '@/services/communities';
import { getLatestCommunityBroadcastForCommunity } from '@/services/broadcasts';
// Adjust the import below to match the actual leaderboard service export found in Step 1.
import { getCommunityLeaderboard } from '@/services/leaderboard';

export async function CommunitySidebar({
  community,
  viewerUserId,
}: {
  community: CommunityWithMembership;
  viewerUserId: string | null;
}) {
  const [latestBroadcast, leaderboard] = await Promise.all([
    getLatestCommunityBroadcastForCommunity({ community, viewerUserId }),
    getCommunityLeaderboard({ community, window: 'all', limit: 3 }),
  ]);

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Latest broadcast
        </p>
        {latestBroadcast ? (
          <>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink">
              {latestBroadcast.body}
            </p>
            <p className="mt-3 text-[12px] text-muted">
              {latestBroadcast.author.username} ·{' '}
              {formatRelative(latestBroadcast.publishedAt)}
            </p>
            <Link
              href={`/communities/${community.slug}/broadcasts/${latestBroadcast.id}`}
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Open broadcast →
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">No broadcasts yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Leaderboard · all-time
        </p>
        {leaderboard.entries.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {leaderboard.entries.slice(0, 3).map((entry, index) => (
              <li
                key={entry.userId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">
                  <span className="font-bold">{index + 1}.</span> @{entry.username}
                </span>
                <b className="font-bold text-ink">{entry.points}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No scores yet.</p>
        )}
        <Link
          href={`/communities/${community.slug}/leaderboard`}
          className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
        >
          View full leaderboard →
        </Link>
      </div>
    </aside>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
```

If the leaderboard service signature doesn't match `({ community, window, limit })`, adapt the call site to what exists. If the entries shape uses different field names (e.g., `points` is named `score`, `username` is on a nested `user` object), match the existing shape.

- [ ] **Step 3: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

If the leaderboard service doesn't exist with a compatible top-N fetcher, STOP and report DONE_WITH_CONCERNS — note that we need a small service addition.

- [ ] **Step 4: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/_components/CommunitySidebar.tsx
```

---

### Task 7: QuestionRow component

**Files:**
- Create: `qna-web/src/app/communities/[slug]/_components/QuestionRow.tsx`

Server component. One row in the questions list. Renders date + title + state badge. Wraps in `<Link>` whose destination depends on lifecycle state and viewer role.

- [ ] **Step 1: Write the component**

```tsx
import Link from 'next/link';
import type { CommunityRole } from '@/services/communities';
import { getQuestionLifecycleState, type CommunityQuestion } from '@/services/questions';

export type QuestionRowQuestion = Pick<
  CommunityQuestion,
  'id' | 'prompt' | 'scheduledFor' | 'closesAt' | 'publishedAt' | 'deletedAt'
> & {
  viewerScore?: number | null;
};

export function QuestionRow({
  slug,
  question,
  viewerRole,
}: {
  slug: string;
  question: QuestionRowQuestion;
  viewerRole: CommunityRole | null;
}) {
  const state = getQuestionLifecycleState(question);
  const href = getRowHref({ slug, questionId: question.id, state, viewerRole });
  const dateLine = question.scheduledFor ?? question.publishedAt;

  return (
    <Link
      href={href}
      className="grid grid-cols-[64px_1fr_auto] items-center gap-4 rounded-lg border border-line bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="text-xs font-semibold text-muted">
        {dateLine ? formatDateBlock(dateLine) : '—'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink">
          {question.prompt}
        </p>
      </div>
      <StateBadge state={state} />
    </Link>
  );
}

function StateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    open: 'bg-primary text-paper',
    scheduled: 'bg-amber-100 text-amber-900',
    draft: 'bg-stone-200 text-stone-700',
    closed: 'bg-primary-soft text-primary',
  };
  const labels: Record<string, string> = {
    open: '● Open',
    scheduled: 'Scheduled',
    draft: 'Draft',
    closed: 'Closed',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
        styles[state] ?? 'bg-stone-200 text-stone-700'
      }`}
    >
      {labels[state] ?? state}
    </span>
  );
}

function getRowHref({
  slug,
  questionId,
  state,
  viewerRole,
}: {
  slug: string;
  questionId: string;
  state: string;
  viewerRole: CommunityRole | null;
}): string {
  if (viewerRole === 'creator' && (state === 'draft' || state === 'scheduled')) {
    return `/communities/${slug}/questions/${questionId}/edit`;
  }
  return `/communities/${slug}/questions/${questionId}`;
}

function formatDateBlock(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
```

If `getQuestionLifecycleState` returns different string values (e.g., `'published'` instead of `'open'`), update the maps to match. Grep `qna-web/src/services/questions/state.ts` to confirm.

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 3: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/_components/QuestionRow.tsx
```

---

### Task 8: QuestionsTabBody component

**Files:**
- Create: `qna-web/src/app/communities/[slug]/_components/QuestionsTabBody.tsx`

Server component. Renders:
- Creator strip (only when `viewerRole === 'creator'`)
- Live-question hero (the single open question, if any)
- List of all other questions (excluding the hero) as `<QuestionRow>` items

Takes pre-fetched questions; the parent page fetches them with the right service.

- [ ] **Step 1: Write the component**

```tsx
import Link from 'next/link';
import { getQuestionLifecycleState, type CommunityQuestion } from '@/services/questions';
import type { CommunityRole } from '@/services/communities';
import { QuestionRow } from './QuestionRow';

export function QuestionsTabBody({
  slug,
  questions,
  viewerRole,
}: {
  slug: string;
  questions: CommunityQuestion[];
  viewerRole: CommunityRole | null;
}) {
  const sorted = [...questions].sort(sortByMostRecentFirst);
  const liveQuestion = sorted.find((q) => getQuestionLifecycleState(q) === 'open');
  const otherQuestions = sorted.filter((q) => q.id !== liveQuestion?.id);

  return (
    <div className="flex flex-col gap-5">
      {viewerRole === 'creator' && (
        <div className="flex items-center justify-between rounded-lg bg-primary-soft px-4 py-3">
          <p className="text-sm font-semibold text-primary">
            You're the creator — drafts and scheduling live here.
          </p>
          <Link
            href={`/communities/${slug}/questions/new`}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper hover:brightness-95"
          >
            + New question
          </Link>
        </div>
      )}

      {liveQuestion && <LiveQuestionHero slug={slug} question={liveQuestion} />}

      {otherQuestions.length === 0 && !liveQuestion ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-sm text-muted">
          No questions yet.
        </div>
      ) : (
        <ul className="grid gap-3">
          {otherQuestions.map((question) => (
            <li key={question.id}>
              <QuestionRow slug={slug} question={question} viewerRole={viewerRole} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveQuestionHero({
  slug,
  question,
}: {
  slug: string;
  question: CommunityQuestion;
}) {
  const closesAt = question.closesAt;
  return (
    <Link
      href={`/communities/${slug}/questions/${question.id}`}
      className="block rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/50 to-card p-6 transition-shadow hover:shadow-md"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        ● Open now {closesAt && `· Closes ${formatClosesAt(closesAt)}`}
      </p>
      <h2 className="mt-2 text-2xl font-bold leading-tight md:text-[28px]">
        {question.prompt}
      </h2>
      <p className="mt-2 text-sm text-muted">{question.points} points</p>
      <span className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper">
        Answer now →
      </span>
    </Link>
  );
}

function sortByMostRecentFirst(a: CommunityQuestion, b: CommunityQuestion): number {
  const aTime = (a.scheduledFor ?? a.publishedAt ?? a.createdAt).getTime();
  const bTime = (b.scheduledFor ?? b.publishedAt ?? b.createdAt).getTime();
  return bTime - aTime;
}

function formatClosesAt(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'soon';
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `in ${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `in ${diffDay}d`;
}
```

If `CommunityQuestion` doesn't have a `createdAt` field, fall back to `scheduledFor ?? publishedAt` only. Check the type in `qna-web/src/services/questions/`.

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 3: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/_components/QuestionsTabBody.tsx
```

---

### Task 9: Rewrite the Questions tab page

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/page.tsx` (full rewrite)

The page becomes the Questions tab body + sidebar. The header/tabs are in the layout. Visitor redirect lives here.

- [ ] **Step 1: Write the new page**

Replace the entire contents of `qna-web/src/app/communities/[slug]/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCreatorCommunityDashboard,
  listCommunityQuestionsForCommunity,
} from '@/services/questions';
import { CommunitySidebar } from './_components/CommunitySidebar';
import { QuestionsTabBody } from './_components/QuestionsTabBody';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityQuestionsTab({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) {
    // notFound() already triggered by the layout; this is just defensive.
    redirect('/communities');
  }

  // Visitor (not signed in or not a member) → About tab.
  if (community.currentUserRole === null) {
    redirect(`/communities/${slug}/about`);
  }

  // Fetch questions according to viewer role.
  const questions =
    community.currentUserRole === 'creator'
      ? (await getCreatorCommunityDashboard({ slug, userId: session!.sub }))?.questions ?? []
      : await listCommunityQuestionsForCommunity({
          community,
          viewerUserId: session?.sub ?? null,
        });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <QuestionsTabBody
        slug={slug}
        questions={questions}
        viewerRole={community.currentUserRole}
      />
      <CommunitySidebar
        community={community}
        viewerUserId={session?.sub ?? null}
      />
    </div>
  );
}
```

Notes:
- We call `getCommunityBySlug` here AND in the layout — accepted duplicate fetch for v1 simplicity.
- For creators, we use `getCreatorCommunityDashboard` which already returns ALL questions including drafts.
- For members, `listCommunityQuestionsForCommunity` returns only published questions (open + scheduled + closed).
- For visitors (null role), we redirect before fetching any questions.

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

If `getCreatorCommunityDashboard` returns a shape that doesn't fit `CommunityQuestion[]` directly (e.g., it's wrapped), adapt the destructuring. Look at the existing dashboard page at `qna-web/src/app/dashboard/communities/[slug]/page.tsx` for the shape — it serializes `dashboard.questions.map(...)`.

- [ ] **Step 3: Run tests**

```powershell
Set-Location qna-web; npm test; Set-Location ..
```

Expected: 106 still pass.

- [ ] **Step 4: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/page.tsx
```

---

## Phase 3: About tab

### Task 10: About tab page

**Files:**
- Create: `qna-web/src/app/communities/[slug]/about/page.tsx`

Server component. No sidebar (per spec). Renders full description + at-a-glance grid + creator card + (if visitor) a centered Join CTA.

- [ ] **Step 1: Write the page**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { joinCommunityAction } from '@/app/actions/communities';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityAboutPage({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  const isVisitor = community.currentUserRole === null;

  return (
    <div className="grid max-w-[720px] gap-6">
      <section className="rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          About this community
        </p>
        <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-ink">
          {community.description || 'No description yet.'}
        </p>
      </section>

      <section className="rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          At a glance
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <Glance label="Cadence" value={formatLabel(community.cadence)} />
          {community.category && (
            <Glance label="Category" value={community.category.name} />
          )}
          <Glance
            label="Members"
            value={community.memberCount.toLocaleString('en-US')}
          />
          <Glance
            label="Open questions"
            value={community.liveQuestionCount.toLocaleString('en-US')}
          />
          <Glance label="Created" value={formatRelative(community.createdAt)} />
        </dl>
      </section>

      {isVisitor && (
        <section className="rounded-lg border border-primary/30 bg-primary-soft p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Join the community
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Members answer the daily challenge
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Join to answer questions, see results, and post broadcasts.
          </p>
          {session ? (
            <form action={joinCommunityAction.bind(null, slug)}>
              <button
                type="submit"
                className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-paper"
              >
                Join community
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-paper"
            >
              Sign in to join
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function Glance({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDay = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDay < 1) return 'today';
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
  const diffYear = Math.round(diffMonth / 12);
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}
```

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 3: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/about/page.tsx
```

---

## Phase 4: Question authoring sub-routes

### Task 11: Relocate QuestionForm component

The existing `QuestionManagementForm` in the dashboard is what we want — but we need to move it under the community tree (so it can be reused by the new `/questions/new` and `/questions/[id]/edit` pages).

**Files:**
- Create: `qna-web/src/app/communities/[slug]/questions/_components/QuestionForm.tsx`
- Delete: `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx`

- [ ] **Step 1: Copy the file to the new location**

```powershell
New-Item -ItemType Directory -Force -Path "qna-web/src/app/communities/[slug]/questions/_components" | Out-Null
Copy-Item -Path "qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx" -Destination "qna-web/src/app/communities/[slug]/questions/_components/QuestionForm.tsx"
```

- [ ] **Step 2: Rename the exported function**

Edit `qna-web/src/app/communities/[slug]/questions/_components/QuestionForm.tsx`. Find `export function QuestionManagementForm(` and replace with `export function QuestionForm(`. Also rename `EditQuestionForm` and `CreateQuestionForm` sub-components if you want (cosmetic) — or leave them as-is. The only external rename that matters is `QuestionManagementForm` → `QuestionForm`.

If the file imports any path-relative siblings (e.g., `./QuestionField.tsx`), copy those too.

- [ ] **Step 3: Update Server Action redirect destinations**

Inside the form, the actions are imported from `@/app/actions/questions`. Those actions currently `revalidatePath('/dashboard/...')`. After this refactor, we want them to revalidate `/communities/${slug}` too. Edit `qna-web/src/app/actions/questions.ts` — find `revalidateDashboardQuestionPaths`:

```ts
function revalidateDashboardQuestionPaths(slug: string): void {
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/communities/${slug}`);
  revalidatePath(`/communities/${slug}`);
}
```

Add `revalidatePath(`/communities/${slug}/questions/new`)` and any `/questions/[id]/edit` paths if relevant — actually, simpler: just revalidate `/communities/${slug}` (the Questions tab). The dashboard paths can stay for now since they redirect anyway.

The function name `revalidateDashboardQuestionPaths` is now misleading — rename it to `revalidateCommunityQuestionPaths`:

```ts
function revalidateCommunityQuestionPaths(slug: string): void {
  revalidatePath('/dashboard');
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/questions`);
}
```

Update all call sites in the same file (search for `revalidateDashboardQuestionPaths`).

- [ ] **Step 4: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

There will be errors in `qna-web/src/app/dashboard/communities/[slug]/page.tsx` because it imports the now-renamed component. We fix those by deleting the dashboard in Task 14 — accept the errors for this commit boundary, OR temporarily keep the old file present with a re-export until Task 14. Simpler: add a 1-line re-export shim in the OLD location:

In `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx`, replace the entire file with:

```tsx
export { QuestionForm as QuestionManagementForm } from '@/app/communities/[slug]/questions/_components/QuestionForm';
```

That way tsc stays clean and we delete the shim in Task 14.

- [ ] **Step 5: Type-check again, expect clean**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 6: Run tests**

```powershell
Set-Location qna-web; npm test; Set-Location ..
```

Expected: 106 still pass.

- [ ] **Step 7: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/questions/_components/
git add qna-web/src/app/dashboard/communities/'[slug]'/_components/QuestionManagementForm.tsx
git add qna-web/src/app/actions/questions.ts
```

---

### Task 12: New-question page

**Files:**
- Create: `qna-web/src/app/communities/[slug]/questions/new/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { QuestionForm } from '../_components/QuestionForm';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function NewQuestionPage({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  if (!session) {
    redirect(`/login?next=/communities/${slug}/questions/new`);
  }
  const community = await getCommunityBySlug(slug, session.sub);
  if (!community) notFound();
  if (community.currentUserRole !== 'creator') {
    redirect(`/communities/${slug}`);
  }

  return (
    <section className="max-w-[720px]">
      <h2 className="text-2xl font-bold">Draft a new question</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Save a draft, schedule it for a specific GMT time, or publish it now.
      </p>
      <div className="mt-6">
        <QuestionForm slug={slug} communityId={community.id} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 3: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/questions/new/page.tsx
```

---

### Task 13: Edit-question page

**Files:**
- Create: `qna-web/src/app/communities/[slug]/questions/[id]/edit/page.tsx`

- [ ] **Step 1: Find the function that loads a single editable question**

In the existing dashboard page (`qna-web/src/app/dashboard/communities/[slug]/page.tsx`), `getCreatorCommunityDashboard` is called and the list includes all questions. The form's edit path likely takes a `question` prop pre-filled — read the existing `QuestionManagementForm.tsx` to see what props its edit variant expects (`QuestionFormValues` shape).

If there's no single-question fetcher service, fetch via the dashboard fetcher and filter in-page (simple, fine for v1).

- [ ] **Step 2: Write the edit page**

```tsx
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCreatorCommunityDashboard,
  getQuestionLifecycleState,
} from '@/services/questions';
import { QuestionForm } from '../../_components/QuestionForm';

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function EditQuestionPage({ params }: PageProps) {
  const [{ slug, id }, session] = await Promise.all([params, getSession()]);
  if (!session) {
    redirect(`/login?next=/communities/${slug}/questions/${id}/edit`);
  }
  const community = await getCommunityBySlug(slug, session.sub);
  if (!community) notFound();
  if (community.currentUserRole !== 'creator') {
    redirect(`/communities/${slug}`);
  }

  const dashboard = await getCreatorCommunityDashboard({ slug, userId: session.sub });
  const question = dashboard?.questions.find((q) => q.id === id);
  if (!question) notFound();

  const state = getQuestionLifecycleState(question);
  if (state === 'open' || state === 'closed') {
    // Published or closed questions cannot be edited via this flow.
    redirect(`/communities/${slug}/questions/${id}`);
  }

  return (
    <section className="max-w-[720px]">
      <h2 className="text-2xl font-bold">Edit question</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Update the prompt, choices, or schedule. Save as draft or schedule again.
      </p>
      <div className="mt-6">
        <QuestionForm
          slug={slug}
          communityId={community.id}
          question={{
            id: question.id,
            prompt: question.prompt,
            explanation: question.explanation,
            imageUrl: question.imageUrl,
            scheduledFor: question.scheduledFor?.toISOString() ?? null,
            choices: question.choices.map((c) => ({
              label: c.label,
              imageUrl: c.imageUrl,
              isCorrect: c.isCorrect,
            })),
          }}
        />
      </div>
    </section>
  );
}
```

If the `QuestionForm` component's edit-mode prop name isn't `question`, or its shape is different, adapt — match the existing `QuestionFormValues` shape exported from the relocated form file.

- [ ] **Step 3: Type-check**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

- [ ] **Step 4: Stage**

```powershell
git add qna-web/src/app/communities/'[slug]'/questions/'[id]'/edit/page.tsx
```

---

## Phase 5: Dashboard removal

### Task 14: Convert /dashboard/communities/[slug] to a redirect, delete old components

**Files:**
- Modify: `qna-web/src/app/dashboard/communities/[slug]/page.tsx`
- Delete: `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx`
- Delete: `qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementList.tsx`

- [ ] **Step 1: Replace the dashboard page with a redirect**

Replace the entire contents of `qna-web/src/app/dashboard/communities/[slug]/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyDashboardRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/communities/${slug}`);
}
```

- [ ] **Step 2: Delete the now-unused dashboard components**

```powershell
Remove-Item "qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementForm.tsx"
Remove-Item "qna-web/src/app/dashboard/communities/[slug]/_components/QuestionManagementList.tsx"
```

If the `_components` directory ends up empty, leave it — git ignores empty dirs.

- [ ] **Step 3: Find any remaining imports of the deleted components**

```powershell
Set-Location qna-web; npx tsc --noEmit; Set-Location ..
```

If tsc reports errors about `QuestionManagementForm` or `QuestionManagementList` being missing, those are remaining call sites that must be cleaned up. Most likely: nothing — the dashboard page was the only consumer and we just rewrote it.

- [ ] **Step 4: Run tests**

```powershell
Set-Location qna-web; npm test; Set-Location ..
```

Expected: 106 pass.

- [ ] **Step 5: Stage**

```powershell
git add qna-web/src/app/dashboard/communities/'[slug]'/page.tsx
git add qna-web/src/app/dashboard/communities/'[slug]'/_components/
```

---

## Phase 6: Final review

### Task 15: Lint + build sanity check

**Files:** none modified.

- [ ] **Step 1: Lint**

```powershell
Set-Location qna-web; npm run lint; Set-Location ..
```

Expected: at most the same pre-existing warnings (`<img>` usage) and the pre-existing `my-communities/page.tsx` error. No NEW errors from this work.

If new errors appear in the files we created, fix them inline. The most likely issue is unescaped apostrophes in JSX strings — escape with `&apos;` or use template literals.

- [ ] **Step 2: Build**

```powershell
Set-Location qna-web; npm run build 2>&1 | Select-Object -Last 30; Set-Location ..
```

This will probably still fail due to the pre-existing `my-communities/page.tsx` lint error. That's not from this work. If it fails for any OTHER reason, fix inline.

- [ ] **Step 3: Manual smoke checklist**

`npm run dev` from `qna-web/`, then walk through:

1. **Visitor** (sign out, then visit `/communities/<some-slug>`):
   - Should redirect to `/communities/<slug>/about`
   - About tab shows description + at-a-glance + Join CTA
   - Clicking the Questions tab in the bar lands on the questions page; for visitors this should also redirect to /about (because page.tsx checks role)
2. **Member** (join a community, then visit `/communities/<slug>`):
   - Land on Questions tab
   - See live question hero if any, list of others
   - Tab bar shows Questions count if there's an open one
   - Sidebar shows latest broadcast + leaderboard top 3
3. **Creator** (visit your own community):
   - Land on Questions tab
   - See the "You're the creator" strip with "+ New question" button
   - See drafts and scheduled questions in the list with state badges
   - Click "+ New question" → lands on `/questions/new` with the layout still wrapping it
   - Save a draft → returns to the Questions tab, new draft visible
   - Click a draft row → lands on `/questions/<id>/edit`
   - Visit `/dashboard/communities/<slug>` directly → redirected to `/communities/<slug>`
4. **Cover treatment**:
   - Community with cover image: 200px banner with rounded corners and padding (NOT edge-to-edge)
   - Community without cover image: no banner block, header still reads cleanly

If any of these fail, fix inline before committing.

- [ ] **Step 4: Final test run**

```powershell
Set-Location qna-web; npm test; Set-Location ..
```

Expected: 106 pass.

- [ ] **Step 5: Stage any inline fixes**

```powershell
git status
```

Stage as needed. No commit (the user commits when ready).

---

## Glossary of types and components

- `CommunityWithMembership` — existing type from `@/services/communities`. Includes `coverImageUrl`, `currentUserRole`, `memberCount`, `liveQuestionCount`, `newBroadcastCount`.
- `CommunityQuestion` — existing type from `@/services/questions`. Includes `id`, `prompt`, `explanation`, `imageUrl`, `scheduledFor`, `publishedAt`, `closesAt`, `points`, `choices`.
- `getQuestionLifecycleState(question)` — returns `'draft' | 'scheduled' | 'open' | 'closed'`. If the actual strings differ, update `QuestionRow` and `QuestionsTabBody` to match.
- `CommunityHeader` — banner + avatar + meta block. Used in `layout.tsx`.
- `CommunityTabs` — client component, tab bar with active-state styling.
- `CommunitySidebar` — right rail on Questions tab.
- `QuestionsTabBody` — main column of Questions tab.
- `QuestionRow` — one row in the question list.
- `QuestionForm` — relocated form, reused by `new` and `edit` pages.
- `revalidateCommunityQuestionPaths(slug)` — replaces `revalidateDashboardQuestionPaths`.

The route shape after this work:

```
/communities/[slug]                            → Questions tab (default; visitor redirects to /about)
/communities/[slug]/about                      → About tab
/communities/[slug]/broadcasts                 → Broadcasts tab
/communities/[slug]/broadcasts/[postId]        → Broadcast detail (still under layout)
/communities/[slug]/leaderboard                → Leaderboard tab
/communities/[slug]/questions/[id]             → Question answer view (unchanged)
/communities/[slug]/questions/new              → New question (creator)
/communities/[slug]/questions/[id]/edit        → Edit question (creator)
/dashboard/communities/[slug]                  → 301 redirect to /communities/[slug]
```
