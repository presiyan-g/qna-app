import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toUserResource } from './user-resource';
import type { User } from '@/db/schema/users';

const baseUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'alice@example.com',
  username: 'alice',
  passwordHash: 'never-leak-me',
  role: 'member',
  status: 'active',
  createdAt: new Date('2026-05-20T12:00:00.000Z'),
  updatedAt: new Date('2026-05-20T12:00:00.000Z'),
};

describe('toUserResource', () => {
  it('exposes safe fields with ISO dates', () => {
    assert.deepEqual(toUserResource(baseUser), {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'alice@example.com',
      username: 'alice',
      role: 'member',
      status: 'active',
      createdAt: '2026-05-20T12:00:00.000Z',
    });
  });

  it('never includes passwordHash', () => {
    const resource = toUserResource(baseUser) as Record<string, unknown>;
    assert.equal('passwordHash' in resource, false);
  });

  it('carries admin role through unchanged', () => {
    const admin = { ...baseUser, role: 'admin' as const };
    assert.equal(toUserResource(admin).role, 'admin');
  });

  it('carries suspended status through unchanged', () => {
    const suspended = { ...baseUser, status: 'suspended' as const };
    assert.equal(toUserResource(suspended).status, 'suspended');
  });
});
