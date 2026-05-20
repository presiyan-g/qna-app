import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AdminNotFoundError,
  AdminPermissionError,
  getAdminUserDetail,
} from '@/services/admin';
import { getSession } from '@/services/auth';
import {
  promoteUserToAdminAction,
  unsuspendUserAction,
} from '../../actions';
import { AdminShell } from '../../_components/AdminShell';
import { SuspendUserForm } from '../../_components/AdminForms';

type AdminUserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/users');

  const { id } = await params;
  const detail = await loadUserDetail(session.sub, id);

  return (
    <AdminShell title={`@${detail.user.username}`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-line bg-card p-5">
          <h2 className="text-xl font-bold">Account</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Email" value={detail.user.email} />
            <Field label="Role" value={detail.user.role} />
            <Field label="Status" value={detail.user.status} />
            <Field
              label="Joined"
              value={detail.user.createdAt.toLocaleDateString('en-US')}
            />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {detail.user.role !== 'admin' ? (
              <form action={promoteUserToAdminAction.bind(null, detail.user.id)}>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-paper"
                >
                  Promote to admin
                </button>
              </form>
            ) : null}
            {detail.user.status === 'suspended' ? (
              <form action={unsuspendUserAction.bind(null, detail.user.id)}>
                <button
                  type="submit"
                  className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink"
                >
                  Unsuspend user
                </button>
              </form>
            ) : null}
          </div>

          {detail.user.status === 'active' ? (
            <div className="mt-6">
              <SuspendUserForm userId={detail.user.id} />
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-line bg-card p-5">
          <h2 className="text-xl font-bold">Communities</h2>
          <div className="mt-4 space-y-3">
            {detail.memberships.map((membership) => (
              <div
                key={membership.id}
                className="rounded-lg border border-line bg-paper p-3 text-sm"
              >
                <Link
                  href={`/communities/${membership.communitySlug}`}
                  className="font-bold text-primary"
                >
                  {membership.communityName}
                </Link>
                <p className="mt-1 text-ink/70">
                  {membership.role} - {membership.communityStatus} - joined{' '}
                  {membership.joinedAt.toLocaleDateString('en-US')}
                </p>
              </div>
            ))}
            {detail.memberships.length === 0 ? (
              <p className="text-sm text-ink/70">No memberships yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

async function loadUserDetail(actorUserId: string, targetUserId: string) {
  try {
    return await getAdminUserDetail({ actorUserId, targetUserId });
  } catch (err) {
    if (
      err instanceof AdminPermissionError ||
      err instanceof AdminNotFoundError
    ) {
      notFound();
    }
    throw err;
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
