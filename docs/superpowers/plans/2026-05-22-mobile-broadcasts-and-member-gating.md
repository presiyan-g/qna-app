# Mobile Broadcasts And Member Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring broadcasts (creator posts) to the mobile app as a read-only feed in the community Posts tab, and gate broadcast reads on community membership across both web and mobile in the same slice.

**Architecture:** Web service `listCommunityBroadcasts` / `getCommunityBroadcast` gain a membership gate enforced through two new typed error classes; REST routes map those errors to `401` / `403` and gain CORS. Mobile gets a typed REST client (`services/broadcasts/api.ts`) and replaces the stub Posts tab in `app/communities/[slug].tsx` with a real feed component. A small refactor extracts `formatRelativeTime` from `services/questions/format.ts` into a neutral `services/util/time.ts` so both features share it.

**Tech Stack:** Next.js App Router (server components, route handlers), Drizzle ORM, Vitest-style `node:test` for both web and mobile, React Native (Expo Router, `expo-image`).

**Spec:** `docs/superpowers/specs/2026-05-22-mobile-broadcasts-and-member-gating-design.md`

---

## File map

**Web (`qna-web/`):**

- `src/services/broadcasts/policy.ts` — add `canReadBroadcasts`.
- `src/services/broadcasts/policy.test.ts` — extend with `canReadBroadcasts` cases.
- `src/services/broadcasts/errors.ts` — add `BroadcastAuthenticationRequiredError`, `BroadcastMembershipRequiredError`.
- `src/services/broadcasts/broadcasts.ts` — call `canReadBroadcasts` inside `listCommunityBroadcasts` and `getCommunityBroadcast`; throw the new errors.
- `src/app/api/communities/[slug]/broadcasts/route.ts` — read session, map errors, add `OPTIONS` + `withCors`.
- `src/app/api/communities/[slug]/broadcasts/[postId]/route.ts` — same.
- `src/app/communities/[slug]/broadcasts/page.tsx` — render a member-required gate instead of the feed when the viewer is not a member.

**Mobile (`qna-mobile/`):**

- `services/util/time.ts` — new home of `formatRelativeTime`.
- `services/util/time.test.ts` — move `formatRelativeTime` test cases here.
- `services/questions/format.ts` — drop `formatRelativeTime`; remove its tests from `format.test.ts`.
- `services/questions/format.test.ts` — remove the `formatRelativeTime` describe block.
- `app/communities/[slug].tsx` — replace `formatRelativeTime` import; replace the broadcasts stub with `BroadcastsTab` + `BroadcastCard`.
- `services/broadcasts/api.ts` — new typed REST client.
- `services/broadcasts/api.test.ts` — new tests.

**Docs:** plan file at `docs/superpowers/plans/2026-05-22-mobile-broadcasts-and-member-gating.md` (this file).

---

## Task 1: Web — `canReadBroadcasts` policy helper (TDD)

**Files:**
- Modify: `qna-web/src/services/broadcasts/policy.ts`
- Test: `qna-web/src/services/broadcasts/policy.test.ts`

- [ ] **Step 1.1: Write the failing test**

