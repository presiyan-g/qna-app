import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
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

  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();
  if (community.currentUserRole === null) {
    redirect(`/communities/${slug}/about`);
  }

  const post = await getCommunityBroadcast({
    slug,
    postId,
    viewerUserId: session?.sub ?? null,
  });
  if (!post) notFound();

  return (
    <section>
      <BroadcastFeed slug={slug} communityId={post.communityId} posts={[serializeBroadcast(post)]} />
    </section>
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
