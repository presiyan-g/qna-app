import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CommunitiesApiError, createCommunitiesClient } from './api';

const community = {
  id: 'community_1',
  slug: 'daily-ai-builders',
  name: 'Daily AI Builders',
  description: 'A daily challenge for people building with AI tools.',
  emoji: 'AI',
  coverImageUrl: null,
  cadence: 'daily',
  status: 'active' as const,
  creatorUserId: 'user_1',
  category: {
    id: 'category_1',
    slug: 'ai',
    name: 'AI',
    description: 'AI builders and researchers.',
  },
  isFeatured: true,
  featuredRank: 1,
  directoryRank: 2,
  memberCount: 12,
  currentUserRole: null,
  createdAt: '2026-05-21T09:00:00.000Z',
  updatedAt: '2026-05-21T10:00:00.000Z',
};

describe('createCommunitiesClient', () => {
  it('lists communities with pagination params', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createCommunitiesClient({
      apiUrl: 'http://localhost:3000/api///',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json({ items: [community], pagination: { limit: 3, offset: 0 } });
      },
    });

    const result = await client.list({ limit: 3, offset: 0 });

    assert.deepEqual(result.items, [community]);
    assert.equal(calls[0].url, 'http://localhost:3000/api/communities?limit=3&offset=0');
    assert.equal(calls[0].init.method, 'GET');
  });

  it('sends bearer auth for authenticated list and detail calls', async () => {
    const seenHeaders: Array<string | undefined> = [];
    const client = createCommunitiesClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        seenHeaders.push(init?.headers?.['Authorization' as keyof HeadersInit] as string);
        return Response.json({ items: [community], pagination: { limit: 24, offset: 0 } });
      },
    });

    await client.list({ token: 'jwt-token' });

    assert.deepEqual(seenHeaders, ['Bearer jwt-token']);
  });

  it('loads a community by slug', async () => {
    const client = createCommunitiesClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        assert.equal(String(url), 'http://localhost:3000/api/communities/daily-ai-builders');
        assert.equal(init?.method, 'GET');
        return Response.json(community);
      },
    });

    assert.deepEqual(await client.get('daily-ai-builders'), community);
  });

  it('posts join requests with bearer auth', async () => {
    const joined = { ...community, currentUserRole: 'member' as const, memberCount: 13 };
    const client = createCommunitiesClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        assert.equal(String(url), 'http://localhost:3000/api/communities/daily-ai-builders/join');
        assert.equal(init?.method, 'POST');
        assert.equal(init?.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt-token');
        return Response.json(joined);
      },
    });

    assert.deepEqual(await client.join('daily-ai-builders', 'jwt-token'), joined);
  });

  it('sends leave requests with bearer auth', async () => {
    const left = { ...community, currentUserRole: null, memberCount: 12 };
    const client = createCommunitiesClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        assert.equal(String(url), 'http://localhost:3000/api/communities/daily-ai-builders/join');
        assert.equal(init?.method, 'DELETE');
        assert.equal(init?.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt-token');
        return Response.json(left);
      },
    });

    assert.deepEqual(await client.leave('daily-ai-builders', 'jwt-token'), left);
  });

  it('raises API errors with status and message', async () => {
    const client = createCommunitiesClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () => Response.json({ error: 'Authentication required.' }, { status: 401 }),
    });

    await assert.rejects(
      () => client.join('daily-ai-builders', 'jwt-token'),
      (err) =>
        err instanceof CommunitiesApiError &&
        err.status === 401 &&
        err.message === 'Authentication required.',
    );
  });
});
