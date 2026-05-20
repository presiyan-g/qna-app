# Broadcast Channel Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build public broadcast feeds and creator-managed broadcast posts for each community.

**Architecture:** Add a `broadcast_posts` table and a focused `qna-web/src/services/broadcasts/` service layer. Server actions and REST route handlers stay thin, while server-rendered web routes consume the same public read and creator mutation services.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, TypeScript, Drizzle ORM, PostgreSQL, Node test runner.

---

## File Structure

| Path | Action | Purpose |
| --- | --- | --- |
| `docs/superpowers/specs/2026-05-20-broadcasts-design.md` | Create | Broadcast slice design and product decisions for sign-off. |
| `docs/superpowers/plans/2026-05-20-broadcasts.md` | Create | Task-by-task implementation plan. |
| `PROJECT.md` | Modify | Record approved broadcast behavior. |
| `qna-web/src/db/schema/broadcasts.ts` | Create | Drizzle schema for `broadcast_posts`. |
| `qna-web/src/db/schema/index.ts` | Modify | Export broadcast schema. |
| `qna-web/drizzle/0007_*.sql` | Create | Drizzle-generated migration for `broadcast_posts`. |
| `qna-web/drizzle/meta/_journal.json` | Modify | Drizzle migration journal update. |
| `qna-web/drizzle/meta/0007_snapshot.json` | Create | Drizzle migration snapshot. |
| `qna-web/src/services/broadcasts/validation.ts` | Create | Body and image URL validation. |
| `qna-web/src/services/broadcasts/validation.test.ts` | Create | Validation coverage. |
| `qna-web/src/services/broadcasts/policy.ts` | Create | Permission helpers. |
| `qna-web/src/services/broadcasts/policy.test.ts` | Create | Permission coverage. |
| `qna-web/src/services/broadcasts/cursor.ts` | Create | Cursor and page-size helpers. |
| `qna-web/src/services/broadcasts/cursor.test.ts` | Create | Cursor coverage. |
| `qna-web/src/services/broadcasts/text.ts` | Create | Plain text URL tokenization for renderers. |
| `qna-web/src/services/broadcasts/text.test.ts` | Create | Linkification helper coverage. |
| `qna-web/src/services/broadcasts/errors.ts` | Create | Domain errors. |
| `qna-web/src/services/broadcasts/broadcasts.ts` | Create | Drizzle service functions. |
| `qna-web/src/services/broadcasts/index.ts` | Create | Barrel exports. |
| `qna-web/src/app/actions/broadcasts.ts` | Create | Server actions for web composer/edit/delete. |
| `qna-web/src/app/api/communities/[slug]/broadcasts/route.ts` | Create | Public list and creator-gated create REST route. |
| `qna-web/src/app/api/communities/[slug]/broadcasts/[postId]/route.ts` | Create | Public detail, creator-gated patch/delete REST route. |
| `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastComposer.tsx` | Create | Creator composer and edit form. |
| `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx` | Create | Feed rendering and creator controls. |
| `qna-web/src/app/communities/[slug]/broadcasts/page.tsx` | Create | Public feed route. |
| `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx` | Create | Public detail route. |
| `qna-web/src/app/communities/[slug]/page.tsx` | Modify | Latest broadcast preview and feed link. |

---

### Task 1: Design Docs Commit

**Files:**
- Create: `docs/superpowers/specs/2026-05-20-broadcasts-design.md`
- Create: `docs/superpowers/plans/2026-05-20-broadcasts.md`

- [ ] **Step 1: Review sign-off proposals**

Confirm the spec resolves these product decisions:

```md
- Primary feed route: /communities/[slug]/broadcasts
- Community home: latest broadcast preview plus full-feed link
- Pagination: cursor-based, default 20, max 50
- Body format: plain text, preserved newlines, auto-linkified URLs, max 4000 chars
- Image URLs: optional external http/https URL, no v1 domain allowlist
- Detail page: /communities/[slug]/broadcasts/[postId]
```

