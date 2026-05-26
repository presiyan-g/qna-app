export type PublicProfileRole = 'member' | 'creator';

export type PublicProfileUser = {
  id: string;
  username: string;
  joinedAt: Date;
};

export type PublicProfileMembershipInput = {
  id: string;
  slug: string;
  name: string;
  role: PublicProfileRole;
  joinedAt: Date;
};

export type StreakLevel = 0 | 1 | 2 | 3;

export type StreakRibbon = {
  /** Most recent day last. Length === requested window (default 30). */
  days: Array<{ dateISO: string; level: StreakLevel; communityCount: number }>;
  /** Consecutive trailing days with at least one answer. Today counts if it
   *  has activity; otherwise the streak resumes only if yesterday does. */
  currentStreak: number;
  /** Longest run of consecutive active days inside the window. */
  longestStreak: number;
};

export type PublicUserProfile = {
  user: PublicProfileUser;
  stats: {
    totalPoints: number;
    communityCount: number;
  };
  communities: Array<{
    id: string;
    slug: string;
    name: string;
    role: PublicProfileRole;
    joinedAt: Date;
  }>;
  streak: StreakRibbon;
};

export function buildPublicUserProfile({
  user,
  memberships,
  totalPoints,
  streak,
}: {
  user: PublicProfileUser;
  memberships: PublicProfileMembershipInput[];
  totalPoints: number;
  streak: StreakRibbon;
}): PublicUserProfile {
  const communities = [...memberships].sort(compareProfileCommunities);

  return {
    user,
    stats: {
      totalPoints,
      communityCount: communities.length,
    },
    communities,
    streak,
  };
}

/**
 * Bucket a user's answer events into a 30-day (configurable) calendar
 * grid. Each bucket counts the number of *distinct communities* the user
 * answered in on that UTC day — that count is the "intensity" the streak
 * ribbon visualizes (l1/l2/l3 sage-green progression).
 *
 * Days are emitted in chronological order, oldest first, so the most
 * recent day is always the last element. Tests rely on this ordering.
 */
export function buildStreakRibbon({
  events,
  now,
  windowDays = 30,
}: {
  events: Array<{ answeredAt: Date; communityId: string }>;
  now: Date;
  windowDays?: number;
}): StreakRibbon {
  // Group distinct communityIds per UTC day.
  const perDay = new Map<string, Set<string>>();
  for (const e of events) {
    const key = toDateISO(e.answeredAt);
    let set = perDay.get(key);
    if (!set) {
      set = new Set();
      perDay.set(key, set);
    }
    set.add(e.communityId);
  }

  // Walk the window from oldest → newest so the array reads left-to-right
  // on screen the same way a streak feels in time.
  const days: StreakRibbon['days'] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = addDaysUTC(now, -i);
    const dateISO = toDateISO(d);
    const communityCount = perDay.get(dateISO)?.size ?? 0;
    days.push({ dateISO, level: levelFor(communityCount), communityCount });
  }

  // currentStreak: scan backwards from the most recent day. If today is
  // missing we don't reset to 0 — a user who answered yesterday but
  // hasn't opened the app yet today still has "1 day" of momentum we
  // want to acknowledge until the day rolls over again.
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].communityCount > 0) currentStreak++;
    else if (i === days.length - 1) continue; // skip empty today, keep scanning
    else break;
  }

  // longestStreak: max run inside the window.
  let longestStreak = 0;
  let run = 0;
  for (const d of days) {
    if (d.communityCount > 0) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  return { days, currentStreak, longestStreak };
}

function levelFor(count: number): StreakLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function toDateISO(d: Date): string {
  // YYYY-MM-DD in UTC. We keep everything in UTC so the ribbon doesn't
  // shift around based on viewer timezone — points + streaks should be
  // a consistent "calendar truth" across sessions.
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + delta);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function compareProfileCommunities(
  a: PublicUserProfile['communities'][number],
  b: PublicUserProfile['communities'][number],
): number {
  if (a.role !== b.role) return a.role === 'creator' ? -1 : 1;
  const joinedDelta = b.joinedAt.getTime() - a.joinedAt.getTime();
  if (joinedDelta !== 0) return joinedDelta;
  return a.name.localeCompare(b.name);
}
