import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCreatorCommunityDashboard,
  listCommunityQuestionsForCommunity,
} from '@/services/questions';
import { CommunitySidebar } from './_components/CommunitySidebar';
import { QuestionsTabBody } from './_components/QuestionsTabBody';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityQuestionsTab({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) {
    // The layout already calls notFound() for missing community, but be defensive.
    redirect('/communities');
  }

  // Visitor → About tab (the only public surface for non-members).
  if (community.currentUserRole === null) {
    redirect(`/communities/${slug}/about`);
  }

  // Fetch questions according to viewer role.
  let questions;
  if (community.currentUserRole === 'creator') {
    const dashboard = await getCreatorCommunityDashboard({
      slug,
      userId: session!.sub,
    });
    questions = dashboard?.questions ?? [];
  } else {
    questions = await listCommunityQuestionsForCommunity({
      community,
      viewerUserId: session?.sub ?? null,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <QuestionsTabBody
        slug={slug}
        questions={questions}
        viewerRole={community.currentUserRole}
      />
      <CommunitySidebar
        community={community}
        viewerUserId={session?.sub ?? null}
      />
    </div>
  );
}
