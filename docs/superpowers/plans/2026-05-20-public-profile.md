# Public Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public `/users/[username]` profile read path, REST mirror, and username link rewires.

**Architecture:** Add a `qna-web/src/services/profiles/` service with a pure summary helper and a thin Drizzle read service. The web route and REST route consume the same service; existing username surfaces only change from text to links.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Drizzle ORM, PostgreSQL, Node test runner.

---

## File Structure

| Path | Action | Purpose |
| --- | --- | --- |
| `docs/superpowers/specs/2026-05-20-public-profile-design.md` | Create | Locked public profile design and sign-off decisions. |
| `docs/superpowers/plans/2026-05-20-public-profile.md` | Create | Task-by-task implementation plan. |
| `PROJECT.md` | Modify | Record approved profile route, visibility, fields, and REST endpoint. |
| `qna-web/src/services/profiles/summary.ts` | Create | Pure profile read-model builder and sort helper. |
| `qna-web/src/services/profiles/summary.test.ts` | Create | Coverage for totals, memberships without points, and sort order. |
| `qna-web/src/services/profiles/profiles.ts` | Create | Public Drizzle read service for username profiles. |
| `qna-web/src/services/profiles/index.ts` | Create | Barrel export for route and page consumers. |
| `qna-web/src/app/api/users/[username]/route.ts` | Create | Public mobile-ready REST endpoint. |
| `qna-web/src/app/users/[username]/page.tsx` | Create | Server-rendered public profile page. |
| `qna-web/src/app/communities/[slug]/leaderboard/page.tsx` | Modify | Link leaderboard usernames to profiles. |
| `qna-web/src/app/communities/[slug]/questions/[id]/_components/CommentForm.tsx` | Modify | Link active comment author usernames in the `CommentList` / `CommentItem` code that currently lives in this file. |
| `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx` | Modify | Link broadcast author usernames to profiles. |
| `qna-web/src/app/_components/landing/UserMenu.tsx` | Modify | Link desktop username chip to signed-in profile. |
| `qna-web/src/app/_components/landing/MobileMenu.tsx` | Modify | Link mobile drawer username chip to signed-in profile. |

---

### Task 1: Design Docs Sign-Off

**Files:**
- Create: `docs/superpowers/specs/2026-05-20-public-profile-design.md`
- Create: `docs/superpowers/plans/2026-05-20-public-profile.md`

- [ ] **Step 1: Confirm proposed decisions**

Review the spec and confirm these v1 choices before implementation:

```md
- Profile content: username, joined date, total points from answers.points_awarded, and active community memberships with role badge.
- Missing usernames: Next notFound() and REST 404.
- Archived communities: hidden from profile memberships; total points remain the all-time answers.points_awarded sum because the locked table set does not include questions for active-community attribution.
- Future member-only communities: filter memberships through viewer visibility policy and revisit aggregate totals if they need viewer-specific privacy.
- REST endpoint: ship GET /api/users/[username] in this slice.
```

- [ ] **Step 2: Commit docs after approval**

Run:

```bash
git add docs/superpowers/specs/2026-05-20-public-profile-design.md docs/superpowers/plans/2026-05-20-public-profile.md
git commit -m "docs: add public profile spec and plan"
```

Expected: commit succeeds with only the two public-profile docs.

---

### Task 2: Profile Summary Helper

**Files:**
- Create: `qna-web/src/services/profiles/summary.test.ts`
- Create: `qna-web/src/services/profiles/summary.ts`
- Create: `qna-web/src/services/profiles/index.ts`

- [ ] **Step 1: Write failing tests**

