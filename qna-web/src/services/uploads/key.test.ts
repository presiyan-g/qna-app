import assert from 'node:assert/strict';
import test from 'node:test';
import { buildObjectKey } from './key';

test('community-cover key uses communityId prefix and random suffix', () => {
  const key = buildObjectKey({
    scope: 'community-cover',
    userId: '11111111-1111-1111-1111-111111111111',
    communityId: '22222222-2222-2222-2222-222222222222',
    extension: 'jpg',
    randomId: 'abcdef1234567890',
  });
  assert.equal(
    key,
    'communities/22222222-2222-2222-2222-222222222222/cover/abcdef1234567890.jpg',
  );
});

test('question-prompt key includes communityId and userId for traceability', () => {
  const key = buildObjectKey({
    scope: 'question-prompt',
    userId: '11111111-1111-1111-1111-111111111111',
    communityId: '22222222-2222-2222-2222-222222222222',
    extension: 'webp',
    randomId: 'zzz999',
  });
  assert.equal(
    key,
    'communities/22222222-2222-2222-2222-222222222222/questions/11111111-1111-1111-1111-111111111111/zzz999.webp',
  );
});

test('broadcast key follows the communities/{id}/broadcasts shape', () => {
  const key = buildObjectKey({
    scope: 'broadcast',
    userId: 'u',
    communityId: 'c',
    extension: 'png',
    randomId: 'r',
  });
  assert.equal(key, 'communities/c/broadcasts/u/r.png');
});

test('community-cover allows null communityId and routes to _pending', () => {
  const key = buildObjectKey({
    scope: 'community-cover',
    userId: 'u1',
    communityId: null,
    extension: 'jpg',
    randomId: 'r1',
  });
  assert.equal(key, 'communities/_pending/u1/cover/r1.jpg');
});

test('question-prompt still requires communityId', () => {
  assert.throws(
    () =>
      buildObjectKey({
        scope: 'question-prompt',
        userId: 'u',
        communityId: null,
        extension: 'jpg',
        randomId: 'r',
      }),
    /communityId is required/,
  );
});
