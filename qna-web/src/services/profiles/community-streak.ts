/**
 * Per-day classification for a community-scoped streak.
 *
 *   correct       — answered the day's question correctly, on time
 *   late-or-wrong — submitted an answer but it was wrong OR late
 *                   (the design treats both as "tried but didn't
 *                   land" — same warm clay tint)
 *   missed        — no answer at all (default beige line color)
 *
 * Days with no question scheduled still resolve to "missed" since
 * that's still a day the user didn't engage with the community.
 * The headline copy contextualizes this ("X of 30 days answered").
 */
export type CommunityStreakState = 'correct' | 'late-or-wrong' | 'missed';

export type CommunityStreakDay = {
  /** UTC `YYYY-MM-DD`. */
  dateISO: string;
  state: CommunityStreakState;
};

export type CommunityStreakRibbon = {
  /** Oldest → newest. Length === windowDays (default 30). */
  days: CommunityStreakDay[];
  /** Trailing run of consecutive "correct" days from the most recent
   *  end of the window. Today is skipped if missing so a user who
   *  was correct yesterday still reads as a 1-day streak until
   *  midnight UTC ticks over. */
  currentStreak: number;
  /** Longest run of consecutive "correct" days inside the window. */
  longestStreak: number;
};

export type CommunityAnswerEvent = {
  answeredAt: Date;
  isCorrect: boolean;
  isLate: boolean;
};

/**
 * Pure, deterministic builder — no DB. Kept in this module without
 * `server-only` so unit tests can import it directly. The DB-backed
 * `getCommunityStreakForViewer` lives next door in
 * `./community-streak-db.ts` to keep the boundary clean.
 *
 * Streaks count consecutive *correct* days only. A late or wrong
 * answer doesn't extend the streak — you "showed up" but it
 * didn't count toward the streak. The current streak survives a
 * missing "today" (you might not have checked in yet) but resets
 * on a late/wrong today (engagement happened, just didn't land).
 */
export function buildCommunityStreakRibbon({
  events,
  now,
  windowDays = 30,
}: {
  events: CommunityAnswerEvent[];
  now: Date;
  windowDays?: number;
}): CommunityStreakRibbon {
  // Collapse multiple events per day into the "best" classification
  // for that day. Best = correct trumps late-or-wrong trumps missed.
  // Two events same UTC day is rare (one answer per question per
  // user), but defensive de-dup costs nothing.
  const perDay = new Map<string, CommunityStreakState>();
  for (const e of events) {
    const key = toDateISO(e.answeredAt);
    const next: CommunityStreakState =
      e.isCorrect && !e.isLate ? 'correct' : 'late-or-wrong';
    const prev = perDay.get(key);
    if (prev === 'correct') continue;
    if (prev === undefined || next === 'correct') {
      perDay.set(key, next);
    }
  }

  // Walk the window oldest → newest so the array reads left-to-right
  // chronologically on screen.
  const days: CommunityStreakDay[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = addDaysUTC(now, -i);
    const dateISO = toDateISO(d);
    days.push({ dateISO, state: perDay.get(dateISO) ?? 'missed' });
  }

  // currentStreak: count consecutive `correct` walking back from the
  // most recent. Missing today doesn't reset, but late/wrong today
  // does — see the docstring above.
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.state === 'correct') {
      currentStreak++;
      continue;
    }
    if (d.state === 'missed' && i === days.length - 1) continue;
    break;
  }

  // longestStreak: longest run of `correct` inside the window.
  let longestStreak = 0;
  let run = 0;
  for (const d of days) {
    if (d.state === 'correct') {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  return { days, currentStreak, longestStreak };
}

function toDateISO(d: Date): string {
  // YYYY-MM-DD in UTC. Keep everything in UTC so the ribbon doesn't
  // shift around per-viewer timezone — points + streaks should be a
  // consistent calendar truth across sessions.
  return d.toISOString().slice(0, 10);
}

/**
 * Exported because the DB module needs the same UTC-day arithmetic
 * to compute the window-start for its query. Kept private-ish via
 * naming so callers think twice before reaching in.
 */
export function addDaysUTC(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + delta);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
