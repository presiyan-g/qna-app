import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRuntimeApiUrl } from './config-url';

describe('resolveRuntimeApiUrl', () => {
  it('uses the configured API URL unchanged on web', () => {
    assert.equal(
      resolveRuntimeApiUrl({
        configuredApiUrl: 'http://localhost:3000/api',
        expoHostUri: '192.168.100.227:8081',
        platform: 'web',
      }),
      'http://localhost:3000/api',
    );
  });

  it('rewrites localhost to the Expo LAN host on native devices', () => {
    assert.equal(
      resolveRuntimeApiUrl({
        configuredApiUrl: 'http://localhost:3000/api',
        expoHostUri: '192.168.100.227:8081',
        platform: 'ios',
      }),
      'http://192.168.100.227:3000/api',
    );
  });

  it('falls back to the Expo Go debugger host on native devices', () => {
    assert.equal(
      resolveRuntimeApiUrl({
        configuredApiUrl: 'http://localhost:3000/api',
        expoDebuggerHost: '192.168.100.227:8081',
        platform: 'ios',
      }),
      'http://192.168.100.227:3000/api',
    );
  });

  it('keeps explicit non-localhost API hosts unchanged on native devices', () => {
    assert.equal(
      resolveRuntimeApiUrl({
        configuredApiUrl: 'http://192.168.100.227:3000/api',
        expoHostUri: '192.168.100.227:8081',
        platform: 'android',
      }),
      'http://192.168.100.227:3000/api',
    );
  });

  it('rewrites stale private LAN API hosts to the current Expo LAN host', () => {
    assert.equal(
      resolveRuntimeApiUrl({
        configuredApiUrl: 'http://192.168.0.10:3000/api',
        expoHostUri: '192.168.100.227:8081',
        platform: 'ios',
      }),
      'http://192.168.100.227:3000/api',
    );
  });
});
