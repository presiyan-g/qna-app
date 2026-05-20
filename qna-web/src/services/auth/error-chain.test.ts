import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeErrorChain } from './error-chain';

describe('describeErrorChain', () => {
  it('returns the message of a plain Error', () => {
    assert.equal(describeErrorChain(new Error('boom')), 'boom');
  });

  it('walks the .cause chain so wrapper errors surface their drivers', () => {
    const inner = new Error(
      'duplicate key value violates unique constraint "users_email_unique"',
    );
    const outer = new Error('Failed query', { cause: inner });
    const combined = describeErrorChain(outer);
    assert.match(combined, /Failed query/);
    assert.match(combined, /duplicate key/);
    assert.match(combined, /email/);
  });

  it('returns an empty string for non-Error input', () => {
    assert.equal(describeErrorChain('boom'), '');
    assert.equal(describeErrorChain(null), '');
    assert.equal(describeErrorChain(undefined), '');
  });

  it('caps recursion at maxDepth to guard against cycles', () => {
    let err: Error = new Error('deepest');
    for (let i = 0; i < 10; i++) {
      err = new Error(`level-${i}`, { cause: err });
    }
    const parts = describeErrorChain(err, 3).split(' | ');
    assert.equal(parts.length, 3);
  });
});
