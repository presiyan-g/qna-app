import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CommentCursorError,
  decodeCommentCursor,
  encodeCommentCursor,
  normalizeCommentLimit,
} from './cursor';

test('normalizes comment page limits', () => {
  assert.equal(normalizeCommentLimit(null), 20);
  assert.equal(normalizeCommentLimit(''), 20);
  assert.equal(normalizeCommentLimit('5'), 5);
  assert.equal(normalizeCommentLimit('200'), 50);
  assert.equal(normalizeCommentLimit('abc'), 20);
  assert.equal(normalizeCommentLimit('-3'), 20);
});

test('round-trips opaque comment cursors', () => {
  const cursor = encodeCommentCursor({
    createdAt: new Date('2026-05-20T14:30:00.000Z'),
    id: '9a8b7c6d-1234-5678-9abc-def012345678',
  });

  assert.deepEqual(decodeCommentCursor(cursor), {
    createdAt: new Date('2026-05-20T14:30:00.000Z'),
    id: '9a8b7c6d-1234-5678-9abc-def012345678',
  });
});

test('rejects malformed cursors', () => {
  assert.throws(() => decodeCommentCursor('not-a-cursor'), CommentCursorError);
  assert.throws(
    () => decodeCommentCursor(Buffer.from('{}').toString('base64url')),
    CommentCursorError,
  );
});
