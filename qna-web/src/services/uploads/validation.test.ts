import assert from 'node:assert/strict';
import test from 'node:test';
import { UploadValidationError } from './errors';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  validateUploadRequest,
} from './validation';

test('accepts a typical jpeg under the size cap', () => {
  const result = validateUploadRequest({
    scope: 'community-cover',
    contentType: 'image/jpeg',
    sizeBytes: 250_000,
  });
  assert.deepEqual(result, {
    scope: 'community-cover',
    contentType: 'image/jpeg',
    sizeBytes: 250_000,
    extension: 'jpg',
  });
});

test('maps each allowed mime type to a canonical extension', () => {
  for (const type of ALLOWED_IMAGE_TYPES) {
    const result = validateUploadRequest({
      scope: 'broadcast',
      contentType: type,
      sizeBytes: 1,
    });
    assert.match(result.extension, /^(jpg|png|webp|avif)$/);
  }
});

test('rejects unknown scopes', () => {
  assert.throws(
    () =>
      validateUploadRequest({
        scope: 'avatar',
        contentType: 'image/png',
        sizeBytes: 1,
      }),
    (err) =>
      err instanceof UploadValidationError &&
      err.fieldErrors.scope === 'Unsupported upload scope.',
  );
});

test('rejects disallowed content types', () => {
  assert.throws(
    () =>
      validateUploadRequest({
        scope: 'broadcast',
        contentType: 'image/gif',
        sizeBytes: 1,
      }),
    (err) =>
      err instanceof UploadValidationError &&
      err.fieldErrors.contentType === 'Use JPEG, PNG, WebP, or AVIF.',
  );
});

test('rejects oversize uploads and non-positive sizes', () => {
  assert.throws(
    () =>
      validateUploadRequest({
        scope: 'broadcast',
        contentType: 'image/png',
        sizeBytes: MAX_IMAGE_SIZE_BYTES + 1,
      }),
    (err) =>
      err instanceof UploadValidationError &&
      err.fieldErrors.sizeBytes === 'Use an image up to 5 MB.',
  );

  assert.throws(
    () =>
      validateUploadRequest({
        scope: 'broadcast',
        contentType: 'image/png',
        sizeBytes: 0,
      }),
    (err) =>
      err instanceof UploadValidationError &&
      err.fieldErrors.sizeBytes === 'Pick an image file.',
  );
});
