import { useFocusEffect } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BackLink,
  BodyText,
  BrandBadge,
  BrandButton,
  ConfirmDialog,
  Eyebrow,
  Heading,
  Screen,
  StatePanel,
} from '@/components/Brand';
import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthContext';
import { formatCommunityRole } from '@/services/communities/format';
import { useRuntimeApiUrl } from '@/services/config';
import {
  createUsersClient,
  type PublicUserProfile,
  UsersApiError,
} from '@/services/users/api';

/**
 * Renders a user's public profile, with a Logout button when the viewer is
 * looking at their own profile.
 *
 * Shared between two routes:
 *   - `app/users/[username].tsx` — full screen pushed via Stack (back button).
 *   - `app/(tabs)/profile.tsx`   — embedded in the tab navigator (no back).
 *
 * The component is intentionally pure-presentation + data-fetching; navigation
 * concerns (whether it's pushed or tabbed) are owned by the route file that
 * mounts it.
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
          <StatePanel title={error ?? 'Profile not found.'}>
            <BrandButton variant="secondary" href={'/' as Href}>
              Back home
            </BrandButton>
          </StatePanel>
        ) : (
          <>
            <View style={styles.headerCard}>
              <Heading compact>@{profile.user.username}</Heading>
              <BodyText>Joined {formatDate(profile.user.joinedAt)}</BodyText>
              <View style={styles.statsGrid}>
                <StatTile label="Total points" value={profile.stats.totalPoints} />
                <StatTile label="Communities" value={profile.stats.communityCount} />
              </View>
              {isOwnProfile ? (
                <BrandButton variant="secondary" onPress={() => setConfirmingLogout(true)}>
                  Logout
                </BrandButton>
              ) : null}
            </View>

            <View style={styles.section}>
              <Eyebrow>Memberships</Eyebrow>
              {profile.communities.length > 0 ? (
                <View style={styles.membershipList}>
                  {profile.communities.map((community) => (
                    <Pressable
                      accessibilityLabel={`Open ${community.name}`}
                      accessibilityRole="link"
                      key={community.id}
                      onPress={() =>
                        router.push({
                          pathname: '/communities/[slug]',
                          params: { slug: community.slug },
                        })
                      }
                      style={({ pressed }) => [
                        styles.membershipRow,
                        pressed ? styles.membershipRowPressed : null,
                      ]}
                    >
                      <View style={styles.membershipCopy}>
                        <Text style={styles.membershipName}>{community.name}</Text>
                        <Text style={styles.membershipMeta}>
                          Joined {formatDate(community.joinedAt)}
                        </Text>
                      </View>
                      <BrandBadge style={styles.roleBadge}>
                        {formatCommunityRole(community.role)}
                      </BrandBadge>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <StatePanel
                  variant="dashed"
                  title="No active community memberships"
                  titleAccent="yet."
                />
              )}
            </View>
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
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
  headerCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    backgroundColor: palette.paper,
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    padding: 13,
  },
  statLabel: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statValue: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 28,
    fontWeight: '800',
  },
  section: {
    gap: 11,
  },
  membershipList: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  membershipRow: {
    alignItems: 'center',
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14,
  },
  membershipRowPressed: {
    backgroundColor: palette.primarySoft,
  },
  membershipCopy: {
    flex: 1,
    gap: 4,
  },
  membershipName: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
  membershipMeta: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  roleBadge: {
    minHeight: 36,
    paddingHorizontal: 12,
  },
});