Append to `qna-web/src/services/broadcasts/policy.test.ts` (above the file's last line, after existing tests):

```ts
import { canReadBroadcasts } from './policy';

test('members and creators can read broadcasts; non-members cannot', () => {
  assert.equal(canReadBroadcasts('creator'), true);
  assert.equal(canReadBroadcasts('member'), true);
  assert.equal(canReadBroadcasts(null), false);
});
```

Move the new `import` line up next to the existing `import` so all imports stay grouped. The final import line at the top of the file becomes:

```ts
import {
  canCreateBroadcastPost,
  canEditBroadcastPost,
  canReadBroadcasts,
  canSoftDeleteBroadcastPost,
} from './policy';
```

- [ ] **Step 1.2: Run test, confirm failure**

Run from repo root: `npm run test -w qna-web -- --test-name-pattern "members and creators can read broadcasts"`

Expected: FAIL — `canReadBroadcasts is not a function` or similar import error.

- [ ] **Step 1.3: Implement `canReadBroadcasts`**

Append to `qna-web/src/services/broadcasts/policy.ts`:

```ts
export function canReadBroadcasts(
  communityRole: CommunityRole | null,
): boolean {
  return communityRole === 'member' || communityRole === 'creator';
}
```

- [ ] **Step 1.4: Run test, confirm pass**

Run: `npm run test -w qna-web -- --test-name-pattern "members and creators can read broadcasts"`

Expected: PASS.

- [ ] **Step 1.5: Commit**

```bash
git add qna-web/src/services/broadcasts/policy.ts qna-web/src/services/broadcasts/policy.test.ts
git commit -m "feat(broadcasts): add canReadBroadcasts policy helper"
```

---

## Task 2: Web — broadcast read-error types

**Files:**
- Modify: `qna-web/src/services/broadcasts/errors.ts`

- [ ] **Step 2.1: Add two new error classes**

Append to `qna-web/src/services/broadcasts/errors.ts`:

```ts
export class BroadcastAuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required.');
    this.name = 'BroadcastAuthenticationRequiredError';
  }
}

export class BroadcastMembershipRequiredError extends Error {
  constructor() {
    super('Join this community to see broadcasts.');
    this.name = 'BroadcastMembershipRequiredError';
  }
}
```

- [ ] **Step 2.2: Verify the package still type-checks**

Run: `npm run typecheck -w qna-web` (or `npm run build -w qna-web` if the project does not expose a separate typecheck script).

Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add qna-web/src/services/broadcasts/errors.ts
git commit -m "feat(broadcasts): add auth-required and membership-required error types"
```

---

## Task 3: Web — gate read paths in the broadcasts service

**Files:**
- Modify: `qna-web/src/services/broadcasts/broadcasts.ts`

- [ ] **Step 3.1: Import the new error types and policy helper**

In `qna-web/src/services/broadcasts/broadcasts.ts`, update the existing imports to include the new symbols. The block becomes:

```ts
import {
  BroadcastAuthenticationRequiredError,
  BroadcastMembershipRequiredError,
  BroadcastNotFoundError,
  BroadcastPermissionError,
} from './errors';
import {
  canCreateBroadcastPost,
  canEditBroadcastPost,
  canReadBroadcasts,
  canSoftDeleteBroadcastPost,
} from './policy';
```

- [ ] **Step 3.2: Add a shared gate helper at the bottom of the file**

Append to `qna-web/src/services/broadcasts/broadcasts.ts` (next to `assertAccountCanMutate`):

```ts
function assertCanReadBroadcasts({
  viewerUserId,
  communityRole,
}: {
  viewerUserId: string | null;
  communityRole: CommunityRole | null;
}): void {
  if (!viewerUserId) {
    throw new BroadcastAuthenticationRequiredError();
  }
  if (!canReadBroadcasts(communityRole)) {
    throw new BroadcastMembershipRequiredError();
  }
}
```

- [ ] **Step 3.3: Gate `listCommunityBroadcasts`**

In `listCommunityBroadcasts`, immediately after the `if (!community) throw new BroadcastNotFoundError();` line, add:

```ts
assertCanReadBroadcasts({
  viewerUserId,
  communityRole: community.currentUserRole,
});
```

The community lookup runs first so a true "community does not exist" still produces `404`; only after the community resolves do we enforce membership.

- [ ] **Step 3.4: Gate `getCommunityBroadcast`**

In `getCommunityBroadcast`, immediately after the `if (!community) return null;` line, add:

```ts
assertCanReadBroadcasts({
  viewerUserId,
  communityRole: community.currentUserRole,
});
```

Note: the function still returns `null` for "no community"; the gate runs once the community is found, before fetching the row.

- [ ] **Step 3.5: Leave `getLatestCommunityBroadcast` / `…ForCommunity` ungated**

These helpers are used elsewhere (e.g. community detail summary card on web) to surface "latest" metadata; do not change their signatures. They already only return content for valid communities and we want them to keep working for callers that present a preview hook. (If a future audit shows a leak here, it's a separate slice.)

- [ ] **Step 3.6: Run the existing broadcasts test suites — confirm nothing broke**

Run: `npm run test -w qna-web -- --test-name-pattern "broadcasts"`

Expected: PASS (no DB tests exist in this package; pure-function tests pass).

- [ ] **Step 3.7: Commit**

```bash
git add qna-web/src/services/broadcasts/broadcasts.ts
git commit -m "feat(broadcasts): gate list and detail reads on community membership"
```

---

## Task 4: Web — broadcasts list route: session + CORS + error mapping

**Files:**
- Modify: `qna-web/src/app/api/communities/[slug]/broadcasts/route.ts`

- [ ] **Step 4.1: Replace the file**

Overwrite `qna-web/src/app/api/communities/[slug]/broadcasts/route.ts` with:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  BroadcastAuthenticationRequiredError,
  BroadcastCursorError,
  BroadcastMembershipRequiredError,
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
  createBroadcastPost,
  listCommunityBroadcasts,
  normalizeBroadcastLimit,
  type BroadcastPage,
  type BroadcastPostResource,
} from '@/services/broadcasts';

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

  try {
    const page = await listCommunityBroadcasts({
      slug,
      limit: normalizeBroadcastLimit(request.nextUrl.searchParams.get('limit')),
      cursor: request.nextUrl.searchParams.get('cursor'),
      viewerUserId: session?.sub ?? null,
    });
    return withCors(NextResponse.json(toBroadcastPageResource(page)), origin);
  } catch (err) {
    if (err instanceof BroadcastAuthenticationRequiredError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 401 }),
        origin,
      );
    }
    if (err instanceof BroadcastMembershipRequiredError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 403 }),
        origin,
      );
    }
    if (err instanceof BroadcastCursorError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 400 }),
        origin,
      );
    }
    if (err instanceof BroadcastNotFoundError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 404 }),
        origin,
      );
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }),
      origin,
    );
  }

  try {
    const post = await createBroadcastPost({
      slug,
      userId: session.sub,
      body: toBroadcastBody(json),
      imageUrl: toBroadcastImageUrl(json),
    });
    return withCors(
      NextResponse.json({ post: toBroadcastResource(post) }, { status: 201 }),
      origin,
    );
  } catch (err) {
    return toMutationErrorResponse(err, origin);
  }
}

function toBroadcastBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { body?: unknown }).body;
}

function toBroadcastImageUrl(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { imageUrl?: unknown }).imageUrl;
}

function toBroadcastPageResource(page: BroadcastPage) {
  return {
    items: page.items.map(toBroadcastResource),
    pagination: page.pagination,
  };
}

function toBroadcastResource(post: BroadcastPostResource) {
  return {
    id: post.id,
    communityId: post.communityId,
    author: post.author,
    body: post.body,
    imageUrl: post.imageUrl,
    publishedAt: post.publishedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    canEdit: post.canEdit,
    canDelete: post.canDelete,
  };
}

function toMutationErrorResponse(err: unknown, origin: string | null): Response {
  if (err instanceof BroadcastNotFoundError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 404 }),
      origin,
    );
  }
  if (err instanceof BroadcastPermissionError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 403 }),
      origin,
    );
  }
  if (err instanceof AccountSuspendedError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 403 }),
      origin,
    );
  }
  if (err instanceof BroadcastValidationError) {
    return withCors(
      NextResponse.json(
        { error: err.message, fieldErrors: err.fieldErrors },
        { status: 422 },
      ),
      origin,
    );
  }
  throw err;
}
```

- [ ] **Step 4.2: Run lint and typecheck for the web package**

Run from repo root: `npm run lint -w qna-web` and `npm run typecheck -w qna-web` (or `npm run build -w qna-web`).

Expected: PASS for both.

- [ ] **Step 4.3: Commit**

```bash
git add qna-web/src/app/api/communities/[slug]/broadcasts/route.ts
git commit -m "feat(broadcasts): gate list route on membership; add CORS"
```

---

## Task 5: Web — broadcasts detail route: session + CORS + error mapping

**Files:**
- Modify: `qna-web/src/app/api/communities/[slug]/broadcasts/[postId]/route.ts`

- [ ] **Step 5.1: Replace the file**

Overwrite `qna-web/src/app/api/communities/[slug]/broadcasts/[postId]/route.ts` with:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  BroadcastAuthenticationRequiredError,
  BroadcastMembershipRequiredError,
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
  getCommunityBroadcast,
  softDeleteBroadcastPost,
  updateBroadcastPost,
  type BroadcastPostResource,
} from '@/services/broadcasts';

