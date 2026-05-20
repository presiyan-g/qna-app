import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BroadcastCursorError,
  decodeBroadcastCursor,
  encodeBroadcastCursor,
  normalizeBroadcastLimit,
} from './cursor';

test('normalizes broadcast page limits', () => {
  assert.equal(normalizeBroadcastLimit(null), 20);
  assert.equal(normalizeBroadcastLimit('0'), 20);
  assert.equal(normalizeBroadcastLimit('40'), 40);
  assert.equal(normalizeBroadcastLimit('500'), 50);
});

test('round-trips opaque broadcast cursors', () => {
  const cursor = encodeBroadcastCursor({
    publishedAt: new Date('2026-05-20T09:00:00.000Z'),
    id: 'post_1',
  });

  assert.deepEqual(decodeBroadcastCursor(cursor), {
    publishedAt: new Date('2026-05-20T09:00:00.000Z'),
    id: 'post_1',
  });
});

test('rejects malformed cursors', () => {
  assert.throws(
    () => decodeBroadcastCursor('not-a-cursor'),
    BroadcastCursorError,
  );
});
