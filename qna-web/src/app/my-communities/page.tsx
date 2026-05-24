import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { listMyCommunities } from '@/services/communities';
import { CommunityListCard } from '@/app/communities/_components/CommunityListCard';

export const metadata = {
  title: 'My communities - Quorum',
};

export default async function MyCommunitiesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?next=/my-communities');
  }

  const communities = await listMyCommunities({ userId: session.sub });

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                My communities
              </p>
              <h1 className="text-[34px] font-bold leading-tight md:text-[46px]">
                The challenges you&apos;ve signed up for.
              </h1>
            </div>
            <Link
              href="/communities"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
            >
              Discover more
            </Link>
          </div>

          {communities.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {communities.map((community) => (
                <CommunityListCard
                  key={community.id}
                  community={community}
                  signedIn
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-card p-8 text-center">
              <h2 className="text-xl font-bold">No communities yet</h2>
              <p className="mt-2 text-sm text-muted">
                Join one from the discover page, or start your own.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <Link
                  href="/communities"
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  Browse communities
                </Link>
                <Link
                  href="/communities/new"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper"
                >
                  Create community
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
