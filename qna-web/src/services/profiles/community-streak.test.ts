import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCommunityStreakRibbon,
  type CommunityStreakState,
} from './community-streak';

// Anchored "now" at midday UTC so adding/subtracting whole days
// crosses date boundaries cleanly. All fixtures use UTC dates.
const NOW = new Date('2026-05-26T12:00:00Z');

function dayAtUTC(date: string): Date {
  return new Date(`${date}T10:00:00Z`);
}

function stateAt(
  days: { dateISO: string; state: CommunityStreakState }[],
  dateISO: string,
): CommunityStreakState | undefined {
  return days.find((d) => d.dateISO === dateISO)?.state;
}

describe('buildCommunityStreakRibbon', () => {
  it('emits a 30-day window oldest → newest by default', () => {
    const { days } = buildCommunityStreakRibbon({ events: [], now: NOW });
    assert.equal(days.length, 30);
    assert.equal(days[0].dateISO, '2026-04-27');
    assert.equal(days[29].dateISO, '2026-05-26');
  });

  it('classifies a correct + on-time answer as "correct"', () => {
    const { days } = buildCommunityStreakRibbon({
      events: [{ answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: false }],
      now: NOW,
    });
    assert.equal(stateAt(days, '2026-05-25'), 'correct');
  });

  it('classifies a wrong answer as "late-or-wrong"', () => {
    const { days } = buildCommunityStreakRibbon({
      events: [{ answeredAt: dayAtUTC('2026-05-25'), isCorrect: false, isLate: false }],
      now: NOW,
    });
    assert.equal(stateAt(days, '2026-05-25'), 'late-or-wrong');
  });

  it('classifies a late correct answer as "late-or-wrong" too', () => {
    // The design treats wrong-or-late uniformly — both are "tried
    // but didn't land in time to count fully".
    const { days } = buildCommunityStreakRibbon({
      events: [{ answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: true }],
      now: NOW,
    });
    assert.equal(stateAt(days, '2026-05-25'), 'late-or-wrong');
  });

  it('leaves untouched days as "missed"', () => {
    const { days } = buildCommunityStreakRibbon({
      events: [{ answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: false }],
      now: NOW,
    });
    assert.equal(stateAt(days, '2026-05-24'), 'missed');
    assert.equal(stateAt(days, '2026-05-26'), 'missed');
  });

  it('counts consecutive correct days as the current streak', () => {
    const { currentStreak } = buildCommunityStreakRibbon({
      events: [
        { answeredAt: dayAtUTC('2026-05-26'), isCorrect: true, isLate: false },
        { answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: false },
        { answeredAt: dayAtUTC('2026-05-24'), isCorrect: true, isLate: false },
      ],
      now: NOW,
    });
    assert.equal(currentStreak, 3);
  });

  it('skips a missing "today" without resetting the streak', () => {
    // Yesterday correct, today empty — momentum still reads as 1.
    const { currentStreak } = buildCommunityStreakRibbon({
      events: [
        { answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: false },
      ],
      now: NOW,
    });
    assert.equal(currentStreak, 1);
  });

  it('a late-or-wrong day resets the current streak', () => {
    // Engaged but didn't land it = no streak. This is the binary
    // mode's contract — only correct extends the chain.
    const { currentStreak } = buildCommunityStreakRibbon({
      events: [
        { answeredAt: dayAtUTC('2026-05-26'), isCorrect: false, isLate: false },
        { answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: false },
      ],
      now: NOW,
    });
    assert.equal(currentStreak, 0);
  });

  it('longestStreak finds the max correct run inside the window', () => {
    const events = [
      // Run of 4: May 21 → 24
      { answeredAt: dayAtUTC('2026-05-21'), isCorrect: true, isLate: false },
      { answeredAt: dayAtUTC('2026-05-22'), isCorrect: true, isLate: false },
      { answeredAt: dayAtUTC('2026-05-23'), isCorrect: true, isLate: false },
      { answeredAt: dayAtUTC('2026-05-24'), isCorrect: true, isLate: false },
      // Break (May 25 late)
      { answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: true },
      // Resume with 1
      { answeredAt: dayAtUTC('2026-05-26'), isCorrect: true, isLate: false },
    ];
    const { longestStreak, currentStreak } = buildCommunityStreakRibbon({
      events,
      now: NOW,
    });
    assert.equal(longestStreak, 4);
    assert.equal(currentStreak, 1);
  });

  it('events outside the window are ignored', () => {
    const { days } = buildCommunityStreakRibbon({
      events: [
        { answeredAt: dayAtUTC('2026-01-01'), isCorrect: true, isLate: false },
      ],
      now: NOW,
    });
    // Window starts at 2026-04-27, so 2026-01-01 isn't represented.
    assert.equal(days.some((d) => d.state === 'correct'), false);
  });

  it('correct beats late-or-wrong on the same day (de-dup)', () => {
    // If a user has both a correct and a wrong row dated the same
    // day (shouldn't happen in practice, but a backfill could
    // produce this), surface the stronger signal.
    const { days } = buildCommunityStreakRibbon({
      events: [
        { answeredAt: dayAtUTC('2026-05-25'), isCorrect: false, isLate: false },
        { answeredAt: dayAtUTC('2026-05-25'), isCorrect: true, isLate: false },
      ],
      now: NOW,
    });
    assert.equal(stateAt(days, '2026-05-25'), 'correct');
  });

  it('honors a custom window size', () => {
    const { days } = buildCommunityStreakRibbon({
      events: [],
      now: NOW,
      windowDays: 7,
    });
    assert.equal(days.length, 7);
    assert.equal(days[0].dateISO, '2026-05-20');
    assert.equal(days[6].dateISO, '2026-05-26');
  });
});
