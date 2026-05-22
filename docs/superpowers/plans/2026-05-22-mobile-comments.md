# Mobile Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the per-question discussion to mobile as an inline `CommentsSection` below the result panel — read, post, reply (one level deep), self-delete — matching the web gating and threading model.

**Architecture:** Web side gets CORS only (no logic changes — gating, threading, and validation already live in the existing service). Mobile gets a new typed REST client with three methods (list / post / delete) and a single in-screen component tree (`CommentsSection`, `CommentComposer`, `CommentRow`) wired into the existing question detail screen. Gating is evaluated client-side from `currentUserRole`, `result`, and `isClosed` already present on `QuestionDetail`; the section only hits the network when the gate passes.

**Tech Stack:** Next.js App Router + Drizzle ORM (web routes), `node:test` for both packages, React Native (Expo Router) with the existing Brand components (`BrandButton`, `Eyebrow`, `FormError`, `StatePanel`, `ConfirmDialog`).

**Spec:** `docs/superpowers/specs/2026-05-22-mobile-comments-design.md`

---

## File map

**Web (`qna-web/`):**

- `src/app/api/communities/[slug]/questions/[id]/comments/route.ts` — add `OPTIONS`, wrap GET/POST responses with `withCors`.
- `src/app/api/communities/[slug]/questions/[id]/comments/[commentId]/route.ts` — add `OPTIONS`, wrap DELETE responses with `withCors`.

**Mobile (`qna-mobile/`):**

- `services/comments/api.ts` — new typed client.
- `services/comments/api.test.ts` — new tests.
- `app/communities/[slug]/questions/[id].tsx` — add `CommentsSection`, `CommentComposer`, `CommentRow` inline (following the existing screen's "sub-components in same file" convention), plus the new style entries.

**Docs:** plan file at `docs/superpowers/plans/2026-05-22-mobile-comments.md` (this file).

---

## Task 1: Web — CORS on the comments list/post route

**File:** `qna-web/src/app/api/communities/[slug]/questions/[id]/comments/route.ts`

The current file does not import the CORS helpers and does not wrap responses. We'll match the pattern already used by `questions/route.ts` and the broadcasts routes.

### Step 1.1: Replace the file

Overwrite `qna-web/src/app/api/communities/[slug]/questions/[id]/comments/route.ts` with:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  CommentNotFoundError,
  CommentPermissionError,
  CommentValidationError,
  listQuestionComments,
  postComment,
  type QuestionComment,
} from '@/services/comments';

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, id }, session] = await Promise.all([
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
    const comments = await listQuestionComments({
      slug,
      questionId: id,
      userId: session.sub,
    });
    return withCors(
      NextResponse.json({ comments: comments.map(toCommentResource) }),
      origin,
    );
  } catch (err) {
    if (err instanceof CommentNotFoundError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 404 }),
        origin,
      );
    }
    if (err instanceof CommentPermissionError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 403 }),
        origin,
      );
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, id }, session] = await Promise.all([
    params,
    getApiSession(request),
  ]);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      origin,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(
      NextResponse.json(
        { error: 'Invalid JSON body.', fieldErrors: {} },
        { status: 422 },
      ),
      origin,
    );
  }

  try {
    const comment = await postComment({
      slug,
      questionId: id,
      userId: session.sub,
      body: toBody(body),
      parentCommentId: toParentCommentId(body),
    });
    return withCors(
      NextResponse.json({ comment: toCommentResource(comment) }, { status: 201 }),
      origin,
    );
  } catch (err) {
    if (err instanceof CommentNotFoundError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 404 }),
        origin,
      );
    }
    if (err instanceof CommentPermissionError) {
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
    if (err instanceof CommentValidationError) {
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
}

function toBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { body?: unknown }).body;
}

function toParentCommentId(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  return (body as { parentCommentId?: unknown }).parentCommentId;
}

