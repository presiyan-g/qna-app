import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHomeCommunitySections,
  buildHomeStatusMessage,
  buildLiveQuestionItems,
  DISCOVER_LIMIT,
} from './shell';
import type { QuestionSummary } from '../questions/api';
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

  it('prefers unanswered live counts when the API provides them', () => {
    assert.equal(
      buildHomeStatusMessage([
        community({
          slug: 'a',
          role: 'member',
          liveQuestionCount: 2,
          unansweredQuestionCount: 0,
        }),
      ]),
      'All caught up today',
    );
  });
});

describe('buildLiveQuestionItems', () => {
  it('returns live unanswered questions from joined communities only', () => {
    const items = buildLiveQuestionItems({
      communities: [
        community({ slug: 'joined', role: 'member' }),
        community({ slug: 'open', role: null }),
      ],
      questionsByCommunitySlug: {
        joined: [
          question({ id: 'live_unanswered', prompt: 'Answer me' }),
          question({
            id: 'already_answered',
            prompt: 'Answered',
            viewerAnswer: { selectedChoiceId: 'choice_1', isCorrect: true },
          }),
          question({
            id: 'closed',
            prompt: 'Closed',
            closesAt: '2026-05-21T09:00:00.000Z',
          }),
        ],
        open: [question({ id: 'outsider_live', prompt: 'No membership' })],
      },
      now: new Date('2026-05-21T12:00:00.000Z'),
    });

    assert.deepEqual(
      items.map((item) => ({
        communitySlug: item.community.slug,
        questionId: item.question.id,
        prompt: item.question.prompt,
      })),
      [{ communitySlug: 'joined', questionId: 'live_unanswered', prompt: 'Answer me' }],
    );
  });
});

function community(options: {
  slug: string;
  role: Community['currentUserRole'];
  isFeatured?: boolean;
  featuredRank?: number | null;
  liveQuestionCount?: number;
  unansweredQuestionCount?: number;
}): Community {
  return {
    id: `community_${options.slug}`,
    slug: options.slug,
    name: options.slug,
    description: 'Description',
    emoji: 'Q',
    coverImageUrl: null,
    cadence: 'daily',
    status: 'active',
    creatorUserId: 'user_1',
    category: null,
    isFeatured: options.isFeatured ?? false,
    featuredRank: options.featuredRank ?? null,
    memberCount: 1,
    liveQuestionCount: options.liveQuestionCount,
    unansweredQuestionCount: options.unansweredQuestionCount,
    currentUserRole: options.role,
    createdAt: '2026-05-21T09:00:00.000Z',
    updatedAt: '2026-05-21T09:00:00.000Z',
  };
}

function question(
  options: Partial<QuestionSummary> & { id: string; prompt: string },
): QuestionSummary {
  return {
    id: options.id,
    communityId: options.communityId ?? 'community_1',
    creatorUserId: options.creatorUserId ?? 'user_1',
    prompt: options.prompt,
    explanation: options.explanation ?? null,
    imageUrl: options.imageUrl ?? null,
    scheduledFor: options.scheduledFor ?? '2026-05-21T09:00:00.000Z',
    publishedAt: options.publishedAt ?? '2026-05-21T09:00:00.000Z',
    closesAt: options.closesAt ?? '2026-05-22T09:00:00.000Z',
    timeZone: options.timeZone ?? 'GMT',
    points: options.points ?? 10,
    choiceCount: options.choiceCount ?? 4,
    choices: options.choices ?? [],
    viewerAnswer: options.viewerAnswer ?? null,
    createdAt: options.createdAt ?? '2026-05-20T09:00:00.000Z',
    updatedAt: options.updatedAt ?? '2026-05-20T09:00:00.000Z',
  };
}
