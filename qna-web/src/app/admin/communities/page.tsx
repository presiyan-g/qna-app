import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AdminPermissionError,
  AdminValidationError,
  normalizeCommunityStatusFilter,
  searchAdminCommunities,
} from '@/services/admin';
import { restoreCommunityAction } from '../actions';
import { getSession } from '@/services/auth';
import {
  ArchiveCommunityForm,
  CommunityPlacementForm,
} from '../_components/AdminForms';
import { AdminShell } from '../_components/AdminShell';

type AdminCommunitiesPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AdminCommunitiesPage({
  searchParams,
}: AdminCommunitiesPageProps) {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/communities');

  const params = await searchParams;
  const rawQuery = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const rawStatus = Array.isArray(params?.status)
    ? params?.status[0]
    : params?.status;
  const query = rawQuery?.trim() ?? '';
  const status = getStatusFilter(rawStatus);
  const communities = await loadCommunities(session.sub, query, status);

  return (
    <AdminShell title="Communities">
      <form action="/admin/communities" className="mb-6">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <label htmlFor="admin-community-search" className="sr-only">
            Search communities
          </label>
          <input
            id="admin-community-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by name or slug"
            className="min-h-12 rounded-lg border border-line bg-card px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            name="status"
            defaultValue={status}
            className="min-h-12 rounded-lg border border-line bg-card px-4 text-sm font-semibold text-ink"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-paper"
          >
            Filter
          </button>
          {query || status !== 'active' ? (
            <Link
              href="/admin/communities"
              className="rounded-lg border border-line px-5 py-3 text-center text-sm font-semibold text-ink"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="space-y-4">
        {communities.map((community) => (
          <section
            key={community.id}
            className="grid gap-4 rounded-lg border border-line bg-card p-4 lg:grid-cols-[1fr_340px]"
          >
            <div className="text-sm">
              <Link
                href={`/communities/${community.slug}`}
                className="text-lg font-bold text-primary"
              >
                {community.name}
              </Link>
              <p className="mt-1 text-ink/70">/{community.slug}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <Metric label="Status" value={community.status} />
                <Metric
                  label="Creator"
                  value={`@${community.creatorUsername}`}
                />
                <Metric
                  label="Members"
                  value={community.memberCount.toLocaleString('en-US')}
                />
                <Metric
                  label="Created"
                  value={community.createdAt.toLocaleDateString('en-US')}
                />
                <Metric
                  label="Featured"
                  value={
                    community.isFeatured
                      ? `Yes - ${formatRank(community.featuredRank)}`
                      : 'No'
                  }
                />
                <Metric
                  label="Browse"
                  value={formatRank(community.directoryRank)}
                />
              </div>
            </div>
            <div className="space-y-4">
              {community.status === 'active' ? (
                <>
                  <CommunityPlacementForm community={community} />
                  <ArchiveCommunityForm communityId={community.id} />
                </>
              ) : (
                <form action={restoreCommunityAction.bind(null, community.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink"
                  >
                    Restore community
                  </button>
                </form>
              )}
            </div>
          </section>
        ))}
        {communities.length === 0 ? (
          <p className="rounded-lg border border-line bg-card p-6 text-sm text-ink/70">
            No communities found.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}

function getStatusFilter(value: unknown): 'active' | 'archived' {
  try {
    return normalizeCommunityStatusFilter(value);
  } catch (err) {
    if (err instanceof AdminValidationError) return 'active';
    throw err;
  }
}

async function loadCommunities(
  actorUserId: string,
  q: string,
  status: 'active' | 'archived',
) {
  try {
    return await searchAdminCommunities({ actorUserId, q, status });
  } catch (err) {
    if (err instanceof AdminPermissionError) notFound();
    throw err;
  }
}

function formatRank(value: number | null): string {
  return value == null ? 'Unranked' : value.toLocaleString('en-US');
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {label}
      </p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
