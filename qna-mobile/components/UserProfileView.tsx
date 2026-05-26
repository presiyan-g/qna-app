import { useFocusEffect } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BackLink,
  BrandButton,
  ConfirmDialog,
  Eyebrow,
  Screen,
  StatePanel,
  StreakLegend,
  StreakRibbon,
} from '@/components/Brand';
import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthContext';
import { useRuntimeApiUrl } from '@/services/config';
import {
  createUsersClient,
  type PublicUserProfile,
  UsersApiError,
} from '@/services/users/api';

/**
 * Public user profile screen. Mirrors the web `/users/[username]` layout:
 * avatar + eyebrow + heading hero, then a three-tile stat row (total
 * points, current streak, memberships), then the 30-day activity ribbon,
 * then the communities list with role indicator.
 *
 * Shared between two routes:
 *   - `app/users/[username].tsx` — full screen pushed via Stack (back link).
 *   - `app/(tabs)/profile.tsx`   — embedded in the tab navigator (no back).
 *
 * The component is intentionally pure-presentation + data-fetching;
 * navigation concerns (whether it's pushed or tabbed) are owned by the
 * route file that mounts it.
 */
export function UserProfileView({
  username,
  backHref,
  backLabel,
}: {
  username: string;
  /** When provided, renders a "← {backLabel}" link at the top of the screen.
   *  Used when the profile was pushed onto a Stack (e.g. /users/[username]). */
  backHref?: Href;
  backLabel?: string;
}) {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const apiUrl = useRuntimeApiUrl();
  const usersClient = useMemo(() => createUsersClient({ apiUrl }), [apiUrl]);
  const isOwnProfile = Boolean(
    user?.username && user.username.toLowerCase() === username.toLowerCase(),
  );

  const loadProfile = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await usersClient.getProfile(username);
        if (!isActive()) return;
        setProfile(result);
      } catch (err) {
        if (!isActive()) return;
        setError(err instanceof UsersApiError ? err.message : 'Unable to load profile.');
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [username, usersClient],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadProfile(() => active);

      return () => {
        active = false;
      };
    }, [loadProfile]),
  );

  async function handleConfirmLogout() {
    setConfirmingLogout(false);
    await logout();
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {backHref ? (
          <BackLink href={backHref}>{backLabel ?? 'Back'}</BackLink>
        ) : null}
        {loading ? (
          <StatePanel title="Loading profile..." />
        ) : error || !profile ? (
          <StatePanel
            variant="dashed"
            title={error ?? 'Profile not found.'}
          >
            <BrandButton variant="secondary" href={'/' as Href}>
              Back home
            </BrandButton>
          </StatePanel>
        ) : (
          <>
            <ProfileHero profile={profile} />
            <StatRow profile={profile} />
            <ActivityCard profile={profile} />
            <CommunityMemberships
              profile={profile}
              onOpen={(slug) =>
                router.push({ pathname: '/communities/[slug]', params: { slug } })
              }
            />
            {isOwnProfile ? (
              <BrandButton variant="ghost" onPress={() => setConfirmingLogout(true)}>
                Logout
              </BrandButton>
            ) : null}
          </>
        )}
      </ScrollView>
      <ConfirmDialog
        cancelLabel="Stay signed in"
        confirmLabel="Logout"
        destructive
        message="You can sign back in any time with your email and password."
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={handleConfirmLogout}
        title="Logout?"
        visible={confirmingLogout}
      />
    </Screen>
  );
}

/**
 * Hero block: avatar tile + "Profile" eyebrow + @username heading +
 * joined date. Mirrors the web header proportions but scaled for the
 * narrower mobile viewport.
 */
function ProfileHero({ profile }: { profile: PublicUserProfile }) {
  const initials = profile.user.username.slice(0, 2).toUpperCase();
  return (
    <View style={styles.hero}>
      <View style={styles.avatar} accessible={false}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.heroCopy}>
        <Eyebrow>Profile</Eyebrow>
        <Text style={styles.handle} numberOfLines={1}>
          @{profile.user.username}
        </Text>
        <Text style={styles.heroMeta}>Joined {formatDate(profile.user.joinedAt)}</Text>
      </View>
    </View>
  );
}

/**
 * Three stat tiles — Total points, Current streak, Memberships — each
 * with eyebrow + large value + muted caption. On mobile the three
 * tiles share a single horizontal row, with the value sized down vs.
 * web to keep numbers readable inside the narrower cells.
 */
function StatRow({ profile }: { profile: PublicUserProfile }) {
  const creatorCount = profile.communities.filter((c) => c.role === 'creator').length;
  return (
    <View style={styles.statRow}>
      <StatTile
        eyebrow="Total points"
        value={profile.stats.totalPoints.toLocaleString('en-US')}
        caption={`across ${profile.stats.communityCount} ${pluralize(profile.stats.communityCount, 'community', 'communities')}`}
      />
      <StatTile
        eyebrow="Current streak"
        value={profile.streak.currentStreak}
        valueSuffix="days"
        valueColor={palette.primary}
        caption={
          <Text style={styles.statCaption}>
            longest · <Text style={styles.statCaptionStrong}>{profile.streak.longestStreak}</Text>
          </Text>
        }
      />
      <StatTile
        eyebrow="Memberships"
        value={profile.stats.communityCount}
        caption={
          creatorCount > 0 ? (
            <Text style={styles.statCaption}>
              with{' '}
              <Text style={styles.statCaptionStrong}>
                {creatorCount} creator {pluralize(creatorCount, 'role', 'roles')}
              </Text>
            </Text>
          ) : (
            'all member roles'
          )
        }
      />
    </View>
  );
}

