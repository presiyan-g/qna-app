export type LeaderboardAggregateRow = {
  userId: string;
  username: string;
  points: number;
  lastScoringAnswerAt: Date;
};

export type LeaderboardEntry = LeaderboardAggregateRow & {
  rank: number;
};

export function rankLeaderboardRows(
  rows: LeaderboardAggregateRow[],
): LeaderboardEntry[] {
  return [...rows]
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      const timeDelta =
        a.lastScoringAnswerAt.getTime() - b.lastScoringAnswerAt.getTime();
      if (timeDelta !== 0) return timeDelta;
      return a.username.localeCompare(b.username);
    })
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
