import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicUserProfile, buildStreakRibbon } from './summary';

const EMPTY_STREAK = {
  days: [],
  currentStreak: 0,
  longestStreak: 0,
};

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
      streak: EMPTY_STREAK,
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
      streak: EMPTY_STREAK,
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

describe('buildStreakRibbon', () => {
  const NOW = new Date('2026-05-25T12:00:00.000Z'); // anchor

  it('emits exactly windowDays buckets in chronological order', () => {
    const r = buildStreakRibbon({ events: [], now: NOW, windowDays: 30 });
    assert.equal(r.days.length, 30);
    assert.equal(r.days[0].dateISO, '2026-04-26');
    assert.equal(r.days[29].dateISO, '2026-05-25');
  });

  it('bumps level by distinct communities answered that day', () => {
    const today = '2026-05-25';
    const events = [
      { answeredAt: new Date(`${today}T08:00:00Z`), communityId: 'c1' },
      { answeredAt: new Date(`${today}T09:00:00Z`), communityId: 'c2' },
      // duplicate community on same day shouldn't double-count
      { answeredAt: new Date(`${today}T18:00:00Z`), communityId: 'c2' },
    ];
    const r = buildStreakRibbon({ events, now: NOW, windowDays: 30 });
    const last = r.days[29];
    assert.equal(last.communityCount, 2);
    assert.equal(last.level, 2);
  });

  it('caps the level at 3 even with many communities', () => {
    const events = ['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => ({
      answeredAt: new Date('2026-05-25T08:00:00Z'),
      communityId: id,
    }));
    const r = buildStreakRibbon({ events, now: NOW, windowDays: 30 });
    assert.equal(r.days[29].level, 3);
  });

  it('counts currentStreak from the most recent active day', () => {
    const events = [
      { answeredAt: new Date('2026-05-23T10:00:00Z'), communityId: 'c1' },
      { answeredAt: new Date('2026-05-24T10:00:00Z'), communityId: 'c1' },
      { answeredAt: new Date('2026-05-25T10:00:00Z'), communityId: 'c1' },
    ];
    const r = buildStreakRibbon({ events, now: NOW, windowDays: 30 });
    assert.equal(r.currentStreak, 3);
  });

  it('keeps a multi-day streak alive even if today is still empty', () => {
    const events = [
      { answeredAt: new Date('2026-05-23T10:00:00Z'), communityId: 'c1' },
      { answeredAt: new Date('2026-05-24T10:00:00Z'), communityId: 'c1' },
      // no event today
    ];
    const r = buildStreakRibbon({ events, now: NOW, windowDays: 30 });
    assert.equal(r.currentStreak, 2);
  });

  it('reports the longest run inside the window', () => {
    const events = [
      // 4-day run earlier
      { answeredAt: new Date('2026-05-10T10:00:00Z'), communityId: 'c1' },
      { answeredAt: new Date('2026-05-11T10:00:00Z'), communityId: 'c1' },
      { answeredAt: new Date('2026-05-12T10:00:00Z'), communityId: 'c1' },
      { answeredAt: new Date('2026-05-13T10:00:00Z'), communityId: 'c1' },
      // 2-day run today
      { answeredAt: new Date('2026-05-24T10:00:00Z'), communityId: 'c1' },
      { answeredAt: new Date('2026-05-25T10:00:00Z'), communityId: 'c1' },
    ];
    const r = buildStreakRibbon({ events, now: NOW, windowDays: 30 });
    assert.equal(r.longestStreak, 4);
    assert.equal(r.currentStreak, 2);
  });
});
