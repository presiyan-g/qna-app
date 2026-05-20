import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUTHENTICATED_HOME_PATH,
  resolvePostAuthRedirectPath,
} from './navigation';

describe('resolvePostAuthRedirectPath', () => {
  it('uses communities as the default authenticated destination', () => {
    assert.equal(AUTHENTICATED_HOME_PATH, '/communities');
    assert.equal(resolvePostAuthRedirectPath(null), '/communities');
  });

  it('preserves safe internal next paths with search params', () => {
    assert.equal(
      resolvePostAuthRedirectPath('/dashboard/communities/daily-ai?tab=drafts'),
      '/dashboard/communities/daily-ai?tab=drafts',
    );
  });

  it('rejects external and malformed next paths', () => {
    assert.equal(resolvePostAuthRedirectPath('https://evil.test'), '/communities');
    assert.equal(resolvePostAuthRedirectPath('//evil.test/path'), '/communities');
    assert.equal(resolvePostAuthRedirectPath('communities'), '/communities');
    assert.equal(resolvePostAuthRedirectPath('/login'), '/communities');
  });
});