- [ ] **Step 2: Commit docs**

Run:

```bash
git add docs/superpowers/specs/2026-05-20-broadcasts-design.md docs/superpowers/plans/2026-05-20-broadcasts.md
git commit -m "docs: add broadcasts spec and plan"
```

Expected: commit succeeds with only the two broadcast docs.

---

### Task 2: Broadcast Schema And Migration

**Files:**
- Create: `qna-web/src/db/schema/broadcasts.ts`
- Modify: `qna-web/src/db/schema/index.ts`
- Create: `qna-web/drizzle/0007_*.sql`
- Create: `qna-web/drizzle/meta/0007_snapshot.json`
- Modify: `qna-web/drizzle/meta/_journal.json`

- [ ] **Step 1: Add Drizzle schema**

Create `broadcasts.ts`:

```ts
import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const broadcastPosts = pgTable(
  'broadcast_posts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    imageUrl: text('image_url'),
    publishedAt: timestamp('published_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('broadcast_posts_community_published_idx').on(
      table.communityId,
      table.publishedAt.desc(),
      table.id.desc(),
    ),
    index('broadcast_posts_author_user_id_idx').on(table.authorUserId),
    index('broadcast_posts_deleted_at_idx').on(table.deletedAt),
  ],
);

export type BroadcastPost = typeof broadcastPosts.$inferSelect;
export type NewBroadcastPost = typeof broadcastPosts.$inferInsert;
```

- [ ] **Step 2: Export schema**

Append to `qna-web/src/db/schema/index.ts`:

```ts
export * from './broadcasts';
```

- [ ] **Step 3: Generate migration**

Run:

```bash
npm run db:generate -w qna-web
```

Expected: Drizzle creates the next migration, snapshot, and journal entry for `broadcast_posts`.

- [ ] **Step 4: Inspect migration**

Run:

```bash
git diff -- qna-web/src/db/schema qna-web/drizzle
```

Expected: migration creates only `broadcast_posts`, its foreign keys, and its three indexes.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/db/schema/broadcasts.ts qna-web/src/db/schema/index.ts qna-web/drizzle
git commit -m "feat(broadcasts): add broadcast posts schema"
```

---

### Task 3: Validation, Policy, Cursor, And Text Helpers

**Files:**
- Create: `qna-web/src/services/broadcasts/validation.test.ts`
- Create: `qna-web/src/services/broadcasts/validation.ts`
- Create: `qna-web/src/services/broadcasts/policy.test.ts`
- Create: `qna-web/src/services/broadcasts/policy.ts`
- Create: `qna-web/src/services/broadcasts/cursor.test.ts`
- Create: `qna-web/src/services/broadcasts/cursor.ts`
- Create: `qna-web/src/services/broadcasts/text.test.ts`
- Create: `qna-web/src/services/broadcasts/text.ts`
- Create: `qna-web/src/services/broadcasts/errors.ts`
- Create: `qna-web/src/services/broadcasts/index.ts`

- [ ] **Step 1: Write failing validation tests**

Create `validation.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BroadcastValidationError,
  validateBroadcastInput,
} from './validation';

test('trims valid broadcast body and normalizes blank image URL', () => {
  assert.deepEqual(
    validateBroadcastInput({ body: '  Hello builders\n\nShip today.  ', imageUrl: '   ' }),
    { body: 'Hello builders\n\nShip today.', imageUrl: null },
  );
});

test('rejects missing and overlong bodies', () => {
  assert.throws(
    () => validateBroadcastInput({ body: ' ' }),
    (err) =>
      err instanceof BroadcastValidationError &&
      err.fieldErrors.body === 'Write a broadcast before posting.',
  );

  assert.throws(
    () => validateBroadcastInput({ body: 'a'.repeat(4001) }),
    (err) =>
      err instanceof BroadcastValidationError &&
      err.fieldErrors.body === 'Use 4000 characters or fewer.',
  );
});

