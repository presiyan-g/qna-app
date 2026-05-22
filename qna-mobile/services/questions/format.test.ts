import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatPoints,
  formatQuestionStateLabel,
  getQuestionState,
} from './format';

const NOW = new Date('2026-05-21T12:00:00.000Z');

describe('getQuestionState', () => {
  it('returns scheduled when publishedAt is null', () => {
    assert.equal(
      getQuestionState(
        { publishedAt: null, closesAt: '2026-05-22T12:00:00.000Z' },
        NOW,
      ),
      'scheduled',
    );
  });

  it('returns scheduled when publishedAt is in the future', () => {
    assert.equal(
      getQuestionState(
        { publishedAt: '2026-05-21T13:00:00.000Z', closesAt: '2026-05-22T12:00:00.000Z' },
        NOW,
      ),
      'scheduled',
    );
  });

  it('returns live when publishedAt has passed and closesAt is in the future', () => {
    assert.equal(
      getQuestionState(
        { publishedAt: '2026-05-21T09:00:00.000Z', closesAt: '2026-05-22T09:00:00.000Z' },
        NOW,
      ),
      'live',
    );
  });

  it('returns closed when closesAt has passed', () => {
    assert.equal(
      getQuestionState(
        { publishedAt: '2026-05-20T09:00:00.000Z', closesAt: '2026-05-21T09:00:00.000Z' },
        NOW,
      ),
      'closed',
    );
  });

  it('returns closed when closesAt equals now (boundary)', () => {
    assert.equal(
      getQuestionState(
        { publishedAt: '2026-05-20T09:00:00.000Z', closesAt: '2026-05-21T12:00:00.000Z' },
        NOW,
      ),
      'closed',
    );
  });
});

describe('formatQuestionStateLabel', () => {
  it('formats all three states', () => {
    assert.equal(formatQuestionStateLabel('scheduled'), 'Scheduled');
    assert.equal(formatQuestionStateLabel('live'), 'Live');
    assert.equal(formatQuestionStateLabel('closed'), 'Closed');
  });
});

describe('formatPoints', () => {
  it('prefixes positive point values with +', () => {
    assert.equal(formatPoints(10), '+10 pts');
    assert.equal(formatPoints(0), '+0 pts');
  });

  it('keeps negative point values intact', () => {
    assert.equal(formatPoints(-5), '-5 pts');
  });
});

