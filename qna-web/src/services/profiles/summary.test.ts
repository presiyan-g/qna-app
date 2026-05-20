import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicUserProfile } from './summary';

const USER = {
  id: 'user_1',
  username: 'daily_builder',
  joinedAt: new Date('2026-05-01T09:00:00.000Z'),
};

describe('buildPublicUserProfile', () => {
  it('keeps active memberships visible when the user has no points', () => {
    const profile = buildPublicUserProfile({
      user: USER,
      memberships: [
        membership(
          'community_1',
          'daily-ai-builders',
          'Daily AI Builders',
          'member',
          '2026-05-03T09:00:00.000Z',
        ),
        membership(
          'community_2',
          'web-makers',
          'Web Makers',
          'creator',
          '2026-05-04T09:00:00.000Z',
        ),
      ],
      totalPoints: 30,
    });

    assert.equal(profile.stats.totalPoints, 30);
    assert.equal(profile.stats.communityCount, 2);
    assert.deepEqual(
      profile.communities.map((community) => community.slug),
      ['web-makers', 'daily-ai-builders'],
    );
  });

  it('sorts by creator role, joined date desc, then name', () => {
    const profile = buildPublicUserProfile({
      user: USER,
      memberships: [
        membership(
          'community_1',
          'alpha',
          'Alpha',
          'member',
          '2026-05-01T09:00:00.000Z',
        ),
        membership(
          'community_2',
          'creator-zero',
          'Creator Zero',
          'creator',
          '2026-05-02T09:00:00.000Z',
        ),
        membership(
          'community_3',
          'member-zero',
          'Member Zero',
          'member',
          '2026-05-03T09:00:00.000Z',
        ),
        membership(
          'community_4',
          'member-new',
          'Member New',
          'member',
          '2026-05-04T09:00:00.000Z',
        ),
      ],
      totalPoints: 50,
    });

    assert.deepEqual(
      profile.communities.map((community) => community.slug),
      ['creator-zero', 'member-new', 'member-zero', 'alpha'],
    );
  });
});

function membership(
  id: string,
  slug: string,
  name: string,
  role: 'member' | 'creator',
  joinedAt: string,
) {
  return {
    id,
    slug,
    name,
    role,
    joinedAt: new Date(joinedAt),
  };
}
