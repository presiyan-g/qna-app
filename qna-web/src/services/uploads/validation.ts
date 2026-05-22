import { UploadValidationError } from './errors';

export const UPLOAD_SCOPES = [
  'community-cover',
  'question-prompt',
  'question-choice',
  'broadcast',
] as const;
export type UploadScope = (typeof UPLOAD_SCOPES)[number];

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<AllowedImageType, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type UploadRequest = {
  scope: UploadScope;
  contentType: AllowedImageType;
  sizeBytes: number;
  extension: 'jpg' | 'png' | 'webp';
};

export function validateUploadRequest(raw: {
  scope?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
}): UploadRequest {
  const fieldErrors: Record<string, string> = {};

  const scope = typeof raw.scope === 'string' ? raw.scope : '';
  const contentType = typeof raw.contentType === 'string' ? raw.contentType : '';
  const sizeBytes =
    typeof raw.sizeBytes === 'number' && Number.isFinite(raw.sizeBytes)
      ? Math.floor(raw.sizeBytes)
      : -1;

  if (!UPLOAD_SCOPES.includes(scope as UploadScope)) {
    fieldErrors.scope = 'Unsupported upload scope.';
  }

  if (!ALLOWED_IMAGE_TYPES.includes(contentType as AllowedImageType)) {
    fieldErrors.contentType = 'Use JPEG, PNG, or WebP.';
  }

  if (sizeBytes <= 0) {
    fieldErrors.sizeBytes = 'Pick an image file.';
  } else if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    fieldErrors.sizeBytes = 'Use an image up to 5 MB.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new UploadValidationError(fieldErrors);
  }

  const typed = contentType as AllowedImageType;
  return {
    scope: scope as UploadScope,
    contentType: typed,
    sizeBytes,
    extension: EXTENSION_BY_TYPE[typed],
  };
}
