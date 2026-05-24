import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCommentThread, type CommentThreadRow } from './thread';

const TOP_DATE = new Date('2026-05-19T12:00:00.000Z');
const REPLY_DATE = new Date('2026-05-19T12:05:00.000Z');

test('builds top-level comments with one level of replies', () => {
  const rows: CommentThreadRow[] = [
    row({ id: 'reply_1', parentCommentId: 'comment_1', body: 'I had the same confusion.', createdAt: REPLY_DATE }),
    row({ id: 'comment_1', body: 'The explanation clicks after the example.', createdAt: TOP_DATE }),
  ];

  const thread = buildCommentThread(rows, {
    userId: 'author_2',
    communityRole: 'member',
    platformRole: 'member',
  });

  assert.equal(thread.length, 1);
  assert.equal(thread[0].id, 'comment_1');
  assert.equal(thread[0].body, 'The explanation clicks after the example.');
  assert.equal(thread[0].replies.length, 1);
  assert.equal(thread[0].replies[0].id, 'reply_1');
});

test('returns tombstones for soft-deleted comments while preserving replies', () => {
  const rows: CommentThreadRow[] = [
    row({ id: 'reply_1', parentCommentId: 'comment_1', body: 'Reply stays visible.', createdAt: REPLY_DATE }),
    row({
      id: 'comment_1',
      body: 'Removed body',
      deletedAt: new Date('2026-05-19T12:10:00.000Z'),
      createdAt: TOP_DATE,
    }),
  ];

  const [comment] = buildCommentThread(rows, {
    userId: 'author_2',
    communityRole: 'member',
    platformRole: 'member',
  });

  assert.equal(comment.body, null);
  assert.equal(comment.author, null);
  assert.equal(comment.deletedAt?.toISOString(), '2026-05-19T12:10:00.000Z');
  assert.equal(comment.canDelete, false);
  assert.equal(comment.replies.length, 1);
  assert.equal(comment.replies[0].body, 'Reply stays visible.');
});

test('marks active comments deletable by their author or a community creator', () => {
  const rows: CommentThreadRow[] = [
    row({ id: 'comment_1', authorUserId: 'author_1' }),
    row({ id: 'comment_2', authorUserId: 'author_2' }),
  ];

  const memberThread = buildCommentThread(rows, {
    userId: 'author_1',
    communityRole: 'member',
    platformRole: 'member',
  });
  const creatorThread = buildCommentThread(rows, {
    userId: 'creator_1',
    communityRole: 'creator',
    platformRole: 'member',
  });

  assert.equal(memberThread[0].canDelete, true);
  assert.equal(memberThread[1].canDelete, false);
  assert.equal(creatorThread[0].canDelete, true);
  assert.equal(creatorThread[1].canDelete, true);
});

function row(overrides: Partial<CommentThreadRow>): CommentThreadRow {
  const createdAt = overrides.createdAt ?? new Date('2026-05-19T12:00:00.000Z');

  return {
    id: overrides.id ?? 'comment_1',
    questionId: overrides.questionId ?? 'question_1',
    parentCommentId: overrides.parentCommentId ?? null,
    authorUserId: overrides.authorUserId ?? 'author_1',
    authorUsername: overrides.authorUsername ?? 'test_user',
    body: overrides.body ?? 'A useful comment.',
    deletedAt: overrides.deletedAt ?? null,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
  };
}
