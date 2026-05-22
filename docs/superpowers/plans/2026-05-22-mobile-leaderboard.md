# Mobile Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the per-community leaderboard inside the mobile Ranks tab with a 7d / 30d / All-time window switcher, viewer highlighting, and an out-of-top-10 "your rank" footer — backed by a small extension to the web leaderboard endpoint.

**Architecture:** Web service gains a viewer-aware query that returns the signed-in caller's rank via SQL `RANK()` with the same tie-breakers used for the top 10. The REST route reads the session and threads `viewerUserId` through, wraps responses with CORS, and adds `viewerEntry` to the JSON payload. Mobile gets a typed REST client (mirrors the broadcasts and questions clients) and an in-file `LeaderboardTab` component with a window switcher, top-10 list, and conditional footer row.

**Tech Stack:** Next.js App Router, Drizzle ORM 0.45 (window functions + subquery aliasing via `.as()`), `node:test` for both packages, React Native (Expo Router).

**Spec:** `docs/superpowers/specs/2026-05-22-mobile-leaderboard-design.md`

---

## File map

**Web (`qna-web/`):**

- `src/services/leaderboard/leaderboard.ts` — add `getLeaderboardEntryForUser` helper; extend `getCommunityLeaderboard` to take `viewerUserId` and return `viewerEntry`.
- `src/app/api/communities/[slug]/leaderboard/route.ts` — read session, thread `viewerUserId`, add `OPTIONS` + `withCors` wrappers, include `viewerEntry` in response.

**Mobile (`qna-mobile/`):**

- `services/leaderboard/api.ts` — new typed REST client.
- `services/leaderboard/api.test.ts` — new tests.
- `app/communities/[slug].tsx` — replace Ranks stub with `LeaderboardTab` + `LeaderboardRow` + window switcher.

**Docs:** plan file at `docs/superpowers/plans/2026-05-22-mobile-leaderboard.md` (this file).

---

## Task 1: Web — viewer-aware leaderboard service

**Files:**
- Modify: `qna-web/src/services/leaderboard/leaderboard.ts`

### Step 1.1: Add the viewer-rank helper

Open `qna-web/src/services/leaderboard/leaderboard.ts`. The existing file already imports `and`, `desc`, `eq`, `gte`, `gt`, `max`, `sql`, `sum` from `drizzle-orm`. Append the new helper function above `getCommunityLeaderboard` (so it's defined before it's used) — or at the bottom of the file if you prefer hoisting. The signature:

```ts
async function getLeaderboardEntryForUser({
  communityId,
  viewerUserId,
  windowStart,
}: {
  communityId: string;
  viewerUserId: string;
  windowStart: Date | null;
}): Promise<LeaderboardEntry | null> {
  const rankedAlias = db
    .select({
      userId: answers.userId,
      username: users.username,
      points: sum(answers.pointsAwarded).mapWith(Number).as('points'),
      lastScoringAnswerAt: max(answers.answeredAt).as('lastScoringAnswerAt'),
      rank: sql<number>`RANK() OVER (
        ORDER BY
          SUM(${answers.pointsAwarded}) DESC,
          MAX(${answers.answeredAt}) ASC,
          ${users.username} ASC
      )`.as('rank'),
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .innerJoin(users, eq(answers.userId, users.id))
    .where(
      and(
        eq(questions.communityId, communityId),
        gt(answers.pointsAwarded, 0),
        windowStart ? gte(answers.answeredAt, windowStart) : undefined,
      ),
    )
    .groupBy(answers.userId, users.username)
    .as('ranked');

  const [row] = await db
    .select()
    .from(rankedAlias)
    .where(eq(rankedAlias.userId, viewerUserId))
    .limit(1);

  if (!row) return null;

  return {
    userId: row.userId,
    username: row.username,
    points: Number(row.points ?? 0),
    lastScoringAnswerAt:
      row.lastScoringAnswerAt instanceof Date
        ? row.lastScoringAnswerAt
        : new Date(row.lastScoringAnswerAt),
    rank: Number(row.rank),
  };
}
```

