export class BroadcastCursorError extends Error {
  constructor() {
    super('Invalid broadcast cursor.');
    this.name = 'BroadcastCursorError';
  }
}

export type BroadcastCursor = {
  publishedAt: Date;
  id: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function normalizeBroadcastLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export function encodeBroadcastCursor(cursor: BroadcastCursor): string {
  return Buffer.from(
    JSON.stringify({
      publishedAt: cursor.publishedAt.toISOString(),
      id: cursor.id,
    }),
  ).toString('base64url');
}

export function decodeBroadcastCursor(value: string): BroadcastCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as {
      publishedAt?: unknown;
      id?: unknown;
    };

    if (typeof parsed.publishedAt !== 'string' || typeof parsed.id !== 'string') {
      throw new BroadcastCursorError();
    }

    const publishedAt = new Date(parsed.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) {
      throw new BroadcastCursorError();
    }

    return { publishedAt, id: parsed.id };
  } catch (err) {
    if (err instanceof BroadcastCursorError) throw err;
    throw new BroadcastCursorError();
  }
}
