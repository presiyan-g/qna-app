import Link from 'next/link';
import type { CommunityWithMembership } from '@/services/communities';
import {
  joinCommunityAction,
  leaveCommunityAction,
} from '@/app/actions/communities';
import {
  formatNewBroadcastsLabel,
  formatNewQuestionsLabel,
} from './communityCardIndicators';

export function CommunityListCard({
  community,
  signedIn,
}: {
  community: CommunityWithMembership;
  signedIn: boolean;
}) {
  const joinAction = joinCommunityAction.bind(null, community.slug);
  const leaveAction = leaveCommunityAction.bind(null, community.slug);

  const showIndicators =
    community.currentUserRole !== null &&
    (community.unansweredQuestionCount > 0 ||
      community.newBroadcastCount > 0);

  return (
    <article className="group relative flex min-h-[220px] cursor-pointer flex-col overflow-hidden rounded-lg border border-line bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary/40">
      {community.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={community.coverImageUrl}
          alt=""
          className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-32 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft via-primary-soft/60 to-paper"
        >
          <span className="select-none truncate px-4 text-5xl font-bold leading-none text-primary/40 transition-transform duration-300 group-hover:scale-110">
            {(community.emoji || community.name.slice(0, 2).toUpperCase()).slice(0, 2)}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-soft text-sm font-bold text-primary">
                <span className="block max-w-full truncate px-1 text-center leading-none">
                  {(community.emoji || community.name.slice(0, 2).toUpperCase()).slice(0, 2)}
                </span>
              </div>
              <div>
                <Link
                  href={`/communities/${community.slug}`}
                  className="text-[17px] font-bold leading-tight text-ink outline-none transition-colors group-hover:text-primary before:absolute before:inset-0 before:z-0 before:rounded-lg before:content-['']"
                >
                  <span className="relative z-10">{community.name}</span>
                </Link>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                  {community.memberCount.toLocaleString('en-US')} members
                </p>
              </div>
            </div>
            <span className="relative z-10 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {formatLabel(community.cadence)}
            </span>
          </header>

          {community.category ? (
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              {community.category.name}
            </p>
          ) : null}

          <p className="mt-4 text-sm leading-6 text-muted">
            {community.description || 'A recurring challenge community.'}
          </p>

          {showIndicators ? (
            <div className="relative z-10 mt-4 flex flex-wrap gap-2">
              {community.unansweredQuestionCount > 0 ? (
                <Link
                  href={`/communities/${community.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-paper"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    aria-hidden
                  />
                  {formatNewQuestionsLabel(community.unansweredQuestionCount)}
                </Link>
              ) : null}
              {community.newBroadcastCount > 0 ? (
                <Link
                  href={`/communities/${community.slug}/broadcasts`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-ink"
                    aria-hidden
                  />
                  {formatNewBroadcastsLabel(community.newBroadcastCount)}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="relative z-10 mt-5 flex items-center gap-2">
          {community.currentUserRole === 'creator' ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 8l4 3 5-7 5 7 4-3-2 11H5L3 8z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              Your community
            </span>
          ) : community.currentUserRole === 'member' ? (
            <>
              <span className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">
                Joined
              </span>
              <form action={leaveAction}>
                <button
                  type="submit"
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  Leave
                </button>
              </form>
            </>
          ) : signedIn ? (
            <form action={joinAction}>
              <button
                type="submit"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:brightness-95"
              >
                Join
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:brightness-95"
            >
              Sign in to join
            </Link>
          )}
        </footer>
      </div>
    </article>
  );
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
