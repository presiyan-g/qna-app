import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { EmptyState } from '@/app/_components/EmptyState';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import {
  getCommunityLeaderboard,
  normalizeLeaderboardWindow,
  type LeaderboardEntry,
  type LeaderboardWindow,
} from '@/services/leaderboard';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
};

const WINDOWS: { value: LeaderboardWindow; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All-time' },
];

export default async function CommunityLeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, query, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);

  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();
  const isAdmin = session?.role === 'admin';
  const isMember =
    community.currentUserRole === 'member' || community.currentUserRole === 'creator';
  if (!isMember && !isAdmin) {
    redirect(`/communities/${slug}/about`);
  }

  const window = normalizeLeaderboardWindow(query.window);
  const leaderboard = await getCommunityLeaderboard({ slug, window });
  if (!leaderboard) notFound();

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-end">
        <WindowLinks slug={leaderboard.community.slug} current={window} />
      </div>

      <section className="mt-8">
        {leaderboard.entries.length > 0 ? (
          <div className="divide-y divide-line rounded-lg border border-line bg-card">
            {leaderboard.entries.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No scores"
            titleAccent="yet."
            description="This window has no point-awarding answers. Try a different time range or come back after the next question closes."
          />
        )}
      </section>
    </>
  );
}

function WindowLinks({
  slug,
  current,
}: {
  slug: string;
  current: LeaderboardWindow;
}) {
  return (
    <nav className="flex rounded-full border border-line bg-card p-1">
      {WINDOWS.map((item) => (
        <Link
          key={item.value}
          href={`/communities/${slug}/leaderboard?window=${item.value}`}
          className={
            item.value === current
              ? 'rounded-full bg-primary px-4 py-2 text-sm font-bold text-paper'
              : 'rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink'
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="grid grid-cols-[48px_1fr_auto] items-center gap-4 p-4 sm:grid-cols-[64px_1fr_140px_180px] sm:p-5">
      <div className="text-2xl font-bold text-primary">#{entry.rank}</div>
      <div>
        <Link
          href={`/users/${entry.username}`}
          className="text-base font-bold text-ink hover:text-primary hover:underline"
        >
          {entry.username}
        </Link>
        <p className="text-xs text-muted sm:hidden">
          Last scored {formatGmtDate(entry.lastScoringAnswerAt)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold">{entry.points}</p>
        <p className="text-xs text-muted">points</p>
      </div>
      <div className="hidden text-right text-sm text-muted sm:block">
        {formatGmtDate(entry.lastScoringAnswerAt)}
      </div>
    </div>
  );
}

function formatGmtDate(value: Date): string {
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