function toCommentResource(comment: QuestionComment): unknown {
  return {
    ...comment,
    deletedAt: comment.deletedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: comment.replies.map(toCommentResource),
  };
}
```

Notes:
- Relative cors import path: `'../../../../../_utils/cors'` — **five** levels up. Count: `comments/route.ts` → `[id]/` → `questions/` → `[slug]/` → `communities/` → `api/`. Inside `api/` we then go into `_utils/cors`.
- This file matches the existing logic exactly; the only diffs are the OPTIONS handler and the `withCors(..., origin)` wraps.

### Step 1.2: Verify

From `D:\Projects\qna-app`:
- `npm run lint -w qna-web`
- `npm run build -w qna-web`

Both PASS.

### Step 1.3: Skip the commit step

Per the standing constraint (user commits and pushes themselves), do NOT commit.

---

## Task 2: Web — CORS on the comment detail route

**File:** `qna-web/src/app/api/communities/[slug]/questions/[id]/comments/[commentId]/route.ts`

### Step 2.1: Replace the file

Overwrite with:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../../../../../_utils/cors';
import { AccountSuspendedError } from '@/services/admin';
import { getApiSession } from '@/services/auth/api-session';
import {
  CommentNotFoundError,
  CommentPermissionError,
  softDeleteComment,
} from '@/services/comments';

type RouteContext = {
  params: Promise<{ slug: string; id: string; commentId: string }>;
};

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  const [{ slug, id, commentId }, session] = await Promise.all([
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
    await softDeleteComment({
      slug,
      questionId: id,
      commentId,
      userId: session.sub,
    });
    return withCors(new NextResponse(null, { status: 204 }), origin);
  } catch (err) {
    if (err instanceof CommentNotFoundError) {
      return withCors(
        NextResponse.json({ error: err.message }, { status: 404 }),
        origin,
      );
    }
    if (err instanceof CommentPermissionError) {
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
    throw err;
  }
}
```

Notes:
- Relative cors import path: `'../../../../../../_utils/cors'` — **six** levels up. Count: `[commentId]/route.ts` → `comments/` → `[id]/` → `questions/` → `[slug]/` → `communities/` → `api/`.

### Step 2.2: Verify

- `npm run lint -w qna-web`
- `npm run build -w qna-web`

Both PASS.

### Step 2.3: Skip the commit step

---

## Task 3: Mobile — comments REST client (TDD)

**Files:**
- Create: `qna-mobile/services/comments/api.ts`
- Create: `qna-mobile/services/comments/api.test.ts`

### Step 3.1: Write the failing test file

Write `qna-mobile/services/comments/api.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CommentsApiError,
  createCommentsClient,
  type Comment,
  type CommentListResult,
} from './api';

const comment: Comment = {
  id: 'comment_1',
  questionId: 'question_1',
  parentCommentId: null,
  author: { id: 'user_1', username: 'lia' },
  body: 'First!',
  deletedAt: null,
  createdAt: '2026-05-22T09:00:00.000Z',
  updatedAt: '2026-05-22T09:00:00.000Z',
  canDelete: true,
  replies: [],
};

const listResult: CommentListResult = { comments: [comment] };

describe('createCommentsClient', () => {
  it('lists comments with bearer auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json(listResult);
      },
    });

    const result = await client.list('ai-builders', 'question_1', 'jwt');

    assert.deepEqual(result.comments, [comment]);
    assert.equal(
      calls[0].url,
      'http://localhost:3000/api/communities/ai-builders/questions/question_1/comments',
    );
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt');
  });

  it('posts a top-level comment without parentCommentId', async () => {
    let sentBody: unknown = null;
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        sentBody = init?.body ? JSON.parse(String(init.body)) : null;
        return Response.json({ comment }, { status: 201 });
      },
    });

    const result = await client.post(
      'ai-builders',
      'question_1',
      { body: 'First!' },
      'jwt',
    );

    assert.deepEqual(sentBody, { body: 'First!' });
    assert.equal(result.comment.id, 'comment_1');
  });

  it('posts a reply with parentCommentId', async () => {
    let sentBody: unknown = null;
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        sentBody = init?.body ? JSON.parse(String(init.body)) : null;
        return Response.json({ comment }, { status: 201 });
      },
    });

    await client.post(
      'ai-builders',
      'question_1',
      { body: 'Reply!', parentCommentId: 'comment_1' },
      'jwt',
    );

    assert.deepEqual(sentBody, { body: 'Reply!', parentCommentId: 'comment_1' });
  });

  it('deletes a comment via DELETE returning void on 204', async () => {
    let seenUrl = '';
    let seenMethod = '';
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        seenUrl = String(url);
        seenMethod = String(init?.method);
        return new Response(null, { status: 204 });
      },
    });

    const result = await client.delete('ai-builders', 'question_1', 'comment_1', 'jwt');

    assert.equal(result, undefined);
    assert.equal(
      seenUrl,
      'http://localhost:3000/api/communities/ai-builders/questions/question_1/comments/comment_1',
    );
    assert.equal(seenMethod, 'DELETE');
  });

  it('maps 401 to CommentsApiError with code "unauthenticated"', async () => {
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Authentication required.' }, { status: 401 }),
    });

    await assert.rejects(
      () => client.list('ai-builders', 'question_1', 'jwt'),
      (err) =>
        err instanceof CommentsApiError &&
        err.status === 401 &&
        err.code === 'unauthenticated',
    );
  });

  it('maps 422 with fieldErrors on post', async () => {
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json(
          {
            error: 'Invalid comment.',
            fieldErrors: { body: 'Body is required.' },
          },
          { status: 422 },
        ),
    });

    await assert.rejects(
      () => client.post('ai-builders', 'question_1', { body: '' }, 'jwt'),
      (err) =>
        err instanceof CommentsApiError &&
        err.status === 422 &&
        err.fieldErrors.body === 'Body is required.',
    );
  });
});
```

