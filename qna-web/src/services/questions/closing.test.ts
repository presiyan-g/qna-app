import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeQuestionClosesAt,
  DAILY_ANSWER_WINDOW_MS,
  MAX_CUSTOM_ANSWER_WINDOW_MS,
  WEEKLY_ANSWER_WINDOW_MS,
} from './closing';
import { QuestionsValidationError } from './validation';

const SCHEDULED = new Date('2026-05-20T09:00:00.000Z');

test('daily cadence: defaults to 24h after scheduledFor when no override', () => {
  const closesAt = computeQuestionClosesAt({
    cadence: 'daily',
    scheduledFor: SCHEDULED,
    requestedClosesAt: null,
  });
  assert.equal(
    closesAt.getTime(),
    SCHEDULED.getTime() + DAILY_ANSWER_WINDOW_MS,
  );
});

test('weekly cadence: defaults to 7 days after scheduledFor when no override', () => {
  const closesAt = computeQuestionClosesAt({
    cadence: 'weekly',
    scheduledFor: SCHEDULED,
    requestedClosesAt: null,
  });
  assert.equal(
    closesAt.getTime(),
    SCHEDULED.getTime() + WEEKLY_ANSWER_WINDOW_MS,
  );
});

test('any cadence: requestedClosesAt always wins when supplied', () => {
  const requested = new Date('2026-05-21T11:00:00.000Z');
  for (const cadence of ['daily', 'weekly', 'custom'] as const) {
    const closesAt = computeQuestionClosesAt({
      cadence,
      scheduledFor: SCHEDULED,
      requestedClosesAt: requested,
    });
    assert.equal(
      closesAt.toISOString(),
      requested.toISOString(),
      `cadence=${cadence} should respect requestedClosesAt`,
    );
  }
});

test('custom cadence: throws when requestedClosesAt is missing', () => {
  assert.throws(
    () =>
      computeQuestionClosesAt({
        cadence: 'custom',
        scheduledFor: SCHEDULED,
        requestedClosesAt: null,
      }),
    (err) =>
      err instanceof QuestionsValidationError &&
      err.fieldErrors.closesAt === 'Choose a GMT close time for this question.',
  );
});

test('custom cadence: throws when requestedClosesAt is at or before scheduledFor', () => {
  assert.throws(
    () =>
      computeQuestionClosesAt({
        cadence: 'custom',
        scheduledFor: SCHEDULED,
        requestedClosesAt: SCHEDULED,
      }),
    (err) =>
      err instanceof QuestionsValidationError &&
      err.fieldErrors.closesAt === 'Close time must be after the publish time.',
  );

  assert.throws(
    () =>
      computeQuestionClosesAt({
        cadence: 'custom',
        scheduledFor: SCHEDULED,
        requestedClosesAt: new Date(SCHEDULED.getTime() - 1),
      }),
    (err) =>
      err instanceof QuestionsValidationError &&
      err.fieldErrors.closesAt === 'Close time must be after the publish time.',
  );
});

test('custom cadence: throws when window exceeds 30 days', () => {
  const tooLate = new Date(SCHEDULED.getTime() + MAX_CUSTOM_ANSWER_WINDOW_MS + 1);
  assert.throws(
    () =>
      computeQuestionClosesAt({
        cadence: 'custom',
        scheduledFor: SCHEDULED,
        requestedClosesAt: tooLate,
      }),
    (err) =>
      err instanceof QuestionsValidationError &&
      err.fieldErrors.closesAt ===
        'Close time must be within 30 days of the publish time.',
  );
});

test('custom cadence: 30-day window is exactly allowed', () => {
  const boundary = new Date(
    SCHEDULED.getTime() + MAX_CUSTOM_ANSWER_WINDOW_MS,
  );
  const closesAt = computeQuestionClosesAt({
    cadence: 'custom',
    scheduledFor: SCHEDULED,
    requestedClosesAt: boundary,
  });
  assert.equal(closesAt.toISOString(), boundary.toISOString());
});
