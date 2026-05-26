import Link from 'next/link';
import type { CommunityWithMembership } from '@/services/communities';
import { getLatestCommunityBroadcastForCommunity } from '@/services/broadcasts';
import { getCommunityLeaderboard } from '@/services/leaderboard';
import { getCommunityStreakForViewer } from '@/services/profiles';
import { CommunityStreakRibbon } from './CommunityStreakRibbon';

export async function CommunitySidebar({
  community,
  viewerUserId,
}: {
  community: CommunityWithMembership;
  viewerUserId: string | null;
}) {
  // Creators see a streak in communities they're members of, but
  // not in communities they themselves run — they don't answer
  // their own questions. Members get a real streak; visitors get
  // the "Join to start a streak" teaser (no DB hit).
  const isMember = community.currentUserRole === 'member';
  const [latestBroadcast, leaderboard, streak] = await Promise.all([
    getLatestCommunityBroadcastForCommunity({ community, viewerUserId }),
    getCommunityLeaderboard({ slug: community.slug, window: 'all', viewerUserId }),
    isMember && viewerUserId
      ? getCommunityStreakForViewer({
          communityId: community.id,
          userId: viewerUserId,
        })
      : Promise.resolve(null),
  ]);

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Latest broadcast
        </p>
        {latestBroadcast ? (
          <>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink">
              {latestBroadcast.body}
            </p>
            <p className="mt-3 text-[12px] text-muted">
              {latestBroadcast.author.username} ·{' '}
              {formatRelative(latestBroadcast.publishedAt)}
            </p>
            <Link
              href={`/communities/${community.slug}/broadcasts/${latestBroadcast.id}`}
              className="mt-3 inline-block text-sm font-semibold text-action-lake transition-colors duration-150 ease-out hover:text-action-lake-hover hover:underline"
            >
              Open broadcast →
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">No broadcasts yet.</p>
        )}
      </div>

      {/* Streak ribbon — only shown for members (or as a "join to
          start" teaser to non-members). Creators of this community
          hide it: they don't answer their own questions. */}
      {community.currentUserRole !== 'creator' && (
        <CommunityStreakRibbon
          streak={streak}
          isMember={isMember}
          slug={community.slug}
        />
      )}

      <div className="rounded-lg border border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Leaderboard · all-time
        </p>
        {leaderboard && leaderboard.entries.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {leaderboard.entries.slice(0, 3).map((entry, index) => (
              <li
                key={entry.userId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">
                  <span className="font-bold">{index + 1}.</span> @{entry.username}
                </span>
                <b className="font-bold text-ink">{entry.points}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No scores yet.</p>
        )}
        <Link
          href={`/communities/${community.slug}/leaderboard`}
          className="mt-3 inline-block text-sm font-semibold text-action-lake transition-colors duration-150 ease-out hover:text-action-lake-hover hover:underline"
        >
          View full leaderboard →
        </Link>
      </div>
    </aside>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
