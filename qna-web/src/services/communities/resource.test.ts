import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Community } from '@/db/schema/communities';
import {
  buildCommunityResource,
  buildCreatedCommunityResource,
  markCommunityJoined,
  markCommunityLeft,
  type CommunityResourceInput,
} from './resource';

describe('community membership resource helpers', () => {
  it('returns a creator community resource without refetching after create', () => {
    const created = buildCreatedCommunityResource({
      community: community(),
      category: null,
    });

    assert.equal(created.memberCount, 1);
    assert.equal(created.liveQuestionCount, 0);
    assert.equal(created.currentUserRole, 'creator');
    assert.equal(created.category, null);
    assert.equal(created.unansweredQuestionCount, 0);
    assert.equal(created.newBroadcastCount, 0);
  });

  it('passes through unanswered and new-broadcast counts on read', () => {
    const resource = buildCommunityResource({
      community: community(),
      category: null,
      memberCount: 10,
      liveQuestionCount: 2,
      currentUserRole: 'member',
      unansweredQuestionCount: 1,
      newBroadcastCount: 3,
    });

    assert.equal(resource.unansweredQuestionCount, 1);
    assert.equal(resource.newBroadcastCount, 3);
  });

  it('increments member count only when join inserts a new membership', () => {
    const base = communityResource({ memberCount: 4, currentUserRole: null });

    assert.equal(markCommunityJoined(base, true).memberCount, 5);
    assert.equal(markCommunityJoined(base, true).currentUserRole, 'member');
    assert.equal(markCommunityJoined(base, false).memberCount, 4);
    assert.equal(markCommunityJoined(base, false).currentUserRole, 'member');
  });

  it('decrements member count only when leave deletes an existing membership', () => {
    const base = communityResource({
      memberCount: 4,
      currentUserRole: 'member',
    });

    assert.equal(markCommunityLeft(base, true).memberCount, 3);
    assert.equal(markCommunityLeft(base, true).currentUserRole, null);
    assert.equal(markCommunityLeft(base, false).memberCount, 4);
    assert.equal(markCommunityLeft(base, false).currentUserRole, null);
  });
});

function communityResource(
  overrides: Partial<CommunityResourceInput> = {},
): CommunityResourceInput {
  return {
    ...community(),
    category: null,
    memberCount: overrides.memberCount ?? 0,
    liveQuestionCount: overrides.liveQuestionCount ?? 0,
    currentUserRole: overrides.currentUserRole ?? null,
    unansweredQuestionCount: overrides.unansweredQuestionCount ?? 0,
    newBroadcastCount: overrides.newBroadcastCount ?? 0,
  };
}

function community(): Community {
  const now = new Date('2026-05-21T12:00:00.000Z');

  return {
    id: 'community_1',
    creatorUserId: 'user_1',
    categoryId: null,
    slug: 'daily-builders',
    name: 'Daily Builders',
    description: 'Build daily.',
    emoji: 'DB',
    coverImageUrl: null,
    cadence: 'daily',
    status: 'active',
    isFeatured: false,
    featuredRank: null,
    createdAt: now,
    updatedAt: now,
  };
}
