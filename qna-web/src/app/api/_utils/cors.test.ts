import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCorsHeaders, corsOptionsResponse, withCors } from './cors';

describe('API CORS helpers', () => {
  it('reflects localhost origins for mobile web development', () => {
    const headers = buildCorsHeaders('http://localhost:8082');

    assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:8082');
    assert.equal(headers.Vary, 'Origin');
  });

  it('does not allow arbitrary origins', () => {
    const headers = buildCorsHeaders('https://example.test');

    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  });

  it('adds CORS headers to JSON responses', () => {
    const response = withCors(Response.json({ ok: true }), 'http://localhost:8082');

    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8082');
    assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET,POST,DELETE,OPTIONS');
  });

  it('returns an OPTIONS preflight response', () => {
    const response = corsOptionsResponse('http://localhost:8082');

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type,Authorization');
  });
});
