import assert from 'node:assert/strict';
import test from 'node:test';
import { computeQuestionTimeline, pickActivityTier, pickCorrectness } from './seed-helpers';

const NOW = new Date('2026-05-24T12:00:00.000Z');

test('closed question (index 0) is ~60 days in the past', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 0, cadence: 'daily' });
  assert.equal(t.kind, 'closed');
  const daysAgo = (NOW.getTime() - t.publishedAt!.getTime()) / 86400000;
  assert.ok(daysAgo > 58 && daysAgo < 62, `published ${daysAgo}d ago, expected ~60`);
  assert.ok(t.closesAt! < NOW);
});

test('closed question (index 17) is within the last few days', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 17, cadence: 'daily' });
  assert.equal(t.kind, 'closed');
  const daysAgo = (NOW.getTime() - t.publishedAt!.getTime()) / 86400000;
  assert.ok(daysAgo >= 0 && daysAgo < 15, `published ${daysAgo}d ago, expected recent`);
});

test('index 18 is currently open', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 18, cadence: 'daily' });
  assert.equal(t.kind, 'open');
  assert.ok(t.publishedAt! < NOW);
  assert.ok(t.closesAt! > NOW);
});

test('index 19 is scheduled for tomorrow', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 19, cadence: 'daily' });
  assert.equal(t.kind, 'scheduled');
  assert.ok(t.scheduledFor! > NOW);
  assert.equal(t.publishedAt!.toISOString(), t.scheduledFor.toISOString());
  assert.equal(t.closesAt!.getTime(), t.scheduledFor.getTime() + 24 * 60 * 60 * 1000);
});

test('weekly cadence stretches answer window to 7 days', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 5, cadence: 'weekly' });
  const windowMs = t.closesAt!.getTime() - t.publishedAt!.getTime();
  assert.equal(windowMs, 7 * 86400000);
});

test('pickActivityTier is deterministic for same username', () => {
  const a = pickActivityTier('demo_member_042');
  const b = pickActivityTier('demo_member_042');
  assert.equal(a, b);
});

test('pickActivityTier returns 0-3', () => {
  for (let i = 0; i < 50; i++) {
    const tier = pickActivityTier(`demo_member_${i.toString().padStart(3, '0')}`);
    assert.ok(tier >= 0 && tier <= 3);
  }
});

test('pickCorrectness is deterministic for same inputs', () => {
  const a = pickCorrectness('demo_member_001', 'community-x', 5, 'medium');
  const b = pickCorrectness('demo_member_001', 'community-x', 5, 'medium');
  assert.equal(a, b);
});

test('pickCorrectness aggregates near expected ratio for easy difficulty', () => {
  let correct = 0;
  const n = 1000;
  for (let i = 0; i < n; i++) {
    if (pickCorrectness(`u${i}`, 'c', 0, 'easy')) correct++;
  }
  const ratio = correct / n;
  // Easy targets ~75% correct. Wide tolerance for deterministic-but-unlucky distributions.
  assert.ok(ratio > 0.65 && ratio < 0.85, `easy correctness ratio = ${ratio}`);
});
