import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QuestionImmutableError } from './errors';
import {
  assertCanManageQuestion,
  canAccessCreatorDashboard,
  shouldIncludeQuestionInActiveReads,
} from './management-policy';

const now = new Date('2026-05-20T12:00:00.000Z');

describe('canAccessCreatorDashboard', () => {
  it('allows creator memberships only', () => {
    assert.equal(canAccessCreatorDashboard('creator'), true);
    assert.equal(canAccessCreatorDashboard('member'), false);
    assert.equal(canAccessCreatorDashboard(null), false);
  });

  it('allows admins regardless of community role', () => {
    assert.equal(canAccessCreatorDashboard(null, 'admin'), true);
    assert.equal(canAccessCreatorDashboard('member', 'admin'), true);
  });
});

describe('assertCanManageQuestion', () => {
  it('allows drafts and future scheduled questions', () => {
    assert.doesNotThrow(() => assertCanManageQuestion(question({}), { now }));
    assert.doesNotThrow(() =>
      assertCanManageQuestion(
        question({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          publishedAt: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
        { now },
      ),
    );
  });

  it('rejects live, closed, and soft-deleted questions', () => {
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({
            scheduledFor: '2026-05-20T10:00:00.000Z',
            publishedAt: '2026-05-20T10:00:00.000Z',
            closesAt: '2026-05-21T10:00:00.000Z',
          }),
          { now },
        ),
      QuestionImmutableError,
    );
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({
            scheduledFor: '2026-05-18T10:00:00.000Z',
            publishedAt: '2026-05-18T10:00:00.000Z',
            closesAt: '2026-05-19T10:00:00.000Z',
          }),
          { now },
        ),
      QuestionImmutableError,
    );
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({ deletedAt: '2026-05-20T11:00:00.000Z' }),
          { now },
        ),
      QuestionImmutableError,
    );
  });
});

describe('assertCanManageQuestion (admin bypass)', () => {
  it('does not throw for admin against a published, live question', () => {
    assert.doesNotThrow(() =>
      assertCanManageQuestion(
        question({
          scheduledFor: '2026-05-20T10:00:00.000Z',
          publishedAt: '2026-05-20T10:00:00.000Z',
          closesAt: '2026-05-21T10:00:00.000Z',
        }),
        { platformRole: 'admin', now },
      ),
    );
  });

  it('does not throw for admin against a closed question', () => {
    assert.doesNotThrow(() =>
      assertCanManageQuestion(
        question({
          scheduledFor: '2026-05-18T10:00:00.000Z',
          publishedAt: '2026-05-18T10:00:00.000Z',
          closesAt: '2026-05-19T10:00:00.000Z',
        }),
        { platformRole: 'admin', now },
      ),
    );
  });

  it('still throws for admin against a soft-deleted question', () => {
    assert.throws(
      () =>
        assertCanManageQuestion(
          question({ deletedAt: '2026-05-20T11:00:00.000Z' }),
          { platformRole: 'admin', now },
        ),
      QuestionImmutableError,
    );
  });
});

describe('shouldIncludeQuestionInActiveReads', () => {
  it('excludes drafts and soft-deleted questions from public/member reads', () => {
    assert.equal(shouldIncludeQuestionInActiveReads(question({})), false);
    assert.equal(
      shouldIncludeQuestionInActiveReads(
        question({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
        }),
      ),
      true,
    );
    assert.equal(
      shouldIncludeQuestionInActiveReads(
        question({
          scheduledFor: '2026-05-21T12:00:00.000Z',
          closesAt: '2026-05-22T12:00:00.000Z',
          deletedAt: '2026-05-20T11:00:00.000Z',
        }),
      ),
      false,
    );
  });
});

function question(values: {
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
