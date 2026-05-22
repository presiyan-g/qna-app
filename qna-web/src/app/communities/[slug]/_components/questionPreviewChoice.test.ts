import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyChoice } from './questionPreviewChoice';

describe('classifyChoice', () => {
  it('returns "correct" when the choice is the revealed correct one', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c1',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: true },
        revealedCorrectChoiceId: 'c1',
      }),
      'correct',
    );
  });

  it('returns "correct" for the right answer even when the viewer picked something else', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c2',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: false },
        revealedCorrectChoiceId: 'c2',
      }),
      'correct',
    );
  });

  it('returns "correct" on the correct choice for a missed-but-closed question (no viewer answer)', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c3',
        viewerAnswer: null,
        revealedCorrectChoiceId: 'c3',
      }),
      'correct',
    );
  });

  it('returns "wrong-pick" when the viewer picked this choice and it is not the correct one', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c1',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: false },
        revealedCorrectChoiceId: 'c2',
      }),
      'wrong-pick',
    );
  });

  it('returns "neutral" for an untouched choice when the reveal triggered elsewhere', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c4',
        viewerAnswer: { selectedChoiceId: 'c1', isCorrect: false },
        revealedCorrectChoiceId: 'c2',
      }),
      'neutral',
    );
  });

  it('returns "neutral" when there is no reveal at all', () => {
    assert.equal(
      classifyChoice({
        choiceId: 'c1',
        viewerAnswer: null,
        revealedCorrectChoiceId: null,
      }),
      'neutral',
    );
  });
});
