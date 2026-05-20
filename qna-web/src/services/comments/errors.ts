export class CommentPermissionError extends Error {
  constructor(message = 'You do not have permission to access this comment thread.') {
    super(message);
    this.name = 'CommentPermissionError';
  }
}

export class CommentValidationError extends Error {
  fieldErrors: Partial<Record<'body' | 'parentCommentId', string>>;

  constructor(fieldErrors: Partial<Record<'body' | 'parentCommentId', string>>) {
    super('Invalid comment input.');
    this.name = 'CommentValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class CommentNotFoundError extends Error {
  constructor() {
    super('Comment not found.');
    this.name = 'CommentNotFoundError';
  }
}
