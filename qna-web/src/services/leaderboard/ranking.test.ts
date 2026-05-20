import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankLeaderboardRows } from './ranking';

describe('rankLeaderboardRows', () => {
  it('sorts by points desc and breaks ties by earliest latest scoring answer', () => {
    const rows = rankLeaderboardRows([
      row('2', 'bea', 40, '2026-05-20T10:00:00.000Z'),
      row('1', 'ana', 40, '2026-05-20T09:00:00.000Z'),
      row('3', 'cal', 50, '2026-05-19T09:00:00.000Z'),
    ]);

    assert.deepEqual(
      rows.map((entry) => [entry.rank, entry.username, entry.points]),
      [
        [1, 'cal', 50],
        [2, 'ana', 40],
        [3, 'bea', 40],
      ],
    );
  });

  it('uses username as a deterministic final tie-break and returns top 10', () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      row(
        String(index),
        `user-${String(12 - index).padStart(2, '0')}`,
        10,
        '2026-05-20T09:00:00.000Z',
      ),
    );

    const ranked = rankLeaderboardRows(rows);

    assert.equal(ranked.length, 10);
    assert.equal(ranked[0].username, 'user-01');
    assert.equal(ranked[9].rank, 10);
  });
});

function row(
  userId: string,
  username: string,
  points: number,
  lastScoringAnswerAt: string,
) {
  return {
    userId,
    username,
    points,
    lastScoringAnswerAt: new Date(lastScoringAnswerAt),
  };
}
