# Broadcast Channel Posts Design

## Goal

Add the third core community pillar: public broadcast posts that creators can publish for announcements, resources, winner messages, and community updates.

## Scope

This slice covers the `broadcast_posts` table, shared service layer, REST mirror, creator composer, public feed, post detail page, community-home preview, and product-doc update.

It does not cover image uploads, R2 signed URLs, interactive buttons, notifications, unread state, email digests, mobile UI consumption, reactions, comments on broadcasts, or a broader moderation dashboard.

## Locked Decisions

- Posting permission is based on `community_members.role = 'creator'` for the target community.
- Multiple creators per community are allowed.
- Broadcast posts are soft-deleted only with `deleted_at`; rows are never hard-deleted by app code.
- Public reads exclude soft-deleted rows.
- Feed ordering is newest first by `published_at`.
- Authors can edit and soft-delete their own posts.
- Other creators in the same community can soft-delete posts for moderation.
- Other creators cannot edit posts they did not author.
- Mutations check current membership, so a former creator who authored a post cannot edit or delete after losing the creator role.
- v1 supports a text body and optional `image_url` column.
- v1 accepts an external image URL string or no image.
- R2/signed-URL media upload is deferred to a dedicated media slice.
- Visibility is public to anyone who can view the community page, including anonymous visitors.
- REST mirrors web behavior: `GET` is public; `POST`, `PATCH`, and `DELETE` require a creator membership.

## Proposed Product Decisions For Sign-Off

These choices resolve the open product questions before coding. They are intentionally called out for review.

### Feed Placement

Use `/communities/[slug]/broadcasts` as the primary public broadcast feed route.

The route contains the member-visible feed for everyone and a creator-only composer at the top for signed-in community creators. This satisfies the screen-list requirement for a broadcast composer without creating a separate composer-only route that members would never use.

### Community Home Preview

Show the latest active broadcast on `/communities/[slug]`, plus a link to the full broadcast feed.

This makes broadcasts discoverable without crowding the community home into a full archive. If there are no broadcasts, the home page shows only the route link.

### Pagination

Use cursor pagination for both web and REST.

- Default page size: 20 posts.
- Maximum page size: 50 posts.
- Cursor shape: opaque string derived from the last row's `published_at` and `id`.
- Sort order: `published_at DESC`, then `id DESC` for deterministic ordering.
- Web route exposes an `Older posts` link with `?cursor=<opaque-cursor>`.
- REST returns `{ items, pagination: { limit, nextCursor } }`.

This avoids unbounded history reads while keeping v1 simpler than bidirectional archive navigation.

### Body Format

Use plain text with preserved newlines and auto-linkified URLs.

- Body is required.
- Body cap is 4000 characters.
- Leading and trailing whitespace is trimmed.
- Internal newlines are preserved.
- Markdown is not supported in v1.
- URLs beginning with `http://` or `https://` render as links.

Plain text is the most predictable default for creator announcements and keeps the first slice free of sanitizer or markdown-renderer concerns.

### Image URL Handling

Accept any syntactically valid `http://` or `https://` URL up to 2048 characters.

Do not restrict domains in v1. Do not fetch or proxy the image server-side. Invalid protocols, relative URLs, blank strings, and malformed values are rejected or normalized to `null` when optional.

This keeps the feature useful for externally hosted images while making the deferred R2 media slice the place for stricter asset ownership.

### Detail Page

Add a shareable detail route: `/communities/[slug]/broadcasts/[postId]`.

The feed remains the main archive surface, but detail pages support direct links to winner posts, resources, and historical announcements. Soft-deleted posts return 404 on public detail reads.

## Data Model

Add `broadcast_posts`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid primary key | `gen_random_uuid()` |
| `community_id` | uuid not null | References `communities.id`, cascade on community deletion |
| `author_user_id` | uuid not null | References `users.id`, restrict on user deletion |
| `body` | text not null | Plain text, max 4000 chars at service validation |
| `image_url` | text null | External URL only in this slice |
| `published_at` | timestamptz not null | Defaults to creation time; controls feed order |
| `deleted_at` | timestamptz null | Soft-delete tombstone |
| `created_at` | timestamptz not null | Defaults to now |
| `updated_at` | timestamptz not null | Defaults to now |

Indexes:

- `broadcast_posts_community_published_idx` on `(community_id, published_at DESC, id DESC)`.
- `broadcast_posts_author_user_id_idx` on `author_user_id`.
- `broadcast_posts_deleted_at_idx` on `deleted_at`.

Schema changes go through Drizzle migration generation only.

## Service Design

