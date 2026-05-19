import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeAnswer } from './grading';

test('awards question points for a correct answer before close', () => {
  const result = gradeAnswer({
    isCorrect: true,
    closesAt: new Date('2026-05-20T10:00:00.000Z'),
    answeredAt: new Date('2026-05-20T09:59:59.000Z'),
    points: 10,
  });

  assert.deepEqual(result, { isLate: false, pointsAwarded: 10 });
});

test('awards zero points for a wrong answer before close', () => {
  const result = gradeAnswer({
    isCorrect: false,
    closesAt: new Date('2026-05-20T10:00:00.000Z'),
    answeredAt: new Date('2026-05-20T09:30:00.000Z'),
    points: 10,
  });

  assert.deepEqual(result, { isLate: false, pointsAwarded: 0 });
});

test('saves a late correct answer with zero points', () => {
  const result = gradeAnswer({
    isCorrect: true,
    closesAt: new Date('2026-05-20T10:00:00.000Z'),
    answeredAt: new Date('2026-05-20T10:00:01.000Z'),
    points: 10,
  });

  assert.deepEqual(result, { isLate: true, pointsAwarded: 0 });
});