Notes for the implementer:
- `sum().mapWith(Number)` is how the existing top-10 query keeps the value numeric — reuse it.
- `RANK()` is the right SQL window function: it produces 1, 2, 2, 4 for ties (rather than `DENSE_RANK`'s 1, 2, 2, 3). With our tie-breakers applied in the ORDER BY, ties shouldn't actually appear (`username` is unique), but `RANK` is the conventional choice.
- The `.as('ranked')` step makes the subquery available as a Drizzle alias so the outer `select` can filter on it.

### Step 1.2: Extend `CommunityLeaderboard` type with `viewerEntry`

In the same file, update the type:

```ts
export type CommunityLeaderboard = {
  community: {
    id: string;
    slug: string;
    name: string;
  };
  window: LeaderboardWindow;
  entries: LeaderboardEntry[];
  viewerEntry: LeaderboardEntry | null;
};
```

### Step 1.3: Extend `getCommunityLeaderboard` to accept `viewerUserId` and populate `viewerEntry`

Find the existing function and update its signature + body. The function currently looks like:

```ts
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
  ...
```

Change it to:

```ts
export async function getCommunityLeaderboard({
  slug,
  window,
  viewerUserId = null,
  now = new Date(),
}: {
  slug: string;
  window: LeaderboardWindow;
  viewerUserId?: string | null;
  now?: Date;
}): Promise<CommunityLeaderboard | null> {
  const community = await getCommunityBySlug(slug, null);
  if (!community) return null;

  const windowStart = getLeaderboardWindowStart(window, now);
  // ... (keep the existing top-10 query block unchanged) ...

  const entries = rankLeaderboardRows(
    rows.map((row) => ({
      userId: row.userId,
      username: row.username,
      points: row.points ?? 0,
      lastScoringAnswerAt: row.lastScoringAnswerAt ?? now,
    })),
  );

  const viewerEntry = await resolveViewerEntry({
    entries,
    communityId: community.id,
    viewerUserId,
    windowStart,
  });

  return {
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
    },
    window,
    entries,
    viewerEntry,
  };
}
```

Note: the comment `// ... (keep the existing top-10 query block unchanged) ...` means: do NOT delete the `totalPoints`, `lastScoringAnswerAt`, and the `db.select(...)` query that builds `rows`. Keep all of that exactly as it is; only the surrounding return shape and the new helper call change.

Add the small helper at the bottom of the file (next to `getLeaderboardEntryForUser`):

```ts
async function resolveViewerEntry({
  entries,
  communityId,
  viewerUserId,
  windowStart,
}: {
  entries: LeaderboardEntry[];
  communityId: string;
  viewerUserId: string | null;
  windowStart: Date | null;
}): Promise<LeaderboardEntry | null> {
  if (!viewerUserId) return null;
  const inTopTen = entries.find((entry) => entry.userId === viewerUserId);
  if (inTopTen) return inTopTen;
  return getLeaderboardEntryForUser({
    communityId,
    viewerUserId,
    windowStart,
  });
}
```

### Step 1.4: Verify

From `D:\Projects\qna-app`:

- `npm run test -w qna-web` — full suite green (the existing `ranking.test.ts` cases still pass; we didn't change pure logic).
- `npm run build -w qna-web` — type-check clean.

Expected: PASS.

### Step 1.5: Skip the commit step

Per the standing instruction, do NOT commit. Leave changes unstaged.

---

## Task 2: Web — leaderboard route: session + CORS + `viewerEntry`

**Files:**
- Modify: `qna-web/src/app/api/communities/[slug]/leaderboard/route.ts`

### Step 2.1: Replace the file

Overwrite `qna-web/src/app/api/communities/[slug]/leaderboard/route.ts` with:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../_utils/cors';
import { getApiSession } from '@/services/auth/api-session';
import {
  getCommunityLeaderboard,
  normalizeLeaderboardWindow,
  type CommunityLeaderboard,
  type LeaderboardEntry,
} from '@/services/leaderboard';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  const window = normalizeLeaderboardWindow(
    request.nextUrl.searchParams.get('window'),
  );
  const leaderboard = await getCommunityLeaderboard({
    slug,
    window,
    viewerUserId: session?.sub ?? null,
  });

  if (!leaderboard) {
    return withCors(
      NextResponse.json({ error: 'Community not found.' }, { status: 404 }),
      origin,
    );
  }

  return withCors(
    NextResponse.json(toLeaderboardResource(leaderboard)),
    origin,
  );
}

function toLeaderboardResource(leaderboard: CommunityLeaderboard) {
  return {
    community: leaderboard.community,
    window: leaderboard.window,
    entries: leaderboard.entries.map(toEntryResource),
    viewerEntry: leaderboard.viewerEntry
      ? toEntryResource(leaderboard.viewerEntry)
      : null,
  };
}

function toEntryResource(entry: LeaderboardEntry) {
  return {
    ...entry,
    lastScoringAnswerAt: entry.lastScoringAnswerAt.toISOString(),
  };
}
```

Notes:
- The cors import path `'../../../_utils/cors'` matches `[slug]/questions/route.ts` (three levels up from `[slug]/leaderboard/route.ts`).
- We extract `toEntryResource` because both `entries` and `viewerEntry` need the same date serialization.

### Step 2.2: Verify

From `D:\Projects\qna-app`:

- `npm run lint -w qna-web`
- `npm run build -w qna-web`

Both PASS.

### Step 2.3: Skip the commit step

---

## Task 3: Mobile — leaderboard REST client (TDD)

**Files:**
- Create: `qna-mobile/services/leaderboard/api.ts`
- Create: `qna-mobile/services/leaderboard/api.test.ts`

### Step 3.1: Write the failing test file

Write `qna-mobile/services/leaderboard/api.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLeaderboardClient,
  LeaderboardApiError,
  type LeaderboardEntry,
  type LeaderboardResult,
} from './api';