### Step 3.2: Run tests — confirm failure

From `D:\Projects\qna-app`, run: `npm run test -w qna-mobile -- --test-name-pattern "createCommentsClient"`

Expected: FAIL — `./api` does not exist.

### Step 3.3: Implement the client

Write `qna-mobile/services/comments/api.ts`:

```ts
export type CommentAuthor = {
  id: string;
  username: string;
};

export type Comment = {
  id: string;
  questionId: string;
  parentCommentId: string | null;
  author: CommentAuthor | null;
  body: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
  replies: Comment[];
};

export type CommentListResult = {
  comments: Comment[];
};

export type CommentPostResult = {
  comment: Comment;
};

type CommentsClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type PostInput = {
  body: string;
  parentCommentId?: string;
};

type ErrorBody = {
  error?: unknown;
  fieldErrors?: unknown;
};

export type CommentsApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'unknown';

export class CommentsApiError extends Error {
  status: number;
  code: CommentsApiErrorCode;
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code: CommentsApiErrorCode,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'CommentsApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function createCommentsClient(options: CommentsClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    list(slug: string, questionId: string, token: string): Promise<CommentListResult> {
      return requestJson<CommentListResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(questionId)}/comments`,
        { method: 'GET', headers: authHeaders(token) },
      );
    },
    post(
      slug: string,
      questionId: string,
      input: PostInput,
      token: string,
    ): Promise<CommentPostResult> {
      const body: Record<string, unknown> = { body: input.body };
      if (input.parentCommentId) {
        body.parentCommentId = input.parentCommentId;
      }
      return requestJson<CommentPostResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(questionId)}/comments`,
        {
          method: 'POST',
          headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
    },
    async delete(
      slug: string,
      questionId: string,
      commentId: string,
      token: string,
    ): Promise<void> {
      const url = `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(questionId)}/comments/${encodeURIComponent(commentId)}`;
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'DELETE',
          headers: authHeaders(token),
        });
      } catch {
        throw new CommentsApiError(
          'Unable to reach Quorum API. Check your connection and API URL.',
          0,
          'network',
        );
      }
      if (response.status === 204) return;

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok) {
        throwApiError(body, response.status);
      }
    },
  };
}

function getConfiguredApiUrl(apiUrl?: string) {
  const configured = apiUrl ?? 'http://localhost:3000/api';
  return configured.replace(/\/+$/, '');
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
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
    throw new CommentsApiError(
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
    throwApiError(body, response.status);
  }

  return body as T;
}

function throwApiError(body: unknown, status: number): never {
  const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
  const message =
    typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.';
  const fieldErrors = normalizeFieldErrors(errorBody.fieldErrors);
  throw new CommentsApiError(message, status, codeForStatus(status), fieldErrors);
}

function codeForStatus(status: number): CommentsApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return 'unknown';
}

function normalizeFieldErrors(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, value]) => [key, value]),
  );
}
```

### Step 3.4: Run tests — confirm pass

Run: `npm run test -w qna-mobile -- --test-name-pattern "createCommentsClient"`

Expected: PASS — 6 cases.

### Step 3.5: Run full mobile suite + lint