type RouteContext = {
  params: Promise<{ slug: string; postId: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, postId }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);

  try {
    const post = await getCommunityBroadcast({
      slug,
      postId,
      viewerUserId: session?.sub ?? null,
    });
    if (!post) {
      return withCors(
        NextResponse.json({ error: 'Broadcast not found.' }, { status: 404 }),
        origin,
      );
    }
    return withCors(
      NextResponse.json({ post: toBroadcastResource(post) }),
      origin,
    );
  } catch (err) {
    if (err instanceof BroadcastAuthenticationRequiredError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 401 }),
        origin,
      );
    }
    if (err instanceof BroadcastMembershipRequiredError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 403 }),
        origin,
      );
    }
    throw err;
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, postId }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }),
      origin,
    );
  }

  try {
    const post = await updateBroadcastPost({
      slug,
      postId,
      userId: session.sub,
      body: toBroadcastBody(json),
      imageUrl: toBroadcastImageUrl(json),
    });
    return withCors(
      NextResponse.json({ post: toBroadcastResource(post) }),
      origin,
    );
  } catch (err) {
    return toMutationErrorResponse(err, origin);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, postId }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  try {
    await softDeleteBroadcastPost({ slug, postId, userId: session.sub });
    return withCors(new NextResponse(null, { status: 204 }), origin);
  } catch (err) {
    return toMutationErrorResponse(err, origin);
  }
}

function toBroadcastBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { body?: unknown }).body;
}

function toBroadcastImageUrl(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { imageUrl?: unknown }).imageUrl;
}

function toBroadcastResource(post: BroadcastPostResource) {
  return {
    id: post.id,
    communityId: post.communityId,
    author: post.author,
    body: post.body,
    imageUrl: post.imageUrl,
    publishedAt: post.publishedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    canEdit: post.canEdit,
    canDelete: post.canDelete,
  };
}

function toMutationErrorResponse(err: unknown, origin: string | null): Response {
  if (err instanceof BroadcastNotFoundError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 404 }),
      origin,
    );
  }
  if (err instanceof BroadcastPermissionError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 403 }),
      origin,
    );
  }
  if (err instanceof AccountSuspendedError) {
    return withCors(
      NextResponse.json({ error: err.message }, { status: 403 }),
      origin,
    );
  }
  if (err instanceof BroadcastValidationError) {
    return withCors(
      NextResponse.json(
        { error: err.message, fieldErrors: err.fieldErrors },
        { status: 422 },
      ),
      origin,
    );
  }
  throw err;
}
```

- [ ] **Step 5.2: Lint + typecheck**

Run: `npm run lint -w qna-web` and `npm run typecheck -w qna-web` (or build).

Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add qna-web/src/app/api/communities/[slug]/broadcasts/[postId]/route.ts
git commit -m "feat(broadcasts): gate detail route on membership; add CORS"
```

