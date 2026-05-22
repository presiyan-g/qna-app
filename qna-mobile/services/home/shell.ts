import type { Community } from '../communities/api';

export const DISCOVER_LIMIT = 3;

export function buildHomeCommunitySections(communities: Community[]) {
  const myCommunities = communities.filter((community) => Boolean(community.currentUserRole));
  const discover = communities
    .filter((community) => !community.currentUserRole && community.isFeatured)
    .slice()
    .sort((a, b) => {
      const rankA = a.featuredRank ?? Number.POSITIVE_INFINITY;
      const rankB = b.featuredRank ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    })
    .slice(0, DISCOVER_LIMIT);

  return { myCommunities, discover };
}

/**
 * Status strip copy for the home screen.
 *
 * - Anonymous or no joined communities: `'Pick a community to start'`
 * - Joined communities with zero live questions today: `'All caught up today'`
 * - Joined communities with one or more live questions: `'N question(s) live today'`
 */
export function buildHomeStatusMessage(myCommunities: Community[]): string {
  if (myCommunities.length === 0) return 'Pick a community to start';

  const liveCount = myCommunities.reduce(
    (total, community) => total + (community.liveQuestionCount ?? 0),
    0,
  );

  if (liveCount === 0) return 'All caught up today';
  if (liveCount === 1) return '1 question live today';
  return `${liveCount} questions live today`;
}
