import Link from 'next/link';
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

  const savedMessage = search.saved ? SAVED_MESSAGES[search.saved] : null;

  return (
    <div className="flex flex-col gap-4">
      {savedMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <span className="font-semibold">✓ {savedMessage}</span>
          <Link
            href={`/communities/${slug}`}
            className="text-xs font-semibold uppercase tracking-wider text-green-700 hover:underline"
          >
            Dismiss
          </Link>
        </div>
      )}
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
    </div>
  );
}