---

## Task 6: Web — broadcasts page renders a member gate

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`

- [ ] **Step 6.1: Replace the file**

Overwrite `qna-web/src/app/communities/[slug]/broadcasts/page.tsx` with:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  canReadBroadcasts,
  listCommunityBroadcasts,
  normalizeBroadcastLimit,
  type BroadcastPostResource,
} from '@/services/broadcasts';
import { BroadcastComposer } from './_components/BroadcastComposer';
import {
  BroadcastFeed,
  type SerializedBroadcastPost,
} from './_components/BroadcastFeed';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string; limit?: string }>;
};

export default async function CommunityBroadcastsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, query, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  const viewerIsMember = canReadBroadcasts(community.currentUserRole);

  if (!viewerIsMember) {
    return (
      <main className="flex flex-1 flex-col bg-paper text-ink">
        <Nav />
        <section className="px-6 py-12 md:px-12 md:py-16">
          <div className="mx-auto max-w-[900px]">
            <Link
              href={`/communities/${community.slug}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Back to community
            </Link>

            <div className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                {community.name}
              </p>
              <h1 className="mt-2 text-[38px] font-bold leading-tight md:text-[52px]">
                Broadcasts
              </h1>
            </div>

            <section className="mt-8 rounded-lg border border-dashed border-line bg-card p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Members only
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {session?.sub
                  ? 'Join this community to see broadcasts'
                  : 'Sign in to see broadcasts'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Broadcasts are creator updates shared with members of {community.name}.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {session?.sub ? (
                  <Link
                    href={`/communities/${community.slug}`}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-paper hover:opacity-90"
                  >
                    Join community
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/login?returnTo=/communities/${community.slug}/broadcasts`}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-paper hover:opacity-90"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </section>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const page = await listCommunityBroadcasts({
    slug,
    limit: normalizeBroadcastLimit(query.limit ?? null),
    cursor: query.cursor ?? null,
    viewerUserId: session?.sub ?? null,
  });

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[900px]">
          <Link
            href={`/communities/${community.slug}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Back to community
          </Link>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                {community.name}
              </p>
              <h1 className="mt-2 text-[38px] font-bold leading-tight md:text-[52px]">
                Broadcasts
              </h1>
            </div>
            <Link
              href={`/communities/${community.slug}/leaderboard?window=all`}
              className="rounded-full border border-line px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
            >
              Leaderboard
            </Link>
          </div>

          {community.currentUserRole === 'creator' && (
            <section className="mt-8 rounded-lg border border-line bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Creator
              </p>
              <h2 className="mt-2 text-2xl font-bold">Post a broadcast</h2>
              <div className="mt-5">
                <BroadcastComposer slug={community.slug} />
              </div>
            </section>
          )}

          <section className="mt-8">
            <BroadcastFeed
              slug={community.slug}
              posts={page.items.map(serializeBroadcast)}
            />
          </section>

          {page.pagination.nextCursor && (
            <div className="mt-8">
              <Link
                href={`/communities/${community.slug}/broadcasts?cursor=${encodeURIComponent(page.pagination.nextCursor)}`}
                className="inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
              >
                Older posts
              </Link>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function serializeBroadcast(
  post: BroadcastPostResource,
): SerializedBroadcastPost {
  return {
    ...post,
    publishedAt: post.publishedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
```

Notes:
- The page-level `canReadBroadcasts` check renders the gate before calling the service. The service's own gate (`assertCanReadBroadcasts`) cannot fire here because the same role is consulted, so we do not catch its errors at the page level.
- We import `canReadBroadcasts` from `@/services/broadcasts`; the module re-exports `policy.ts` via the existing `index.ts`, so no additional barrel changes are needed.

- [ ] **Step 6.2: Lint + typecheck + build the affected pages**

Run: `npm run lint -w qna-web` and `npm run build -w qna-web`.

Expected: PASS.

- [ ] **Step 6.3: Commit**

```bash
git add qna-web/src/app/communities/[slug]/broadcasts/page.tsx
git commit -m "feat(broadcasts): render member-only gate on the broadcasts page"
```

---

## Task 7: Mobile — extract `formatRelativeTime` into `services/util/time.ts`

**Files:**
- Create: `qna-mobile/services/util/time.ts`
- Create: `qna-mobile/services/util/time.test.ts`
- Modify: `qna-mobile/services/questions/format.ts`
- Modify: `qna-mobile/services/questions/format.test.ts`
- Modify: `qna-mobile/app/communities/[slug].tsx`

- [ ] **Step 7.1: Create `services/util/time.ts`**

Write `qna-mobile/services/util/time.ts`:

```ts
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const target = value instanceof Date ? value : new Date(value);
  const diffMs = target.getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return '';

  const isPast = diffMs < 0;
  const absMs = Math.abs(diffMs);

  if (absMs < MINUTE_MS) {
    return isPast ? 'just now' : 'in a moment';
  }

  let magnitude: string;
  if (absMs < HOUR_MS) {
    const minutes = Math.round(absMs / MINUTE_MS);
    magnitude = `${minutes}m`;
  } else if (absMs < DAY_MS) {
    const hours = Math.round(absMs / HOUR_MS);
    magnitude = `${hours}h`;
  } else {
    const days = Math.round(absMs / DAY_MS);
    magnitude = `${days}d`;
  }

  return isPast ? `${magnitude} ago` : `in ${magnitude}`;
}
```

- [ ] **Step 7.2: Create `services/util/time.test.ts`**

Write `qna-mobile/services/util/time.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatRelativeTime } from './time';

const NOW = new Date('2026-05-21T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent past', () => {
    assert.equal(formatRelativeTime('2026-05-21T11:59:30.000Z', NOW), 'just now');
  });

  it('returns "in a moment" for very near future', () => {
    assert.equal(formatRelativeTime('2026-05-21T12:00:30.000Z', NOW), 'in a moment');
  });

  it('formats past minutes, hours, and days', () => {
    assert.equal(formatRelativeTime('2026-05-21T11:30:00.000Z', NOW), '30m ago');
    assert.equal(formatRelativeTime('2026-05-21T10:00:00.000Z', NOW), '2h ago');
    assert.equal(formatRelativeTime('2026-05-19T12:00:00.000Z', NOW), '2d ago');
  });

  it('formats future minutes, hours, and days', () => {
    assert.equal(formatRelativeTime('2026-05-21T12:30:00.000Z', NOW), 'in 30m');
    assert.equal(formatRelativeTime('2026-05-21T16:00:00.000Z', NOW), 'in 4h');
    assert.equal(formatRelativeTime('2026-05-24T12:00:00.000Z', NOW), 'in 3d');
  });

  it('returns empty string for an unparseable value', () => {
    assert.equal(formatRelativeTime('not-a-date', NOW), '');
  });
});
```

- [ ] **Step 7.3: Run the new tests**

Run: `npm run test -w qna-mobile -- --test-name-pattern "formatRelativeTime"`

Expected: PASS — 5 cases.

- [ ] **Step 7.4: Remove `formatRelativeTime` from `services/questions/format.ts`**

Open `qna-mobile/services/questions/format.ts` and delete the trailing `formatRelativeTime` function plus the three `*_MS` constants that exist only to support it. The final file becomes:

```ts
import type { QuestionDetail, QuestionSummary } from './api';

export type QuestionState = 'scheduled' | 'live' | 'closed';

type QuestionLike = Pick<QuestionSummary | QuestionDetail, 'publishedAt' | 'closesAt'>;

export function getQuestionState(question: QuestionLike, now: Date = new Date()): QuestionState {
  if (!question.publishedAt) return 'scheduled';
  const publishedAt = new Date(question.publishedAt).getTime();
  if (Number.isNaN(publishedAt) || publishedAt > now.getTime()) return 'scheduled';
  const closesAt = new Date(question.closesAt).getTime();
  if (!Number.isNaN(closesAt) && closesAt <= now.getTime()) return 'closed';
  return 'live';
}

export function formatQuestionStateLabel(state: QuestionState): string {
  switch (state) {
    case 'scheduled':
      return 'Scheduled';
    case 'live':
      return 'Live';
    case 'closed':
      return 'Closed';
  }
}

export function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points} pts`;
}
```

- [ ] **Step 7.5: Remove the `formatRelativeTime` describe block from `services/questions/format.test.ts`**

Delete the `describe('formatRelativeTime', …)` block and remove `formatRelativeTime` from the top-of-file import. The remaining imports become:

```ts
import {
  formatPoints,
  formatQuestionStateLabel,
  getQuestionState,
} from './format';
```

- [ ] **Step 7.6: Update consumers — `app/communities/[slug].tsx`**

In `qna-mobile/app/communities/[slug].tsx`, find the import:

```ts
import {
  formatPoints,
  formatQuestionStateLabel,
  formatRelativeTime,
  getQuestionState,
  type QuestionState,
} from '@/services/questions/format';
```

Replace it with two imports:

```ts
import {
  formatPoints,
  formatQuestionStateLabel,
  getQuestionState,
  type QuestionState,
} from '@/services/questions/format';
import { formatRelativeTime } from '@/services/util/time';
```

Leave other call sites of `formatRelativeTime(...)` inside this file unchanged.

- [ ] **Step 7.7: Search for any other consumers**

Run from `qna-mobile/`: `grep -r "formatRelativeTime" services/ app/ components/ | grep -v "services/util/time" | grep -v "services/questions/format.test"` (or equivalent search via Grep tool).

If any consumer still imports `formatRelativeTime` from `@/services/questions/format`, update it to import from `@/services/util/time` instead. The only expected consumer is `app/communities/[slug].tsx` (handled above) and the question detail screen `app/communities/[slug]/questions/[id].tsx` — update that file too if a match is found there.

- [ ] **Step 7.8: Run the mobile test suite**

Run: `npm run test -w qna-mobile`

Expected: PASS — full suite green.

- [ ] **Step 7.9: Run mobile typecheck and lint**

Run: `npm run typecheck -w qna-mobile` and `npm run lint -w qna-mobile`.

Expected: PASS.

- [ ] **Step 7.10: Commit**

```bash
git add qna-mobile/services/util/time.ts qna-mobile/services/util/time.test.ts qna-mobile/services/questions/format.ts qna-mobile/services/questions/format.test.ts qna-mobile/app/communities/[slug].tsx
# Also add any other file Step 7.7 surfaced.
git commit -m "refactor(mobile): move formatRelativeTime to services/util/time"
```

---

## Task 8: Mobile — broadcasts REST client (TDD)

**Files:**
- Create: `qna-mobile/services/broadcasts/api.ts`
- Create: `qna-mobile/services/broadcasts/api.test.ts`

- [ ] **Step 8.1: Write the failing test file**

Write `qna-mobile/services/broadcasts/api.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BroadcastsApiError,
  createBroadcastsClient,
  type Broadcast,
} from './api';

const broadcast: Broadcast = {
  id: 'broadcast_1',
  communityId: 'community_1',
  author: { id: 'user_1', username: 'lia' },
  body: 'Hello, community.',
  imageUrl: null,
  publishedAt: '2026-05-22T09:00:00.000Z',
  createdAt: '2026-05-22T09:00:00.000Z',
  updatedAt: '2026-05-22T09:00:00.000Z',
  canEdit: false,
  canDelete: false,
};

describe('createBroadcastsClient', () => {
  it('lists community broadcasts with limit and bearer auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api///',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json({
          items: [broadcast],
          pagination: { limit: 20, nextCursor: null },
        });
      },
    });

    const result = await client.list('ai-builders', { limit: 20, token: 'jwt' });

    assert.deepEqual(result.items, [broadcast]);
    assert.equal(
      calls[0].url,
      'http://localhost:3000/api/communities/ai-builders/broadcasts?limit=20',
    );
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt');
  });

  it('passes cursor through when provided', async () => {
    let seenUrl = '';
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url) => {
        seenUrl = String(url);
        return Response.json({
          items: [],
          pagination: { limit: 20, nextCursor: null },
        });
      },
    });

    await client.list('ai-builders', { limit: 20, cursor: 'abc=', token: 'jwt' });

    assert.ok(seenUrl.includes('cursor=abc%3D'));
  });

  it('maps 401 to BroadcastsApiError with code "unauthenticated"', async () => {
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Authentication required.' }, { status: 401 }),
    });

    await assert.rejects(
      () => client.list('ai-builders'),
      (err) =>
        err instanceof BroadcastsApiError &&
        err.status === 401 &&
        err.code === 'unauthenticated',
    );
  });

  it('maps 403 to BroadcastsApiError with code "forbidden"', async () => {
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json(
          { error: 'Join this community to see broadcasts.' },
          { status: 403 },
        ),
    });

    await assert.rejects(
      () => client.list('ai-builders', { token: 'jwt' }),
      (err) =>
        err instanceof BroadcastsApiError &&
        err.status === 403 &&
        err.code === 'forbidden',
    );
  });

  it('maps 404 to BroadcastsApiError with code "not_found"', async () => {
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Community not found.' }, { status: 404 }),
    });

    await assert.rejects(
      () => client.list('nope', { token: 'jwt' }),
      (err) =>
        err instanceof BroadcastsApiError &&
        err.status === 404 &&
        err.code === 'not_found',
    );
  });
});
```

- [ ] **Step 8.2: Run the new tests — confirm they fail**

Run: `npm run test -w qna-mobile -- --test-name-pattern "createBroadcastsClient"`

Expected: FAIL — `./api` does not exist.

- [ ] **Step 8.3: Implement the client**

Write `qna-mobile/services/broadcasts/api.ts`:

```ts
export type Broadcast = {
  id: string;
  communityId: string;
  author: { id: string; username: string };
  body: string;
  imageUrl: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
};

export type BroadcastListPagination = {
  limit: number;
  nextCursor: string | null;
};

export type BroadcastListResult = {
  items: Broadcast[];
  pagination: BroadcastListPagination;
};

type BroadcastsClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type ListOptions = {
  limit?: number;
  cursor?: string | null;
  token?: string | null;
};

type ErrorBody = {
  error?: unknown;
};

export type BroadcastsApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'unknown';

export class BroadcastsApiError extends Error {
  status: number;
  code: BroadcastsApiErrorCode;

  constructor(message: string, status: number, code: BroadcastsApiErrorCode) {
    super(message);
    this.name = 'BroadcastsApiError';
    this.status = status;
    this.code = code;
  }
}

export function createBroadcastsClient(options: BroadcastsClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    list(slug: string, { limit = 20, cursor = null, token = null }: ListOptions = {}) {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return requestJson<BroadcastListResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/broadcasts?${params.toString()}`,
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
    throw new BroadcastsApiError(
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
    const message = typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.';
    throw new BroadcastsApiError(message, response.status, codeForStatus(response.status));
  }

  return body as T;
}

function codeForStatus(status: number): BroadcastsApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return 'unknown';
}
```

- [ ] **Step 8.4: Run the tests — confirm they pass**

Run: `npm run test -w qna-mobile -- --test-name-pattern "createBroadcastsClient"`

Expected: PASS — 5 cases.

- [ ] **Step 8.5: Run the full mobile suite + typecheck + lint**

Run: `npm run test -w qna-mobile && npm run typecheck -w qna-mobile && npm run lint -w qna-mobile`.

Expected: PASS for all.

- [ ] **Step 8.6: Commit**

```bash
git add qna-mobile/services/broadcasts/api.ts qna-mobile/services/broadcasts/api.test.ts
git commit -m "feat(mobile): add typed broadcasts REST client"
```

---

## Task 9: Mobile — wire `BroadcastsTab` into community detail screen

**Files:**
- Modify: `qna-mobile/app/communities/[slug].tsx`

- [ ] **Step 9.1: Add new imports**

Near the top of `qna-mobile/app/communities/[slug].tsx`, add these imports alongside the existing ones (keep alphabetical grouping where the file already does):

```ts
import { Image } from 'expo-image';

