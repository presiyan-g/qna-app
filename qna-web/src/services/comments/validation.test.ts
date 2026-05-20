import assert from 'node:assert/strict';
import test from 'node:test';
import { CommentValidationError } from './errors';
import { validateCommentBody } from './validation';

test('trims valid comment body text', () => {
  assert.equal(validateCommentBody('  This helped me understand RAG evals.  '), 'This helped me understand RAG evals.');
});

test('rejects empty comment body text', () => {
  assert.throws(
    () => validateCommentBody('   '),
    (err) =>
      err instanceof CommentValidationError &&
      err.fieldErrors.body === 'Write a comment before posting.',
  );
});

test('rejects comment body text longer than 2000 characters', () => {
  assert.throws(
    () => validateCommentBody('a'.repeat(2001)),
    (err) =>
      err instanceof CommentValidationError &&
      err.fieldErrors.body === 'Keep comments to 2000 characters or fewer.',
  );
});
