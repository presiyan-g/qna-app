import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLeaderboardClient,
  LeaderboardApiError,
  type LeaderboardEntry,
  type LeaderboardResult,
} from './api';

const entry: LeaderboardEntry = {
  rank: 1,
  userId: 'user_1',
  username: 'lia',
  points: 50,
  lastScoringAnswerAt: '2026-05-22T09:00:00.000Z',
};

const result: LeaderboardResult = {
  community: { id: 'community_1', slug: 'ai-builders', name: 'AI Builders' },
  window: '7d',
  entries: [entry],
  viewerEntry: null,
};

describe('createLeaderboardClient', () => {
  it('fetches leaderboard with default window 7d when none provided', async () => {
    let seenUrl = '';
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url) => {
        seenUrl = String(url);
        return Response.json(result);
      },
    });

    await client.get('ai-builders');

    assert.equal(
      seenUrl,
      'http://localhost:3000/api/communities/ai-builders/leaderboard?window=7d',
    );
  });

  it('passes the window query param when provided', async () => {
    let seenUrl = '';
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url) => {
        seenUrl = String(url);
        return Response.json(result);
      },
    });

    await client.get('ai-builders', { window: 'all' });

    assert.ok(seenUrl.endsWith('?window=all'));
  });

  it('forwards the bearer token when supplied', async () => {
    let seenHeaders: Record<string, string> = {};
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        seenHeaders = (init?.headers ?? {}) as Record<string, string>;
        return Response.json(result);
      },
    });

    await client.get('ai-builders', { window: '30d', token: 'jwt' });

    assert.equal(seenHeaders.Authorization, 'Bearer jwt');
  });

  it('returns the parsed leaderboard with entries and viewerEntry', async () => {
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({
          ...result,
          viewerEntry: { ...entry, rank: 42, userId: 'user_42', username: 'me' },
        }),
    });

    const out = await client.get('ai-builders');

    assert.equal(out.entries.length, 1);
    assert.equal(out.viewerEntry?.rank, 42);
    assert.equal(out.viewerEntry?.username, 'me');
  });

  it('maps 404 to LeaderboardApiError with code "not_found"', async () => {
    const client = createLeaderboardClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json({ error: 'Community not found.' }, { status: 404 }),
    });

    await assert.rejects(
      () => client.get('nope'),
      (err) =>
        err instanceof LeaderboardApiError &&
        err.status === 404 &&
        err.code === 'not_found',
    );
  });
});