import {
  BroadcastsApiError,
  createBroadcastsClient,
  type Broadcast,
} from '@/services/broadcasts/api';
```

- [ ] **Step 9.2: Replace the broadcasts stub in `TabPanel`**

Find the `TabPanel` function. Currently the broadcasts branch falls through to a generic "scaffold" panel via the `copy` object. Replace the broadcasts branch with a dedicated render. The updated `TabPanel` becomes:

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

  const scaffoldTab = activeTab as Exclude<DetailTab, 'about' | 'questions' | 'broadcasts'>;
  const copy = {
    leaderboard: 'Scores and streaks will show here once members start answering.',
  } satisfies Record<Exclude<DetailTab, 'about' | 'questions' | 'broadcasts'>, string>;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{TABS.find((tab) => tab.value === activeTab)?.label}</Text>
      <Text style={styles.panelBody}>{copy[scaffoldTab]}</Text>
    </View>
  );
}
```

- [ ] **Step 9.3: Add the `BroadcastsTab` component**

Below the existing `QuestionsTab` / `QuestionCard` / `getQuestionTimeHint` functions in `qna-mobile/app/communities/[slug].tsx`, append:

```tsx
function BroadcastsTab({ community }: { community: Community }) {
  const { token } = useAuth();
  const apiUrl = useRuntimeApiUrl();
  const broadcastsClient = useMemo(() => createBroadcastsClient({ apiUrl }), [apiUrl]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<BroadcastsApiError | null>(null);

  const loadBroadcasts = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await broadcastsClient.list(community.slug, { limit: 20, token });
        if (!isActive()) return;
        setBroadcasts(result.items);
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof BroadcastsApiError) {
          setError(err);
        } else {
          setError(new BroadcastsApiError('Unable to load posts.', 0, 'unknown'));
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [broadcastsClient, community.slug, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadBroadcasts(() => active);

      return () => {
        active = false;
      };
    }, [loadBroadcasts]),
  );

  if (loading) {
    return <StatePanel title="Loading posts..." />;
  }

  if (error) {
    if (error.code === 'unauthenticated') {
      return (
        <StatePanel
          title="Sign in to see posts"
          body="Broadcasts are creator updates shared with members of this community."
        >
          <BrandButton
            href={{ pathname: '/login', params: { returnTo: `/communities/${community.slug}` } }}
          >
            Sign in
          </BrandButton>
        </StatePanel>
      );
    }
    if (error.code === 'forbidden') {
      return (
        <StatePanel
          title="Join this community to see posts"
          body="Membership unlocks broadcasts from the creator."
        />
      );
    }
    return (
      <StatePanel title={error.message || 'Unable to load posts.'}>
        <BrandButton variant="secondary" onPress={() => void loadBroadcasts()}>
          Retry
        </BrandButton>
      </StatePanel>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <StatePanel
        title="No posts yet"
        body="Creators will share updates here."
      />
    );
  }

  return (
    <View style={styles.broadcastList}>
      {broadcasts.map((post) => (
        <BroadcastCard key={post.id} post={post} />
      ))}
    </View>
  );
}

function BroadcastCard({ post }: { post: Broadcast }) {
  return (
    <View style={styles.broadcastCard}>
      <View style={styles.broadcastHeader}>
        <Text style={styles.broadcastAuthor}>@{post.author.username}</Text>
        <Text style={styles.broadcastTime}>{formatRelativeTime(post.publishedAt)}</Text>
      </View>
      <Text style={styles.broadcastBody}>{post.body}</Text>
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.broadcastImage}
          contentFit="cover"
          transition={150}
        />
      ) : null}
    </View>
  );
}
```

