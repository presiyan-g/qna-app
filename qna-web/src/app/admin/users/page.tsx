import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AdminPermissionError,
  searchAdminUsers,
} from '@/services/admin';
import { getSession } from '@/services/auth';
import { AdminShell } from '../_components/AdminShell';

type AdminUsersPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
  }>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/users');

  const params = await searchParams;
  const rawQuery = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const query = rawQuery?.trim() ?? '';
  const users = await loadUsers(session.sub, query);

  return (
    <AdminShell title="Users">
      <form action="/admin/users" className="mb-6">
        <label htmlFor="admin-user-search" className="sr-only">
          Search users
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="admin-user-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by email or username"
            className="min-h-12 flex-1 rounded-lg border border-line bg-card px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-paper"
          >
            Search
          </button>
          {query ? (
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

async function loadUsers(actorUserId: string, q: string) {
  try {
    return await searchAdminUsers({ actorUserId, q });
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
