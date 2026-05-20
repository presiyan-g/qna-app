import assert from 'node:assert/strict';
import test from 'node:test';
import { tokenizeBroadcastText } from './text';

test('splits plain text and http urls into renderable tokens', () => {
  assert.deepEqual(tokenizeBroadcastText('Read https://example.com now'), [
    { type: 'text', value: 'Read ' },
    { type: 'link', value: 'https://example.com' },
    { type: 'text', value: ' now' },
  ]);
});

test('keeps newlines in text tokens', () => {
  assert.deepEqual(tokenizeBroadcastText('Line one\nLine two'), [
    { type: 'text', value: 'Line one\nLine two' },
  ]);
});