const entry: LeaderboardEntry = {
  rank: 1,
  userId: 'user_1',
  username: 'lia',
  points: 50,
  lastScoringAnswerAt: '2026-05-22T09:00:00.000Z',
};

const result: LeaderboardResult = {
  community: { id: 'community_1', slug: 'ai-builders', name: 'AI Builders' },
  window: '7d',
  entries: [entry],
  viewerEntry: null,
};

describe('createLeaderboardClient', () => {
  it('fetches leaderboard with default window 7d when none provided', async () => {
    let seenUrl = '';
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url) => {
        seenUrl = String(url);
        return Response.json(result);
      },
    });

    await client.get('ai-builders');

    assert.equal(
      seenUrl,
      'http://localhost:3000/api/communities/ai-builders/leaderboard?window=7d',
    );
  });

  it('passes the window query param when provided', async () => {
    let seenUrl = '';
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url) => {
        seenUrl = String(url);
        return Response.json(result);
      },
    });

    await client.get('ai-builders', { window: 'all' });

    assert.ok(seenUrl.endsWith('?window=all'));
  });

  it('forwards the bearer token when supplied', async () => {
    let seenHeaders: Record<string, string> = {};
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        seenHeaders = (init?.headers ?? {}) as Record<string, string>;
        return Response.json(result);
      },
    });

    await client.get('ai-builders', { window: '30d', token: 'jwt' });

    assert.equal(seenHeaders.Authorization, 'Bearer jwt');
  });

  it('returns the parsed leaderboard with entries and viewerEntry', async () => {
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({
          ...result,
          viewerEntry: { ...entry, rank: 42, userId: 'user_42', username: 'me' },
        }),
    });

    const out = await client.get('ai-builders');

    assert.equal(out.entries.length, 1);
    assert.equal(out.viewerEntry?.rank, 42);
    assert.equal(out.viewerEntry?.username, 'me');
  });

  it('maps 404 to LeaderboardApiError with code "not_found"', async () => {
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Community not found.' }, { status: 404 }),
    });

    await assert.rejects(
      () => client.get('nope'),
      (err) =>
        err instanceof LeaderboardApiError &&
        err.status === 404 &&
        err.code === 'not_found',
    );
  });
});
```

### Step 3.2: Run the tests — confirm failure

From `D:\Projects\qna-app`, run: `npm run test -w qna-mobile -- --test-name-pattern "createLeaderboardClient"`

Expected: FAIL — `./api` does not exist.

### Step 3.3: Implement the client

Write `qna-mobile/services/leaderboard/api.ts`:

```ts
export type LeaderboardWindow = '7d' | '30d' | 'all';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  points: number;
  lastScoringAnswerAt: string;
};

export type LeaderboardResult = {
  community: { id: string; slug: string; name: string };
  window: LeaderboardWindow;
  entries: LeaderboardEntry[];
  viewerEntry: LeaderboardEntry | null;
};

type LeaderboardClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type GetOptions = {
  window?: LeaderboardWindow;
  token?: string | null;
};

type ErrorBody = {
  error?: unknown;
};

