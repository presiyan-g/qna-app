# Mobile Comments Design

## Goal

Close the daily-question loop on mobile: after a member answers, render the discussion inline below the result panel so they can read what others said and add their own thoughts. Match the web data model and gating exactly — one level of reply nesting, member-only after-answer access, self-delete.

## Scope

- New `CommentsSection` inside the question detail screen at `qna-mobile/app/communities/[slug]/questions/[id].tsx`, rendered inline below the existing `ResultPanel` inside the same `ScrollView`.
- Read + post + self-delete using the existing web REST endpoints under `/api/communities/[slug]/questions/[id]/comments`.
- Top-level composer at the top of the section; tapping Reply on a row expands an inline composer beneath that row (one reply composer open at a time).
- One level of nesting: top-level newest-first, replies indented chronologically.
- Soft-deleted comments rendered as a tombstone (`Comment removed`) with replies still visible underneath.
- Gating mirrors web: anonymous → sign-in CTA; authenticated non-member → join CTA; member who has not answered a live question → answer-first CTA; member who has answered or question is closed → full thread.
- Web side: add CORS to the two comment routes so mobile can reach them.

Out of scope: creator-side deletion of other users' comments (stays web-only per `qna-mobile/AGENTS.md`); editing comments (web does not support it); pagination; mentions; reactions; nesting beyond one level; optimistic UI.

## Decisions

- **Threading depth**: exactly one level. Top-level comments sort newest-first; replies sort chronologically under their parent. Matches the web `buildCommentThread` ordering.
- **Gate evaluation**: client-side first. The question detail screen already knows `currentUserRole`, whether `result` exists (the viewer has answered), and `isClosed`. When the gate fails, render the gate panel and do not fetch. When it passes, fetch.
- **Delete capability**: self-delete only on mobile. The `Delete` action renders only when `canDelete === true` (already computed by the service) AND the comment author equals the current user. Creator-deletion of others' comments stays on web.
- **Confirmation**: delete uses the existing `ConfirmDialog` Brand component already used on this screen for the "Leave community" flow.
- **Refetch after mutation**: after a successful post (top-level or reply) or delete, refetch the full thread. No optimistic UI for this slice.
- **Single open reply composer**: tapping Reply on a different row collapses the previous one.
- **Tombstone**: when `body === null` (deleted), render "Comment removed" in `palette.muted`. Replies still hang off the tombstone row. The Reply action is hidden on a tombstone.

## REST contract

Existing endpoints, with this slice's changes called out:

- `GET /api/communities/[slug]/questions/[id]/comments` — **changed**: add `OPTIONS` handler + wrap responses with `withCors`. Auth required (401 if anonymous). Gating handled inside the service via `canListQuestionComments`; service throws `CommentPermissionError` → route returns 403.
- `POST /api/communities/[slug]/questions/[id]/comments` body `{ body: string, parentCommentId?: string }` — **changed**: add `OPTIONS` + CORS. Returns 201 on success, 401/403 for gates, 422 with `fieldErrors` for validation.
- `DELETE /api/communities/[slug]/questions/[id]/comments/[commentId]` — **changed**: add `OPTIONS` + CORS. Returns 204 on success, 401/403/404 otherwise.

No service-layer logic changes; the existing policy helpers and error classes are already correct.

Resource shape (unchanged):

```ts
type QuestionComment = {
  id: string;
  questionId: string;
  parentCommentId: string | null;
  author: { id: string; username: string } | null; // null when deleted
  body: string | null;                              // null when deleted
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
  replies: QuestionComment[];                       // one level deep
};
```

## Service layer (mobile)

`qna-mobile/services/comments/api.ts` — typed REST client:

- Types: `Comment` (matching the resource above), `CommentListResult = { comments: Comment[] }`.
- `createCommentsClient({ apiUrl })` exposes:
  - `list(slug, questionId, token)` → `CommentListResult`.
  - `post(slug, questionId, { body, parentCommentId? }, token)` → `{ comment: Comment }`.
  - `delete(slug, questionId, commentId, token)` → `void` (returns nothing on 204).
- `CommentsApiError extends Error` with `status: number`, `code: 'unauthenticated' | 'forbidden' | 'not_found' | 'network' | 'unknown'`, and `fieldErrors: Record<string, string>` so `POST` 422 cases can surface inline form errors on the composer.

`qna-mobile/services/comments/api.test.ts` — covers:

- List happy path with bearer.
- Post top-level (no `parentCommentId`).
- Post reply (with `parentCommentId`) — verify the body JSON includes the parent id.
- Delete returns `void` on 204.
- 401 → `code: 'unauthenticated'`.
- 422 → `code: 'unknown'` (no dedicated code; relies on `fieldErrors` for UI use) with `fieldErrors.body` populated.

(The 422 case is intentionally not assigned its own discriminator code — the `fieldErrors` shape is sufficient for the UI.)

## Screens

### Question detail — comments section

Component: in-file `CommentsSection`, rendered inside the existing `ScrollView` directly below the `ResultPanel`.

`CommentsSection` props: `{ slug: string; question: QuestionDetail }`. It pulls `token`, `user`, and `apiUrl` from the existing hooks already used on the screen.

#### Gate evaluation (client-side, before any fetch)

In order:

1. `!user || !token` → render `SignInToDiscussGate`. CTA: Sign in (preserves the `returnTo`).
2. `question.currentUserRole === null` → render `JoinToDiscussGate`. CTA: scroll to / link back to community detail with a brief "Tap Join above" hint.
3. `!question.result && !question.isClosed` → render `AnswerFirstGate`. Body: "Answer first to see what others said." No CTA — the question's answer UI is right above.
4. Otherwise → fetch and render the thread.

#### Loaded thread layout

