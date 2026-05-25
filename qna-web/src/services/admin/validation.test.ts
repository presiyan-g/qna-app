import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdminValidationError } from './errors';
import {
  normalizeAdminQuery,
  normalizeAdminReason,
  normalizeCommunityPlacementInput,
  normalizeCommunityStatusFilter,
  normalizeUserStatusFilter,
} from './validation';

describe('normalizeAdminReason', () => {
  it('trims valid reasons', () => {
    assert.equal(normalizeAdminReason('  repeated spam  '), 'repeated spam');
  });

  it('rejects blank and very short reasons', () => {
    assert.throws(() => normalizeAdminReason(''), AdminValidationError);
    assert.throws(() => normalizeAdminReason('bad'), AdminValidationError);
  });
});

describe('normalizeAdminQuery', () => {
  it('trims search strings and returns null for blank input', () => {
    assert.equal(normalizeAdminQuery('  test@example.com  '), 'test@example.com');
    assert.equal(normalizeAdminQuery('   '), null);
    assert.equal(normalizeAdminQuery(null), null);
  });
});

describe('normalizeCommunityStatusFilter', () => {
  it('allows active and archived only', () => {
    assert.equal(normalizeCommunityStatusFilter('active'), 'active');
    assert.equal(normalizeCommunityStatusFilter('archived'), 'archived');
    assert.equal(normalizeCommunityStatusFilter(null), 'active');
    assert.throws(
      () => normalizeCommunityStatusFilter('deleted'),
      AdminValidationError,
    );
  });
});

describe('normalizeCommunityPlacementInput', () => {
  it('normalizes featured and browse placement fields', () => {
    assert.deepEqual(
      normalizeCommunityPlacementInput({
        isFeatured: 'on',
        featuredRank: ' 2 ',
        directoryRank: ' 10 ',
      }),
      {
        isFeatured: true,
        featuredRank: 2,
        directoryRank: 10,
      },
    );
  });

  it('clears blank rank fields and ignores featured rank when not featured', () => {
    assert.deepEqual(
      normalizeCommunityPlacementInput({
        isFeatured: null,
        featuredRank: '4',
        directoryRank: '',
      }),
      {
        isFeatured: false,
        featuredRank: null,
        directoryRank: null,
      },
    );
  });

  it('rejects negative or non-integer ranks', () => {
    assert.throws(
      () =>
        normalizeCommunityPlacementInput({
          isFeatured: 'on',
          featuredRank: '-1',
          directoryRank: '3',
        }),
      AdminValidationError,
    );
    assert.throws(
      () =>
        normalizeCommunityPlacementInput({
          isFeatured: 'on',
          featuredRank: '1.5',
          directoryRank: '3',
        }),
      AdminValidationError,
    );
  });
});

describe('normalizeUserStatusFilter', () => {
  it('defaults to all and accepts active, suspended, all', () => {
    assert.equal(normalizeUserStatusFilter(null), 'all');
    assert.equal(normalizeUserStatusFilter(''), 'all');
    assert.equal(normalizeUserStatusFilter('all'), 'all');
    assert.equal(normalizeUserStatusFilter('active'), 'active');
    assert.equal(normalizeUserStatusFilter('suspended'), 'suspended');
  });

  it('rejects unknown values', () => {
    assert.throws(
      () => normalizeUserStatusFilter('banned'),
      AdminValidationError,
    );
  });
});
