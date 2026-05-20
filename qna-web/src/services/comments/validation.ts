import { CommentValidationError } from './errors';

const MAX_COMMENT_LENGTH = 2000;

export function validateCommentBody(value: unknown): string {
  const body = typeof value === 'string' ? value.trim() : '';

  if (!body) {
    throw new CommentValidationError({
      body: 'Write a comment before posting.',
    });
  }

  if (body.length > MAX_COMMENT_LENGTH) {
    throw new CommentValidationError({
      body: 'Keep comments to 2000 characters or fewer.',
    });
  }

  return body;
}
