import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  joinCommunityAction,
  leaveCommunityAction,
} from '@/app/actions/communities';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { getLatestCommunityBroadcastForCommunity } from '@/services/broadcasts';
import { listCommunityQuestionsForCommunity } from '@/services/questions';
import { QuestionList } from './_components/QuestionList';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityPage({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  const [questions, latestBroadcast] = await Promise.all([
    listCommunityQuestionsForCommunity({
      community,
      viewerUserId: session?.sub ?? null,
    }),
    getLatestCommunityBroadcastForCommunity({
      community,
      viewerUserId: session?.sub ?? null,
    }),
  ]);

  const joinAction = joinCommunityAction.bind(null, community.slug);
  const leaveAction = leaveCommunityAction.bind(null, community.slug);

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[1000px]">
          <Link
            href="/communities"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Back to communities
          </Link>

          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_280px]">
            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-primary-soft text-lg font-bold text-primary">
                {community.emoji || community.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                {community.category
                  ? `${community.category.name} / ${formatLabel(community.cadence)} challenge`
                  : `${formatLabel(community.cadence)} challenge`}
              </p>
              <h1 className="text-[38px] font-bold leading-tight md:text-[56px]">
                {community.name}
              </h1>
              <p className="mt-5 max-w-[680px] text-base leading-7 text-muted">
                {community.description || 'A recurring challenge community.'}
              </p>
            </div>

            <aside className="rounded-lg border border-line bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Membership
              </p>
              <p className="mt-3 text-3xl font-bold">
                {community.memberCount.toLocaleString('en-US')}
              </p>
              <p className="text-sm text-muted">members</p>

              <div className="mt-5">
                {community.currentUserRole === 'creator' ? (
                  <span className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper">
                    You are the creator
                  </span>
                ) : community.currentUserRole === 'member' ? (
                  <div className="grid gap-2">
                    <span className="block rounded-full bg-primary-soft px-4 py-2.5 text-center text-sm font-semibold text-primary">
                      Joined
                    </span>
                    <form action={leaveAction}>
                      <button
                        type="submit"
                        className="w-full rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                      >
                        Leave community
                      </button>
                    </form>
                  </div>
                ) : session ? (
                  <form action={joinAction}>
                    <button
                      type="submit"
                      className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-paper"
                    >
                      Join community
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/login"
                    className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper"
                  >
                    Sign in to join
                  </Link>
                )}
              </div>

              <Link
                href={`/communities/${community.slug}/leaderboard?window=all`}
                className="mt-4 block rounded-full border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink hover:border-primary hover:text-primary"
              >
                View leaderboard
              </Link>

              <Link
                href={`/communities/${community.slug}/broadcasts`}
                className="mt-3 block rounded-full border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink hover:border-primary hover:text-primary"
              >
                Read broadcasts
              </Link>
            </aside>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-6">
              {latestBroadcast && (
                <section className="rounded-lg border border-line bg-card p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                        Latest broadcast
                      </p>
                      <p className="mt-2 text-sm font-bold text-ink">
                        {latestBroadcast.author.username}
                      </p>
                      <p className="mt-1 text-[12px] text-muted">
                        {formatBroadcastDate(latestBroadcast.publishedAt)}
                      </p>
                    </div>
                    <Link
                      href={`/communities/${community.slug}/broadcasts/${latestBroadcast.id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                  <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {latestBroadcast.body}
                  </p>
                  {latestBroadcast.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={latestBroadcast.imageUrl}
                      alt=""
                      className="mt-4 h-36 w-full rounded-lg border border-line object-cover"
                    />
                  )}
                </section>
              )}

              <QuestionList questions={questions} slug={community.slug} />
            </div>

            {community.currentUserRole === 'creator' ? (
              <aside className="rounded-lg border border-line bg-card p-5 lg:sticky lg:top-6 lg:self-start">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Creator
                </p>
                <h2 className="mt-2 text-2xl font-bold">Manage questions</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Draft, schedule, and edit upcoming questions from the
                  creator dashboard.
                </p>
                <Link
                  href={`/dashboard/communities/${community.slug}`}
                  className="mt-5 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper"
                >
                  Open dashboard
                </Link>
              </aside>
            ) : (
              <aside className="rounded-lg border border-line bg-card p-5 lg:self-start">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Schedule
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {questions[0]
                    ? getNextQuestionLabel(questions[0].scheduledFor)
                    : 'Waiting for the first challenge'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Multiple-choice answering, grading, and discussion unlocks
                  build on this question schedule.
                </p>
              </aside>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function getNextQuestionLabel(value: Date): string {
  if (value.getTime() <= Date.now()) return 'Question is live';
  return 'Next question is scheduled';
}

function formatBroadcastDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(value);
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
