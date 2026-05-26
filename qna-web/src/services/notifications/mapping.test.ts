import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  toQuestionNotification,
  type QuestionNotificationRow,
} from './mapping';

const NOW = new Date('2026-05-25T12:00:00.000Z');
const ONE_HOUR_AGO = new Date(NOW.getTime() - 60 * 60 * 1000);
const ONE_HOUR_AHEAD = new Date(NOW.getTime() + 60 * 60 * 1000);
const ONE_DAY_AGO = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

function row(overrides: Partial<QuestionNotificationRow> = {}): QuestionNotificationRow {
  return {
    questionId: 'q1',
    prompt: 'What is the capital of France?',
    publishedAt: ONE_HOUR_AGO,
    closesAt: ONE_HOUR_AHEAD,
    communitySlug: 'geography',
    communityName: 'Geography Daily',
    communityEmoji: '🌍',
    hasAnswered: false,
    ...overrides,
  };
}

describe('toQuestionNotification', () => {
  describe('isUnread', () => {
    it('is true when lastSeenNotificationsAt is null', () => {
      const result = toQuestionNotification(row(), {
        now: NOW,
        lastSeenNotificationsAt: null,
      });
      assert.equal(result.isUnread, true);
    });

    it('is true when the row was published after lastSeenNotificationsAt', () => {
      const result = toQuestionNotification(row({ publishedAt: ONE_HOUR_AGO }), {
        now: NOW,
        lastSeenNotificationsAt: ONE_DAY_AGO,
      });
      assert.equal(result.isUnread, true);
    });

    it('is false when the row was published at or before lastSeenNotificationsAt', () => {
      const lastSeen = new Date(ONE_HOUR_AGO.getTime() + 1000);
      const result = toQuestionNotification(row({ publishedAt: ONE_HOUR_AGO }), {
        now: NOW,
        lastSeenNotificationsAt: lastSeen,
      });
      assert.equal(result.isUnread, false);
    });

    it('treats equal timestamps as already-seen (strict greater-than)', () => {
      const result = toQuestionNotification(row({ publishedAt: ONE_HOUR_AGO }), {
        now: NOW,
        lastSeenNotificationsAt: ONE_HOUR_AGO,
      });
      assert.equal(result.isUnread, false);
    });
  });

  describe('isClosed', () => {
    it('is false when closesAt is in the future', () => {
      const result = toQuestionNotification(row({ closesAt: ONE_HOUR_AHEAD }), {
        now: NOW,
        lastSeenNotificationsAt: null,
      });
      assert.equal(result.isClosed, false);
    });

    it('is true when closesAt is in the past', () => {
      const result = toQuestionNotification(row({ closesAt: ONE_HOUR_AGO }), {
        now: NOW,
        lastSeenNotificationsAt: null,
      });
      assert.equal(result.isClosed, true);
    });

    it('is true when closesAt equals now', () => {
      const result = toQuestionNotification(row({ closesAt: NOW }), {
        now: NOW,
        lastSeenNotificationsAt: null,
      });
      assert.equal(result.isClosed, true);
    });

    it('is false when closesAt is null', () => {
      const result = toQuestionNotification(row({ closesAt: null }), {
        now: NOW,
        lastSeenNotificationsAt: null,
      });
      assert.equal(result.isClosed, false);
    });
  });

  describe('passthrough fields', () => {
    it('preserves identifiers, prompt, community metadata, and hasAnswered', () => {
      const input = row({
        questionId: 'q-xyz',
        prompt: 'Edge cases?',
        communitySlug: 'devs',
        communityName: 'Devs',
        communityEmoji: '💻',
        hasAnswered: true,
      });
      const result = toQuestionNotification(input, {
        now: NOW,
        lastSeenNotificationsAt: null,
      });
      assert.equal(result.questionId, 'q-xyz');
      assert.equal(result.prompt, 'Edge cases?');
      assert.equal(result.communitySlug, 'devs');
      assert.equal(result.communityName, 'Devs');
      assert.equal(result.communityEmoji, '💻');
      assert.equal(result.hasAnswered, true);
    });
  });
});
