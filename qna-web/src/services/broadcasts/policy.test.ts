import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCreateBroadcastPost,
  canEditBroadcastPost,
  canReadBroadcasts,
  canSoftDeleteBroadcastPost,
} from './policy';

test('only community creators can create broadcast posts', () => {
  assert.equal(canCreateBroadcastPost('creator'), true);
  assert.equal(canCreateBroadcastPost('member'), false);
  assert.equal(canCreateBroadcastPost(null), false);
});

test('only the author creator can edit a broadcast post', () => {
  assert.equal(
    canEditBroadcastPost({
      authorUserId: 'user_1',
      userId: 'user_1',
      communityRole: 'creator',
    }),
    true,
  );
  assert.equal(
    canEditBroadcastPost({
      authorUserId: 'user_1',
      userId: 'user_2',
      communityRole: 'creator',
    }),
    false,
  );
  assert.equal(
    canEditBroadcastPost({
      authorUserId: 'user_1',
      userId: 'user_1',
      communityRole: 'member',
    }),
    false,
  );
});

test('authors and same-community creators can soft-delete broadcast posts', () => {
  assert.equal(
    canSoftDeleteBroadcastPost({
      authorUserId: 'user_1',
      userId: 'user_1',
      communityRole: 'creator',
    }),
    true,
  );
  assert.equal(
    canSoftDeleteBroadcastPost({
      authorUserId: 'user_1',
      userId: 'user_2',
      communityRole: 'creator',
    }),
    true,
  );
  assert.equal(
    canSoftDeleteBroadcastPost({
      authorUserId: 'user_1',
      userId: 'user_2',
      communityRole: 'member',
    }),
    false,
  );
});

test('members and creators can read broadcasts; non-members cannot', () => {
  assert.equal(canReadBroadcasts('creator'), true);
  assert.equal(canReadBroadcasts('member'), true);
  assert.equal(canReadBroadcasts(null), false);
});
