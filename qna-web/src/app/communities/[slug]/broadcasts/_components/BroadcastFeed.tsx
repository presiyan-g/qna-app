'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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
}: {
  slug: string;
  communityId: string;
  posts: SerializedBroadcastPost[];
  emptyTitle?: string;
}) {
  if (posts.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Broadcasts
        </p>
        <h2 className="mt-2 text-2xl font-bold">{emptyTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Creator announcements and resources will appear here.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      {posts.map((post) => (
        <BroadcastCard key={post.id} slug={slug} communityId={communityId} post={post} />
      ))}
    </div>
  );
}

function BroadcastCard({
  slug,
  communityId,
  post,
}: {
  slug: string;
  communityId: string;
  post: SerializedBroadcastPost;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/users/${post.author.username}`}
            className="text-sm font-bold text-ink hover:text-primary hover:underline"
          >
            {post.author.username}
          </Link>
          <p className="mt-1 text-[12px] text-muted">
            {formatTimestamp(post.publishedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/communities/${slug}/broadcasts/${post.id}`}
            className="text-sm font-bold text-primary hover:underline"
          >
            Open
          </Link>
          {post.canEdit && (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="text-sm font-bold text-primary hover:underline"
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
        className="text-sm font-bold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-65"
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
