import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CommentsApiError,
  createCommentsClient,
  type Comment,
  type CommentListResult,
} from './api';

const comment: Comment = {
  id: 'comment_1',
  questionId: 'question_1',
  parentCommentId: null,
  author: { id: 'user_1', username: 'lia' },
  body: 'First!',
  deletedAt: null,
  createdAt: '2026-05-22T09:00:00.000Z',
  updatedAt: '2026-05-22T09:00:00.000Z',
  canDelete: true,
  replies: [],
};

const listResult: CommentListResult = { comments: [comment] };

describe('createCommentsClient', () => {
  it('lists comments with bearer auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json(listResult);
      },
    });

    const result = await client.list('ai-builders', 'question_1', 'jwt');

    assert.deepEqual(result.comments, [comment]);
    assert.equal(
      calls[0].url,
      'http://localhost:3000/api/communities/ai-builders/questions/question_1/comments',
    );
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt');
  });

  it('posts a top-level comment without parentCommentId', async () => {
    let sentBody: unknown = null;
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        sentBody = init?.body ? JSON.parse(String(init.body)) : null;
        return Response.json({ comment }, { status: 201 });
      },
    });

    const result = await client.post(
      'ai-builders',
      'question_1',
      { body: 'First!' },
      'jwt',
    );

    assert.deepEqual(sentBody, { body: 'First!' });
    assert.equal(result.comment.id, 'comment_1');
  });

  it('posts a reply with parentCommentId', async () => {
    let sentBody: unknown = null;
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        sentBody = init?.body ? JSON.parse(String(init.body)) : null;
        return Response.json({ comment }, { status: 201 });
      },
    });

    await client.post(
      'ai-builders',
      'question_1',
      { body: 'Reply!', parentCommentId: 'comment_1' },
      'jwt',
    );

    assert.deepEqual(sentBody, { body: 'Reply!', parentCommentId: 'comment_1' });
  });

  it('deletes a comment via DELETE returning void on 204', async () => {
    let seenUrl = '';
    let seenMethod = '';
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        seenUrl = String(url);
        seenMethod = String(init?.method);
        return new Response(null, { status: 204 });
      },
    });

    const result = await client.delete('ai-builders', 'question_1', 'comment_1', 'jwt');

    assert.equal(result, undefined);
    assert.equal(
      seenUrl,
      'http://localhost:3000/api/communities/ai-builders/questions/question_1/comments/comment_1',
    );
    assert.equal(seenMethod, 'DELETE');
  });

  it('maps 401 to CommentsApiError with code "unauthenticated"', async () => {
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Authentication required.' }, { status: 401 }),
    });

    await assert.rejects(
      () => client.list('ai-builders', 'question_1', 'jwt'),
      (err) =>
        err instanceof CommentsApiError &&
        err.status === 401 &&
        err.code === 'unauthenticated',
    );
  });

  it('maps 422 with fieldErrors on post', async () => {
    const client = createCommentsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json(
          {
            error: 'Invalid comment.',
            fieldErrors: { body: 'Body is required.' },
          },
          { status: 422 },
        ),
    });

    await assert.rejects(
      () => client.post('ai-builders', 'question_1', { body: '' }, 'jwt'),
      (err) =>
        err instanceof CommentsApiError &&
        err.status === 422 &&
        err.fieldErrors.body === 'Body is required.',
    );
  });
});
