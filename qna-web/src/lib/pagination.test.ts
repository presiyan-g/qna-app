import assert from 'node:assert/strict';
import test from 'node:test';
import { getPageWindow, parsePageParam } from './pagination';

test('getPageWindow returns empty for zero pages', () => {
  assert.deepEqual(getPageWindow(1, 0), []);
});

test('getPageWindow returns all pages when total <= 7', () => {
  assert.deepEqual(getPageWindow(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(getPageWindow(3, 7), [1, 2, 3, 4, 5, 6, 7]);
});

test('getPageWindow inserts ellipsis on right when current is near start', () => {
  assert.deepEqual(getPageWindow(1, 10), [1, 2, 'ellipsis', 10]);
});

test('getPageWindow inserts ellipsis on left when current is near end', () => {
  assert.deepEqual(getPageWindow(10, 10), [1, 'ellipsis', 9, 10]);
});

test('getPageWindow inserts ellipsis on both sides for middle pages', () => {
  assert.deepEqual(getPageWindow(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
});

test('parsePageParam defaults to 1', () => {
  assert.equal(parsePageParam(undefined), 1);
  assert.equal(parsePageParam(''), 1);
  assert.equal(parsePageParam('abc'), 1);
  assert.equal(parsePageParam('0'), 1);
  assert.equal(parsePageParam('-3'), 1);
});

test('parsePageParam reads a valid number', () => {
  assert.equal(parsePageParam('1'), 1);
  assert.equal(parsePageParam('42'), 42);
});

test('parsePageParam takes first when given array', () => {
  assert.equal(parsePageParam(['3', '5']), 3);
});
