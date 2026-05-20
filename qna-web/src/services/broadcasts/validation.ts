import { BroadcastValidationError } from './errors';

export { BroadcastValidationError } from './errors';

const MAX_BROADCAST_BODY_LENGTH = 4000;
const MAX_IMAGE_URL_LENGTH = 2048;

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
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
    fieldErrors.imageUrl = 'Use 2048 characters or fewer.';
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      fieldErrors.imageUrl = 'Use a valid http or https image URL.';
      return null;
    }
    return url.toString();
  } catch {
    fieldErrors.imageUrl = 'Use a valid http or https image URL.';
    return null;
  }
}