- Header row: small uppercase "DISCUSSION" eyebrow (`palette.muted`) + count of top-level comments (e.g. "DISCUSSION · 4").
- Composer at the top: multi-line `TextInput` placeholder "Share your thoughts..." + `BrandButton` "Post". Submit button disabled while submitting or when the trimmed body is empty. Inline `FormError` below the input shows `fieldErrors.body` on 422.
- List of `CommentRow` items.
- Loading state (initial fetch): `StatePanel` "Loading discussion...".
- Error state (non-gate failures, e.g. network): `StatePanel` with the error message + Retry.
- Empty state (`comments.length === 0`): inline "No comments yet — start the discussion." copy below the composer (no `StatePanel`, since the composer is the call to action).

#### `CommentRow`

Props: `{ slug, questionId, comment, depth: 0 | 1, currentUser, canReply, openReplyCommentId, onOpenReply, onCloseReply, onAfterMutation }`.

Layout:

- Header line: `@username` in `palette.primary` + relative time in `palette.muted`. If `author === null` (deleted), show "Anonymous" in muted color and no link styling.
- Body: `palette.ink`, multi-line text. If `body === null` (deleted), show "Comment removed" italic in `palette.muted`.
- Action row (skipped when deleted):
  - `Reply` link (visible only for top-level rows `depth === 0` AND `canReply === true`).
  - `Delete` link (visible only when `comment.canDelete === true` AND `comment.author?.id === currentUser.id` — i.e. the viewer is the author, not a creator deleting someone else). Tapping opens `ConfirmDialog` with "Delete this comment?" copy.
- Inline reply composer: rendered only when `openReplyCommentId === comment.id`. Same shape as the top-level composer but with a `Cancel` link next to the Post button.
- Replies: for `depth === 0`, render each entry in `comment.replies` as a child `CommentRow` with `depth={1}`. Each child gets a left padding plus a thin `palette.line` left border to visualize the indent. `depth === 1` rows do NOT render Reply (one-level cap) and do NOT recurse.

#### Single open reply composer

`CommentsSection` owns `openReplyCommentId: string | null` state. Tapping Reply on a row calls `onOpenReply(commentId)`, which sets the value. Tapping Reply on another row replaces it. Cancel calls `onCloseReply()`, which clears it. After a successful reply submission, it also clears.

### Data flow

- `useFocusEffect` triggers `loadComments` when the screen is focused AND the gate is satisfied. Subsequent re-focuses refetch (consistent with how Questions / Posts tabs already behave).
- `handlePostTopLevel(body)`: calls `commentsClient.post(slug, questionId, { body })`, then on success calls `loadComments()` and clears the composer input.
- `handlePostReply(parentCommentId, body)`: same with `parentCommentId`. Also closes the reply composer.
- `handleDelete(commentId)`: calls `commentsClient.delete(...)`, then `loadComments()`.

### Error handling

| Trigger | Mobile behavior |
|---|---|
| Network failure during list | `StatePanel` with retry. |
| 401 during list (token expired mid-session) | Surface as `SignInToDiscussGate` panel; clear `user/token` via auth context if applicable. |
| 403 during list (gate flipped server-side) | Surface a generic "Comments unavailable" panel with Retry — defensive; should not happen if local gate evaluated correctly. |
| 422 during post | Inline `FormError` under the composer using `fieldErrors.body`. |
| 403 during post | "You can't post right now." inline error + refetch the question detail. |
| 404 during delete | Toast-style banner "Comment already removed" + refetch. |

## Testing

- Mobile: `services/comments/api.test.ts` covers the cases listed in the service layer section.
- Web: no new tests. The CORS additions are mechanical (identical pattern to the broadcasts/leaderboard slices). Existing `services/comments/policy.test.ts`, `thread.test.ts`, and `validation.test.ts` still cover the gating logic.
- Manual:
  - Anonymous → gated CTA, no fetch happens (verify in network panel).
  - Non-member → gated CTA.
  - Member who hasn't answered → "Answer first" gate.
  - Member who has answered → full thread, can post top-level, can reply, can delete own comment.
  - Closed question for member who didn't answer → thread visible, but composer disabled (canPost gate is `member && hasAnswered`, so posting is blocked even after close).
  - Two browsers / devices: post on one, refocus the other → comments appear after refetch.

Note on the closed-question + no-answer case: web policy lets you *read* (`canListQuestionComments` is `member && (hasAnswered || isClosed)`) but not *post* (`canPostQuestionComment` is `member && hasAnswered`). Mobile must respect both. The two gates are derived from data already on the screen:

```
canList = currentUserRole !== null && (result !== null || isClosed)
canPost = currentUserRole !== null && result !== null
```

When `canList === true && canPost === false`, render the thread but hide the composer and the Reply links.

## Files touched

**Web** (`qna-web/`):
- `src/app/api/communities/[slug]/questions/[id]/comments/route.ts` — add `OPTIONS`, wrap GET/POST responses with `withCors`.
- `src/app/api/communities/[slug]/questions/[id]/comments/[commentId]/route.ts` — add `OPTIONS`, wrap DELETE response with `withCors`.

**Mobile** (`qna-mobile/`):
- `services/comments/api.ts` — new typed client.
- `services/comments/api.test.ts` — new tests.
- `app/communities/[slug]/questions/[id].tsx` — add `CommentsSection`, `CommentComposer`, `CommentRow` components plus style entries.

**Docs**:
- `docs/superpowers/specs/2026-05-22-mobile-comments-design.md` — this file.

## Sequencing notes

1. Web CORS first (unblocks mobile fetches).
2. Mobile REST client + tests (TDD).
3. Mobile UI wiring (composer + thread + gates).
4. Verification: web tests + lint + build; mobile tests + lint + web export; manual gate matrix.