Notes for the implementer:
- `StatePanel` is already imported at the top of this file. Confirm its API supports a `body` prop; if it does not, fall back to nesting a `<Text>` child instead. (Check `qna-mobile/components/Brand.tsx` for the actual signature.) Use whichever idiom the existing screens (e.g., `app/communities/[slug]/questions/[id].tsx`) use for explanatory copy under a panel title.
- `BrandButton` already accepts `href` as either string or object in this codebase (see `app/index.tsx` for an `href` object example).

- [ ] **Step 9.4: Extend the `styles` object**

In the same file, find the `styles = StyleSheet.create({...})` block and add the following entries (place them near the existing `questionList` / `questionCard` block to keep related styles together):

```ts
broadcastList: {
  gap: 12,
},
broadcastCard: {
  backgroundColor: palette.card,
  borderColor: palette.line,
  borderRadius: 12,
  borderWidth: 1,
  gap: 10,
  paddingHorizontal: 16,
  paddingVertical: 14,
},
broadcastHeader: {
  alignItems: 'baseline',
  flexDirection: 'row',
  gap: 10,
  justifyContent: 'space-between',
},
broadcastAuthor: {
  color: palette.primary,
  fontFamily: fonts.sans,
  fontSize: 14,
  fontWeight: '800',
},
broadcastTime: {
  color: palette.muted,
  fontFamily: fonts.sans,
  fontSize: 12,
  fontWeight: '600',
},
broadcastBody: {
  color: palette.ink,
  fontFamily: fonts.serif,
  fontSize: 15,
  lineHeight: 22,
},
broadcastImage: {
  aspectRatio: 16 / 9,
  borderRadius: 10,
  marginTop: 4,
  width: '100%',
},
```

