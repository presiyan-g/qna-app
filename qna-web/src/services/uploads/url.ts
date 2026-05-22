export function isAllowedImageUrl(value: string, publicUrlPrefix: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

  const prefixUrl = new URL(publicUrlPrefix);
  return parsed.host === prefixUrl.host;
}

export function normalizeStoredImageUrl(
  value: unknown,
  publicUrlPrefix: string,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!isAllowedImageUrl(trimmed, publicUrlPrefix)) {
    throw new Error('Image must be uploaded through Quorum');
  }
  return trimmed;
}
