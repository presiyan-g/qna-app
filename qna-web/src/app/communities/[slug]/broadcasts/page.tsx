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