If `palette.ink` or `fonts.serif` is not exported, follow the closest peer (`questionPrompt`) to pick the correct token. The implementer should resolve token names by reading `qna-mobile/constants/theme.ts` rather than guessing.

- [ ] **Step 9.5: Run the full mobile suite + typecheck + lint**

Run: `npm run test -w qna-mobile && npm run typecheck -w qna-mobile && npm run lint -w qna-mobile`.

Expected: PASS for all.

- [ ] **Step 9.6: Smoke-test the mobile web export**

Run: `npm run web:export -w qna-mobile` (or the equivalent Expo web export command this project uses; see `qna-mobile/package.json`).

Expected: build completes; all routes export successfully.

- [ ] **Step 9.7: Commit**

```bash
git add qna-mobile/app/communities/[slug].tsx
git commit -m "feat(mobile): render broadcasts feed in community Posts tab"
```

---

## Task 10: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 10.1: Run web tests + lint + build**

Run from repo root: `npm run test -w qna-web && npm run lint -w qna-web && npm run build -w qna-web`.

Expected: all pass.

- [ ] **Step 10.2: Run mobile tests + lint + typecheck + export**

Run: `npm run test -w qna-mobile && npm run lint -w qna-mobile && npm run typecheck -w qna-mobile && npm run web:export -w qna-mobile`.

