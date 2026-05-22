import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHomeCommunitySections,
  buildHomeStatusMessage,
  DISCOVER_LIMIT,
} from './shell';
import type { Community } from '../communities/api';

describe('buildHomeCommunitySections', () => {
  it('separates joined communities from featured discover communities', () => {
    const sections = buildHomeCommunitySections([
      community({ slug: 'daily-ai-builders', role: 'member' }),
      community({ slug: 'open-web', role: null, isFeatured: true }),
      community({ slug: 'creator-room', role: 'creator' }),
      community({ slug: 'not-featured', role: null, isFeatured: false }),
    ]);

    assert.deepEqual(
      sections.myCommunities.map((item) => item.slug),
      ['daily-ai-builders', 'creator-room'],
    );
    assert.deepEqual(
      sections.discover.map((item) => item.slug),
      ['open-web'],
    );
  });

  it('excludes non-featured communities from discover', () => {
    const sections = buildHomeCommunitySections([
      community({ slug: 'plain', role: null, isFeatured: false }),
    ]);

    assert.equal(sections.discover.length, 0);
  });

  it('caps discover at DISCOVER_LIMIT', () => {
    const items = Array.from({ length: DISCOVER_LIMIT + 2 }, (_, index) =>
      community({
        slug: `featured-${index}`,
        role: null,
        isFeatured: true,
        featuredRank: index,
      }),
    );

    const sections = buildHomeCommunitySections(items);

    assert.equal(sections.discover.length, DISCOVER_LIMIT);
  });

  it('sorts discover by featuredRank then name, with nullish ranks last', () => {
    const sections = buildHomeCommunitySections([
      community({ slug: 'b', role: null, isFeatured: true, featuredRank: 2 }),
      community({ slug: 'a', role: null, isFeatured: true, featuredRank: 1 }),
      community({ slug: 'unranked-z', role: null, isFeatured: true, featuredRank: null }),
    ]);

    assert.deepEqual(
      sections.discover.map((item) => item.slug),
      ['a', 'b', 'unranked-z'],
    );
  });
});

describe('buildHomeStatusMessage', () => {
  it('returns the discovery message when the user has no joined communities', () => {
    assert.equal(buildHomeStatusMessage([]), 'Pick a community to start');
  });

  it('returns the all-caught-up message when joined communities have zero live questions', () => {
    assert.equal(
      buildHomeStatusMessage([
        community({ slug: 'a', role: 'member', liveQuestionCount: 0 }),
        community({ slug: 'b', role: 'member' }),
      ]),
      'All caught up today',
    );
  });

  it('returns the singular form when one question is live', () => {
    assert.equal(
      buildHomeStatusMessage([
        community({ slug: 'a', role: 'member', liveQuestionCount: 1 }),
      ]),
      '1 question live today',
    );
  });

  it('sums live counts across joined communities for the plural form', () => {
    assert.equal(
      buildHomeStatusMessage([
        community({ slug: 'a', role: 'member', liveQuestionCount: 2 }),
        community({ slug: 'b', role: 'creator', liveQuestionCount: 1 }),
      ]),
      '3 questions live today',
    );
  });
});

function community(options: {
  slug: string;
  role: Community['currentUserRole'];
  isFeatured?: boolean;
  featuredRank?: number | null;
  liveQuestionCount?: number;
}): Community {
  return {
    id: `community_${options.slug}`,
    slug: options.slug,
    name: options.slug,
    description: 'Description',
    emoji: 'Q',
    cadence: 'daily',
    status: 'active',
    creatorUserId: 'user_1',
    category: null,
    isFeatured: options.isFeatured ?? false,
    featuredRank: options.featuredRank ?? null,
    memberCount: 1,
    liveQuestionCount: options.liveQuestionCount,
    currentUserRole: options.role,
    createdAt: '2026-05-21T09:00:00.000Z',
    updatedAt: '2026-05-21T09:00:00.000Z',
  };
}
