import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canListQuestionComments,
  canPostQuestionComment,
  canSoftDeleteQuestionComment,
} from './policy';

test('allows members who answered to list and post comments on open questions', () => {
  assert.equal(
    canListQuestionComments({
      communityRole: 'member',
      hasAnswered: true,
      isClosed: false,
    }),
    true,
  );
  assert.equal(
    canPostQuestionComment({
      communityRole: 'member',
      hasAnswered: true,
    }),
    true,
  );
});

test('allows closed question comment reads for members who missed the question but keeps posting locked', () => {
  assert.equal(
    canListQuestionComments({
      communityRole: 'member',
      hasAnswered: false,
      isClosed: true,
    }),
    true,
  );
  assert.equal(
    canPostQuestionComment({
      communityRole: 'member',
      hasAnswered: false,
    }),
    false,
  );
});

test('blocks non-members from listing and posting comments', () => {
  assert.equal(
    canListQuestionComments({
      communityRole: null,
      hasAnswered: true,
      isClosed: true,
    }),
    false,
  );
  assert.equal(
    canPostQuestionComment({
      communityRole: null,
      hasAnswered: true,
    }),
    false,
  );
});

test('allows authors and community creators to soft-delete comments', () => {
  assert.equal(
    canSoftDeleteQuestionComment({
      authorUserId: 'user_1',
      userId: 'user_1',
      communityRole: 'member',
    }),
    true,
  );
  assert.equal(
    canSoftDeleteQuestionComment({
      authorUserId: 'user_1',
      userId: 'creator_1',
      communityRole: 'creator',
    }),
    true,
  );
  assert.equal(
    canSoftDeleteQuestionComment({
      authorUserId: 'user_1',
      userId: 'user_2',
      communityRole: 'member',
    }),
    false,
  );
});
