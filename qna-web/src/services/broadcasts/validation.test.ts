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

test('accepts only http and https image URLs', () => {
  assert.equal(
    validateBroadcastInput({
      body: 'Post',
      imageUrl: 'https://example.com/image.png',
    }).imageUrl,
    'https://example.com/image.png',
  );

  assert.throws(
    () =>
      validateBroadcastInput({
        body: 'Post',
        imageUrl: 'javascript:alert(1)',
      }),
    (err) =>
      err instanceof BroadcastValidationError &&
      err.fieldErrors.imageUrl === 'Use a valid http or https image URL.',
  );
});
