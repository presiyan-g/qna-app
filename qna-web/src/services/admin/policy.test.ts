import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AccountSuspendedError,
  AdminInvariantError,
  AdminPermissionError,
} from './errors';
import {
  assertActiveAdmin,
  assertCanSuspendTargetUser,
  assertUserCanMutate,
  canAccessAdmin,
} from './policy';

describe('canAccessAdmin', () => {
  it('allows only active platform admins', () => {
    assert.equal(canAccessAdmin({ role: 'admin', status: 'active' }), true);
    assert.equal(canAccessAdmin({ role: 'member', status: 'active' }), false);
    assert.equal(canAccessAdmin({ role: 'admin', status: 'suspended' }), false);
    assert.equal(canAccessAdmin(null), false);
  });
});

describe('assertActiveAdmin', () => {
  it('throws for members and suspended admins', () => {
    assert.doesNotThrow(() =>
      assertActiveAdmin({ role: 'admin', status: 'active' }),
    );
    assert.throws(
      () => assertActiveAdmin({ role: 'member', status: 'active' }),
      AdminPermissionError,
    );
    assert.throws(
      () => assertActiveAdmin({ role: 'admin', status: 'suspended' }),
      AdminPermissionError,
    );
  });
});

describe('assertUserCanMutate', () => {
  it('blocks suspended users from product mutations', () => {
    assert.doesNotThrow(() => assertUserCanMutate({ status: 'active' }));
    assert.throws(
      () => assertUserCanMutate({ status: 'suspended' }),
      AccountSuspendedError,
    );
  });
});

describe('assertCanSuspendTargetUser', () => {
  it('blocks self-suspension', () => {
    assert.throws(
      () =>
        assertCanSuspendTargetUser({
          actorUserId: 'u1',
          targetUserId: 'u1',
          targetRole: 'member',
          activeAdminCount: 2,
        }),
      AdminInvariantError,
    );
  });

  it('blocks suspending the last active admin', () => {
    assert.throws(
      () =>
        assertCanSuspendTargetUser({
          actorUserId: 'u1',
          targetUserId: 'u2',
          targetRole: 'admin',
          activeAdminCount: 1,
        }),
      AdminInvariantError,
    );
  });

  it('allows suspending a member or a non-last admin', () => {
    assert.doesNotThrow(() =>
      assertCanSuspendTargetUser({
        actorUserId: 'u1',
        targetUserId: 'u2',
        targetRole: 'member',
        activeAdminCount: 1,
      }),
    );
    assert.doesNotThrow(() =>
      assertCanSuspendTargetUser({
        actorUserId: 'u1',
        targetUserId: 'u2',
        targetRole: 'admin',
        activeAdminCount: 2,
      }),
    );
  });
});
