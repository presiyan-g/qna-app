import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatRelativeTime } from './formatRelativeTime';

const NOW = new Date('2026-05-25T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('returns "just now" for sub-minute differences', () => {
    assert.equal(formatRelativeTime(NOW, NOW), 'just now');
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() - 30_000), NOW),
      'just now',
    );
  });

  it('returns minutes for sub-hour differences', () => {
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() - 3 * 60_000), NOW),
      '3m',
    );
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() - 59 * 60_000), NOW),
      '59m',
    );
  });

  it('returns hours for sub-day differences', () => {
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() - 2 * 60 * 60_000), NOW),
      '2h',
    );
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() - 23 * 60 * 60_000), NOW),
      '23h',
    );
  });

  it('returns days for sub-week differences', () => {
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() - 3 * 24 * 60 * 60_000), NOW),
      '3d',
    );
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() - 6 * 24 * 60 * 60_000), NOW),
      '6d',
    );
  });

  it('returns weeks for week-plus differences', () => {
    assert.equal(
      formatRelativeTime(
        new Date(NOW.getTime() - 7 * 24 * 60 * 60_000),
        NOW,
      ),
      '1w',
    );
    assert.equal(
      formatRelativeTime(
        new Date(NOW.getTime() - 30 * 24 * 60 * 60_000),
        NOW,
      ),
      '4w',
    );
  });

  it('treats future dates defensively', () => {
    assert.equal(
      formatRelativeTime(new Date(NOW.getTime() + 60_000), NOW),
      'just now',
    );
  });
});
