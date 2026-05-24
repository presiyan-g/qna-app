import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { getRemainingForUser } from '@/services/ai-usage';
import { QuestionForm } from '../_components/QuestionForm';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function NewQuestionPage({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);

  if (!session) {
    redirect(`/login?next=/communities/${slug}/questions/new`);
  }

  const community = await getCommunityBySlug(slug, session.sub);
  if (!community) notFound();

  if (community.currentUserRole !== 'creator') {
    redirect(`/communities/${slug}`);
  }

  let initialRemainingQuota: number | null = null;
  try {
    initialRemainingQuota = await getRemainingForUser(session.sub);
  } catch (err) {
    console.error('new question page: getRemainingForUser failed', err);
  }

  return (
    <section className="max-w-[720px]">
      <h2 className="text-2xl font-bold">Draft a new question</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Save a draft, schedule it for a specific GMT time, or publish it now.
      </p>
      <div className="mt-6">
        <QuestionForm
          slug={slug}
          communityId={community.id}
          cadence={community.cadence}
          initialRemainingQuota={initialRemainingQuota}
        />
      </div>
    </section>
  );
}
