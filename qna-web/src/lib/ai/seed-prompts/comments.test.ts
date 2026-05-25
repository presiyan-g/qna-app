import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseCommentThread,
  CommentValidationError,
  generateCommentThread,
} from './comments';

test('parseCommentThread accepts top-level only', () => {
  const thread = parseCommentThread({
    topLevel: { body: 'I went with the second option but only because the rook lift seemed forced.' },
  });
  assert.equal(thread.topLevel.body.length > 0, true);
  assert.equal(thread.reply, undefined);
});

test('parseCommentThread accepts top-level + reply', () => {
  const thread = parseCommentThread({
    topLevel: { body: 'I thought the same thing, but missed the back-rank threat entirely.' },
    reply: { body: 'Same. The back rank is the kind of thing you only see after you fall for it twice.' },
  });
  assert.ok((thread.reply?.body.length ?? 0) > 0);
});

test('parseCommentThread throws on missing topLevel', () => {
  assert.throws(() => parseCommentThread({}), CommentValidationError);
});

test('parseCommentThread throws on too-short body', () => {
  assert.throws(
    () => parseCommentThread({ topLevel: { body: 'k' } }),
    CommentValidationError,
  );
});

test('generateCommentThread returns the parsed thread from result.data', async () => {
  const expected = {
    topLevel: { body: 'I went with option B, mostly out of habit. Definitely the kind of thing where I should have stopped to count.' },
    reply: { body: 'Same here. The pattern looks obvious after the fact, but in the heat of a game it just disappears.' },
  };
  const thread = await generateCommentThread(
    {
      generate: async () => ({
        data: expected,
        inputTokens: 1,
        outputTokens: 1,
      }),
    },
    {
      community: { name: 'Chess Tactics Daily', description: 'Daily tactical positions.' },
      question: { prompt: 'White to move and mate in 2.', explanation: 'Knight sacrifice opens the king.' },
      model: 'test-model',
      maxOutputTokens: 200,
      timeoutMs: 1000,
    },
  );
  assert.deepEqual(thread, expected);
});
