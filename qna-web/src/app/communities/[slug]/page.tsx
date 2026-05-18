import Link from 'next/link';
import { notFound } from 'next/navigation';
import { joinCommunityAction } from '@/app/actions/communities';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityPage({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  const joinAction = joinCommunityAction.bind(null, community.slug);

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
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-lg font-bold text-primary">
                {community.emoji || community.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                {community.cadence} challenge
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
                {community.currentUserRole ? (
                  <span className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper">
                    {community.currentUserRole === 'creator'
                      ? 'You are the creator'
                      : 'You joined this community'}
                  </span>
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
            </aside>
          </div>

          <section className="mt-10 rounded-lg border border-line bg-card p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Coming next
            </p>
            <h2 className="mt-3 text-2xl font-bold">Community home</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              This first slice creates the community and membership foundation.
              Scheduled questions, broadcasts, and leaderboards can build on
              this page next.
            </p>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
