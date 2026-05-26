'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { EmptyState } from '@/app/_components/EmptyState';
import { deleteBroadcastAction } from '@/app/actions/broadcasts';
import { tokenizeBroadcastText } from '@/services/broadcasts/text';
import { BroadcastComposer } from './BroadcastComposer';

export type SerializedBroadcastPost = {
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

export function BroadcastFeed({
  slug,
  communityId,
  posts,
  emptyTitle = 'No broadcasts yet',
  showOpenLink = true,
}: {
  slug: string;
  communityId: string;
  posts: SerializedBroadcastPost[];
  emptyTitle?: string;
  showOpenLink?: boolean;
}) {
  if (posts.length === 0) {
    // Many callers still pass "No broadcasts yet" as emptyTitle.
    // Strip the trailing " yet" so EmptyState's serif italic accent
    // can render it without duplicating the word.
    const trimmedTitle = emptyTitle.replace(/\s*yet\.?$/i, '');
    return (
      <EmptyState
        title={trimmedTitle}
        titleAccent="yet."
        description="Creator announcements and resources will appear here."
      />
    );
  }

  return (
    <div className="grid gap-5">
      {posts.map((post) => (
        <BroadcastCard
          key={post.id}
          slug={slug}
          communityId={communityId}
          post={post}
          showOpenLink={showOpenLink}
        />
      ))}
    </div>
  );
}

function BroadcastCard({
  slug,
  communityId,
  post,
  showOpenLink,
}: {
  slug: string;
  communityId: string;
  post: SerializedBroadcastPost;
  showOpenLink: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="rounded-[14px] border border-line bg-card p-5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/40 hover:shadow-[0_18px_40px_-22px_rgba(31,64,50,0.18)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Author surfaces as a lake-tinted chip — auxiliary
              identity, distinct from the primary action color. */}
          <Link
            href={`/users/${post.author.username}`}
            className="text-[13px] font-bold text-action-lake transition-colors duration-150 ease-out hover:text-action-lake-hover hover:underline"
          >
            @{post.author.username}
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted">
            · {formatTimestamp(post.publishedAt)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showOpenLink && (
            <Link
              href={`/communities/${slug}/broadcasts/${post.id}`}
              className="text-sm font-bold text-action-lake transition-colors duration-150 ease-out hover:text-action-lake-hover hover:underline"
            >
              Open broadcast →
            </Link>
          )}
          {post.canEdit && (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="text-sm font-bold text-action-lake transition-colors duration-150 ease-out hover:text-action-lake-hover hover:underline"
            >
              {editing ? 'Cancel edit' : 'Edit'}
            </button>
          )}
          {post.canDelete && (
            <DeleteBroadcastButton slug={slug} postId={post.id} />
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-5 rounded-lg border border-line bg-paper p-4">
          <BroadcastComposer
            slug={slug}
            communityId={communityId}
            postId={post.id}
            initialBody={post.body}
            initialImageUrl={post.imageUrl}
            onSaved={() => setEditing(false)}
          />
        </div>
      ) : (
        <BroadcastBody post={post} />
      )}
    </article>
  );
}

function BroadcastBody({ post }: { post: SerializedBroadcastPost }) {
  return (
    <div className="mt-4">
      <p className="whitespace-pre-wrap text-sm leading-7 text-ink">
        {tokenizeBroadcastText(post.body).map((token, index) =>
          token.type === 'link' ? (
            <a
              key={`${token.value}-${index}`}
              href={token.value}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              {token.value}
            </a>
          ) : (
            <span key={`${token.value}-${index}`}>{token.value}</span>
          ),
        )}
      </p>
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt=""
          className="mt-4 max-h-[420px] w-full rounded-lg border border-line object-cover"
        />
      )}
    </div>
  );
}

function DeleteBroadcastButton({
  slug,
  postId,
}: {
  slug: string;
  postId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await deleteBroadcastAction(slug, postId);
              router.refresh();
            } catch {
              setError('Could not delete broadcast.');
            }
          })
        }
        style={{ color: 'var(--color-action-clay)' }}
        className="text-sm font-bold transition-colors duration-150 ease-out hover:underline disabled:cursor-not-allowed disabled:opacity-65"
      >
        {pending ? 'Deleting...' : 'Delete'}
      </button>
      {error && <p className="mt-1 text-[12px] text-red-700">{error}</p>}
    </div>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}