Expected: all pass.

- [ ] **Step 10.3: Manual sanity matrix (record results inline as a comment in the PR or pasted into chat)**

Start the Next dev server (`npm run dev -w qna-web`) and the Expo mobile app (`npm run start -w qna-mobile`). Then walk through:

| Scenario                                           | Web behavior                       | Mobile behavior                                |
|----------------------------------------------------|------------------------------------|------------------------------------------------|
| Logged-out → `/communities/<slug>/broadcasts`      | Member-only gate, Sign in / Create | "Sign in to see posts" panel + Sign in button  |
| Logged-in, not joined → broadcasts page / tab      | Gate with Join CTA                 | "Join this community to see posts" panel       |
| Logged-in member → broadcasts page / Posts tab     | Feed renders normally              | Feed renders (text + image where set)          |
| Creator → broadcasts page / Posts tab              | Feed + composer renders            | Feed renders (mobile has no composer by design)|
| Logged-in non-member → direct hit on `/api/.../broadcasts` | n/a                        | curl returns `403`                              |
| Anonymous → direct hit on `/api/.../broadcasts`    | n/a                                | curl returns `401`                              |

- [ ] **Step 10.4: Do not commit**

Per the project's standing instruction (user commits and pushes themselves), do not run `git push` or open a PR.

---

## Self-review notes

Quick spec coverage scan:

- Members-only gate on web service layer → Tasks 1–3.
- Two new error classes → Task 2.
- REST routes session-aware + CORS → Tasks 4–5.
- Web page gate render → Task 6.
- Shared `formatRelativeTime` utility → Task 7.
- Mobile REST client + tests → Task 8.
- Mobile Posts tab wired up → Task 9.
- Verification (web tests, mobile tests, lint, typecheck, export) → Task 10.

Placeholder scan: no "TBD" / "TODO" / "add appropriate error handling" — every code block is concrete.

Type consistency: `Broadcast` (mobile) ↔ `BroadcastPostResource` (web) field shape matches; `BroadcastListPagination` mirrors `BroadcastPage.pagination`; `BroadcastsApiErrorCode` is the single source of truth for the mobile error discriminator; `canReadBroadcasts` is referenced under the same name in policy and in the gate helper.