Create `summary.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicUserProfile } from './summary';

const USER = {
  id: 'user_1',
  username: 'daily_builder',
  joinedAt: new Date('2026-05-01T09:00:00.000Z'),
};

describe('buildPublicUserProfile', () => {
  it('keeps active memberships visible when the user has no points', () => {
    const profile = buildPublicUserProfile({
      user: USER,
      memberships: [
        membership('community_1', 'daily-ai-builders', 'Daily AI Builders', 'member', '2026-05-03T09:00:00.000Z'),
        membership('community_2', 'web-makers', 'Web Makers', 'creator', '2026-05-04T09:00:00.000Z'),
      ],
      totalPoints: 30,
    });

    assert.equal(profile.stats.totalPoints, 30);
    assert.equal(profile.stats.communityCount, 2);
    assert.deepEqual(
      profile.communities.map((community) => community.slug),
      ['web-makers', 'daily-ai-builders'],
    );
  });

  it('sorts by creator role, joined date desc, then name', () => {
    const profile = buildPublicUserProfile({
      user: USER,
      memberships: [
        membership('community_1', 'alpha', 'Alpha', 'member', '2026-05-01T09:00:00.000Z'),
        membership('community_2', 'creator-zero', 'Creator Zero', 'creator', '2026-05-02T09:00:00.000Z'),
        membership('community_3', 'member-zero', 'Member Zero', 'member', '2026-05-03T09:00:00.000Z'),
        membership('community_4', 'member-new', 'Member New', 'member', '2026-05-04T09:00:00.000Z'),
      ],
      totalPoints: 50,
    });

    assert.deepEqual(
      profile.communities.map((community) => community.slug),
      ['creator-zero', 'member-new', 'member-zero', 'alpha'],
    );
  });
});

function membership(
  id: string,
  slug: string,
  name: string,
  role: 'member' | 'creator',
  joinedAt: string,
) {
  return {
    id,
    slug,
    name,
    role,
    joinedAt: new Date(joinedAt),
  };
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -w qna-web -- src/services/profiles/summary.test.ts
```

Expected: FAIL because `./summary` does not exist.

- [ ] **Step 3: Implement helper**

Create `summary.ts`:

```ts
export type PublicProfileRole = 'member' | 'creator';

export type PublicProfileUser = {
  id: string;
  username: string;
  joinedAt: Date;
};

export type PublicProfileMembershipInput = {
  id: string;
  slug: string;
  name: string;
  role: PublicProfileRole;
  joinedAt: Date;
};

export type PublicUserProfile = {
  user: PublicProfileUser;
  stats: {
    totalPoints: number;
    communityCount: number;
  };
  communities: Array<{
    id: string;
    slug: string;
    name: string;
    role: PublicProfileRole;
    joinedAt: Date;
  }>;
};

export function buildPublicUserProfile({
  user,
  memberships,
  totalPoints,
}: {
  user: PublicProfileUser;
  memberships: PublicProfileMembershipInput[];
  totalPoints: number;
}): PublicUserProfile {
  const communities = [...memberships].sort(compareProfileCommunities);

  return {
    user,
    stats: {
      totalPoints,
      communityCount: communities.length,
    },
    communities,
  };
}

function compareProfileCommunities(
  a: PublicUserProfile['communities'][number],
  b: PublicUserProfile['communities'][number],
): number {
  if (a.role !== b.role) return a.role === 'creator' ? -1 : 1;
  const joinedDelta = b.joinedAt.getTime() - a.joinedAt.getTime();
  if (joinedDelta !== 0) return joinedDelta;
  return a.name.localeCompare(b.name);
}
```

Create `index.ts`:

```ts
export * from './summary';
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm run test -w qna-web -- src/services/profiles/summary.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/services/profiles
git commit -m "feat(profiles): add public profile summary"
```

---

### Task 3: Public Profile Service

**Files:**
- Create: `qna-web/src/services/profiles/profiles.ts`
- Modify: `qna-web/src/services/profiles/index.ts`

- [ ] **Step 1: Add Drizzle read service**

Create `profiles.ts`:

```ts
import 'server-only';
import { and, eq, sum } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { communities, communityMembers } from '@/db/schema/communities';
import { users } from '@/db/schema/users';
import {
  buildPublicUserProfile,
  type PublicUserProfile,
} from './summary';

export async function getPublicUserProfileByUsername(
  username: string,
): Promise<PublicUserProfile | null> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return null;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      joinedAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .limit(1);

  if (!user) return null;

  const [memberships, pointsRow] = await Promise.all([
    db
      .select({
        id: communities.id,
        slug: communities.slug,
        name: communities.name,
        role: communityMembers.role,
        joinedAt: communityMembers.joinedAt,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(
        and(
          eq(communityMembers.userId, user.id),
          eq(communities.status, 'active'),
        ),
      ),
    db
      .select({
        points: sum(answers.pointsAwarded).mapWith(Number).as('points'),
      })
      .from(answers)
      .where(eq(answers.userId, user.id))
      .limit(1),
  ]);

  return buildPublicUserProfile({
    user,
    memberships,
    totalPoints: pointsRow[0]?.points ?? 0,
  });
}
```

