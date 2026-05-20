# Public Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public per-community leaderboard page and REST read endpoint using existing `answers.points_awarded` data.

**Architecture:** Add a small leaderboard service under `qna-web/src/services/leaderboard/` with testable window and ranking helpers. The service performs the Drizzle aggregate query for active communities, while the web page and REST route remain thin render/serialization layers.

**Tech Stack:** Next.js App Router, Route Handlers, React Server Components, TypeScript, Drizzle ORM, PostgreSQL.

---

## File Structure

| Path | Action | Purpose |
| --- | --- | --- |
| `docs/superpowers/specs/2026-05-20-leaderboard-design.md` | Create | Locked design decisions for this slice. |
| `docs/superpowers/plans/2026-05-20-leaderboard.md` | Create | Task-by-task implementation plan. |
| `PROJECT.md` | Modify | Record public leaderboard product behavior in scoring rules. |
| `qna-web/src/services/leaderboard/windows.ts` | Create | Normalize URL window values and compute window starts. |
| `qna-web/src/services/leaderboard/windows.test.ts` | Create | RED/GREEN coverage for window parsing and date math. |
| `qna-web/src/services/leaderboard/ranking.ts` | Create | Rank, tie-break, and top-10 truncation helper. |
| `qna-web/src/services/leaderboard/ranking.test.ts` | Create | RED/GREEN coverage for tie-break and truncation. |
| `qna-web/src/services/leaderboard/leaderboard.ts` | Create | Public service that resolves active community and derives scores from `answers`. |
| `qna-web/src/services/leaderboard/index.ts` | Create | Barrel export for route/page consumers. |
| `qna-web/src/app/api/communities/[slug]/leaderboard/route.ts` | Create | Public REST endpoint for mobile consumers. |
| `qna-web/src/app/communities/[slug]/leaderboard/page.tsx` | Create | Server-rendered public leaderboard UI. |
| `qna-web/src/app/communities/[slug]/page.tsx` | Modify | Add a discoverable link to the leaderboard route. |

---

### Task 1: Leaderboard Window Contract

**Files:**
- Create: `qna-web/src/services/leaderboard/windows.test.ts`
- Create: `qna-web/src/services/leaderboard/windows.ts`
- Create: `qna-web/src/services/leaderboard/index.ts`

- [ ] **Step 1: Write failing tests**

Add tests for the URL contract and deterministic window starts:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getLeaderboardWindowStart,
  normalizeLeaderboardWindow,
} from './windows';

describe('normalizeLeaderboardWindow', () => {
  it('accepts supported URL values', () => {
    assert.equal(normalizeLeaderboardWindow('7d'), '7d');
    assert.equal(normalizeLeaderboardWindow('30d'), '30d');
    assert.equal(normalizeLeaderboardWindow('all'), 'all');
  });

  it('falls back to all for missing or unsupported values', () => {
    assert.equal(normalizeLeaderboardWindow(null), 'all');
    assert.equal(normalizeLeaderboardWindow('weekly'), 'all');
  });
});

