'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  AdminInvariantError,
  AdminNotFoundError,
  AdminPermissionError,
  AdminValidationError,
  archiveCommunity,
  promoteUserToAdmin,
  restoreCommunity,
  suspendUser,
  unsuspendUser,
  updateCommunityPlacement,
} from '@/services/admin';
import { getSession } from '@/services/auth';

export type AdminActionState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<
    Record<'reason' | 'featuredRank' | 'directoryRank', string>
  >;
};

const INITIAL_OK: AdminActionState = { ok: true };

export async function promoteUserToAdminAction(
  targetUserId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  await promoteUserToAdmin({ actorUserId: session.sub, targetUserId });
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function suspendUserAction(
  targetUserId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  try {
    await suspendUser({
      actorUserId: session.sub,
      targetUserId,
      reason: formData.get('reason'),
    });
  } catch (err) {
    return toAdminActionError(err);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${targetUserId}`);
  return INITIAL_OK;
}

export async function unsuspendUserAction(
  targetUserId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  await unsuspendUser({ actorUserId: session.sub, targetUserId });
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function archiveCommunityAction(
  communityId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  try {
    await archiveCommunity({
      actorUserId: session.sub,
      communityId,
      reason: formData.get('reason'),
    });
  } catch (err) {
    return toAdminActionError(err);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/communities');
  revalidatePath('/communities');
  return INITIAL_OK;
}

export async function restoreCommunityAction(
  communityId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  await restoreCommunity({ actorUserId: session.sub, communityId });
  revalidatePath('/admin');
  revalidatePath('/admin/communities');
  revalidatePath('/communities');
}

export async function updateCommunityPlacementAction(
  communityId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin');

  try {
    await updateCommunityPlacement({
      actorUserId: session.sub,
      communityId,
      input: {
        isFeatured: formData.get('isFeatured'),
        featuredRank: formData.get('featuredRank'),
        directoryRank: formData.get('directoryRank'),
      },
    });
  } catch (err) {
    return toAdminActionError(err);
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/communities');
  revalidatePath('/communities');
  return INITIAL_OK;
}

function toAdminActionError(err: unknown): AdminActionState {
  if (err instanceof AdminValidationError) {
    return { ok: false, fieldErrors: err.fieldErrors };
  }
  if (
    err instanceof AdminInvariantError ||
    err instanceof AdminNotFoundError ||
    err instanceof AdminPermissionError
  ) {
    return { ok: false, formError: err.message };
  }
  throw err;
}