function StatTile({
  eyebrow,
  value,
  valueSuffix,
  valueColor,
  caption,
}: {
  eyebrow: string;
  value: number | string;
  valueSuffix?: string;
  valueColor?: string;
  caption: ReactNode;
}) {
  return (
    <View style={styles.statTile}>
      {/* Eyebrow wraps to 2 lines on narrow screens so labels like
          "CURRENT STREAK" don't clip with an ellipsis in a 95px-wide
          tile. minHeight reserves the 2-line height so the value rows
          across all three tiles stay vertically aligned. */}
      <Text style={styles.statEyebrow} numberOfLines={2}>
        {eyebrow}
      </Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
        {value}
        {valueSuffix ? <Text style={styles.statValueSuffix}> {valueSuffix}</Text> : null}
      </Text>
      {typeof caption === 'string' ? (
        <Text style={styles.statCaption} numberOfLines={2}>
          {caption}
        </Text>
      ) : (
        caption
      )}
    </View>
  );
}

/**
 * 30-day activity ribbon section. Header has eyebrow + active-day count,
 * grid is the StreakRibbon primitive, and the summary line below uses
 * the same "shown up X of Y days · Keep going." pattern as web.
 */
function ActivityCard({ profile }: { profile: PublicUserProfile }) {
  const activeDays = profile.streak.days.filter((d) => d.level > 0).length;
  const totalDays = profile.streak.days.length;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Eyebrow>Activity · last 30 days</Eyebrow>
        <Text style={styles.cardHeaderMeta}>
          {activeDays}/{totalDays} active
        </Text>
      </View>
      <StreakRibbon days={profile.streak.days} />
      <StreakLegend />
      <Text style={styles.activitySummary}>
        You&rsquo;ve shown up{' '}
        <Text style={styles.activitySummaryStrong}>
          {activeDays} of the last {totalDays} days
        </Text>
        . Longest run is{' '}
        <Text style={styles.activitySummaryStrong}>
          {profile.streak.longestStreak} {pluralize(profile.streak.longestStreak, 'day', 'days')}
        </Text>
        . <Text style={styles.serifAccent}>Keep going.</Text>
      </Text>
    </View>
  );
}

/**
 * Communities list. Each row: 32×32 initials tile + name + role label.
 * Creator role is highlighted in clay, members are muted — same color
 * semantics as web.
 */
function CommunityMemberships({
  profile,
  onOpen,
}: {
  profile: PublicUserProfile;
  onOpen: (slug: string) => void;
}) {
  if (profile.communities.length === 0) {
    return (
      <View style={styles.card}>
        <Eyebrow>Communities</Eyebrow>
        <StatePanel variant="dashed" title="No memberships" titleAccent="yet.">
          <Text style={styles.communitiesEmptyCopy}>
            Communities this user joins will appear here.
          </Text>
        </StatePanel>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <Eyebrow>Communities</Eyebrow>
      <View style={styles.communityList}>
        {profile.communities.map((community) => (
          <Pressable
            accessibilityLabel={`Open ${community.name}`}
            accessibilityRole="link"
            key={community.id}
            onPress={() => onOpen(community.slug)}
            style={({ pressed }) => [
              styles.communityRow,
              pressed ? styles.communityRowPressed : null,
            ]}
          >
            <View style={styles.communityBadge}>
              <Text style={styles.communityBadgeText} numberOfLines={1}>
                {community.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.communityCopy}>
              <Text style={styles.communityName} numberOfLines={1}>
                {community.name}
              </Text>
              <Text
                style={[
                  styles.communityRole,
                  community.role === 'creator' ? styles.communityRoleCreator : null,
                ]}
              >
                {community.role === 'creator' ? 'Creator' : 'Member'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function pluralize(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 20,
  },
  hero: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 16,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  avatarText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  handle: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroMeta: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 14,
  },
  statEyebrow: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    lineHeight: 14,
    // Reserve room for two lines (~28px) so all three tiles keep their
    // big-number value rows on the same baseline.
    minHeight: 28,
    textTransform: 'uppercase',
  },
  statValue: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  statValueSuffix: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  statCaption: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 15,
  },
  statCaptionStrong: {
    color: palette.ink,
    fontWeight: '700',
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  cardHeaderRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardHeaderMeta: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activitySummary: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  activitySummaryStrong: {
    color: palette.ink,
    fontWeight: '700',
  },
  serifAccent: {
    color: palette.primary,
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  communitiesEmptyCopy: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  communityList: {
    gap: 4,
  },
  communityRow: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  communityRowPressed: {
    backgroundColor: palette.primarySoft,
  },
  communityBadge: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  communityBadgeText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
  },
  communityCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  communityName: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  communityRole: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
  },
  communityRoleCreator: {
    color: palette.actionClayHover,
    fontWeight: '700',
  },
});