- [ ] **Step 2: Export service**

Update `index.ts`:

```ts
export * from './profiles';
export * from './summary';
```

- [ ] **Step 3: Run tests and lint**

Run:

```bash
npm run test -w qna-web -- src/services/profiles/summary.test.ts
npm run lint -w qna-web
```

Expected: tests pass and lint has no errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add qna-web/src/services/profiles/profiles.ts qna-web/src/services/profiles/index.ts
git commit -m "feat(profiles): add public profile service"
```

---

### Task 4: REST Endpoint

**Files:**
- Create: `qna-web/src/app/api/users/[username]/route.ts`

- [ ] **Step 1: Add public route**

Create `route.ts`:

```ts
import { NextResponse } from 'next/server';
import {
  getPublicUserProfileByUsername,
  type PublicUserProfile,
} from '@/services/profiles';

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { username } = await params;
  const profile = await getPublicUserProfileByUsername(username);

  if (!profile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json(toPublicProfileResource(profile));
}

function toPublicProfileResource(profile: PublicUserProfile) {
  return {
    user: {
      ...profile.user,
      joinedAt: profile.user.joinedAt.toISOString(),
    },
    stats: profile.stats,
    communities: profile.communities.map((community) => ({
      ...community,
      joinedAt: community.joinedAt.toISOString(),
    })),
  };
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 3: Commit**

Run:

```bash
git add qna-web/src/app/api/users/[username]/route.ts
git commit -m "feat(profiles): expose public profile API"
```

---

### Task 5: Web Profile Page

**Files:**
- Create: `qna-web/src/app/users/[username]/page.tsx`

- [ ] **Step 1: Add server-rendered page**

Create `page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import {
  getPublicUserProfileByUsername,
  type PublicUserProfile,
} from '@/services/profiles';

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicUserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getPublicUserProfileByUsername(username);
  if (!profile) notFound();

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[960px]">
          <ProfileHeader profile={profile} />
          <CommunityMemberships profile={profile} />
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ProfileHeader({ profile }: { profile: PublicUserProfile }) {
  return (
    <header className="rounded-lg border border-line bg-card p-6 md:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Public profile
      </p>
      <h1 className="mt-3 text-[38px] font-bold leading-tight md:text-[52px]">
        @{profile.user.username}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Joined {formatDate(profile.user.joinedAt)}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <StatTile label="Total points" value={profile.stats.totalPoints} />
        <StatTile label="Communities" value={profile.stats.communityCount} />
      </div>
    </header>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function CommunityMemberships({ profile }: { profile: PublicUserProfile }) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Communities
          </p>
          <h2 className="mt-2 text-2xl font-bold">Active memberships</h2>
        </div>
      </div>

      {profile.communities.length > 0 ? (
        <div className="mt-5 divide-y divide-line rounded-lg border border-line bg-card">
          {profile.communities.map((community) => (
            <Link
              key={community.id}
              href={`/communities/${community.slug}`}
              className="grid gap-3 p-5 hover:bg-primary-soft sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="text-base font-bold text-ink">
                  {community.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Joined {formatDate(community.joinedAt)}
                </p>
              </div>
              <span className="w-fit rounded-full border border-line px-3 py-1 text-xs font-bold capitalize text-primary">
                {community.role}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-line bg-card p-6">
          <h3 className="text-xl font-bold">No active community memberships</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Active communities this user joins will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 3: Commit**

Run:

```bash
git add qna-web/src/app/users/[username]/page.tsx
git commit -m "feat(profiles): add public profile page"
```

---

### Task 6: Username Link Rewires

**Files:**
- Modify: `qna-web/src/app/communities/[slug]/leaderboard/page.tsx`
- Modify: `qna-web/src/app/communities/[slug]/questions/[id]/_components/CommentForm.tsx`
- Modify: `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx`
- Modify: `qna-web/src/app/_components/landing/UserMenu.tsx`
- Modify: `qna-web/src/app/_components/landing/MobileMenu.tsx`

- [ ] **Step 1: Link leaderboard usernames**

In `LeaderboardRow`, replace the username paragraph with:

```tsx
<Link
  href={`/users/${entry.username}`}
  className="text-base font-bold text-ink hover:text-primary hover:underline"
>
  {entry.username}
</Link>
```

`Link` is already imported in the leaderboard page.

- [ ] **Step 2: Link comment author usernames**

`CommentThread.tsx` loads the thread data, but the visible author username is rendered by `CommentItem` inside `CommentForm.tsx`. Add a `Link` import there:

```tsx
import Link from 'next/link';
```

In `CommentItem`, replace the author `<p>` with:

```tsx
{isDeleted || !comment.author ? (
  <p className="text-sm font-bold text-ink">[deleted]</p>
) : (
  <Link
    href={`/users/${comment.author.username}`}
    className="text-sm font-bold text-ink hover:text-primary hover:underline"
  >
    {comment.author.username}
  </Link>
)}
```

- [ ] **Step 3: Link broadcast author usernames**

In `BroadcastCard`, replace the author `<p>` with:

```tsx
<Link
  href={`/users/${post.author.username}`}
  className="text-sm font-bold text-ink hover:text-primary hover:underline"
>
  {post.author.username}
</Link>
```

`Link` is already imported in `BroadcastFeed.tsx`.

- [ ] **Step 4: Link desktop username chip**

In `UserMenu.tsx`, replace the username `<span>` with:

```tsx
<Link
  href={`/users/${username}`}
  className="rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary hover:brightness-95"
>
  @{username}
</Link>
```

- [ ] **Step 5: Link mobile drawer username chip**

In `MobileMenu.tsx`, replace the signed-in username `<span>` with:

```tsx
<Link
  href={`/users/${username}`}
  className="rounded-full bg-primary-soft px-4 py-2.5 text-center text-sm font-semibold text-primary"
>
  @{username}
</Link>
```

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 7: Commit**

Run:

```bash
git add qna-web/src/app/communities/[slug]/leaderboard/page.tsx qna-web/src/app/communities/[slug]/questions/[id]/_components/CommentForm.tsx qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx qna-web/src/app/_components/landing/UserMenu.tsx qna-web/src/app/_components/landing/MobileMenu.tsx
git commit -m "feat(profiles): link usernames to profiles"
```

---

### Task 7: Product Docs And Final Verification

**Files:**
- Modify: `PROJECT.md`

- [ ] **Step 1: Update product docs**

Add this profile note near `PROJECT.md` Section 6:

```md
Profile v1:

- Public web route: `/users/[username]`.
- Public REST route for mobile: `GET /api/users/[username]`.
- Profiles are visible to anonymous visitors.
- v1 shows username, joined date, total points from `answers.points_awarded`, and active community memberships with role.
- Profile totals derive from `answers.points_awarded`; there is no denormalized profile score.
- Profile editing, display names, bios, avatars, activity feeds, and streaks are separate slices.
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

Run:

```bash
git diff --stat
```

Expected: only public-profile docs, profile service/tests, profile API route, profile web page, username link rewires, and `PROJECT.md` changed.

- [ ] **Step 4: Commit**

Run:

```bash
git add PROJECT.md
git commit -m "docs: capture public profile behavior"
```

---

## Self-Review

- Spec coverage: profile URL, public visibility, no schema, no editing, aggregate points, profile content, 404 handling, archived-community behavior, future private-community path, REST endpoint, and all required link rewires are covered by tasks.
- Placeholder scan: tasks contain exact file paths, commands, expected outcomes, and concrete code snippets.
- Type consistency: `PublicUserProfile`, `PublicProfileRole`, and `PublicProfileMembershipInput` names are consistent across helper, service, page, and route tasks.
- Risk note: the DB-sensitive behavior is active-community membership filtering and all-time answer point aggregation. Keep the summary helper tested and inspect the Drizzle query before wiring the page and API.
