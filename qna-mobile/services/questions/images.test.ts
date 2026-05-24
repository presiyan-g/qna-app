import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toInspectableImage } from './images';

describe('toInspectableImage', () => {
  it('returns a modal image target with a stable label', () => {
    assert.deepEqual(
      toInspectableImage({
        accessibilityLabel: 'Question image',
        uri: 'https://cdn.example.com/question.png',
      }),
      {
        accessibilityLabel: 'Question image',
        uri: 'https://cdn.example.com/question.png',
      },
    );
  });

  it('returns null for missing or blank URLs', () => {
    assert.equal(toInspectableImage({ accessibilityLabel: 'Question image', uri: null }), null);
    assert.equal(toInspectableImage({ accessibilityLabel: 'Question image', uri: '   ' }), null);
  });
});
