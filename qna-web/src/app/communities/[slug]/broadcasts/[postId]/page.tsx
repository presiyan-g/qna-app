import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import {
  getCommunityBroadcast,
  type BroadcastPostResource,
} from '@/services/broadcasts';
import {
  BroadcastFeed,
  type SerializedBroadcastPost,
} from '../_components/BroadcastFeed';

type PageProps = {
  params: Promise<{ slug: string; postId: string }>;
};

export default async function BroadcastDetailPage({ params }: PageProps) {
  const [{ slug, postId }, session] = await Promise.all([params, getSession()]);
  const post = await getCommunityBroadcast({
    slug,
    postId,
    viewerUserId: session?.sub ?? null,
  });
  if (!post) notFound();

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[900px]">
          <Link
            href={`/communities/${slug}/broadcasts`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Back to broadcasts
          </Link>

          <div className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Broadcast
            </p>
            <h1 className="mt-2 text-[38px] font-bold leading-tight md:text-[52px]">
              Community update
            </h1>
          </div>

          <section className="mt-8">
            <BroadcastFeed slug={slug} communityId={post.communityId} posts={[serializeBroadcast(post)]} />
          </section>
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
