import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectUniqueConflict } from './user-conflict';

const drizzleWrapperMsg =
  'Failed query: insert into "users" ("id", "email", "username", "password_hash", "role", "status", "created_at", "updated_at") values (default, $1, $2, $3, default, default, default, default) returning "id", "email", "username", "password_hash", "role", "status", "created_at", "updated_at"';

describe('detectUniqueConflict', () => {
  it('detects an email conflict from a Drizzle-wrapped Neon error', () => {
    const inner = new Error(
      'duplicate key value violates unique constraint "users_email_unique"',
    );
    const outer = new Error(drizzleWrapperMsg, { cause: inner });
    assert.equal(detectUniqueConflict(outer), 'email');
  });

  it('detects a username conflict even when the wrapper SQL also mentions "email"', () => {
    const inner = new Error(
      'duplicate key value violates unique constraint "users_username_unique"',
    );
    const outer = new Error(drizzleWrapperMsg, { cause: inner });
    assert.equal(detectUniqueConflict(outer), 'username');
  });

  it('detects email when only the Postgres detail "Key (email)=..." form is present alongside the duplicate-key prefix', () => {
    const inner = new Error(
      'duplicate key value violates unique constraint "some_other_name"\nDETAIL: Key (email)=(alice@example.com) already exists.',
    );
    const outer = new Error('Failed query: insert ...', { cause: inner });
    assert.equal(detectUniqueConflict(outer), 'email');
  });

  it('returns null for unrelated errors', () => {
    assert.equal(detectUniqueConflict(new Error('connection refused')), null);
    assert.equal(detectUniqueConflict(new Error('Failed query: select 1')), null);
  });

  it('returns null when input is not an Error', () => {
    assert.equal(detectUniqueConflict('boom'), null);
    assert.equal(detectUniqueConflict(null), null);
  });
});