test('accepts only http and https image URLs', () => {
  assert.equal(
    validateBroadcastInput({
      body: 'Post',
      imageUrl: 'https://example.com/image.png',
    }).imageUrl,
    'https://example.com/image.png',
  );

  assert.throws(
    () => validateBroadcastInput({ body: 'Post', imageUrl: 'javascript:alert(1)' }),
    (err) =>
      err instanceof BroadcastValidationError &&
      err.fieldErrors.imageUrl === 'Use a valid http or https image URL.',
  );
});
```

- [ ] **Step 2: Write failing policy tests**

Create `policy.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCreateBroadcastPost,
  canEditBroadcastPost,
  canSoftDeleteBroadcastPost,
} from './policy';

test('only community creators can create broadcast posts', () => {
  assert.equal(canCreateBroadcastPost('creator'), true);
  assert.equal(canCreateBroadcastPost('member'), false);
  assert.equal(canCreateBroadcastPost(null), false);
});

test('only the author creator can edit a broadcast post', () => {
  assert.equal(
    canEditBroadcastPost({ authorUserId: 'user_1', userId: 'user_1', communityRole: 'creator' }),
    true,
  );
  assert.equal(
    canEditBroadcastPost({ authorUserId: 'user_1', userId: 'user_2', communityRole: 'creator' }),
    false,
  );
  assert.equal(
    canEditBroadcastPost({ authorUserId: 'user_1', userId: 'user_1', communityRole: 'member' }),
    false,
  );
});

test('authors and same-community creators can soft-delete broadcast posts', () => {
  assert.equal(
    canSoftDeleteBroadcastPost({ authorUserId: 'user_1', userId: 'user_1', communityRole: 'creator' }),
    true,
  );
  assert.equal(
    canSoftDeleteBroadcastPost({ authorUserId: 'user_1', userId: 'user_2', communityRole: 'creator' }),
    true,
  );
  assert.equal(
    canSoftDeleteBroadcastPost({ authorUserId: 'user_1', userId: 'user_2', communityRole: 'member' }),
    false,
  );
});
```

- [ ] **Step 3: Write failing cursor and text tests**

Create `cursor.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BroadcastCursorError,
  decodeBroadcastCursor,
  encodeBroadcastCursor,
  normalizeBroadcastLimit,
} from './cursor';

test('normalizes broadcast page limits', () => {
  assert.equal(normalizeBroadcastLimit(null), 20);
  assert.equal(normalizeBroadcastLimit('0'), 20);
  assert.equal(normalizeBroadcastLimit('40'), 40);
  assert.equal(normalizeBroadcastLimit('500'), 50);
});

test('round-trips opaque broadcast cursors', () => {
  const cursor = encodeBroadcastCursor({
    publishedAt: new Date('2026-05-20T09:00:00.000Z'),
    id: 'post_1',
  });

  assert.deepEqual(decodeBroadcastCursor(cursor), {
    publishedAt: new Date('2026-05-20T09:00:00.000Z'),
    id: 'post_1',
  });
});

test('rejects malformed cursors', () => {
  assert.throws(
    () => decodeBroadcastCursor('not-a-cursor'),
    BroadcastCursorError,
  );
});
```

Create `text.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { tokenizeBroadcastText } from './text';

test('splits plain text and http urls into renderable tokens', () => {
  assert.deepEqual(
    tokenizeBroadcastText('Read https://example.com now'),
    [
      { type: 'text', value: 'Read ' },
      { type: 'link', value: 'https://example.com' },
      { type: 'text', value: ' now' },
    ],
  );
});

