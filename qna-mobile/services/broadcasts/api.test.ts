import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BroadcastsApiError,
  createBroadcastsClient,
  type Broadcast,
} from './api';

const broadcast: Broadcast = {
  id: 'broadcast_1',
  communityId: 'community_1',
  author: { id: 'user_1', username: 'lia' },
  body: 'Hello, community.',
  imageUrl: null,
  publishedAt: '2026-05-22T09:00:00.000Z',
  createdAt: '2026-05-22T09:00:00.000Z',
  updatedAt: '2026-05-22T09:00:00.000Z',
  canEdit: false,
  canDelete: false,
};

describe('createBroadcastsClient', () => {
  it('lists community broadcasts with limit and bearer auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api///',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json({
          items: [broadcast],
          pagination: { limit: 20, nextCursor: null },
        });
      },
    });

    const result = await client.list('ai-builders', { limit: 20, token: 'jwt' });

    assert.deepEqual(result.items, [broadcast]);
    assert.equal(
      calls[0].url,
      'http://localhost:3000/api/communities/ai-builders/broadcasts?limit=20',
    );
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt');
  });

  it('passes cursor through when provided', async () => {
    let seenUrl = '';
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url) => {
        seenUrl = String(url);
        return Response.json({
          items: [],
          pagination: { limit: 20, nextCursor: null },
        });
      },
    });

    await client.list('ai-builders', { limit: 20, cursor: 'abc=', token: 'jwt' });

    assert.ok(seenUrl.includes('cursor=abc%3D'));
  });

  it('maps 401 to BroadcastsApiError with code "unauthenticated"', async () => {
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Authentication required.' }, { status: 401 }),
    });

    await assert.rejects(
      () => client.list('ai-builders'),
      (err) =>
        err instanceof BroadcastsApiError &&
        err.status === 401 &&
        err.code === 'unauthenticated',
    );
  });

  it('maps 403 to BroadcastsApiError with code "forbidden"', async () => {
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json(
          { error: 'Join this community to see broadcasts.' },
          { status: 403 },
        ),
    });

    await assert.rejects(
      () => client.list('ai-builders', { token: 'jwt' }),
      (err) =>
        err instanceof BroadcastsApiError &&
        err.status === 403 &&
        err.code === 'forbidden',
    );
  });

  it('maps 404 to BroadcastsApiError with code "not_found"', async () => {
    const client = createBroadcastsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Community not found.' }, { status: 404 }),
    });

    await assert.rejects(
      () => client.list('nope', { token: 'jwt' }),
      (err) =>
        err instanceof BroadcastsApiError &&
        err.status === 404 &&
        err.code === 'not_found',
    );
  });
});
