import { redirect } from 'next/navigation';
import { Pagination } from '@/app/_components/Pagination';
import { parsePageParam } from '@/lib/pagination';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCreatorCommunityDashboard,
  listCommunityQuestionsForCommunity,
  type CommunityQuestion,
} from '@/services/questions';
import { CommunitySidebar } from './_components/CommunitySidebar';
import { QuestionsTabBody } from './_components/QuestionsTabBody';
import { SavedBanner } from './_components/SavedBanner';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; page?: string | string[] }>;
};

const SAVED_MESSAGES: Record<string, string> = {
  draft: 'Draft saved.',
  scheduled: 'Question scheduled.',
  published: 'Question published.',
  updated: 'Question updated.',
  deleted: 'Question deleted.',
};

const PAGE_SIZE = 20;

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

  const page = parsePageParam(search?.page);

  let questions: CommunityQuestion[];
  let questionsTotalCount: number;
  if (isCreator || isAdmin) {
    const dashboard = await getCreatorCommunityDashboard({
      slug,
      userId: session!.sub,
      platformRole: session!.role,
    });
    questions = dashboard?.questions ?? [];
    questionsTotalCount = questions.length;
  } else {
    const result = await listCommunityQuestionsForCommunity({
      community,
      viewerUserId: session?.sub ?? null,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    questions = result.items;
    questionsTotalCount = result.totalCount;
  }

  const savedMessage = search.saved ? SAVED_MESSAGES[search.saved] : null;

  return (
    <div className="flex flex-col gap-4">
      {savedMessage && <SavedBanner message={savedMessage} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <QuestionsTabBody
            slug={slug}
            questions={questions}
            viewerRole={community.currentUserRole}
            isAdmin={isAdmin}
          />
          {!isCreator && !isAdmin ? (
            <Pagination
              totalCount={questionsTotalCount}
              currentPage={page}
              pageSize={PAGE_SIZE}
              baseHref={`/communities/${slug}`}
              itemLabel="questions"
            />
          ) : null}
        </div>
        <CommunitySidebar
          community={community}
          viewerUserId={session?.sub ?? null}
        />
      </div>
    </div>
  );
}
