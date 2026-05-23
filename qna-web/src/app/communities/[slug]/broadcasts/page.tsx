import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug, markBroadcastsSeen } from '@/services/communities';
import {
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
  if (community.currentUserRole === null) {
    redirect(`/communities/${slug}/about`);
  }

  if (session?.sub) {
    await markBroadcastsSeen({ userId: session.sub, slug });
  }

  const page = await listCommunityBroadcasts({
    slug,
    limit: normalizeBroadcastLimit(query.limit ?? null),
    cursor: query.cursor ?? null,
    viewerUserId: session?.sub ?? null,
  });

  return (
    <>
      {community.currentUserRole === 'creator' && (
        <section className="rounded-lg border border-line bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Creator
          </p>
          <h2 className="mt-2 text-2xl font-bold">Post a broadcast</h2>
          <div className="mt-5">
            <BroadcastComposer slug={community.slug} communityId={community.id} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <BroadcastFeed
          slug={community.slug}
          communityId={community.id}
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
    </>
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
