import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import {
  getCreatorCommunityDashboard,
  getQuestionLifecycleState,
  type CommunityQuestion,
} from '@/services/questions';
import { CreatorForbidden } from '../../_components/CreatorForbidden';
import { QuestionManagementForm } from './_components/QuestionManagementForm';
import {
  QuestionManagementList,
  type SerializedManagedQuestion,
} from './_components/QuestionManagementList';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CreatorCommunityDashboardPage({
  params,
}: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  if (!session) {
    redirect(`/login?next=/dashboard/communities/${slug}`);
  }

  const dashboard = await getCreatorCommunityDashboard({
    slug,
    userId: session.sub,
  });

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      {!dashboard ? (
        <CreatorForbidden />
      ) : (
        <section className="px-6 py-12 md:px-12 md:py-16">
          <div className="mx-auto max-w-[880px]">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Back to dashboard
            </Link>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Creator dashboard
                </p>
                <h1 className="mt-2 text-[38px] font-bold leading-tight md:text-[52px]">
                  {dashboard.community.name}
                </h1>
                <p className="mt-2 text-sm text-muted">
                  {dashboard.community.memberCount.toLocaleString('en-US')}{' '}
                  members
                </p>
              </div>
              <Link
                href={`/communities/${dashboard.community.slug}`}
                className="rounded-full border border-primary/25 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
              >
                View public community
              </Link>
            </div>

            <section
              aria-labelledby="composer-heading"
              className="mt-10 rounded-2xl border border-primary/15 bg-card p-6 shadow-[0_18px_40px_-32px_rgba(31,64,50,0.35)] md:p-8"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Question composer
              </p>
              <h2
                id="composer-heading"
                className="mt-2 text-3xl font-bold tracking-tight"
              >
                Create a question
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Save a draft, schedule for a specific GMT time, or publish it
                right now.
              </p>
              <div className="mt-6">
                <QuestionManagementForm slug={dashboard.community.slug} />
              </div>
            </section>

            <section aria-label="Existing questions" className="mt-12">
              <QuestionManagementList
                slug={dashboard.community.slug}
                questions={dashboard.questions.map(serializeQuestion)}
              />
            </section>
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}

function serializeQuestion(question: CommunityQuestion): SerializedManagedQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    explanation: question.explanation,
    imageUrl: question.imageUrl,
    scheduledFor: question.scheduledFor?.toISOString() ?? null,
    closesAt: question.closesAt?.toISOString() ?? null,
    points: question.points,
    state: getQuestionLifecycleState(question),
    choices: question.choices.map((choice) => ({
      label: choice.label,
      imageUrl: choice.imageUrl,
      isCorrect: choice.isCorrect,
    })),
  };
}
