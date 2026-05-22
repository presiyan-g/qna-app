import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatRelativeTime } from './time';

const NOW = new Date('2026-05-21T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent past', () => {
    assert.equal(formatRelativeTime('2026-05-21T11:59:30.000Z', NOW), 'just now');
  });

  it('returns "in a moment" for very near future', () => {
    assert.equal(formatRelativeTime('2026-05-21T12:00:30.000Z', NOW), 'in a moment');
  });

  it('formats past minutes, hours, and days', () => {
    assert.equal(formatRelativeTime('2026-05-21T11:30:00.000Z', NOW), '30m ago');
    assert.equal(formatRelativeTime('2026-05-21T10:00:00.000Z', NOW), '2h ago');
    assert.equal(formatRelativeTime('2026-05-19T12:00:00.000Z', NOW), '2d ago');
  });

  it('formats future minutes, hours, and days', () => {
    assert.equal(formatRelativeTime('2026-05-21T12:30:00.000Z', NOW), 'in 30m');
    assert.equal(formatRelativeTime('2026-05-21T16:00:00.000Z', NOW), 'in 4h');
    assert.equal(formatRelativeTime('2026-05-24T12:00:00.000Z', NOW), 'in 3d');
  });

  it('returns empty string for an unparseable value', () => {
    assert.equal(formatRelativeTime('not-a-date', NOW), '');
  });
});