Create `qna-web/src/services/broadcasts/` with focused modules:

- `validation.ts`: validates body and optional image URL.
- `policy.ts`: creator, edit, and soft-delete permission helpers.
- `cursor.ts`: cursor encode/decode and page-size normalization.
- `text.ts`: plain-text URL tokenization for UI rendering tests.
- `broadcasts.ts`: Drizzle queries and public service functions.
- `errors.ts`: permission, not-found, validation, and cursor errors.
- `index.ts`: exports service API.

Primary service functions:

- `listCommunityBroadcasts({ slug, limit, cursor })`
- `getLatestCommunityBroadcast({ slug })`
- `getCommunityBroadcast({ slug, postId })`
- `createBroadcastPost({ slug, userId, body, imageUrl, now })`
- `updateBroadcastPost({ slug, postId, userId, body, imageUrl, now })`
- `softDeleteBroadcastPost({ slug, postId, userId, now })`

Public read functions do not require auth or membership. Mutating functions resolve the active community, load the caller's membership role, and enforce creator policy.

## REST API

Add:

`GET /api/communities/[slug]/broadcasts?limit=20&cursor=<opaque-cursor>`

Public response:

```json
{
  "items": [
    {
      "id": "uuid",
      "communityId": "uuid",
      "author": { "id": "uuid", "username": "creator" },
      "body": "Weekly winner: Ana",
      "imageUrl": "https://example.com/winner.png",
      "publishedAt": "2026-05-20T09:00:00.000Z",
      "createdAt": "2026-05-20T09:00:00.000Z",
      "updatedAt": "2026-05-20T09:00:00.000Z"
    }
  ],
  "pagination": { "limit": 20, "nextCursor": null }
}
```

Add:

- `POST /api/communities/[slug]/broadcasts`
- `GET /api/communities/[slug]/broadcasts/[postId]`
- `PATCH /api/communities/[slug]/broadcasts/[postId]`
- `DELETE /api/communities/[slug]/broadcasts/[postId]`

Status behavior:

- `200` for public list/detail and successful patch.
- `201` for successful create.
- `204` for successful soft-delete, including already-deleted posts visible to the authorized deleter.
- `400` for invalid JSON or malformed cursor.
- `401` when a mutation lacks auth.
- `403` when the signed-in user is not allowed to mutate the post.
- `404` for missing community or missing active post on public reads.
- `422` for body/image validation errors.

## Web UX

### Broadcast Feed

`/communities/[slug]/broadcasts` renders server-first:

- Back link to the community.
- Community name and `Broadcasts` heading.
- Creator-only composer at the top when `currentUserRole === 'creator'`.
- Newest-first feed of public, non-deleted posts.
- Preserved newlines and linkified URL text.
- Optional image preview when `image_url` is present.
- `Older posts` link when `nextCursor` exists.
- Empty state when no broadcasts exist.

Creators see edit and delete controls for their own posts. Creators see delete controls for other creators' posts, but no edit control.

### Broadcast Detail

`/communities/[slug]/broadcasts/[postId]` renders one active post with the same text/image presentation and creator controls.

### Community Home

`/communities/[slug]` shows:

- A link to `/communities/[slug]/broadcasts`.
- The latest active broadcast preview when one exists.

The preview is intentionally short: author, date, body excerpt, optional image thumbnail, and a `Read broadcasts` link.

## Product Docs

Update `PROJECT.md` to capture the approved v1 behavior:

- First-class broadcast feed route.
- Public read visibility.
- Creator-only create/update/delete permissions.
- Cursor-paginated history.
- Soft-delete history preservation.
- Plain-text body with optional external image URL.

## Testing

Focused tests should cover:

- Body validation: required, trim, 4000-character cap.
- Image URL validation: optional, `http`/`https` only, malformed URL rejection.
- Policy: creator can post; author can edit; other creator cannot edit; author or same-community creator can soft-delete.
- Cursor helpers: page-size normalization, opaque cursor encode/decode, malformed cursor error.
- Text rendering helper: plain text segments, URL segments, newline preservation inputs.

Full verification should include:

```bash
npm run test -w qna-web
npm run lint -w qna-web
npm run build -w qna-web
```

## Self-Review

- Placeholder scan: implementation decisions are explicit in this spec.
- Internal consistency: public reads, creator-gated mutations, soft-delete exclusion, and cursor ordering match across schema, service, REST, and web UX.
- Scope check: this is one coherent slice because schema, service, REST, and web surfaces all implement the same broadcast read/write model.
- Ambiguity check: feed route, home preview, pagination, body format, image URL policy, and detail route are proposed explicitly for sign-off before coding.
