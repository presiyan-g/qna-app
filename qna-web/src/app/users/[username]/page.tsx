import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import {
  getPublicUserProfileByUsername,
  type PublicUserProfile,
} from '@/services/profiles';

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicUserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getPublicUserProfileByUsername(username);
  if (!profile) notFound();

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[960px]">
          <ProfileHeader profile={profile} />
          <CommunityMemberships profile={profile} />
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ProfileHeader({ profile }: { profile: PublicUserProfile }) {
  return (
    <header className="rounded-lg border border-line bg-card p-6 md:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Public profile
      </p>
      <h1 className="mt-3 text-[38px] font-bold leading-tight md:text-[52px]">
        @{profile.user.username}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Joined {formatDate(profile.user.joinedAt)}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <StatTile label="Total points" value={profile.stats.totalPoints} />
        <StatTile label="Communities" value={profile.stats.communityCount} />
      </div>
    </header>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function CommunityMemberships({ profile }: { profile: PublicUserProfile }) {
  return (
    <section className="mt-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Communities
        </p>
        <h2 className="mt-2 text-2xl font-bold">Active memberships</h2>
      </div>

      {profile.communities.length > 0 ? (
        <div className="mt-5 divide-y divide-line rounded-lg border border-line bg-card">
          {profile.communities.map((community) => (
            <Link
              key={community.id}
              href={`/communities/${community.slug}`}
              className="grid gap-3 p-5 hover:bg-primary-soft sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="text-base font-bold text-ink">
                  {community.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Joined {formatDate(community.joinedAt)}
                </p>
              </div>
              <span className="w-fit rounded-full border border-line px-3 py-1 text-xs font-bold capitalize text-primary">
                {community.role}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-line bg-card p-6">
          <h3 className="text-xl font-bold">No active community memberships</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Active communities this user joins will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}
