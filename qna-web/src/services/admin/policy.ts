import {
  AccountSuspendedError,
  AdminInvariantError,
  AdminPermissionError,
} from './errors';

export type PlatformRole = 'member' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export type AdminActor = {
  role: PlatformRole;
  status: AccountStatus;
} | null;

export function canAccessAdmin(actor: AdminActor): boolean {
  return actor?.role === 'admin' && actor.status === 'active';
}

export function assertActiveAdmin(actor: AdminActor): void {
  if (!canAccessAdmin(actor)) {
    throw new AdminPermissionError();
  }
}

export function assertUserCanMutate(user: { status: AccountStatus }): void {
  if (user.status === 'suspended') {
    throw new AccountSuspendedError();
  }
}

export function assertCanSuspendTargetUser({
  actorUserId,
  targetUserId,
  targetRole,
  activeAdminCount,
}: {
  actorUserId: string;
  targetUserId: string;
  targetRole: PlatformRole;
  activeAdminCount: number;
}): void {
  if (actorUserId === targetUserId) {
    throw new AdminInvariantError('You cannot suspend your own account.');
  }

  if (targetRole === 'admin' && activeAdminCount <= 1) {
    throw new AdminInvariantError(
      'At least one active admin must remain on the platform.',
    );
  }
}
