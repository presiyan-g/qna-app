# Admin moderation inside communities — design

Date: 2026-05-24
Status: Approved
Owner: web app (qna-web)

## Goal

Platform admins (`users.role = 'admin'`) need to enter any community — even ones they haven't joined — and moderate user-generated content. They can edit and delete questions, delete broadcasts, and delete comments. They never create content on a creator's or member's behalf.

## Out of scope

- Mobile app. The mobile package is still boilerplate and is not in this slice.
- Admin creating questions, scheduling drafts, posting broadcasts, or posting comments.
- Admin editing broadcasts.
- Audit logging for moderation actions. The `admin_audit_logs` table exists but its `action` union does not cover question/broadcast/comment events. Deferred.
- Recomputing existing answers when an admin edits a question's correct choice.
- Admin badge in the community header. Header stays the same as a non-member's view.
- Comment posting by admin.

## Decisions

1. Admin powers per content type:
   - **Questions:** edit + soft-delete. Admin can edit any question, including closed/published ones.
   - **Broadcasts:** soft-delete only. Admin does not edit broadcasts.
   - **Comments:** soft-delete only. Admin does not post comments.
2. When admin edits a question's correct choice, existing answers stay as graded. No re-grading, no leaderboard recompute. Known surprise: members may see their past answer marked as "wrong" while visually matching the current correct choice.
3. The community header for an admin-non-member shows the regular Join button. There is no "Admin view" badge.
4. Admin sees the question detail page with the prompt, all choices with the correct one revealed, the explanation, and the comment thread read-only — plus Edit + Delete buttons. No answer form, no comment composer.
5. Web only. Admin moderation flows live entirely in `qna-web`.

## Architecture (Approach A — extend the existing `platformRole` parameter pattern)

Two services already follow this pattern: `updateCommunity` and `archiveCommunity` accept an optional `platformRole?: 'member' | 'admin'` and bypass the creator-only check when admin. The same pattern is extended to questions, broadcasts, and comments.

Session plumbing: every server-side caller (page loaders and server actions) already calls `getSession()` and has `session.role` available. Each call site forwards `platformRole: session.role` into the service.

### Services touched

#### `services/questions/management-policy.ts`

- `assertCanManageQuestion(question, { platformRole, now })` — when `platformRole === 'admin'`, skip the `canManageUnpublishedQuestion` immutability check. Creators continue to be blocked from editing published questions.

#### `services/questions/questions.ts`

- `loadQuestionForManagement({ slug, questionId, userId, platformRole })` — when admin, drop the `currentUserRole !== 'creator'` rejection so the loader returns the question regardless of membership.
- `updateUnpublishedQuestion`, `scheduleQuestion` — accept `platformRole` and forward to the policy/loader. The `userId` parameter is retained (still needed for `assertAccountCanMutate` and for the loader to compute `currentUserRole`). The parameter named `creatorUserId` is renamed to `userId` because admins call these too.
- `softDeleteUnpublishedQuestion` is renamed to `softDeleteQuestion` and broadens: when admin, allows soft-deleting closed/published questions in addition to unpublished ones. Creators retain the unpublished-only rule.
- `createQuestion`, `createQuestionDraft` — unchanged. Creator-only.

#### `services/broadcasts/policy.ts`

- `canSoftDeleteBroadcastPost({ communityRole, platformRole })` — returns true for `platformRole === 'admin'`.
- `canReadBroadcasts({ communityRole, platformRole })` — returns true for admin so admins can read broadcasts in communities they haven't joined.
- `canCreateBroadcastPost`, `canEditBroadcastPost` — unchanged. Creator-only (and edit additionally requires author).

#### `services/broadcasts/broadcasts.ts`