export type LeaderboardApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'unknown';

export class LeaderboardApiError extends Error {
  status: number;
  code: LeaderboardApiErrorCode;

  constructor(message: string, status: number, code: LeaderboardApiErrorCode) {
    super(message);
    this.name = 'LeaderboardApiError';
    this.status = status;
    this.code = code;
  }
}

export function createLeaderboardClient(options: LeaderboardClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    get(slug: string, { window = '7d', token = null }: GetOptions = {}) {
      const params = new URLSearchParams({ window });
      return requestJson<LeaderboardResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/leaderboard?${params.toString()}`,
        { method: 'GET', headers: authHeaders(token) },
      );
    },
  };
}

function getConfiguredApiUrl(apiUrl?: string) {
  const configured = apiUrl ?? 'http://localhost:3000/api';
  return configured.replace(/\/+$/, '');
}

function authHeaders(token?: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new LeaderboardApiError(
      'Unable to reach Quorum API. Check your connection and API URL.',
      0,
      'network',
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
    const message =
      typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.';
    throw new LeaderboardApiError(
      message,
      response.status,
      codeForStatus(response.status),
    );
  }

  return body as T;
}

function codeForStatus(status: number): LeaderboardApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return 'unknown';
}
```

### Step 3.4: Run the tests — confirm pass

Run: `npm run test -w qna-mobile -- --test-name-pattern "createLeaderboardClient"`

Expected: PASS (5 cases).

### Step 3.5: Run the full mobile suite + lint

Run: `npm run test -w qna-mobile && npm run lint -w qna-mobile`.

Expected: PASS.

### Step 3.6: Skip the commit step

---

## Task 4: Mobile — wire `LeaderboardTab` into community detail

**Files:**
- Modify: `qna-mobile/app/communities/[slug].tsx`

### Step 4.1: Add new imports

At the top of `qna-mobile/app/communities/[slug].tsx`, add:

```ts
import {
  createLeaderboardClient,
  LeaderboardApiError,
  type LeaderboardEntry,
  type LeaderboardResult,
  type LeaderboardWindow,
} from '@/services/leaderboard/api';
```

Keep import grouping consistent with the file's existing style.

### Step 4.2: Update `TabPanel` to handle the `leaderboard` tab

Find `TabPanel` (currently routes `about`, `questions`, `broadcasts`, falls back to a stub for `leaderboard`). Replace it with:

```tsx
function TabPanel({ activeTab, community }: { activeTab: DetailTab; community: Community }) {
  if (activeTab === 'about') {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>About</Text>
        <Text style={styles.panelBody}>{community.description}</Text>
        <MetaItem label="Category" value={community.category?.name ?? 'General'} />
        <MetaItem label="Created" separated value={formatDate(community.createdAt)} />
        <MetaItem label="Updated" separated value={formatDate(community.updatedAt)} />
      </View>
    );
  }

  if (activeTab === 'questions') {
    return <QuestionsTab community={community} />;
  }

  if (activeTab === 'broadcasts') {
    return <BroadcastsTab community={community} />;
  }

  if (activeTab === 'leaderboard') {
    return <LeaderboardTab community={community} />;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{TABS.find((tab) => tab.value === activeTab)?.label}</Text>
      <Text style={styles.panelBody}>Coming soon.</Text>
    </View>
  );
}
```

(Removing the now-redundant `scaffoldTab` / `copy` block since every known tab is handled.)

### Step 4.3: Add the `LeaderboardTab` and `LeaderboardRow` components

Append the following components to the same file, below the existing tab components (after `BroadcastCard`):

```tsx
const LEADERBOARD_WINDOWS: { value: LeaderboardWindow; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All-time' },
];

function LeaderboardTab({ community }: { community: Community }) {
  const { token } = useAuth();
  const apiUrl = useRuntimeApiUrl();
  const leaderboardClient = useMemo(
    () => createLeaderboardClient({ apiUrl }),
    [apiUrl],
  );
  const [selectedWindow, setSelectedWindow] = useState<LeaderboardWindow>('7d');
  const [data, setData] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LeaderboardApiError | null>(null);

  const loadLeaderboard = useCallback(
    async (windowValue: LeaderboardWindow, isActive: () => boolean = () => true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await leaderboardClient.get(community.slug, {
          window: windowValue,
          token,
        });
        if (!isActive()) return;
        setData(result);
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof LeaderboardApiError) {
          setError(err);
        } else {
          setError(new LeaderboardApiError('Unable to load leaderboard.', 0, 'unknown'));
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [community.slug, leaderboardClient, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadLeaderboard(selectedWindow, () => active);

      return () => {
        active = false;
      };
    }, [loadLeaderboard, selectedWindow]),
  );

  const entries = data?.entries ?? [];
  const viewerEntry = data?.viewerEntry ?? null;
  const viewerOutsideTopTen =
    viewerEntry !== null && !entries.some((row) => row.userId === viewerEntry.userId);

  return (
    <View style={styles.leaderboardContainer}>
      <View style={styles.windowSwitcher}>
        {LEADERBOARD_WINDOWS.map((option) => {
          const active = option.value === selectedWindow;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => setSelectedWindow(option.value)}
              style={[
                styles.windowPill,
                active ? styles.windowPillActive : styles.windowPillInactive,
              ]}
            >
              <Text
                style={[
                  styles.windowPillText,
                  active ? styles.windowPillTextActive : styles.windowPillTextInactive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <StatePanel title="Loading leaderboard..." />
      ) : error ? (
        <StatePanel title={error.message || 'Unable to load leaderboard.'}>
          <BrandButton variant="secondary" onPress={() => void loadLeaderboard(selectedWindow)}>
            Retry
          </BrandButton>
        </StatePanel>
      ) : entries.length === 0 ? (
        <StatePanel title="No scores yet">
          <Text style={styles.panelBody}>Be the first to answer today&apos;s question.</Text>
        </StatePanel>
      ) : (
        <>
          <View style={styles.leaderboardList}>
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isViewer={viewerEntry?.userId === entry.userId}
              />
            ))}
          </View>

          {viewerOutsideTopTen ? (
            <View style={styles.viewerFooter}>
              <Text style={styles.viewerFooterLabel}>YOUR RANK</Text>
              <LeaderboardRow entry={viewerEntry} isViewer />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function LeaderboardRow({
  entry,
  isViewer,
}: {
  entry: LeaderboardEntry;
  isViewer: boolean;
}) {
  const topThree = entry.rank <= 3;

  return (
    <View
      style={[
        styles.leaderboardRow,
        isViewer ? styles.leaderboardRowViewer : null,
      ]}
    >
      <View
        style={[
          styles.rankPill,
          topThree ? styles.rankPillTop : styles.rankPillRegular,
        ]}
      >
        <Text
          style={[
            styles.rankPillText,
            topThree ? styles.rankPillTextTop : styles.rankPillTextRegular,
          ]}
        >
          {entry.rank}
        </Text>
      </View>
      <Text style={styles.leaderboardUsername} numberOfLines={1}>
        @{entry.username}
      </Text>
      <Text style={styles.leaderboardPoints}>{formatPoints(entry.points)}</Text>
    </View>
  );
}
```

### Step 4.4: Extend the `styles` block

In the same file, find the `styles = StyleSheet.create({...})` block and add the following entries (place them near the existing `broadcastCard` / `questionCard` block to keep related styles together):

```ts
leaderboardContainer: {
  gap: 14,
},
windowSwitcher: {
  flexDirection: 'row',
  gap: 8,
},
windowPill: {
  borderRadius: 999,
  borderWidth: 1,
  flexGrow: 1,
  paddingHorizontal: 12,
  paddingVertical: 8,
},
windowPillActive: {
  backgroundColor: palette.primary,
  borderColor: palette.primary,
},
windowPillInactive: {
  backgroundColor: palette.card,
  borderColor: palette.line,
},
windowPillText: {
  fontFamily: fonts.sans,
  fontSize: 13,
  fontWeight: '800',
  textAlign: 'center',
},
windowPillTextActive: {
  color: palette.paper,
},
windowPillTextInactive: {
  color: palette.ink,
},
leaderboardList: {
  gap: 8,
},
leaderboardRow: {
  alignItems: 'center',
  backgroundColor: palette.card,
  borderColor: palette.line,
  borderRadius: 12,
  borderWidth: 1,
  flexDirection: 'row',
  gap: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
},
leaderboardRowViewer: {
  borderColor: palette.primary,
  borderWidth: 1.5,
},
rankPill: {
  alignItems: 'center',
  borderRadius: 999,
  height: 28,
  justifyContent: 'center',
  width: 28,
},
rankPillTop: {
  backgroundColor: palette.primary,
},
rankPillRegular: {
  backgroundColor: palette.paper,
  borderColor: palette.line,
  borderWidth: 1,
},
rankPillText: {
  fontFamily: fonts.sans,
  fontSize: 13,
  fontWeight: '800',
},
rankPillTextTop: {
  color: palette.paper,
},
rankPillTextRegular: {
  color: palette.ink,
},
leaderboardUsername: {
  color: palette.ink,
  flex: 1,
  fontFamily: fonts.sans,
  fontSize: 14,
  fontWeight: '700',
},
leaderboardPoints: {
  color: palette.primary,
  fontFamily: fonts.sans,
  fontSize: 14,
  fontWeight: '800',
},
viewerFooter: {
  gap: 6,
  paddingTop: 6,
},
viewerFooterLabel: {
  color: palette.muted,
  fontFamily: fonts.sans,
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 0.6,
  textTransform: 'uppercase',
},
```

If any token in this style block doesn't exist by that exact name (`palette.ink`, `palette.muted`, `palette.paper`, `palette.line`, `palette.card`, `palette.primary`, `fonts.sans`), substitute the actual tokens. Check existing styles like `leaderboardUsername` against `broadcastBody` / `questionPrompt` for confirmation.

### Step 4.5: Verify

From `D:\Projects\qna-app`:

- `npm run test -w qna-mobile` — full suite green.
- `npm run lint -w qna-mobile` — clean.
- `npm run build -w qna-mobile` — web export succeeds, 9 routes.

Expected: PASS for all three.

### Step 4.6: Skip the commit step

---

## Task 5: End-to-end verification

**Files:** none (verification only)

### Step 5.1: Web tests + lint + build

From `D:\Projects\qna-app`:

- `npm run test -w qna-web`
- `npm run lint -w qna-web`
- `npm run build -w qna-web`

Expected: all pass.

### Step 5.2: Mobile tests + lint + export

- `npm run test -w qna-mobile`
- `npm run lint -w qna-mobile`
- `npm run build -w qna-mobile`

Expected: all pass; web export emits 9 routes.

### Step 5.3: Manual sanity matrix

Start the Next dev server (`npm run dev -w qna-web`) and the Expo app (`npm run start -w qna-mobile`). Walk through:

| Scenario                                              | Expected mobile behavior                                                   |
|-------------------------------------------------------|----------------------------------------------------------------------------|
| Anonymous → Ranks tab, default 7d                     | List of up to 10 entries; no viewer footer                                 |
| Anonymous → switch to 30d, then All-time              | Each switch re-fetches; results update                                     |
| Member with 0 scoring answers → Ranks tab             | Top 10 list (if any), no footer                                            |
| Member with a scoring answer in top 10 → Ranks tab    | Their row has the viewer border; no separate footer                        |
| Member with a scoring answer NOT in top 10            | "YOUR RANK" label + viewer-styled row appended below top 10                |
| Community with no scoring answers at all              | "No scores yet" empty panel                                                |
| `curl /api/communities/<slug>/leaderboard` (no auth)  | 200 with `viewerEntry: null`                                               |
| `curl ... -H "Authorization: Bearer <member-jwt>"`    | 200 with `viewerEntry` populated                                           |
| `curl /api/communities/nope/leaderboard`              | 404 with `{ error: "Community not found." }`                               |

### Step 5.4: Do not commit

Per the standing instruction (user commits and pushes themselves), do not stage or push anything.

---

## Self-review notes

Quick spec coverage scan:

- Viewer-aware leaderboard service → Task 1.
- CORS + session on route + `viewerEntry` in response → Task 2.
- Mobile REST client + tests → Task 3.
- Mobile Ranks tab UI + window switcher + viewer footer → Task 4.
- Verification → Task 5.

Placeholder scan: no "TBD" / "add error handling" / "similar to Task N". Every code block is concrete.

Type consistency: `LeaderboardEntry` (mobile) ↔ the same name on web (route response). Mobile uses `lastScoringAnswerAt: string` (ISO) while web internally uses `Date`; the route serializes via `toEntryResource`. `LeaderboardApiErrorCode` is the discriminator on mobile and mirrors the broadcasts client. `LeaderboardWindow` is shared as a literal union both sides.
