import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AdminPermissionError,
  AdminValidationError,
  normalizeUserStatusFilter,
  searchAdminUsers,
  type UserStatusFilter,
} from '@/services/admin';
import { getSession } from '@/services/auth';
import { AdminShell } from '../_components/AdminShell';

type AdminUsersPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/users');

  const params = await searchParams;
  const rawQuery = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const rawStatus = Array.isArray(params?.status)
    ? params?.status[0]
    : params?.status;
  const query = rawQuery?.trim() ?? '';
  const status = getStatusFilter(rawStatus);
  const users = await loadUsers(session.sub, query, status);

  const hasFilters = query.length > 0 || status !== 'all';

  return (
    <AdminShell title="Users">
      <form action="/admin/users" className="mb-6">
        <label htmlFor="admin-user-search" className="sr-only">
          Search users
        </label>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <input
            id="admin-user-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by email or username"
            className="min-h-12 rounded-lg border border-line bg-card px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <label htmlFor="admin-user-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="admin-user-status"
            name="status"
            defaultValue={status}
            className="min-h-12 rounded-lg border border-line bg-card px-4 text-sm font-semibold text-ink"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-paper"
          >
            Filter
          </button>
          {hasFilters ? (
            <Link
              href="/admin/users"
              className="rounded-lg border border-line px-5 py-3 text-center text-sm font-semibold text-ink"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-line bg-card">
        {users.map((user) => (
          <div
            key={user.id}
            className="grid gap-3 border-t border-line p-4 text-sm first:border-t-0 md:grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr_0.8fr_auto] md:items-center"
          >
            <div>
              <p className="font-bold">@{user.username}</p>
              <p className="text-ink/60">
                Joined {user.createdAt.toLocaleDateString('en-US')}
              </p>
            </div>
            <p className="break-all text-ink/80">{user.email}</p>
            <Badge>{user.role}</Badge>
            <Badge>{user.status}</Badge>
            <p className="font-semibold">
              {user.membershipCount.toLocaleString('en-US')} memberships
            </p>
            <Link
              href={`/admin/users/${user.id}`}
              className="rounded-lg border border-line px-3 py-2 text-center font-bold"
            >
              View
            </Link>
          </div>
        ))}
        {users.length === 0 ? (
          <p className="p-6 text-sm text-ink/70">No users found.</p>
        ) : null}
      </div>
    </AdminShell>
  );
}

function getStatusFilter(value: unknown): UserStatusFilter {
  try {
    return normalizeUserStatusFilter(value);
  } catch (err) {
    if (err instanceof AdminValidationError) return 'all';
    throw err;
  }
}

async function loadUsers(
  actorUserId: string,
  q: string,
  status: UserStatusFilter,
) {
  try {
    return await searchAdminUsers({ actorUserId, q, status });
  } catch (err) {
    if (err instanceof AdminPermissionError) notFound();
    throw err;
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-lg border border-line px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">
      {children}
    </span>
  );
}
