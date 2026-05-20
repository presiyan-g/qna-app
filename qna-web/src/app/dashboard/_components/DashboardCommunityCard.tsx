import Link from 'next/link';
import type { CreatorDashboardCommunity } from '@/services/questions';

const STATUS_LABELS: Record<CreatorDashboardCommunity['todayQuestionStatus'], string> = {
  live: 'Live today',
  scheduled_today: 'Scheduled today',
  missing_today: 'Missing today',
  closed_today: 'Closed today',
};

export function DashboardCommunityCard({
  community,
}: {
  community: CreatorDashboardCommunity;
}) {
  return (
    <article className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-lg font-bold text-primary">
          {community.emoji || community.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {community.cadence} challenge
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-tight">
            {community.name}
          </h2>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Signal label="Members" value={community.memberCount.toLocaleString('en-US')} />
        <Signal
          label="Today"
          value={STATUS_LABELS[community.todayQuestionStatus]}
        />
        <Signal
          label="Next question"
          value={
            community.nextQuestionAt
              ? formatGmtDate(community.nextQuestionAt)
              : 'Not scheduled'
          }
        />
        <Signal
          label="Latest broadcast"
          value={
            community.latestBroadcastAt
              ? formatGmtDate(community.latestBroadcastAt)
              : 'None yet'
          }
        />
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/dashboard/communities/${community.slug}`}
          className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-paper"
        >
          Manage questions
        </Link>
        <Link
          href={`/communities/${community.slug}`}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          Public page
        </Link>
        <Link
          href={`/communities/${community.slug}/broadcasts`}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          Broadcasts
        </Link>
      </div>
    </article>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}

function formatGmtDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(value);
}
