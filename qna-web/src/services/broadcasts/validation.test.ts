import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BroadcastValidationError,
  validateBroadcastInput,
} from './validation';

test('trims valid broadcast body and normalizes blank image URL', () => {
  assert.deepEqual(
    validateBroadcastInput({
      body: '  Hello builders\n\nShip today.  ',
      imageUrl: '   ',
    }),
    { body: 'Hello builders\n\nShip today.', imageUrl: null },
  );
});

test('rejects missing and overlong bodies', () => {
  assert.throws(
    () => validateBroadcastInput({ body: ' ' }),
    (err) =>
      err instanceof BroadcastValidationError &&
      err.fieldErrors.body === 'Write a broadcast before posting.',
  );

  assert.throws(
    () => validateBroadcastInput({ body: 'a'.repeat(4001) }),
    (err) =>
      err instanceof BroadcastValidationError &&
      err.fieldErrors.body === 'Use 4000 characters or fewer.',
  );
});

test('only accepts image URLs on the configured R2 host', () => {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    // Skip in environments without R2 configured; this guards CI from breaking.
    return;
  }

  assert.equal(
    validateBroadcastInput({
      body: 'Post',
      imageUrl: `${publicUrl}/communities/c/broadcasts/u/r.png`,
    }).imageUrl,
    `${publicUrl}/communities/c/broadcasts/u/r.png`,
  );

  assert.throws(
    () =>
      validateBroadcastInput({
        body: 'Post',
        imageUrl: 'https://example.com/image.png',
      }),
    (err) =>
      err instanceof BroadcastValidationError &&
      err.fieldErrors.imageUrl === 'Re-upload the image.',
  );
});
