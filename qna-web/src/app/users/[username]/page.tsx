import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import {
  getPublicUserProfileByUsername,
  type PublicUserProfile,
} from '@/services/profiles';
import { StreakRibbon } from './_components/StreakRibbon';

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
      <section className="px-6 py-12 md:px-12 md:py-14">
        <div className="mx-auto max-w-[1100px]">
          <ProfileHeader profile={profile} />
          <StatRow profile={profile} />
          <ActivityAndMemberships profile={profile} />
        </div>
      </section>
      <Footer />
    </main>
  );
}

/**
 * Hero block: avatar tile · eyebrow + big handle + joined date.
 * Matches the design's `.q-layout-header` (88px · 1fr · auto). On
 * small screens the avatar shrinks and the row stacks naturally
 * via flex-wrap rather than a separate grid breakpoint.
 */
function ProfileHeader({ profile }: { profile: PublicUserProfile }) {
  const initials = profile.user.username.slice(0, 2).toUpperCase();
  return (
    <header className="flex flex-wrap items-end gap-5 sm:gap-7">
      <div
        className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft text-2xl font-bold text-primary sm:h-[88px] sm:w-[88px] sm:text-[28px]"
        aria-hidden
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Profile
        </p>
        <h1 className="mt-2 break-all text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px] md:text-[42px]">
          @{profile.user.username}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Joined {formatDate(profile.user.joinedAt)}
        </p>
      </div>
    </header>
  );
}

/**
 * Three-up stat tiles: Total points, Current streak, Memberships.
 * Each tile mirrors the design's q-card with eyebrow + 36px display
 * number + muted caption.
 */
function StatRow({ profile }: { profile: PublicUserProfile }) {
  // The "creator role" count is a secondary fact, not surfaced in the
  // stats data we already aggregate. Cheap to derive from the
  // communities list rather than threading another value through
  // the service.
  const creatorCount = profile.communities.filter(
    (c) => c.role === 'creator',
  ).length;
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      <StatTile
        eyebrow="Total points"
        value={profile.stats.totalPoints.toLocaleString('en-US')}
        caption={`across ${profile.stats.communityCount} ${pluralize(profile.stats.communityCount, 'community', 'communities')}`}
      />
      <StatTile
        eyebrow="Current streak"
        value={profile.streak.currentStreak}
        valueSuffix="days"
        valueColor="text-primary"
        caption={
          <>
            longest · <b className="font-bold text-ink">{profile.streak.longestStreak}</b>
          </>
        }
      />
      <StatTile
        eyebrow="Memberships"
        value={profile.stats.communityCount}
        caption={
          creatorCount > 0 ? (
            <>
              including{' '}
              <b className="font-bold text-ink">
                {creatorCount} creator {pluralize(creatorCount, 'role', 'roles')}
              </b>
            </>
          ) : (
            'all member roles'
          )
        }
      />
    </div>
  );
}

function StatTile({
  eyebrow,
  value,
  valueSuffix,
  valueColor,
  caption,
}: {
  eyebrow: string;
  value: number | string;
  valueSuffix?: string;
  valueColor?: string;
  caption: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {eyebrow}
      </p>
      <p
        className={`mt-2 text-[36px] font-bold leading-none tracking-[-0.02em] ${valueColor ?? ''}`}
      >
        {value}
        {valueSuffix ? (
          <span className="ml-2 align-middle text-sm font-normal text-muted">
            {valueSuffix}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-muted">{caption}</p>
    </div>
  );
}

/**
 * Two-column lower section:
 *   left  → Activity ribbon (last 30 days)
 *   right → Communities list with creator-role accent
 *
 * Collapses to a single column under 900px (md breakpoint) per the
 * design's q-layout-2col-r rule.
 */
function ActivityAndMemberships({ profile }: { profile: PublicUserProfile }) {
  const activeDays = profile.streak.days.filter((d) => d.level > 0).length;
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-[1fr_320px]">
      <div className="rounded-[14px] border border-line bg-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Activity · last 30 days
          </p>
          <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted">
            {activeDays}/{profile.streak.days.length} active
          </span>
        </div>
        <div className="mt-4">
          <StreakRibbon streak={profile.streak} />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          You&rsquo;ve shown up{' '}
          <b className="font-bold text-ink">
            {activeDays} of the last {profile.streak.days.length} days
          </b>
          . Longest run is{' '}
          <b className="font-bold text-ink">
            {profile.streak.longestStreak} {pluralize(profile.streak.longestStreak, 'day', 'days')}
          </b>
          . <span className="serif-italic">Keep going.</span>
        </p>
      </div>

      <CommunityMemberships profile={profile} />
    </div>
  );
}

function CommunityMemberships({ profile }: { profile: PublicUserProfile }) {
  if (profile.communities.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-line bg-card p-6 text-center">
        <h3 className="text-base font-bold">
          No memberships <span className="serif-italic">yet.</span>
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Communities this user joins will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[14px] border border-line bg-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Communities
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {profile.communities.map((community) => (
          <li key={community.id}>
            <Link
              href={`/communities/${community.slug}`}
              className="flex items-center gap-3 rounded-[10px] p-2.5 transition-colors duration-150 ease-out hover:bg-primary-soft"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-bold text-primary"
              >
                {community.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold leading-tight">
                  {community.name}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {community.role === 'creator' ? (
                    <span
                      className="font-bold"
                      style={{ color: 'var(--color-action-clay-hover)' }}
                    >
                      Creator
                    </span>
                  ) : (
                    'Member'
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}
