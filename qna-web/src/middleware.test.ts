import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildLoginRedirectUrl } from './middleware';

describe('buildLoginRedirectUrl', () => {
  it('preserves dashboard path and search in next param', () => {
    const url = buildLoginRedirectUrl(
      new URL('https://qna.test/dashboard/communities/daily-ai?tab=drafts'),
    );

    assert.equal(
      url.toString(),
      'https://qna.test/login?next=%2Fdashboard%2Fcommunities%2Fdaily-ai%3Ftab%3Ddrafts',
    );
  });
});
