import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  BrandBadge,
  BodyText,
  BrandButton,
  BrandLogo,
  CommunityPreviewCard,
  ConfirmDialog,
  Heading,
  Screen,
  StatePanel,
} from '@/components/Brand';
import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthContext';
import { useRuntimeApiUrl } from '@/services/config';
import {
  CommunitiesApiError,
  type Community,
  createCommunitiesClient,
} from '@/services/communities/api';
import { formatCommunityCadence } from '@/services/communities/format';

export default function HomeScreen() {
  const { loading, logout, token, user } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitiesError, setCommunitiesError] = useState<string | null>(null);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const apiUrl = useRuntimeApiUrl();
  const communitiesClient = useMemo(() => createCommunitiesClient({ apiUrl }), [apiUrl]);

  const loadCommunities = useCallback(async (isActive = () => true) => {
    setCommunitiesLoading(true);
    setCommunitiesError(null);
    try {
      const result = await communitiesClient.list({ limit: 3, offset: 0, token });
      if (!isActive()) return;
      setCommunities(result.items);
    } catch (err) {
      if (!isActive()) return;
      setCommunitiesError(
        err instanceof CommunitiesApiError ? err.message : 'Unable to load communities.',
      );
    } finally {
      if (isActive()) setCommunitiesLoading(false);
    }
  }, [communitiesClient, token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadCommunities(() => active);

      return () => {
        active = false;
      };
    }, [loadCommunities]),
  );

  async function handleConfirmLogout() {
    setConfirmingLogout(false);
    await logout();
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandLogo />
          {user ? (
            <BrandButton
              onPress={() => setConfirmingLogout(true)}
              variant="secondary"
              style={styles.headerJoinButton}
            >
              Logout
            </BrandButton>
          ) : (
            <BrandButton disabled={loading} href="/register" style={styles.headerJoinButton}>
              Join
            </BrandButton>
          )}
        </View>

        <View style={styles.quickActions}>
          <BrandButton href="/communities" style={styles.quickActionButton}>
            Communities
          </BrandButton>
          {user ? (
            <BrandBadge
              accessibilityLabel={`Signed in as ${user.username}`}
              style={styles.quickActionButton}
            >
              @{user.username}
            </BrandBadge>
          ) : (
            <BrandButton
              disabled={loading}
              href="/login"
              variant="secondary"
              style={styles.quickActionButton}
            >
              Sign in
            </BrandButton>
          )}
        </View>

        <View style={styles.hero}>
          <Heading compact>Pick a daily challenge.</Heading>
          <BodyText>
            Browse communities, answer today&apos;s question, and unlock the discussion.
          </BodyText>
        </View>

        <View style={styles.communityList}>
          {communitiesLoading ? (
            <StatePanel title="Loading communities..." />
          ) : communitiesError ? (
            <StatePanel title={communitiesError}>
              <BrandButton variant="secondary" onPress={() => void loadCommunities()}>
                Retry
              </BrandButton>
            </StatePanel>
          ) : communities.length > 0 ? (
            communities.map((community) => (
              <CommunityPreviewCard
                key={community.id}
                initials={community.emoji || community.name.slice(0, 2)}
                name={community.name}
                cadence={formatCommunityCadence(community.cadence)}
                description={community.description}
                href={`/communities/${community.slug}`}
              />
            ))
          ) : (
            <StatePanel title="No communities are open yet." />
          )}
        </View>

        <View style={styles.footerCta}>
          <Text style={styles.footerLabel}>Ready to explore?</Text>
          <BrandButton href="/communities">Browse communities</BrandButton>
        </View>
      </ScrollView>
      <ConfirmDialog
        cancelLabel="Stay signed in"
        confirmLabel="Logout"
        message="You can sign back in any time with your email and password."
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={handleConfirmLogout}
        title="Logout?"
        visible={confirmingLogout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerJoinButton: {
    minHeight: 40,
    paddingHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 9,
  },
  quickActionButton: {
    flex: 1,
  },
  hero: {
    gap: 10,
    paddingTop: 2,
  },
  communityList: {
    gap: 11,
  },
  footerCta: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  footerLabel: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
