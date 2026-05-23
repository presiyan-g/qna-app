import Link from 'next/link';
import {
  joinCommunityAction,
  leaveCommunityAction,
} from '@/app/actions/communities';
import type { CommunityWithMembership } from '@/services/communities';

export function CommunityHeader({
  community,
  signedIn,
}: {
  community: CommunityWithMembership;
  signedIn: boolean;
}) {
  return (
    <div>
      {community.coverImageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={community.coverImageUrl}
          alt=""
          className="h-[200px] w-full rounded-xl border border-line object-cover"
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-[88px_1fr_auto] sm:items-end sm:gap-6">
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft text-3xl font-bold text-primary">
          <span className="block max-w-full truncate px-2 text-center leading-none">
            {(community.emoji || community.name.slice(0, 2).toUpperCase()).slice(0, 2)}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {community.category
              ? `${community.category.name} · ${formatLabel(community.cadence)} challenge`
              : `${formatLabel(community.cadence)} challenge`}
          </p>
          <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight md:text-[42px]">
            {community.name}
          </h1>
          {community.description && (
            <p className="mt-2 line-clamp-2 max-w-[640px] text-sm leading-6 text-muted">
              {community.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span>
              <b className="font-semibold text-ink">{community.memberCount.toLocaleString('en-US')}</b>{' '}
              members
            </span>
            <span aria-hidden>·</span>
            <span>
              <b className="font-semibold text-ink">{community.liveQuestionCount.toLocaleString('en-US')}</b>{' '}
              open
            </span>
          </div>
        </div>

        <CommunityHeaderAction community={community} signedIn={signedIn} />
      </div>
    </div>
  );
}

function CommunityHeaderAction({
  community,
  signedIn,
}: {
  community: CommunityWithMembership;
  signedIn: boolean;
}) {
  if (community.currentUserRole === 'creator') {
    return (
      <span className="text-sm text-muted">You&rsquo;re the creator</span>
    );
  }
  if (community.currentUserRole === 'member') {
    const leaveAction = leaveCommunityAction.bind(null, community.slug);
    return (
      <form action={leaveAction} className="flex items-center gap-2">
        <span className="rounded-full bg-primary-soft px-5 py-2.5 text-sm font-semibold text-primary">
          ✓ Joined
        </span>
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          Leave
        </button>
      </form>
    );
  }
  if (signedIn) {
    const joinAction = joinCommunityAction.bind(null, community.slug);
    return (
      <form action={joinAction}>
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper"
        >
          Join community
        </button>
      </form>
    );
  }
  return (
    <Link
      href="/login"
      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper"
    >
      Sign in to join
    </Link>
  );
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
