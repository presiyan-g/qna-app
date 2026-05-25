import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseBroadcastBody,
  BroadcastValidationError,
  generateBroadcastBody,
} from './broadcasts';

test('parseBroadcastBody returns trimmed string within length bounds', () => {
  const longEnough = 'Welcome aboard, builders! This community runs daily and we already have answers rolling in across the first batch of questions.';
  const body = parseBroadcastBody(`  ${longEnough}  `);
  assert.equal(body, longEnough);
});

test('parseBroadcastBody accepts a {body:string} envelope', () => {
  const longEnough = 'Welcome aboard, builders! This community runs daily and we already have answers rolling in across the first batch of questions.';
  const body = parseBroadcastBody({ body: longEnough });
  assert.equal(body, longEnough);
});

test('parseBroadcastBody throws on too-short body', () => {
  assert.throws(() => parseBroadcastBody('Hi.'), BroadcastValidationError);
});

test('parseBroadcastBody throws on too-long body', () => {
  assert.throws(() => parseBroadcastBody('x'.repeat(3000)), BroadcastValidationError);
});

test('parseBroadcastBody throws on non-string input', () => {
  assert.throws(() => parseBroadcastBody(null as unknown as string), BroadcastValidationError);
  assert.throws(() => parseBroadcastBody(123 as unknown as string), BroadcastValidationError);
});

test('generateBroadcastBody returns the parsed string from result.data', async () => {
  const expected = 'Welcome aboard, builders! This community runs daily and you should see your first question land within the hour.';
  const body = await generateBroadcastBody(
    {
      generate: async () => ({
        data: expected,
        inputTokens: 1,
        outputTokens: 1,
      }),
    },
    {
      community: { name: 'Daily AI Builders', description: 'Daily AI questions.' },
      theme: 'welcome',
      model: 'test-model',
      maxOutputTokens: 100,
      timeoutMs: 1000,
    },
  );
  assert.equal(body, expected);
});
