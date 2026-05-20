import { redirect } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { listCreatorCommunitiesDashboard } from '@/services/questions';
import { CreatorForbidden } from './_components/CreatorForbidden';
import { DashboardCommunityCard } from './_components/DashboardCommunityCard';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/dashboard');

  const communities = await listCreatorCommunitiesDashboard({
    userId: session.sub,
  });

  const liveToday = communities.filter(
    (community) => community.todayQuestionStatus === 'live',
  ).length;
  const missingToday = communities.filter(
    (community) => community.todayQuestionStatus === 'missing_today',
  ).length;

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      {communities.length === 0 ? (
        <CreatorForbidden />
      ) : (
        <section className="px-6 py-12 md:px-12 md:py-16">
          <div className="mx-auto max-w-[1100px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Creator
            </p>
            <h1 className="mt-2 text-[38px] font-bold leading-tight md:text-[52px]">
              Dashboard
            </h1>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Summary label="Communities" value={communities.length} />
              <Summary label="Live today" value={liveToday} />
              <Summary label="Missing today" value={missingToday} />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {communities.map((community) => (
                <DashboardCommunityCard
                  key={community.id}
                  community={community}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">
        {value.toLocaleString('en-US')}
      </p>
    </div>
  );
}