- `softDeleteBroadcastPost({ slug, postId, userId, platformRole })` — admin path bypasses the creator-membership check.
- Read paths (`listCommunityBroadcasts`, `getCommunityBroadcast`) — when admin, surface `canEdit`/`canDelete` correctly on each post: `canEdit` stays false for admin (they don't edit broadcasts), `canDelete` becomes true regardless of community membership.

#### `services/comments/policy.ts`

- `canListQuestionComments({ communityRole, hasAnswered, isClosed, platformRole })` — returns true for admin regardless of answer state.
- `canSoftDeleteQuestionComment({ authorUserId, userId, communityRole, platformRole })` — returns true for admin.
- `canPostQuestionComment` — unchanged. Admin does not post.

#### `services/comments/comments.ts` and `services/comments/thread.ts`

- Comment listing reads forward `platformRole` so admin-non-members get the thread.
- `softDeleteQuestionComment` accepts `platformRole`.

#### `services/answers/...`

- `getQuestionDetail({ slug, questionId, userId, platformRole })` — when admin, do not throw `AnswerPermissionError`. Build a response with:
  - all choices including the correct one,
  - the explanation,
  - `viewerCanAnswer: false`,
  - `viewerCanComment: false`,
  - `viewerCanModerate: true`,
  - no `result` block (admin has not answered),
  - the comment thread loaded read-only.
- A creator viewing the page still gets the existing creator-equivalent payload; the admin path is parallel.

## UI changes

A small helper `canModerate = session?.role === 'admin' || community.currentUserRole === 'creator'` is the gating predicate at each surface. `isAdmin = session?.role === 'admin'` is the additional flag used for "non-member admin" code paths.

### Page-by-page

1. **Community layout** (`app/communities/[slug]/layout.tsx`) — `canManage` already covers `creator || admin`. Unchanged.

2. **Questions tab** (`app/communities/[slug]/page.tsx`):
   - Remove the `currentUserRole === null` redirect for admins. Non-admin visitors still redirect to `/about`.
   - Question list fetch: `if (currentUserRole === 'creator' || isAdmin)` → fetch via the dashboard path (`listDashboardQuestions`) so admin sees drafts/scheduled and correct-answer-aware payloads.
   - `QuestionsTabBody` and `QuestionRow` gain an `isAdmin` prop. Row href routing for drafts/scheduled mirrors the creator branch. The "+ New question" pill stays creator-only.

3. **Question detail** (`app/communities/[slug]/questions/[id]/page.tsx`):
   - Loader calls `getQuestionDetail({ ..., platformRole: session.role })`.
   - When `viewerCanModerate` is true and `viewerCanAnswer` is false (admin path): render prompt, all choices with correct revealed, explanation, comment thread (read-only), Edit + Delete buttons.
   - Existing creator-actions block renders for `canModerate` instead of `isCreator`.

4. **Question edit** (`app/communities/[slug]/questions/[id]/edit/page.tsx`): loader currently requires creator. Admin gets in too. The form posts to `updateUnpublishedQuestion` / `scheduleQuestion` server actions which now accept admin.

5. **Question new** (`app/communities/[slug]/questions/new/page.tsx`): unchanged route, but adds an explicit `if (!isCreator) redirect('/communities/[slug]')` for clarity (admin reaching this URL bounces away).

6. **Broadcasts** (`app/communities/[slug]/broadcasts/page.tsx` and `[postId]/page.tsx`):
   - Remove the non-member redirect for admins.
   - Skip `markBroadcastsSeen` for admin-non-members.
   - Hide the composer (creator-only).
   - Each card shows a Delete button when `canModerate`. Edit stays creator+author.

7. **Comment thread** (`app/communities/[slug]/questions/[id]/_components/CommentThread.tsx`):
   - Admin sees the thread.
   - Delete renders on every comment.
   - Composer hidden for admin.

8. **Leaderboard** (`app/communities/[slug]/leaderboard/page.tsx`) — remove non-member redirect for admins.

9. **About** (`app/communities/[slug]/about/page.tsx`) — unchanged. Already public.

10. **Community header** (`app/communities/[slug]/_components/CommunityHeader.tsx`) — unchanged. Admin who isn't a member sees the normal Join button.

### Server actions touched

- `app/actions/questions.ts` — pass `platformRole: session.role` into `updateUnpublishedQuestion`, `scheduleQuestion`, `softDeleteQuestion`.
- `app/actions/broadcasts.ts` — pass `platformRole` into `softDeleteBroadcastPost`.
- `app/actions/comments.ts` — pass `platformRole` into the comment soft-delete action.

## Error handling and edge cases

1. **Suspended admin.** `assertAccountCanMutate` already runs before every service mutation and rejects suspended users. Admin moderation inherits this.

2. **Stale role on the session JWT.** A demoted admin keeps `role: 'admin'` in their JWT until expiry. Service layer trusts the role claim. Matches existing `updateCommunity`/`archiveCommunity` behavior.

3. **Admin deletes a live question.** Question becomes soft-deleted: it disappears from listings, detail 404s, already-submitted answers persist in DB. Members mid-answer see a 404 on submit. Accepted side effect.

4. **Admin edits a published question's correct choice.** Existing answers untouched. New `revealedCorrectChoiceId` may not match the past answer's selection — surfaces as past answers visually appearing wrong against the new key. Documented surprise.

5. **Admin deletes their own comment.** Already allowed today via the author branch in `canSoftDeleteQuestionComment`. No change.

6. **Admin opens a draft/scheduled question by URL.** The detail page route requires `scheduledFor` — drafts stay reachable only via the edit page route. Admin can hit edit; detail stays scheduled/published only.

7. **Admin reaches `/communities/[slug]/questions/new`.** Page-level redirect bounces admin back to `/communities/[slug]`. Server action `createQuestion` still throws `QuestionPermissionError` for non-creators as defense in depth.

8. **Admin and `markBroadcastsSeen`.** Skipped for admin-non-members. The underlying update is a noop in that case (no matching `community_members` row) but we don't bother calling it.

## Testing

### Policy unit tests (new admin branches)

- `services/comments/policy.test.ts`:
  - admin → true for `canListQuestionComments` regardless of `hasAnswered`/`isClosed`.
  - admin → true for `canSoftDeleteQuestionComment` when not author and not creator.
  - admin → false for `canPostQuestionComment`.
- `services/broadcasts/policy.test.ts`:
  - admin → true for `canSoftDeleteBroadcastPost`, `canReadBroadcasts`.
  - admin → false for `canCreateBroadcastPost`, `canEditBroadcastPost`.
- `services/questions/management-policy.test.ts`:
  - `assertCanManageQuestion` does not throw for admin against closed/published.
  - throws for member against published.

### Service-layer tests (extending existing patterns)

- `updateUnpublishedQuestion`/`scheduleQuestion`: admin not in `community_members` can edit; suspended admin cannot.
- `softDeleteQuestion`: admin can soft-delete a published question; member cannot.
- `softDeleteBroadcastPost`: admin can delete another user's broadcast in a non-joined community.
- `softDeleteQuestionComment`: admin can delete a non-authored comment.

### Manual verification (web preview)

- As admin in a non-joined community → can open Questions tab, see drafts/scheduled.
- Open a published question → see correct choice + explanation + comments, no answer form.
- Edit a question → save survives reload.
- Delete a question → it disappears from listing and detail 404s.
- Broadcasts tab → see all posts, can delete each, no composer.
- Comments → delete works; no compose box.

## File-level diff outline

New code is small; most of the work is threading a parameter and removing two redirect guards.

- `services/questions/management-policy.ts` — `platformRole` arg.
- `services/questions/questions.ts` — `platformRole` on management functions; rename `softDeleteUnpublishedQuestion` → `softDeleteQuestion` and broaden.
- `services/broadcasts/policy.ts` — `platformRole` on `canSoftDeleteBroadcastPost`, `canReadBroadcasts`.
- `services/broadcasts/broadcasts.ts` — `platformRole` on soft-delete + read paths; `canDelete` reflects admin.
- `services/comments/policy.ts` — `platformRole` on list + soft-delete.
- `services/comments/comments.ts`, `services/comments/thread.ts` — forward `platformRole`.
- `services/answers/...` — `platformRole` on `getQuestionDetail`; build admin-view payload.
- `app/actions/questions.ts`, `app/actions/broadcasts.ts`, `app/actions/comments.ts` — forward `session.role`.
- `app/communities/[slug]/page.tsx` — drop redirect for admin; dashboard fetch on admin path.
- `app/communities/[slug]/_components/QuestionsTabBody.tsx`, `QuestionRow.tsx` — `isAdmin` prop.
- `app/communities/[slug]/questions/[id]/page.tsx` — admin-view rendering.
- `app/communities/[slug]/questions/[id]/edit/page.tsx` — admin access.
- `app/communities/[slug]/questions/new/page.tsx` — guard admin.
- `app/communities/[slug]/broadcasts/page.tsx`, `[postId]/page.tsx` — admin access; `markBroadcastsSeen` skip.
- `app/communities/[slug]/questions/[id]/_components/CommentThread.tsx`, `DeleteQuestionButton.tsx` — render under `canModerate`.
- `app/communities/[slug]/leaderboard/page.tsx` — drop redirect for admin.

Existing tests for each touched policy/service get new admin-branch cases.
