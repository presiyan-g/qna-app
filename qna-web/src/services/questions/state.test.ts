import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canManageUnpublishedQuestion,
  getQuestionLifecycleState,
} from './state';

const now = new Date('2026-05-20T12:00:00.000Z');

describe('getQuestionLifecycleState', () => {
  it('derives draft, scheduled, live, closed, and deleted states', () => {
    assert.equal(getQuestionLifecycleState(row({}), now), 'draft');
    assert.equal(
      getQuestionLifecycleState(
        row({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          publishedAt: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
        now,
      ),
      'scheduled',
    );
    assert.equal(
      getQuestionLifecycleState(
        row({
          scheduledFor: '2026-05-20T10:00:00.000Z',
          publishedAt: '2026-05-20T10:00:00.000Z',
          closesAt: '2026-05-21T10:00:00.000Z',
        }),
        now,
      ),
      'live',
    );
    assert.equal(
      getQuestionLifecycleState(
        row({
          scheduledFor: '2026-05-18T10:00:00.000Z',
          publishedAt: '2026-05-18T10:00:00.000Z',
          closesAt: '2026-05-19T10:00:00.000Z',
        }),
        now,
      ),
      'closed',
    );
    assert.equal(
      getQuestionLifecycleState(
        row({ deletedAt: '2026-05-20T11:00:00.000Z' }),
        now,
      ),
      'deleted',
    );
  });
});

describe('canManageUnpublishedQuestion', () => {
  it('allows draft and future scheduled rows only', () => {
    assert.equal(canManageUnpublishedQuestion(row({}), now), true);
    assert.equal(
      canManageUnpublishedQuestion(
        row({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          publishedAt: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
        now,
      ),
      true,
    );
    assert.equal(
      canManageUnpublishedQuestion(
        row({
          scheduledFor: '2026-05-20T10:00:00.000Z',
          publishedAt: '2026-05-20T10:00:00.000Z',
          closesAt: '2026-05-21T10:00:00.000Z',
        }),
        now,
      ),
      false,
    );
  });
});

function row(values: {
  scheduledFor?: string;
  publishedAt?: string;
  closesAt?: string;
  deletedAt?: string;
}) {
  return {
    scheduledFor: values.scheduledFor ? new Date(values.scheduledFor) : null,
    publishedAt: values.publishedAt ? new Date(values.publishedAt) : null,
    closesAt: values.closesAt ? new Date(values.closesAt) : null,
    deletedAt: values.deletedAt ? new Date(values.deletedAt) : null,
  };
}
