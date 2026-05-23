import Link from 'next/link';
import { notFound } from 'next/navigation';
import { joinCommunityAction } from '@/app/actions/communities';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityAboutPage({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  const isVisitor = community.currentUserRole === null;

  return (
    <div className="grid max-w-[720px] gap-6">
      <section className="rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          About this community
        </p>
        <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-ink">
          {community.description || 'No description yet.'}
        </p>
      </section>

      <section className="rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          At a glance
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <Glance label="Cadence" value={formatLabel(community.cadence)} />
          {community.category && (
            <Glance label="Category" value={community.category.name} />
          )}
          <Glance
            label="Members"
            value={community.memberCount.toLocaleString('en-US')}
          />
          <Glance
            label="Open questions"
            value={community.liveQuestionCount.toLocaleString('en-US')}
          />
          <Glance label="Created" value={formatRelative(community.createdAt)} />
        </dl>
      </section>

      {isVisitor && (
        <section className="rounded-lg border border-primary/30 bg-primary-soft p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Join the community
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Members answer the daily challenge
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Join to answer questions, see results, and post broadcasts.
          </p>
          {session ? (
            <form action={joinCommunityAction.bind(null, slug)}>
              <button
                type="submit"
                className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-paper"
              >
                Join community
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-paper"
            >
              Sign in to join
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function Glance({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDay = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDay < 1) return 'today';
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
  const diffYear = Math.round(diffMonth / 12);
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}
