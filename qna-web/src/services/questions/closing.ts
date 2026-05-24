import { QuestionsValidationError } from './validation';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const DAILY_ANSWER_WINDOW_MS = 24 * HOUR_MS;
export const WEEKLY_ANSWER_WINDOW_MS = 7 * DAY_MS;
export const MAX_CUSTOM_ANSWER_WINDOW_MS = 30 * DAY_MS;

export type CommunityCadence = 'daily' | 'weekly' | 'custom';

/**
 * Compute the final `closesAt` for a question being scheduled or published.
 *
 * Policy:
 * 1. If the creator supplied `requestedClosesAt`, it always wins — regardless
 *    of community cadence. Must be after `scheduledFor` and within
 *    `MAX_CUSTOM_ANSWER_WINDOW_MS` (30 days).
 * 2. Otherwise, fall back to the cadence default:
 *    - `daily`  → scheduledFor + 24h
 *    - `weekly` → scheduledFor + 7 days
 *    - `custom` → no default; closes-at is required for custom cadence.
 *
 * Throws `QuestionsValidationError` with a `closesAt` field error when the
 * supplied value is invalid or when a custom cadence omits it.
 */
export function computeQuestionClosesAt({
  cadence,
  scheduledFor,
  requestedClosesAt,
}: {
  cadence: CommunityCadence;
  scheduledFor: Date;
  requestedClosesAt: Date | null;
}): Date {
  if (requestedClosesAt) {
    if (requestedClosesAt.getTime() <= scheduledFor.getTime()) {
      throw new QuestionsValidationError({
        closesAt: 'Close time must be after the publish time.',
      });
    }
    if (
      requestedClosesAt.getTime() - scheduledFor.getTime() >
      MAX_CUSTOM_ANSWER_WINDOW_MS
    ) {
      throw new QuestionsValidationError({
        closesAt: 'Close time must be within 30 days of the publish time.',
      });
    }
    return requestedClosesAt;
  }

  switch (cadence) {
    case 'daily':
      return new Date(scheduledFor.getTime() + DAILY_ANSWER_WINDOW_MS);
    case 'weekly':
      return new Date(scheduledFor.getTime() + WEEKLY_ANSWER_WINDOW_MS);
    case 'custom':
      throw new QuestionsValidationError({
        closesAt: 'Choose a GMT close time for this question.',
      });
  }
}
