import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedImageUrl, normalizeStoredImageUrl } from './url';

const PUBLIC = 'https://pub-296483968407434aa306574a96261da8.r2.dev';

test('accepts URLs on the configured R2 public host', () => {
  assert.equal(
    isAllowedImageUrl(`${PUBLIC}/communities/c/cover/abc.jpg`, PUBLIC),
    true,
  );
});

test('rejects other hosts even if they look similar', () => {
  assert.equal(
    isAllowedImageUrl('https://evil.example/x.png', PUBLIC),
    false,
  );
  assert.equal(
    isAllowedImageUrl(
      'https://pub-296483968407434aa306574a96261da8.r2.dev.attacker.com/x.png',
      PUBLIC,
    ),
    false,
  );
});

test('rejects non-http(s) protocols', () => {
  assert.equal(isAllowedImageUrl(`javascript:alert(1)`, PUBLIC), false);
});

test('normalizeStoredImageUrl returns null for empty input', () => {
  assert.equal(normalizeStoredImageUrl('  ', PUBLIC), null);
  assert.equal(normalizeStoredImageUrl(null, PUBLIC), null);
});

test('normalizeStoredImageUrl throws for non-allowed hosts', () => {
  assert.throws(
    () => normalizeStoredImageUrl('https://evil.example/x.png', PUBLIC),
    /Image must be uploaded through Quorum/,
  );
});