describe('getLeaderboardWindowStart', () => {
  const now = new Date('2026-05-20T12:00:00.000Z');

  it('returns null for all-time', () => {
    assert.equal(getLeaderboardWindowStart('all', now), null);
  });

  it('computes the 7-day and 30-day lower bounds', () => {
    assert.equal(
      getLeaderboardWindowStart('7d', now)?.toISOString(),
      '2026-05-13T12:00:00.000Z',
    );
    assert.equal(
      getLeaderboardWindowStart('30d', now)?.toISOString(),
      '2026-04-20T12:00:00.000Z',
    );
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm run test -w qna-web -- src/services/leaderboard/windows.test.ts`

Expected: FAIL because `./windows` does not exist.

- [ ] **Step 3: Implement window helper**

Create `windows.ts`:

```ts
export type LeaderboardWindow = '7d' | '30d' | 'all';

const WINDOW_DAYS: Partial<Record<LeaderboardWindow, number>> = {
  '7d': 7,
  '30d': 30,
};

export function normalizeLeaderboardWindow(
  value: string | null | undefined,
): LeaderboardWindow {
  return value === '7d' || value === '30d' || value === 'all'
    ? value
    : 'all';
}

export function getLeaderboardWindowStart(
  window: LeaderboardWindow,
  now = new Date(),
): Date | null {
  const days = WINDOW_DAYS[window];
  if (!days) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
```

Create `index.ts`:

```ts
export * from './windows';
```

- [ ] **Step 4: Run GREEN**

Run: `npm run test -w qna-web -- src/services/leaderboard/windows.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/services/leaderboard/windows.ts qna-web/src/services/leaderboard/windows.test.ts qna-web/src/services/leaderboard/index.ts
git commit -m "feat(leaderboard): add window contract"
```

---

### Task 2: Ranking Helper

**Files:**
- Create: `qna-web/src/services/leaderboard/ranking.test.ts`
- Create: `qna-web/src/services/leaderboard/ranking.ts`
- Modify: `qna-web/src/services/leaderboard/index.ts`

- [ ] **Step 1: Write failing ranking tests**

Add tests for the score-first order, tie-break, final username fallback, rank assignment, and top-10 limit:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankLeaderboardRows } from './ranking';

describe('rankLeaderboardRows', () => {
  it('sorts by points desc and breaks ties by earliest latest scoring answer', () => {
    const rows = rankLeaderboardRows([
      row('2', 'bea', 40, '2026-05-20T10:00:00.000Z'),
      row('1', 'ana', 40, '2026-05-20T09:00:00.000Z'),
      row('3', 'cal', 50, '2026-05-19T09:00:00.000Z'),
    ]);

    assert.deepEqual(
      rows.map((entry) => [entry.rank, entry.username, entry.points]),
      [
        [1, 'cal', 50],
        [2, 'ana', 40],
        [3, 'bea', 40],
      ],
    );
  });

  it('uses username as a deterministic final tie-break and returns top 10', () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      row(String(index), `user-${String(12 - index).padStart(2, '0')}`, 10, '2026-05-20T09:00:00.000Z'),
    );

    const ranked = rankLeaderboardRows(rows);

    assert.equal(ranked.length, 10);
    assert.equal(ranked[0].username, 'user-01');
    assert.equal(ranked[9].rank, 10);
  });
});

function row(
  userId: string,
  username: string,
  points: number,
  lastScoringAnswerAt: string,
) {
  return {
    userId,
    username,
    points,
    lastScoringAnswerAt: new Date(lastScoringAnswerAt),
  };
}
```

- [ ] **Step 2: Run RED**

Run: `npm run test -w qna-web -- src/services/leaderboard/ranking.test.ts`

Expected: FAIL because `./ranking` does not exist.

- [ ] **Step 3: Implement ranking helper**

Create `ranking.ts`:

```ts
export type LeaderboardAggregateRow = {
  userId: string;
  username: string;
  points: number;
  lastScoringAnswerAt: Date;
};

export type LeaderboardEntry = LeaderboardAggregateRow & {
  rank: number;
};

export function rankLeaderboardRows(
  rows: LeaderboardAggregateRow[],
): LeaderboardEntry[] {
  return [...rows]
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      const timeDelta =
        a.lastScoringAnswerAt.getTime() - b.lastScoringAnswerAt.getTime();
      if (timeDelta !== 0) return timeDelta;
      return a.username.localeCompare(b.username);
    })
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
```

Update `index.ts`:

```ts
export * from './ranking';
export * from './windows';
```

- [ ] **Step 4: Run GREEN**

Run: `npm run test -w qna-web -- src/services/leaderboard/ranking.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/services/leaderboard/ranking.ts qna-web/src/services/leaderboard/ranking.test.ts qna-web/src/services/leaderboard/index.ts
git commit -m "feat(leaderboard): add ranking helper"
```

---

### Task 3: Shared Leaderboard Service

**Files:**
- Create: `qna-web/src/services/leaderboard/leaderboard.ts`
- Modify: `qna-web/src/services/leaderboard/index.ts`

- [ ] **Step 1: Implement the aggregate read service**

Create `leaderboard.ts` with a public read function:

```ts
import 'server-only';
import { and, desc, eq, gte, gt, max, sql, sum } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { questions } from '@/db/schema/questions';
import { users } from '@/db/schema/users';
import { getCommunityBySlug } from '@/services/communities';
import {
  getLeaderboardWindowStart,
  type LeaderboardWindow,
} from './windows';
import {
  rankLeaderboardRows,
  type LeaderboardEntry,
} from './ranking';

export type CommunityLeaderboard = {
  community: {
    id: string;
    slug: string;
    name: string;
  };
  window: LeaderboardWindow;
  entries: LeaderboardEntry[];
};

export async function getCommunityLeaderboard({
  slug,
  window,
  now = new Date(),
}: {
  slug: string;
  window: LeaderboardWindow;
  now?: Date;
}): Promise<CommunityLeaderboard | null> {
  const community = await getCommunityBySlug(slug, null);
  if (!community) return null;

  const windowStart = getLeaderboardWindowStart(window, now);
  const totalPoints = sum(answers.pointsAwarded).mapWith(Number).as('points');
  const lastScoringAnswerAt = max(answers.answeredAt).as('lastScoringAnswerAt');

  const rows = await db
    .select({
      userId: answers.userId,
      username: users.username,
      points: totalPoints,
      lastScoringAnswerAt,
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .innerJoin(users, eq(answers.userId, users.id))
    .where(
      and(
        eq(questions.communityId, community.id),
        gt(answers.pointsAwarded, 0),
        windowStart ? gte(answers.answeredAt, windowStart) : undefined,
      ),
    )
    .groupBy(answers.userId, users.username)
    .orderBy(desc(sql`points`), sql`"lastScoringAnswerAt" asc`, users.username)
    .limit(10);

  return {
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
    },
    window,
    entries: rankLeaderboardRows(
      rows.map((row) => ({
        userId: row.userId,
        username: row.username,
        points: row.points ?? 0,
        lastScoringAnswerAt: row.lastScoringAnswerAt ?? now,
      })),
    ),
  };
}
```

Keep the service public: do not read session, membership, or bearer auth.

- [ ] **Step 2: Export service API**

Update `index.ts`:

```ts
export * from './leaderboard';
export * from './ranking';
export * from './windows';
```

- [ ] **Step 3: Run tests and type/lint feedback**

Run: `npm run test -w qna-web -- src/services/leaderboard/*.test.ts`

Expected: PASS.

Run: `npm run lint -w qna-web`

Expected: no lint errors. If Drizzle alias ordering needs adjustment, keep the same ranking semantics and rerun lint.

- [ ] **Step 4: Commit**

Run:

```bash
git add qna-web/src/services/leaderboard/leaderboard.ts qna-web/src/services/leaderboard/index.ts
git commit -m "feat(leaderboard): derive community standings"
```

---

### Task 4: Public REST Endpoint

**Files:**
- Create: `qna-web/src/app/api/communities/[slug]/leaderboard/route.ts`

- [ ] **Step 1: Add REST route**

Create the route as a thin serializer over the service:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import {
  getCommunityLeaderboard,
  normalizeLeaderboardWindow,
  type CommunityLeaderboard,
} from '@/services/leaderboard';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const window = normalizeLeaderboardWindow(
    request.nextUrl.searchParams.get('window'),
  );
  const leaderboard = await getCommunityLeaderboard({ slug, window });

  if (!leaderboard) {
    return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  }

  return NextResponse.json(toLeaderboardResource(leaderboard));
}

function toLeaderboardResource(leaderboard: CommunityLeaderboard) {
  return {
    community: leaderboard.community,
    window: leaderboard.window,
    entries: leaderboard.entries.map((entry) => ({
      ...entry,
      lastScoringAnswerAt: entry.lastScoringAnswerAt.toISOString(),
    })),
  };
}
```

- [ ] **Step 2: Run focused verification**

Run: `npm run lint -w qna-web`

Expected: no lint errors.

- [ ] **Step 3: Commit**

Run:

```bash
git add qna-web/src/app/api/communities/[slug]/leaderboard/route.ts
git commit -m "feat(leaderboard): expose public REST endpoint"
```

---

### Task 5: Server-Rendered Web Page

**Files:**
- Create: `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`
- Modify: `qna-web/src/app/communities/[slug]/page.tsx`

- [ ] **Step 1: Create the leaderboard page**

Implement a server component that reads `searchParams.window`, calls the service, and renders the top 10 with future-friendly username layout:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import {
  getCommunityLeaderboard,
  normalizeLeaderboardWindow,
  type LeaderboardEntry,
  type LeaderboardWindow,
} from '@/services/leaderboard';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
};

const WINDOWS: { value: LeaderboardWindow; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All-time' },
];

export default async function CommunityLeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const window = normalizeLeaderboardWindow(query.window);
  const leaderboard = await getCommunityLeaderboard({ slug, window });
  if (!leaderboard) notFound();

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[900px]">
          <Link
            href={`/communities/${leaderboard.community.slug}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Back to community
          </Link>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                {leaderboard.community.name}
              </p>
              <h1 className="mt-2 text-[38px] font-bold leading-tight md:text-[52px]">
                Leaderboard
              </h1>
            </div>
            <WindowLinks slug={leaderboard.community.slug} current={window} />
          </div>

          <section className="mt-8 rounded-lg border border-line bg-card">
            {leaderboard.entries.length > 0 ? (
              <div className="divide-y divide-line">
                {leaderboard.entries.map((entry) => (
                  <LeaderboardRow key={entry.userId} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  No scores yet
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  This window has no point-awarding answers.
                </h2>
              </div>
            )}
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function WindowLinks({
  slug,
  current,
}: {
  slug: string;
  current: LeaderboardWindow;
}) {
  return (
    <nav className="flex rounded-full border border-line bg-card p-1">
      {WINDOWS.map((item) => (
        <Link
          key={item.value}
          href={`/communities/${slug}/leaderboard?window=${item.value}`}
          className={
            item.value === current
              ? 'rounded-full bg-primary px-4 py-2 text-sm font-bold text-paper'
              : 'rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink'
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="grid grid-cols-[48px_1fr_auto] items-center gap-4 p-4 sm:grid-cols-[64px_1fr_140px_180px] sm:p-5">
      <div className="text-2xl font-bold text-primary">#{entry.rank}</div>
      <div>
        <p className="text-base font-bold text-ink">{entry.username}</p>
        <p className="text-xs text-muted">
          Last scored {formatGmtDate(entry.lastScoringAnswerAt)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold">{entry.points}</p>
        <p className="text-xs text-muted">points</p>
      </div>
      <div className="hidden text-right text-sm text-muted sm:block">
        {formatGmtDate(entry.lastScoringAnswerAt)}
      </div>
    </div>
  );
}

function formatGmtDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(value);
}
```

- [ ] **Step 2: Add community page link**

Add a leaderboard link in the existing membership/schedule side rail:

```tsx
<Link
  href={`/communities/${community.slug}/leaderboard?window=all`}
  className="mt-4 block rounded-full border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink hover:border-primary hover:text-primary"
>
  View leaderboard
</Link>
```

- [ ] **Step 3: Run lint**

Run: `npm run lint -w qna-web`

Expected: no lint errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add qna-web/src/app/communities/[slug]/leaderboard/page.tsx qna-web/src/app/communities/[slug]/page.tsx
git commit -m "feat(leaderboard): add public web page"
```

---

### Task 6: Product Docs And Final Verification

**Files:**
- Modify: `PROJECT.md`

- [ ] **Step 1: Update `PROJECT.md`**

In `PROJECT.md` §8, add the leaderboard rules:

```md
Leaderboard v1:

- Scores are per community only; there is no global cross-community leaderboard.
- Public leaderboard reads derive from `answers.points_awarded`.
- Windows: 7 days, 30 days, all-time.
- Show the top 10 users by username.
- Tie-break equal point totals by the earliest `MAX(answered_at)` among point-awarding answers.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test -w qna-web
npm run lint -w qna-web
npm run build -w qna-web
```

Expected: all commands exit 0.

- [ ] **Step 3: Inspect final diff**

Run: `git diff --stat`

Expected: only leaderboard docs, leaderboard service, leaderboard route/page, community-page link, and `PROJECT.md` changed.

- [ ] **Step 4: Commit**

Run:

```bash
git add PROJECT.md
git commit -m "docs: capture leaderboard scoring rules"
```

---

## Self-Review

- Spec coverage: route, public access, three windows, URL-driven SSR, usernames, top 10, tie-break, no global leaderboard, REST endpoint, mobile UI out of scope, and `PROJECT.md` update are covered.
- Placeholder scan: no deferred-work markers remain.
- Type consistency: `LeaderboardWindow`, `LeaderboardEntry`, and `CommunityLeaderboard` names are consistent across tasks.
