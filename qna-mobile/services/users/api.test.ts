import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UsersApiError, createUsersClient } from './api';

const profile = {
  user: {
    id: 'user_1',
    username: 'ada_builder',
    joinedAt: '2026-05-01T09:00:00.000Z',
  },
  stats: {
    totalPoints: 40,
    communityCount: 2,
  },
  communities: [
    {
      id: 'community_1',
      slug: 'daily-ai-builders',
      name: 'Daily AI Builders',
      role: 'member' as const,
      joinedAt: '2026-05-03T09:00:00.000Z',
    },
  ],
};

describe('createUsersClient', () => {
  it('loads a public user profile by username', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createUsersClient({
      apiUrl: 'http://localhost:3000/api///',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json(profile);
      },
    });

    const result = await client.getProfile('Ada Builder');

    assert.deepEqual(result, profile);
    assert.equal(calls[0].url, 'http://localhost:3000/api/users/Ada%20Builder');
    assert.equal(calls[0].init.method, 'GET');
  });

  it('raises API errors with status and message', async () => {
    const client = createUsersClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () => Response.json({ error: 'User not found.' }, { status: 404 }),
    });

    await assert.rejects(
      () => client.getProfile('missing'),
      (err) =>
        err instanceof UsersApiError &&
        err.status === 404 &&
        err.message === 'User not found.',
    );
  });
});
