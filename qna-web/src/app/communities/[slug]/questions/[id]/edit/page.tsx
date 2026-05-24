import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCreatorCommunityDashboard,
  getQuestionLifecycleState,
} from '@/services/questions';
import { QuestionForm } from '../../_components/QuestionForm';

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function EditQuestionPage({ params }: PageProps) {
  const [{ slug, id }, session] = await Promise.all([params, getSession()]);
  if (!session) {
    redirect(`/login?next=/communities/${slug}/questions/${id}/edit`);
  }
  const community = await getCommunityBySlug(slug, session.sub);
  if (!community) notFound();
  if (community.currentUserRole !== 'creator') {
    redirect(`/communities/${slug}`);
  }

  const dashboard = await getCreatorCommunityDashboard({
    slug,
    userId: session.sub,
  });
  const question = dashboard?.questions.find((q) => q.id === id);
  if (!question) notFound();

  const state = getQuestionLifecycleState(question);
  if (state === 'live' || state === 'closed') {
    // Live or closed questions cannot be edited; send to the answer view.
    redirect(`/communities/${slug}/questions/${id}`);
  }

  return (
    <section className="max-w-[720px]">
      <h2 className="text-2xl font-bold">Edit question</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Update the prompt, choices, or schedule.
      </p>
      <div className="mt-6">
        <QuestionForm
          slug={slug}
          communityId={community.id}
          cadence={community.cadence}
          question={{
            id: question.id,
            prompt: question.prompt,
            explanation: question.explanation,
            imageUrl: question.imageUrl,
            scheduledFor: question.scheduledFor?.toISOString() ?? null,
            closesAt: question.closesAt?.toISOString() ?? null,
            choices: question.choices.map((c) => ({
              label: c.label,
              imageUrl: c.imageUrl,
              isCorrect: c.isCorrect,
            })),
          }}
        />
      </div>
    </section>
  );
}
