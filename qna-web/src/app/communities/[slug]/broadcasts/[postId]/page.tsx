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

  const isAdmin = session?.role === 'admin';
  const isMember =
    community.currentUserRole === 'member' || community.currentUserRole === 'creator';
  if (!isMember && !isAdmin) {
    redirect(`/communities/${slug}/about`);
  }

  const post = await getCommunityBroadcast({
    slug,
    postId,
    viewerUserId: session?.sub ?? null,
    viewerPlatformRole: session?.role,
  });
  if (!post) notFound();

  return (
    <section>
      <BroadcastFeed
        slug={slug}
        communityId={post.communityId}
        posts={[serializeBroadcast(post)]}
        showOpenLink={false}
      />
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
