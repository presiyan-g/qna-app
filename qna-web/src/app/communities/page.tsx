import Link from 'next/link';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { listCommunities } from '@/services/communities';
import { CommunityListCard } from './_components/CommunityListCard';

export const metadata = {
  title: 'Browse communities - Quorum',
};

export default async function CommunitiesPage() {
  const session = await getSession();
  const communities = await listCommunities({ userId: session?.sub ?? null });

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Communities
              </p>
              <h1 className="text-[34px] font-bold leading-tight md:text-[46px]">
                Find a recurring challenge worth showing up for.
              </h1>
            </div>
            <Link
              href={session ? '/communities/new' : '/login'}
              className="w-fit rounded-full bg-primary px-5 py-3 text-sm font-semibold text-paper"
            >
              Create community
            </Link>
          </div>

          {communities.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {communities.map((community) => (
                <CommunityListCard
                  key={community.id}
                  community={community}
                  signedIn={Boolean(session)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-card p-8 text-center">
              <h2 className="text-xl font-bold">No communities yet</h2>
              <p className="mt-2 text-sm text-muted">
                Create the first one and invite members to join.
              </p>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
