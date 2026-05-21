import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AuthApiError,
  createAuthClient,
  getConfiguredApiUrl,
} from './api';

const user = {
  id: 'user_1',
  email: 'ada@example.com',
  username: 'ada',
  role: 'member' as const,
  status: 'active' as const,
  createdAt: '2026-05-21T09:00:00.000Z',
};

describe('getConfiguredApiUrl', () => {
  it('trims trailing slashes from the configured API URL', () => {
    assert.equal(getConfiguredApiUrl('http://localhost:3000/api///'), 'http://localhost:3000/api');
  });
});

describe('createAuthClient', () => {
  it('posts login credentials and returns the token and user', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createAuthClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json({ token: 'jwt-token', user }, { status: 200 });
      },
    });

    const result = await client.login({ email: 'Ada@Example.com ', password: 'password123' });

    assert.deepEqual(result, { token: 'jwt-token', user });
    assert.equal(calls[0].url, 'http://localhost:3000/api/auth/login');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers?.['Content-Type' as keyof HeadersInit], 'application/json');
    assert.equal(calls[0].init.body, JSON.stringify({ email: 'ada@example.com', password: 'password123' }));
  });

  it('posts register credentials and returns the token and user', async () => {
    const client = createAuthClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () => Response.json({ token: 'new-token', user }, { status: 201 }),
    });

    const result = await client.register({
      email: 'Ada@Example.com ',
      username: ' Ada_123 ',
      password: 'password123',
    });

    assert.deepEqual(result, { token: 'new-token', user });
  });

  it('raises field errors from validation responses', async () => {
    const client = createAuthClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json(
          { error: 'Validation failed.', fieldErrors: { email: 'Enter a valid email.' } },
          { status: 422 },
        ),
    });

    await assert.rejects(
      () => client.login({ email: 'bad', password: 'password123' }),
      (err) =>
        err instanceof AuthApiError &&
        err.status === 422 &&
        err.fieldErrors.email === 'Enter a valid email.',
    );
  });

  it('sends the bearer token when loading the current user', async () => {
    const client = createAuthClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        assert.equal(init?.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt-token');
        return Response.json({ user }, { status: 200 });
      },
    });

    assert.deepEqual(await client.me('jwt-token'), user);
  });
});
