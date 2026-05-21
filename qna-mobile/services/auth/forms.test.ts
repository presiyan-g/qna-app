import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateLoginForm, validateRegisterForm } from './forms';

describe('validateLoginForm', () => {
  it('requires valid email and password values', () => {
    assert.deepEqual(validateLoginForm({ email: 'bad', password: '' }), {
      email: 'Enter a valid email address.',
      password: 'Enter your password.',
    });
  });

  it('accepts a valid login form', () => {
    assert.deepEqual(validateLoginForm({ email: 'ada@example.com', password: 'password123' }), {});
  });
});

describe('validateRegisterForm', () => {
  it('requires email, username, and password values matching the auth contract', () => {
    assert.deepEqual(validateRegisterForm({ email: 'bad', username: 'Ada!', password: 'short' }), {
      email: 'Enter a valid email address.',
      username: 'Use 3-24 lowercase letters, numbers, or underscores.',
      password: 'Use 8-128 characters.',
    });
  });

  it('accepts a valid register form', () => {
    assert.deepEqual(
      validateRegisterForm({
        email: 'ada@example.com',
        username: 'ada_123',
        password: 'password123',
      }),
      {},
    );
  });
});
