import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getLeaderboardWindowStart,
  normalizeLeaderboardWindow,
} from './windows';

describe('normalizeLeaderboardWindow', () => {
  it('accepts supported URL values', () => {
    assert.equal(normalizeLeaderboardWindow('7d'), '7d');
    assert.equal(normalizeLeaderboardWindow('30d'), '30d');
    assert.equal(normalizeLeaderboardWindow('all'), 'all');
  });

  it('falls back to all for missing or unsupported values', () => {
    assert.equal(normalizeLeaderboardWindow(null), 'all');
    assert.equal(normalizeLeaderboardWindow('weekly'), 'all');
  });
});

describe('getLeaderboardWindowStart', () => {
  const now = new Date('2026-05-20T12:00:00.000Z');

  it('returns null for all-time', () => {
    assert.equal(getLeaderboardWindowStart('all', now), null);
  });

  it('computes the 7-day and 30-day lower bounds', () => {
    assert.equal(
      getLeaderboardWindowStart('7d', now)?.toISOString(),
      '2026-05-13T12:00:00.000Z',
    );
    assert.equal(
      getLeaderboardWindowStart('30d', now)?.toISOString(),
      '2026-04-20T12:00:00.000Z',
    );
  });
});
