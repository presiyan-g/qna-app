import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUniqueViolation } from './db-errors';

describe('isUniqueViolation', () => {
  it('detects a bare pg-driver error carrying code 23505', () => {
    // Shape produced by the `pg` driver — a plain object with a `code`
    // property on the thrown error itself.
    const err = Object.assign(new Error('duplicate key value violates unique constraint "communities_slug_unique"'), {
      code: '23505',
    });
    assert.equal(isUniqueViolation(err), true);
  });

  it('detects when the error is wrapped by Drizzle (cause carries the code)', () => {
    // This is the production shape that originally went unhandled:
    // DrizzleQueryError({ message: "Failed query: insert into…", cause: pgError })
    const inner = Object.assign(new Error('duplicate key value violates unique constraint "communities_slug_unique"'), {
      code: '23505',
    });
    const outer = new Error('Failed query: insert into "communities" …', { cause: inner });
    assert.equal(isUniqueViolation(outer), true);
  });

  it('falls back to the message when no code is present', () => {
    const err = new Error('ERROR: duplicate key value violates unique constraint "foo"');
    assert.equal(isUniqueViolation(err), true);
  });

  it('walks more than one level of cause', () => {
    const root = Object.assign(new Error('inner'), { code: '23505' });
    const mid = new Error('mid', { cause: root });
    const top = new Error('top', { cause: mid });
    assert.equal(isUniqueViolation(top), true);
  });

  it('returns false for unrelated errors', () => {
    assert.equal(isUniqueViolation(new Error('connection refused')), false);
    assert.equal(isUniqueViolation(null), false);
    assert.equal(isUniqueViolation(undefined), false);
    // A different SQLSTATE — not a unique violation
    assert.equal(
      isUniqueViolation(Object.assign(new Error('foreign key violation'), { code: '23503' })),
      false,
    );
  });

  it('terminates on a self-referential cause chain', () => {
    // Defensively assert the depth cap really protects us. Without it
    // this test would hang.
    const cyclic: Error & { cause?: unknown } = new Error('cyclic');
    cyclic.cause = cyclic;
    assert.equal(isUniqueViolation(cyclic), false);
  });
});
