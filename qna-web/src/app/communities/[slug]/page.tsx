import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCreatorCommunityDashboard,
  listCommunityQuestionsForCommunity,
} from '@/services/questions';
import { CommunitySidebar } from './_components/CommunitySidebar';
import { QuestionsTabBody } from './_components/QuestionsTabBody';
import { SavedBanner } from './_components/SavedBanner';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
};

const SAVED_MESSAGES: Record<string, string> = {
  draft: 'Draft saved.',
  scheduled: 'Question scheduled.',
  published: 'Question published.',
  updated: 'Question updated.',
  deleted: 'Question deleted.',
};

export default async function CommunityQuestionsTab({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, search, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) {
    redirect('/communities');
  }

  const isAdmin = session?.role === 'admin';
  const isCreator = community.currentUserRole === 'creator';
  const isMember =
    community.currentUserRole === 'member' || isCreator;

  if (!isMember && !isAdmin) {
    redirect(`/communities/${slug}/about`);
  }

  let questions;
  if (isCreator || isAdmin) {
    const dashboard = await getCreatorCommunityDashboard({
      slug,
      userId: session!.sub,
      platformRole: session!.role,
    });
    questions = dashboard?.questions ?? [];
  } else {
    questions = await listCommunityQuestionsForCommunity({
      community,
      viewerUserId: session?.sub ?? null,
    });
  }

  const savedMessage = search.saved ? SAVED_MESSAGES[search.saved] : null;

  return (
    <div className="flex flex-col gap-4">
      {savedMessage && <SavedBanner message={savedMessage} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <QuestionsTabBody
          slug={slug}
          questions={questions}
          viewerRole={community.currentUserRole}
          isAdmin={isAdmin}
        />
        <CommunitySidebar
          community={community}
          viewerUserId={session?.sub ?? null}
        />
      </div>
    </div>
  );
}
