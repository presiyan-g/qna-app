import { AdminValidationError } from './errors';

export type CommunityStatusFilter = 'active' | 'archived';
export type UserStatusFilter = 'all' | 'active' | 'suspended';

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

export function normalizeAdminReason(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AdminValidationError({ reason: 'Enter a reason.' });
  }

  const reason = value.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    throw new AdminValidationError({
      reason: 'Enter a reason with at least 5 characters.',
    });
  }
  if (reason.length > MAX_REASON_LENGTH) {
    throw new AdminValidationError({
      reason: 'Keep the reason under 500 characters.',
    });
  }
  return reason;
}

export function normalizeAdminQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const query = value.trim();
  return query.length > 0 ? query : null;
}

export function normalizeCommunityStatusFilter(
  value: unknown,
): CommunityStatusFilter {
  if (value == null || value === '') return 'active';
  if (value === 'active' || value === 'archived') return value;
  throw new AdminValidationError({
    status: 'Choose active or archived communities.',
  });
}

export function normalizeUserStatusFilter(value: unknown): UserStatusFilter {
  if (value == null || value === '' || value === 'all') return 'all';
  if (value === 'active' || value === 'suspended') return value;
  throw new AdminValidationError({
    status: 'Choose all, active, or suspended users.',
  });
}
