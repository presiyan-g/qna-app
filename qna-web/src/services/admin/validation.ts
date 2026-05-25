import { AdminValidationError } from './errors';

export type CommunityStatusFilter = 'active' | 'archived';
export type CommunityPlacementInput = {
  isFeatured: boolean;
  featuredRank: number | null;
  directoryRank: number | null;
};
export type UserStatusFilter = 'all' | 'active' | 'suspended';

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;
const MAX_RANK = 9999;

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

export function normalizeCommunityPlacementInput(input: {
  isFeatured: unknown;
  featuredRank: unknown;
  directoryRank: unknown;
}): CommunityPlacementInput {
  const isFeatured = input.isFeatured === 'on' || input.isFeatured === true;

  return {
    isFeatured,
    featuredRank: isFeatured
      ? normalizeRank(input.featuredRank, 'featuredRank')
      : null,
    directoryRank: normalizeRank(input.directoryRank, 'directoryRank'),
  };
}

export function normalizeUserStatusFilter(value: unknown): UserStatusFilter {
  if (value == null || value === '' || value === 'all') return 'all';
  if (value === 'active' || value === 'suspended') return value;
  throw new AdminValidationError({
    status: 'Choose all, active, or suspended users.',
  });
}

function normalizeRank(
  value: unknown,
  field: 'featuredRank' | 'directoryRank',
): number | null {
  if (value == null) return null;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AdminValidationError({
      [field]: 'Enter a whole number, or leave it blank.',
    });
  }

  const raw = String(value).trim();
  if (!raw) return null;
  const rank = Number(raw);
  if (!Number.isInteger(rank) || rank < 0 || rank > MAX_RANK) {
    throw new AdminValidationError({
      [field]: `Enter a whole number from 0 to ${MAX_RANK}, or leave it blank.`,
    });
  }
  return rank;
}