Run: `npm run test -w qna-mobile && npm run lint -w qna-mobile`.

Expected: PASS.

### Step 3.6: Skip the commit step

---

## Task 4: Mobile — wire `CommentsSection` into the question detail screen

**File:** `qna-mobile/app/communities/[slug]/questions/[id].tsx`

### Step 4.1: Add new imports

At the top of the file, add:

```ts
import {
  CommentsApiError,
  createCommentsClient,
  type Comment,
} from '@/services/comments/api';
import { ConfirmDialog } from '@/components/Brand';
```

(Update the existing Brand import line if `ConfirmDialog` isn't already pulled in. Currently the file imports `BodyText, BrandButton, Eyebrow, FormError, Heading, Screen, StatePanel` — extend it to also import `ConfirmDialog`.)

Also add `TextInput` to the existing `react-native` import. Current line is `import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';` — update to:

```ts
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
```

### Step 4.2: Render `<CommentsSection />` inside the ScrollView

Find the existing `ScrollView` in `QuestionDetailScreen` (around line 218-279). After the final conditional block that renders the "Join community to answer" button, append:

```tsx
{slugValue && idValue ? (
  <CommentsSection
    slug={slugValue}
    questionId={idValue}
    question={question}
    currentUserId={user?.id ?? null}
    token={token}
  />
) : null}
```

Place this just before the closing `</ScrollView>` tag, so the section is the last element in the scroll content.

### Step 4.3: Add `CommentsSection` component

Append this component to the same file, AFTER the `ResultPanel` component (or near the bottom, before the `styles` block):

```tsx
function CommentsSection({
  slug,
  questionId,
  question,
  currentUserId,
  token,
}: {
  slug: string;
  questionId: string;
  question: QuestionDetail;
  currentUserId: string | null;
  token: string | null;
}) {
  const apiUrl = useRuntimeApiUrl();
  const commentsClient = useMemo(() => createCommentsClient({ apiUrl }), [apiUrl]);

  const canList =
    question.currentUserRole !== null && (question.result !== null || question.isClosed);
  const canPost = question.currentUserRole !== null && question.result !== null;
  const hasToken = Boolean(token);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openReplyCommentId, setOpenReplyCommentId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadComments = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!canList || !token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await commentsClient.list(slug, questionId, token);
        if (!isActive()) return;
        setComments(result.comments);
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof CommentsApiError) {
          setError(err.message);
        } else {
          setError('Unable to load comments.');
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [canList, commentsClient, questionId, slug, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadComments(() => active);

      return () => {
        active = false;
      };
    }, [loadComments]),
  );

  async function handlePostTopLevel(body: string) {
    if (!token) return;
    await commentsClient.post(slug, questionId, { body }, token);
    await loadComments();
  }

  async function handlePostReply(parentCommentId: string, body: string) {
    if (!token) return;
    await commentsClient.post(slug, questionId, { body, parentCommentId }, token);
    setOpenReplyCommentId(null);
    await loadComments();
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || !token || deleting) return;
    setDeleting(true);
    try {
      await commentsClient.delete(slug, questionId, pendingDelete.id, token);
      setPendingDelete(null);
      await loadComments();
    } catch {
      // Refetch anyway in case it's already deleted.
      setPendingDelete(null);
      await loadComments();
    } finally {
      setDeleting(false);
    }
  }

  // Gates
  if (!hasToken) {
    return (
      <View style={styles.commentsGate}>
        <Eyebrow>Discussion</Eyebrow>
        <Heading compact>Sign in to join the conversation</Heading>
        <BodyText>
          See what other members said and add your own thoughts.
        </BodyText>
        <BrandButton
          href={{
            pathname: '/login',
            params: { returnTo: `/communities/${slug}/questions/${questionId}` },
          }}
        >
          Sign in
        </BrandButton>
      </View>
    );
  }

  if (question.currentUserRole === null) {
    return (
      <View style={styles.commentsGate}>
        <Eyebrow>Discussion</Eyebrow>
        <Heading compact>Join this community to read the discussion</Heading>
        <BodyText>
          Membership unlocks comments on every question in this community.
        </BodyText>
        <BrandButton
          href={{ pathname: '/communities/[slug]', params: { slug } }}
          variant="secondary"
        >
          Go to community
        </BrandButton>
      </View>
    );
  }

  if (!canList) {
    return (
      <View style={styles.commentsGate}>
        <Eyebrow>Discussion</Eyebrow>
        <Heading compact>Answer first to join the discussion</Heading>
        <BodyText>
          Once you submit your answer, you can read and post comments here.
        </BodyText>
      </View>
    );
  }

  return (
    <View style={styles.commentsSection}>
      <View style={styles.commentsHeader}>
        <Text style={styles.commentsEyebrow}>
          DISCUSSION{comments.length > 0 ? ` · ${comments.length}` : ''}
        </Text>
      </View>

      {canPost ? (
        <CommentComposer
          placeholder="Share your thoughts..."
          onSubmit={handlePostTopLevel}
          submitLabel="Post"
        />
      ) : (
        <Text style={styles.commentsLockedNote}>
          Comments are closed for new posts on this question.
        </Text>
      )}

      {loading ? (
        <StatePanel title="Loading discussion..." />
      ) : error ? (
        <StatePanel title={error}>
          <BrandButton variant="secondary" onPress={() => void loadComments()}>
            Retry
          </BrandButton>
        </StatePanel>
      ) : comments.length === 0 ? (
        <Text style={styles.commentsEmpty}>
          No comments yet — start the discussion.
        </Text>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              depth={0}
              currentUserId={currentUserId}
              canReply={canPost}
              openReplyCommentId={openReplyCommentId}
              onOpenReply={(id) => setOpenReplyCommentId(id)}
              onCloseReply={() => setOpenReplyCommentId(null)}
              onSubmitReply={handlePostReply}
              onRequestDelete={(c) => setPendingDelete(c)}
            />
          ))}
        </View>
      )}

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        message="This will remove your comment for everyone."
        onCancel={() => (deleting ? undefined : setPendingDelete(null))}
        onConfirm={handleConfirmDelete}
        title="Delete this comment?"
        visible={pendingDelete !== null}
      />
    </View>
  );
}
```

### Step 4.4: Add `CommentComposer` component

Append:

```tsx
function CommentComposer({
  placeholder,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  placeholder: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const disabled = submitting || body.trim().length === 0;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setFieldError(null);
    try {
      await onSubmit(body.trim());
      setBody('');
    } catch (err) {
      if (err instanceof CommentsApiError) {
        setFieldError(err.fieldErrors.body ?? err.message);
      } else {
        setFieldError('Unable to post comment.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.composer}>
      <TextInput
        editable={!submitting}
        multiline
        onChangeText={setBody}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.composerInput}
        value={body}
      />
      <FormError>{fieldError}</FormError>
      <View style={styles.composerActions}>
        {onCancel ? (
          <BrandButton
            disabled={submitting}
            onPress={onCancel}
            style={styles.composerCancel}
            variant="secondary"
          >
            Cancel
          </BrandButton>
        ) : null}
        <BrandButton disabled={disabled} onPress={handleSubmit}>
          {submitting ? 'Posting...' : submitLabel}
        </BrandButton>
      </View>
    </View>
  );
}
```

### Step 4.5: Add `CommentRow` component

Append:

```tsx
function CommentRow({
  comment,
  depth,
  currentUserId,
  canReply,
  openReplyCommentId,
  onOpenReply,
  onCloseReply,
  onSubmitReply,
  onRequestDelete,
}: {
  comment: Comment;
  depth: 0 | 1;
  currentUserId: string | null;
  canReply: boolean;
  openReplyCommentId: string | null;
  onOpenReply: (commentId: string) => void;
  onCloseReply: () => void;
  onSubmitReply: (parentCommentId: string, body: string) => Promise<void>;
  onRequestDelete: (comment: Comment) => void;
}) {
  const isDeleted = comment.body === null;
  const isOwnComment =
    comment.author !== null && currentUserId !== null && comment.author.id === currentUserId;
  const showDelete = !isDeleted && comment.canDelete && isOwnComment;
  const showReply = !isDeleted && canReply && depth === 0;
  const replyOpen = openReplyCommentId === comment.id;

  return (
    <View style={[styles.commentRow, depth === 1 ? styles.commentRowReply : null]}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>
          {comment.author ? `@${comment.author.username}` : 'Anonymous'}
        </Text>
        <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
      </View>

      {isDeleted ? (
        <Text style={styles.commentDeleted}>Comment removed</Text>
      ) : (
        <Text style={styles.commentBody}>{comment.body}</Text>
      )}

      {(showReply || showDelete) && !isDeleted ? (
        <View style={styles.commentActions}>
          {showReply ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => (replyOpen ? onCloseReply() : onOpenReply(comment.id))}
            >
              <Text style={styles.commentActionText}>
                {replyOpen ? 'Cancel reply' : 'Reply'}
              </Text>
            </Pressable>
          ) : null}
          {showDelete ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => onRequestDelete(comment)}
            >
              <Text style={[styles.commentActionText, styles.commentActionDelete]}>
                Delete
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {replyOpen ? (
        <View style={styles.commentReplyComposer}>
          <CommentComposer
            placeholder={`Reply to @${comment.author?.username ?? 'comment'}...`}
            onSubmit={(body) => onSubmitReply(comment.id, body)}
            onCancel={onCloseReply}
            submitLabel="Post reply"
          />
        </View>
      ) : null}

      {depth === 0 && comment.replies.length > 0 ? (
        <View style={styles.commentRepliesList}>
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              depth={1}
              currentUserId={currentUserId}
              canReply={canReply}
              openReplyCommentId={openReplyCommentId}
              onOpenReply={onOpenReply}
              onCloseReply={onCloseReply}
              onSubmitReply={onSubmitReply}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
```

### Step 4.6: Add styles

Find the `styles = StyleSheet.create({...})` block at the bottom of the file. Add these entries (place near the existing `submitArea` block for grouping; existing styles should remain intact):

```ts
commentsGate: {
  alignItems: 'center',
  backgroundColor: palette.card,
  borderColor: palette.line,
  borderRadius: 12,
  borderWidth: 1,
  gap: 10,
  paddingHorizontal: 18,
  paddingVertical: 20,
},
commentsSection: {
  gap: 12,
  paddingTop: 8,
},
commentsHeader: {
  paddingTop: 4,
},
commentsEyebrow: {
  color: palette.muted,
  fontFamily: fonts.sans,
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 0.6,
  textTransform: 'uppercase',
},
commentsLockedNote: {
  color: palette.muted,
  fontFamily: fonts.sans,
  fontSize: 13,
  fontStyle: 'italic',
},
commentsEmpty: {
  color: palette.muted,
  fontFamily: fonts.sans,
  fontSize: 13,
  paddingTop: 6,
},
commentsList: {
  gap: 12,
},
composer: {
  gap: 8,
},
composerInput: {
  backgroundColor: palette.paper,
  borderColor: palette.line,
  borderRadius: 10,
  borderWidth: 1,
  color: palette.ink,
  fontFamily: fonts.sans,
  fontSize: 14,
  minHeight: 80,
  paddingHorizontal: 12,
  paddingVertical: 10,
  textAlignVertical: 'top',
},
composerActions: {
  alignItems: 'center',
  flexDirection: 'row',
  gap: 8,
  justifyContent: 'flex-end',
},
composerCancel: {
  marginRight: 'auto',
},
commentRow: {
  backgroundColor: palette.card,
  borderColor: palette.line,
  borderRadius: 12,
  borderWidth: 1,
  gap: 6,
  paddingHorizontal: 14,
  paddingVertical: 12,
},
commentRowReply: {
  backgroundColor: palette.paper,
  borderLeftColor: palette.primary,
  borderLeftWidth: 2,
  borderRadius: 8,
  marginLeft: 14,
},
commentHeader: {
  alignItems: 'baseline',
  flexDirection: 'row',
  gap: 10,
  justifyContent: 'space-between',
},
commentAuthor: {
  color: palette.primary,
  fontFamily: fonts.sans,
  fontSize: 13,
  fontWeight: '800',
},
commentTime: {
  color: palette.muted,
  fontFamily: fonts.sans,
  fontSize: 12,
  fontWeight: '600',
},
commentBody: {
  color: palette.ink,
  fontFamily: fonts.serif,
  fontSize: 15,
  lineHeight: 22,
},
commentDeleted: {
  color: palette.muted,
  fontFamily: fonts.serif,
  fontSize: 14,
  fontStyle: 'italic',
},
commentActions: {
  flexDirection: 'row',
  gap: 14,
  paddingTop: 4,
},
commentActionText: {
  color: palette.primary,
  fontFamily: fonts.sans,
  fontSize: 13,
  fontWeight: '700',
},
commentActionDelete: {
  color: '#A12B2B',
},
commentReplyComposer: {
  paddingTop: 8,
},
commentRepliesList: {
  gap: 8,
  paddingTop: 8,
},
```

If a palette token used here doesn't exist exactly (`palette.card`, `palette.line`, `palette.paper`, `palette.ink`, `palette.muted`, `palette.primary`, `fonts.sans`, `fonts.serif`), substitute with the actual token; mirror the pattern of nearby existing styles. The literal red `#A12B2B` is acceptable inline for the destructive-action color since the palette doesn't currently expose a danger token.

### Step 4.7: Verify

From `D:\Projects\qna-app`:
- `npm run test -w qna-mobile` — full suite (should be 61 tests now: 55 prior + 6 new).
- `npm run lint -w qna-mobile` — clean.
- `npm run build -w qna-mobile` — web export succeeds, 9 routes.

Expected: PASS for all three.

### Step 4.8: Skip the commit step

---

## Task 5: End-to-end verification

**Files:** none (verification only).

### Step 5.1: Web tests + lint + build

From `D:\Projects\qna-app`:
- `npm run test -w qna-web`
- `npm run lint -w qna-web`
- `npm run build -w qna-web`

Expected: all pass; 78 tests should still pass.

### Step 5.2: Mobile tests + lint + export

- `npm run test -w qna-mobile` (61 tests pass)
- `npm run lint -w qna-mobile` (clean)
- `npm run build -w qna-mobile` (9 routes exported)

### Step 5.3: Manual gate matrix

Run the dev servers and walk:

| Scenario | Expected mobile behavior |
|---|---|
| Anonymous, open a live question | Comments section shows "Sign in to join the conversation" panel; no fetch in network tab |
| Logged in, not joined | "Join this community to read the discussion" panel; no fetch |
| Member, live question, no answer yet | "Answer first to join the discussion" panel; no fetch |
| Member, just submitted answer | Fetch fires; discussion thread renders with composer at top |
| Member, post a top-level comment | New comment appears at the top after refetch; composer clears |
| Member, tap Reply on a comment, post a reply | Reply appears under the parent; reply composer collapses |
| Member, tap Reply on a different row mid-typing | Previous reply composer collapses |
| Member, tap Delete on own comment → Confirm | Comment becomes "Comment removed" tombstone after refetch |
| Closed question + member who never answered | Thread renders, but composer is replaced by "Comments are closed for new posts on this question." and no Reply links appear |
| `curl -X GET /api/.../comments` no auth | 401 |
| `curl -X OPTIONS /api/.../comments -H "Origin: http://localhost:8081"` | 204 with `Access-Control-Allow-*` headers |

### Step 5.4: Do not commit

Per the standing instruction, do not stage or push anything.

---

## Self-review notes

Spec coverage scan:

- CORS on both comment routes → Tasks 1, 2.
- Mobile REST client + 6 test cases → Task 3.
- Client-side gate evaluation (anonymous / non-member / no-answer / closed-no-answer) → Task 4 (`CommentsSection`).
- Threading with one-level nesting → Task 4 (`CommentRow` with `depth` and child rendering loop).
- Top composer + inline reply composer → Task 4 (`CommentComposer` reused).
- Single open reply composer → Task 4 (`openReplyCommentId` state in `CommentsSection`).
- Self-delete with `ConfirmDialog` → Task 4 (`pendingDelete` + `handleConfirmDelete`).
- Tombstone for deleted comments → Task 4 (`isDeleted` branch).
- Refetch after mutation → Task 4 (`loadComments()` after each post/delete).
- Style entries for the new sub-tree → Task 4 step 4.6.
- Verification → Task 5.

Placeholder scan: every code block is concrete; no TBD / TODO / "add error handling" / "similar to Task N".

Type consistency: `Comment` (mobile) mirrors `QuestionComment` (web) exactly. `CommentsApiError` and `CommentsApiErrorCode` follow the same shape we used for broadcasts and leaderboard. `CommentComposer`'s `onSubmit: (body: string) => Promise<void>` matches what both `handlePostTopLevel` and the wrapped `onSubmitReply` provide. `CommentRow`'s `depth: 0 | 1` is enforced and never recursed past 1.
