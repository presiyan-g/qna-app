import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseInlineEmphasis } from './inline-emphasis';

describe('parseInlineEmphasis', () => {
  it('marks text between single asterisks as emphasized', () => {
    assert.deepEqual(parseInlineEmphasis('compare *between* groups'), [
      { text: 'compare ', emphasized: false },
      { text: 'between', emphasized: true },
      { text: ' groups', emphasized: false },
    ]);
  });

  it('leaves unmatched asterisks as plain text', () => {
    assert.deepEqual(parseInlineEmphasis('compare *between groups'), [
      { text: 'compare *between groups', emphasized: false },
    ]);
  });

  it('leaves empty emphasis markers as plain text', () => {
    assert.deepEqual(parseInlineEmphasis('compare ** groups'), [
      { text: 'compare ** groups', emphasized: false },
    ]);
  });
});
