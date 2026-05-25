export class CommentCursorError extends Error {
  constructor() {
    super('Invalid comment cursor.');
    this.name = 'CommentCursorError';
  }
}

export type CommentCursor = {
  createdAt: Date;
  id: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function normalizeCommentLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export function encodeCommentCursor(cursor: CommentCursor): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
  ).toString('base64url');
}

export function decodeCommentCursor(value: string): CommentCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as { createdAt?: unknown; id?: unknown };

    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      throw new CommentCursorError();
    }

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new CommentCursorError();
    }

    return { createdAt, id: parsed.id };
  } catch (err) {
    if (err instanceof CommentCursorError) throw err;
    throw new CommentCursorError();
  }
}
