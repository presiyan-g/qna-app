import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeCooldownRetryAfter,
  computeRemaining,
  isQuotaCounted,
} from './helpers';

describe('computeRemaining', () => {
  it('returns full quota when no rows', () => {
    assert.equal(computeRemaining(0, 20), 20);
  });

  it('decrements as rows accumulate', () => {
    assert.equal(computeRemaining(7, 20), 13);
  });

  it('floors at zero', () => {
    assert.equal(computeRemaining(25, 20), 0);
  });
});

describe('computeCooldownRetryAfter', () => {
  const now = new Date('2026-05-24T12:00:05.000Z');

  it('returns 0 when there is no prior success', () => {
    assert.equal(computeCooldownRetryAfter(null, 5000, now), 0);
  });

  it('returns 0 when the cooldown has fully elapsed', () => {
    assert.equal(
      computeCooldownRetryAfter(
        new Date('2026-05-24T11:59:59.000Z'),
        5000,
        now,
      ),
      0,
    );
  });

  it('returns remaining ms when still inside the cooldown window', () => {
    assert.equal(
      computeCooldownRetryAfter(
        new Date('2026-05-24T12:00:04.000Z'),
        5000,
        now,
      ),
      4000,
    );
  });
});

describe('isQuotaCounted', () => {
  it('counts successful generations', () => {
    assert.equal(isQuotaCounted({ success: true, errorCode: null }), true);
  });

  it('counts safety-blocked failures', () => {
    assert.equal(
      isQuotaCounted({ success: false, errorCode: 'safety_blocked' }),
      true,
    );
  });

  it('does not count transient failures', () => {
    assert.equal(
      isQuotaCounted({ success: false, errorCode: 'provider_timeout' }),
      false,
    );
    assert.equal(
      isQuotaCounted({ success: false, errorCode: 'provider_error' }),
      false,
    );
  });
});
