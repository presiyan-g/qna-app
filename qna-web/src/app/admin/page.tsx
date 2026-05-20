import { notFound, redirect } from 'next/navigation';
import {
  AdminPermissionError,
  getAdminOverview,
  listAdminAuditLogs,
} from '@/services/admin';
import { getSession } from '@/services/auth';
import { AdminShell } from './_components/AdminShell';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  const data = await loadAdminPage(session.sub);

  return (
    <AdminShell title="Platform admin">
      <div className="grid gap-3 sm:grid-cols-4">
        <Summary label="Users" value={data.overview.totalUsers} />
        <Summary label="Suspended" value={data.overview.suspendedUsers} />
        <Summary
          label="Active communities"
          value={data.overview.activeCommunities}
        />
        <Summary label="Archived" value={data.overview.archivedCommunities} />
      </div>
      <section className="mt-8 rounded-lg border border-line bg-card p-5">
        <h2 className="text-xl font-bold">Recent admin actions</h2>
        <div className="mt-4 space-y-3">
          {data.logs.map(({ log, actorUsername }) => (
            <div
              key={log.id}
              className="border-t border-line pt-3 text-sm first:border-t-0 first:pt-0"
            >
              <p className="font-bold">{log.action.replaceAll('_', ' ')}</p>
              <p className="text-ink/70">
                {actorUsername} - {log.createdAt.toLocaleString('en-US')} -{' '}
                {log.reason}
              </p>
            </div>
          ))}
          {data.logs.length === 0 ? (
            <p className="text-sm text-ink/70">No admin actions yet.</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}

async function loadAdminPage(actorUserId: string) {
  try {
    const [overview, logs] = await Promise.all([
      getAdminOverview({ actorUserId }),
      listAdminAuditLogs({ actorUserId, limit: 10 }),
    ]);
    return { overview, logs };
  } catch (err) {
    if (err instanceof AdminPermissionError) notFound();
    throw err;
  }
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString('en-US')}</p>
    </div>
  );
}
