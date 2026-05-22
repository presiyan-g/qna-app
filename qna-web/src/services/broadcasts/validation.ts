import { normalizeStoredImageUrl } from '@/services/uploads/url';
import { BroadcastValidationError } from './errors';

export { BroadcastValidationError } from './errors';

const MAX_BROADCAST_BODY_LENGTH = 4000;

export type BroadcastInput = {
  body: string;
  imageUrl: string | null;
};

export function validateBroadcastInput(raw: {
  body?: unknown;
  imageUrl?: unknown;
}): BroadcastInput {
  const fieldErrors: Partial<Record<'body' | 'imageUrl', string>> = {};
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  const imageUrl = normalizeOptionalImageUrl(raw.imageUrl, fieldErrors);

  if (!body) {
    fieldErrors.body = 'Write a broadcast before posting.';
  } else if (body.length > MAX_BROADCAST_BODY_LENGTH) {
    fieldErrors.body = 'Use 4000 characters or fewer.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new BroadcastValidationError(fieldErrors);
  }

  return { body, imageUrl };
}

function normalizeOptionalImageUrl(
  value: unknown,
  fieldErrors: Partial<Record<'body' | 'imageUrl', string>>,
): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL ?? '';
  try {
    return normalizeStoredImageUrl(value, publicUrl);
  } catch {
    fieldErrors.imageUrl = 'Re-upload the image.';
    return null;
  }
}