test('keeps newlines in text tokens', () => {
  assert.deepEqual(tokenizeBroadcastText('Line one\nLine two'), [
    { type: 'text', value: 'Line one\nLine two' },
  ]);
});
```

- [ ] **Step 4: Run RED**

Run:

```bash
npm run test -w qna-web -- src/services/broadcasts/*.test.ts
```

Expected: FAIL because the broadcast service helper files do not exist.

- [ ] **Step 5: Implement helper modules**

Create `errors.ts`:

```ts
export class BroadcastPermissionError extends Error {
  constructor(message = 'Only community creators can manage broadcasts.') {
    super(message);
    this.name = 'BroadcastPermissionError';
  }
}

export class BroadcastNotFoundError extends Error {
  constructor() {
    super('Broadcast not found.');
    this.name = 'BroadcastNotFoundError';
  }
}

export class BroadcastValidationError extends Error {
  constructor(
    public readonly fieldErrors: Partial<Record<'body' | 'imageUrl', string>>,
  ) {
    super('Invalid broadcast input.');
    this.name = 'BroadcastValidationError';
  }
}
```

Create `validation.ts`:

```ts
import { BroadcastValidationError } from './errors';

export { BroadcastValidationError } from './errors';

const MAX_BROADCAST_BODY_LENGTH = 4000;
const MAX_IMAGE_URL_LENGTH = 2048;

export type BroadcastInput = {
  body: string;
  imageUrl: string | null;
};

export function validateBroadcastInput(raw: {
  body?: unknown;
  imageUrl?: unknown;
}): BroadcastInput {
  const fieldErrors: Partial<Record<'body' | 'imageUrl', string>> = {};
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  const imageUrl = normalizeOptionalImageUrl(raw.imageUrl, fieldErrors);

  if (!body) {
    fieldErrors.body = 'Write a broadcast before posting.';
  } else if (body.length > MAX_BROADCAST_BODY_LENGTH) {
    fieldErrors.body = 'Use 4000 characters or fewer.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new BroadcastValidationError(fieldErrors);
  }

  return { body, imageUrl };
}

function normalizeOptionalImageUrl(
  value: unknown,
  fieldErrors: Partial<Record<'body' | 'imageUrl', string>>,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
    fieldErrors.imageUrl = 'Use 2048 characters or fewer.';
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      fieldErrors.imageUrl = 'Use a valid http or https image URL.';
      return null;
    }
    return url.toString();
  } catch {
    fieldErrors.imageUrl = 'Use a valid http or https image URL.';
    return null;
  }
}
```

Create `policy.ts`:

```ts
import type { CommunityRole } from '@/services/communities';

export function canCreateBroadcastPost(
  communityRole: CommunityRole | null,
): boolean {
  return communityRole === 'creator';
}

export function canEditBroadcastPost({
  authorUserId,
  userId,
  communityRole,
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
}): boolean {
  return communityRole === 'creator' && authorUserId === userId;
}

export function canSoftDeleteBroadcastPost({
  communityRole,
}: {
  authorUserId: string;
  userId: string;
  communityRole: CommunityRole | null;
}): boolean {
  return communityRole === 'creator';
}
```

Create `cursor.ts`:

```ts
export class BroadcastCursorError extends Error {
  constructor() {
    super('Invalid broadcast cursor.');
    this.name = 'BroadcastCursorError';
  }
}

export type BroadcastCursor = {
  publishedAt: Date;
  id: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function normalizeBroadcastLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export function encodeBroadcastCursor(cursor: BroadcastCursor): string {
  return Buffer.from(
    JSON.stringify({
      publishedAt: cursor.publishedAt.toISOString(),
      id: cursor.id,
    }),
  ).toString('base64url');
}

export function decodeBroadcastCursor(value: string): BroadcastCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      publishedAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.publishedAt !== 'string' || typeof parsed.id !== 'string') {
      throw new BroadcastCursorError();
    }
    const publishedAt = new Date(parsed.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) throw new BroadcastCursorError();
    return { publishedAt, id: parsed.id };
  } catch (err) {
    if (err instanceof BroadcastCursorError) throw err;
    throw new BroadcastCursorError();
  }
}
```

Create `text.ts`:

```ts
export type BroadcastTextToken =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string };

const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function tokenizeBroadcastText(value: string): BroadcastTextToken[] {
  const tokens: BroadcastTextToken[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: 'text', value: value.slice(lastIndex, index) });
    }
    tokens.push({ type: 'link', value: url });
    lastIndex = index + url.length;
  }

  if (lastIndex < value.length) {
    tokens.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value }];
}
```

Create `index.ts`:

```ts
export * from './cursor';
export * from './errors';
export * from './policy';
export * from './text';
export * from './validation';
```

- [ ] **Step 6: Run GREEN**

Run:

```bash
npm run test -w qna-web -- src/services/broadcasts/*.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add qna-web/src/services/broadcasts
git commit -m "feat(broadcasts): add validation and policy helpers"
```

---

### Task 4: Shared Broadcast Service

**Files:**
- Create: `qna-web/src/services/broadcasts/broadcasts.ts`
- Modify: `qna-web/src/services/broadcasts/index.ts`

- [ ] **Step 1: Implement service types and queries**

Create `broadcasts.ts` with:

```ts
import 'server-only';
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { broadcastPosts } from '@/db/schema/broadcasts';
import { communityMembers } from '@/db/schema/communities';
import { users } from '@/db/schema/users';
import { getCommunityBySlug, type CommunityRole } from '@/services/communities';
import {
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
} from './errors';
import {
  canCreateBroadcastPost,
  canEditBroadcastPost,
  canSoftDeleteBroadcastPost,
} from './policy';
import {
  decodeBroadcastCursor,
  encodeBroadcastCursor,
  normalizeBroadcastLimit,
} from './cursor';
import { validateBroadcastInput } from './validation';

export type BroadcastPostResource = {
  id: string;
  communityId: string;
  author: { id: string; username: string };
  body: string;
  imageUrl: string | null;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  canEdit: boolean;
  canDelete: boolean;
};

export type BroadcastPage = {
  items: BroadcastPostResource[];
  pagination: { limit: number; nextCursor: string | null };
};
```

Then add the six service functions with these signatures:

```ts
export async function listCommunityBroadcasts({
  slug,
  limit,
  cursor,
  viewerUserId = null,
}: {
  slug: string;
  limit?: number;
  cursor?: string | null;
  viewerUserId?: string | null;
}): Promise<BroadcastPage>;

export async function getLatestCommunityBroadcast({
  slug,
  viewerUserId = null,
}: {
  slug: string;
  viewerUserId?: string | null;
}): Promise<BroadcastPostResource | null>;

export async function getCommunityBroadcast({
  slug,
  postId,
  viewerUserId = null,
}: {
  slug: string;
  postId: string;
  viewerUserId?: string | null;
}): Promise<BroadcastPostResource | null>;

export async function createBroadcastPost({
  slug,
  userId,
  body,
  imageUrl,
  now = new Date(),
}: {
  slug: string;
  userId: string;
  body: unknown;
  imageUrl?: unknown;
  now?: Date;
}): Promise<BroadcastPostResource>;

export async function updateBroadcastPost({
  slug,
  postId,
  userId,
  body,
  imageUrl,
  now = new Date(),
}: {
  slug: string;
  postId: string;
  userId: string;
  body: unknown;
  imageUrl?: unknown;
  now?: Date;
}): Promise<BroadcastPostResource>;

export async function softDeleteBroadcastPost({
  slug,
  postId,
  userId,
  now = new Date(),
}: {
  slug: string;
  postId: string;
  userId: string;
  now?: Date;
}): Promise<void>;
```

Implementation rules:

- Resolve communities through `getCommunityBySlug(slug, viewerUserId ?? null)`.
- Return `BroadcastNotFoundError` for missing active communities where a mutating route needs an error.
- Exclude `deleted_at` rows from list/detail/latest public reads.
- Use `limit + 1` to compute `nextCursor`.
- Apply cursor filter with `(published_at < cursor.publishedAt) OR (published_at = cursor.publishedAt AND id < cursor.id)`.
- Join `users` for author username.
- Compute `canEdit` and `canDelete` from the viewer's role when a viewer is present.
- Leave `published_at` unchanged on edits.
- Set `deleted_at` and `updated_at` on soft-delete.

- [ ] **Step 2: Export service**

Update `index.ts`:

```ts
export * from './broadcasts';
export * from './cursor';
export * from './errors';
export * from './policy';
export * from './text';
export * from './validation';
```

- [ ] **Step 3: Run helper tests and lint**

Run:

```bash
npm run test -w qna-web -- src/services/broadcasts/*.test.ts
npm run lint -w qna-web
```

Expected: tests pass and lint has no errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add qna-web/src/services/broadcasts/broadcasts.ts qna-web/src/services/broadcasts/index.ts
git commit -m "feat(broadcasts): add shared broadcast service"
```

---

### Task 5: REST Mirror

**Files:**
- Create: `qna-web/src/app/api/communities/[slug]/broadcasts/route.ts`
- Create: `qna-web/src/app/api/communities/[slug]/broadcasts/[postId]/route.ts`

- [ ] **Step 1: Add list and create route**

Create `route.ts` for `/api/communities/[slug]/broadcasts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/services/auth/api-session';
import {
  BroadcastCursorError,
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
  createBroadcastPost,
  listCommunityBroadcasts,
  normalizeBroadcastLimit,
  type BroadcastPostResource,
} from '@/services/broadcasts';

type RouteContext = {
  params: Promise<{ slug: string }>;
};
```

Add handlers with these signatures:

```ts
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const page = await listCommunityBroadcasts({
    slug,
    limit: normalizeBroadcastLimit(request.nextUrl.searchParams.get('limit')),
    cursor: request.nextUrl.searchParams.get('cursor'),
  });
  return NextResponse.json(toBroadcastPageResource(page));
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const [{ slug }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const body = await request.json();
  const post = await createBroadcastPost({
    slug,
    userId: session.sub,
    body: toBroadcastBody(body),
    imageUrl: toBroadcastImageUrl(body),
  });
  return NextResponse.json({ post: toBroadcastResource(post) }, { status: 201 });
}
```

Serialization must convert dates to ISO strings and return `{ items, pagination }`.

- [ ] **Step 2: Add detail, patch, and delete route**

Create `[postId]/route.ts` with:

```ts
type RouteContext = {
  params: Promise<{ slug: string; postId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug, postId } = await params;
  const post = await getCommunityBroadcast({ slug, postId });
  if (!post) return NextResponse.json({ error: 'Broadcast not found.' }, { status: 404 });
  return NextResponse.json({ post: toBroadcastResource(post) });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const [{ slug, postId }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const body = await request.json();
  const post = await updateBroadcastPost({
    slug,
    postId,
    userId: session.sub,
    body: toBroadcastBody(body),
    imageUrl: toBroadcastImageUrl(body),
  });
  return NextResponse.json({ post: toBroadcastResource(post) });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const [{ slug, postId }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  await softDeleteBroadcastPost({ slug, postId, userId: session.sub });
  return new NextResponse(null, { status: 204 });
}
```

Behavior:

- `GET` is public.
- `PATCH` and `DELETE` use `getApiSession`.
- `PATCH` returns `200` with `{ post }`.
- `DELETE` returns `204`.
- Map service errors to the status codes from the spec.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add qna-web/src/app/api/communities/[slug]/broadcasts
git commit -m "feat(broadcasts): expose REST endpoints"
```

---

### Task 6: Web Server Actions And Components

**Files:**
- Create: `qna-web/src/app/actions/broadcasts.ts`
- Create: `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastComposer.tsx`
- Create: `qna-web/src/app/communities/[slug]/broadcasts/_components/BroadcastFeed.tsx`

- [ ] **Step 1: Add server actions**

Create actions that call the service and revalidate broadcast routes:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import {
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
  createBroadcastPost,
  softDeleteBroadcastPost,
  updateBroadcastPost,
} from '@/services/broadcasts';

export type BroadcastFormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<'body' | 'imageUrl', string>>;
};
```

Add action signatures:

```ts
export async function createBroadcastAction(
  slug: string,
  _prev: BroadcastFormState,
  formData: FormData,
): Promise<BroadcastFormState>;

export async function updateBroadcastAction(
  slug: string,
  postId: string,
  _prev: BroadcastFormState,
  formData: FormData,
): Promise<BroadcastFormState>;

export async function deleteBroadcastAction(
  slug: string,
  postId: string,
): Promise<void>;
```

- [ ] **Step 2: Add composer component**

Create a client component with `useActionState`, body textarea, optional image URL input, success/error states, and reset-on-success behavior matching `QuestionComposer`.

- [ ] **Step 3: Add feed component**

Create a server-friendly feed component that renders:

- author username
- GMT date
- body with `tokenizeBroadcastText`
- optional image
- detail link
- edit/delete controls when `canEdit` or `canDelete` is true

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/app/actions/broadcasts.ts qna-web/src/app/communities/[slug]/broadcasts/_components
git commit -m "feat(broadcasts): add web composer components"
```

---

### Task 7: Feed Route, Detail Route, And Home Preview

**Files:**
- Create: `qna-web/src/app/communities/[slug]/broadcasts/page.tsx`
- Create: `qna-web/src/app/communities/[slug]/broadcasts/[postId]/page.tsx`
- Modify: `qna-web/src/app/communities/[slug]/page.tsx`

- [ ] **Step 1: Add public feed page**

Create a server component that:

```ts
const [{ slug }, query, session] = await Promise.all([
  params,
  searchParams,
  getSession(),
]);
const limit = normalizeBroadcastLimit(query.limit);
const page = await listCommunityBroadcasts({
  slug,
  limit,
  cursor: query.cursor ?? null,
  viewerUserId: session?.sub ?? null,
});
```

Render `Nav`, `Footer`, back link, heading, creator composer when the current user is a creator, `BroadcastFeed`, and `Older posts` link when `nextCursor` exists.

- [ ] **Step 2: Add public detail page**

Create a server component that loads one post with `getCommunityBroadcast({ slug, postId, viewerUserId })`, calls `notFound()` when absent, and renders the same post presentation with creator controls.

- [ ] **Step 3: Add community home preview**

Modify the existing community page to load `getLatestCommunityBroadcast({ slug })` and render a compact preview plus link to `/communities/${community.slug}/broadcasts`.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint -w qna-web
```

Expected: no lint errors.

- [ ] **Step 5: Commit**

Run:

```bash
git add qna-web/src/app/communities/[slug]/broadcasts qna-web/src/app/communities/[slug]/page.tsx
git commit -m "feat(broadcasts): add public web feed"
```

---

### Task 8: Product Docs And Final Verification

**Files:**
- Modify: `PROJECT.md`

- [ ] **Step 1: Update `PROJECT.md`**

Update §2.3 and Broadcast history with approved v1 behavior:

```md
Broadcasts v1 use a public community feed at `/communities/[slug]/broadcasts`.
Reads are public. Creating, editing, and deleting require a creator membership
in that community. Authors can edit their own posts; same-community creators can
soft-delete posts for moderation. Broadcast history is cursor-paginated and
soft-deleted posts are hidden from public reads but preserved in the database.
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

Expected: only broadcast schema, migration, service, REST routes, web routes/components/actions, community home preview, docs, and `PROJECT.md` changed.

- [ ] **Step 4: Commit**

Run:

```bash
git add PROJECT.md
git commit -m "docs: capture broadcast post behavior"
```

---

## Self-Review

- Spec coverage: table, creator permissions, author edit rule, same-community creator soft-delete, public reads, cursor pagination, home preview, feed route, detail route, REST mirror, and deferred media work are covered.
- Placeholder scan: product behavior is explicit before implementation tasks begin.
- Type consistency: `BroadcastPostResource`, `BroadcastPage`, `BroadcastFormState`, and broadcast cursor names stay consistent across tasks.
- Risk note: the service task is the densest task because it owns DB access and policy enforcement; keep helper tests green before wiring REST and web surfaces.
