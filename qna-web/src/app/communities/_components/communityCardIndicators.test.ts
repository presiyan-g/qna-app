import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatNewQuestionsLabel,
  formatNewBroadcastsLabel,
} from './communityCardIndicators';

describe('communityCardIndicators', () => {
  it('singular/plural new question label', () => {
    assert.equal(formatNewQuestionsLabel(1), '1 new question');
    assert.equal(formatNewQuestionsLabel(2), '2 new questions');
    assert.equal(formatNewQuestionsLabel(5), '5 new questions');
  });

  it('singular/plural new broadcast label', () => {
    assert.equal(formatNewBroadcastsLabel(1), '1 new broadcast');
    assert.equal(formatNewBroadcastsLabel(2), '2 new broadcasts');
    assert.equal(formatNewBroadcastsLabel(7), '7 new broadcasts');
  });
});
