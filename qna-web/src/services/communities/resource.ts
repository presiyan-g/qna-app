import type {
  Community,
  CommunityCategory,
} from '@/db/schema/communities';
import type { CommunityRole, CommunityWithMembership } from './communities';

export type CommunityResourceInput = Community & {
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
  unansweredQuestionCount: number;
  newBroadcastCount: number;
};

export function buildCommunityResource({
  community,
  category,
  memberCount,
  liveQuestionCount,
  currentUserRole,
  unansweredQuestionCount,
  newBroadcastCount,
}: {
  community: Community;
  category: CommunityCategory | null;
  memberCount: number;
  liveQuestionCount: number;
  currentUserRole: CommunityRole | null;
  unansweredQuestionCount: number;
  newBroadcastCount: number;
}): CommunityWithMembership {
  return {
    ...community,
    category,
    memberCount,
    liveQuestionCount,
    currentUserRole,
    unansweredQuestionCount,
    newBroadcastCount,
  };
}

export function buildCreatedCommunityResource({
  community,
  category,
}: {
  community: Community;
  category: CommunityCategory | null;
}): CommunityWithMembership {
  return buildCommunityResource({
    community,
    category,
    memberCount: 1,
    liveQuestionCount: 0,
    currentUserRole: 'creator',
    unansweredQuestionCount: 0,
    newBroadcastCount: 0,
  });
}

export function markCommunityJoined(
  community: CommunityWithMembership,
  inserted: boolean,
): CommunityWithMembership {
  if (community.currentUserRole) return community;

  return {
    ...community,
    memberCount: community.memberCount + (inserted ? 1 : 0),
    currentUserRole: 'member',
  };
}

export function markCommunityLeft(
  community: CommunityWithMembership,
  deleted: boolean,
): CommunityWithMembership {
  return {
    ...community,
    memberCount: Math.max(0, community.memberCount - (deleted ? 1 : 0)),
    currentUserRole: null,
  };
}
