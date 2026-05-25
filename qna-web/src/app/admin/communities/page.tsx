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
import { Pagination } from '@/app/_components/Pagination';
import { parsePageParam } from '@/lib/pagination';
import {
  ArchiveCommunityForm,
  CommunityPlacementForm,
} from '../_components/AdminForms';
import { AdminShell } from '../_components/AdminShell';

const PAGE_SIZE = 20;

type AdminCommunitiesPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
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
  const page = parsePageParam(params?.page);
  const { items: communities, totalCount } = await loadCommunities(
    session.sub,
    query,
    status,
    page,
  );

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

      <div className="overflow-hidden rounded-lg border border-line bg-card">
        <div className="hidden grid-cols-[minmax(200px,1.4fr)_100px_130px_90px_minmax(390px,2fr)] gap-4 border-b border-line bg-primary-soft/35 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary xl:grid">
          <span>Community</span>
          <span>Status</span>
          <span>Creator</span>
          <span>Members</span>
          <span>Placement</span>
        </div>
        {communities.map((community) => (
          <article
            key={community.id}
            className="border-t-2 border-primary/20 bg-card first:border-t-0"
          >
            <div className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(200px,1.4fr)_100px_130px_90px_minmax(390px,2fr)]">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <CommunityIcon
                    emoji={community.emoji}
                    name={community.name}
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/communities/${community.slug}`}
                      className="block truncate text-base font-bold text-primary"
                    >
                      {community.name}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-ink/65">
                      /{community.slug}
                    </p>
                  </div>
                </div>
              </div>
              <AdminField label="Status">
                <Badge>{community.status}</Badge>
              </AdminField>
              <AdminField label="Creator">
                <span className="font-semibold">@{community.creatorUsername}</span>
              </AdminField>
              <AdminField label="Members">
                <span className="font-semibold">
                  {community.memberCount.toLocaleString('en-US')}
                </span>
              </AdminField>
              <div className="xl:self-start">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary xl:hidden">
                  Placement
                </p>
                {community.status === 'active' ? (
                  <CommunityPlacementForm community={community} />
                ) : (
                  <div className="text-sm text-ink/70">
                    Featured {formatRank(community.featuredRank)} - Browse{' '}
                    {formatRank(community.directoryRank)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-3 border-t border-line bg-primary-soft/15 px-4 py-3">
              <details className="group">
                <summary className="inline-flex w-fit cursor-pointer select-none items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary [&::-webkit-details-marker]:hidden">
                  Preview
                </summary>
                <CommunityPreview community={community} />
              </details>
              <div>
                {community.status === 'active' ? (
                  <ArchiveDisclosure communityId={community.id} />
                ) : (
                  <form action={restoreCommunityAction.bind(null, community.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink"
                    >
                      Restore
                    </button>
                  </form>
                )}
              </div>
            </div>
          </article>
        ))}
        {communities.length === 0 ? (
          <p className="p-6 text-sm text-ink/70">
            No communities found.
          </p>
        ) : null}
      </div>
      <Pagination
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        baseHref="/admin/communities"
        queryParams={{ q: query, status }}
        itemLabel="communities"
      />
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
  page: number,
) {
  try {
    return await searchAdminCommunities({
      actorUserId,
      q,
      status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  } catch (err) {
    if (err instanceof AdminPermissionError) notFound();
    throw err;
  }
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-sm">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary xl:hidden">
        {label}
      </p>
      {children}
    </div>
  );
}

function ArchiveDisclosure({ communityId }: { communityId: string }) {
  return (
    <details className="w-full xl:w-auto">
      <summary className="w-fit cursor-pointer select-none list-none rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary [&::-webkit-details-marker]:hidden">
        Archive
      </summary>
      <div className="mt-3 min-w-[280px]">
        <ArchiveCommunityForm communityId={communityId} />
      </div>
    </details>
  );
}

function CommunityPreview({
  community,
}: {
  community: Awaited<ReturnType<typeof loadCommunities>>['items'][number];
}) {
  return (
    <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr]">
      {community.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={community.coverImageUrl}
          alt=""
          className="aspect-[16/9] w-full rounded-lg border border-line object-cover"
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-line bg-primary-soft text-4xl font-bold text-primary/50">
          {(community.emoji || community.name.slice(0, 2).toUpperCase()).slice(
            0,
            2,
          )}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CommunityIcon emoji={community.emoji} name={community.name} />
          <h2 className="text-lg font-bold">{community.name}</h2>
          <Badge>{community.cadence}</Badge>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
          {community.description || 'No description.'}
        </p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <PreviewMetric label="Created" value={community.createdAt.toLocaleDateString('en-US')} />
          <PreviewMetric label="Members" value={community.memberCount.toLocaleString('en-US')} />
          <PreviewMetric label="Featured" value={community.isFeatured ? formatRank(community.featuredRank) : 'No'} />
          <PreviewMetric label="Browse" value={formatRank(community.directoryRank)} />
        </div>
      </div>
    </div>
  );
}

function CommunityIcon({ emoji, name }: { emoji: string; name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-soft text-sm font-bold text-primary">
      <span className="block max-w-full truncate px-1 text-center leading-none">
        {(emoji || name.slice(0, 2).toUpperCase()).slice(0, 2)}
      </span>
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-lg border border-line px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">
      {children}
    </span>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatRank(value: number | null): string {
  return value == null ? 'Unranked' : value.toLocaleString('en-US');
}
