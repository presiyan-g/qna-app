import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCommunityCadence, formatCommunityRole } from './format';

describe('community display formatters', () => {
  it('formats lowercase cadence enum values for people', () => {
    assert.equal(formatCommunityCadence('daily'), 'Daily');
    assert.equal(formatCommunityCadence('weekly'), 'Weekly');
    assert.equal(formatCommunityCadence('custom'), 'Custom');
  });

  it('formats role enum values and anonymous state for people', () => {
    assert.equal(formatCommunityRole('member'), 'Member');
    assert.equal(formatCommunityRole('creator'), 'Creator');
    assert.equal(formatCommunityRole(null), 'Not joined');
  });
});
