import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getKeyboardAvoidingBehavior } from './keyboard';

describe('getKeyboardAvoidingBehavior', () => {
  it('uses padding on iOS so focused inputs stay above the keyboard', () => {
    assert.equal(getKeyboardAvoidingBehavior('ios'), 'padding');
  });

  it('uses height on Android so the scroll view can shrink above the keyboard', () => {
    assert.equal(getKeyboardAvoidingBehavior('android'), 'height');
  });
});
