import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  BodyText,
  BrandButton,
  BrandLogo,
  CommunityPreviewCard,
  Eyebrow,
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
import {
  buildHomeCommunitySections,
  buildHomeStatusMessage,
} from '@/services/home/shell';

export default function HomeScreen() {
  const { loading, token, user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitiesError, setCommunitiesError] = useState<string | null>(null);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const apiUrl = useRuntimeApiUrl();
  const communitiesClient = useMemo(() => createCommunitiesClient({ apiUrl }), [apiUrl]);
  const sections = useMemo(() => buildHomeCommunitySections(communities), [communities]);
  const isEngaged = sections.myCommunities.length > 0;
  const heroHeading = isEngaged ? 'Welcome back.' : 'Today starts with a community.';
  const heroBody = isEngaged
    ? "Tap a community to answer today's question."
    : 'Choose a room, answer the daily question, and unlock the conversation.';
  const statusMessage = buildHomeStatusMessage(sections.myCommunities);

  const loadCommunities = useCallback(
    async (isActive: () => boolean = () => true) => {
      setCommunitiesLoading(true);
      setCommunitiesError(null);
      try {
        const result = await communitiesClient.list({ limit: 24, offset: 0, token });
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
    },
    [communitiesClient, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadCommunities(() => active);

      return () => {
        active = false;
      };
    }, [loadCommunities]),
  );

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandLogo />
          {user ? (
            <BrandButton
              href={{ pathname: '/users/[username]', params: { username: user.username } }}
              variant="secondary"
              style={styles.headerActionButton}
            >
              @{user.username}
            </BrandButton>
          ) : (
            <View style={styles.headerActions}>
              <BrandButton
                disabled={loading}
                href="/register"
                style={styles.headerActionButton}
              >
                Join
              </BrandButton>
              <BrandButton
                disabled={loading}
                href="/login"
                variant="secondary"
                style={styles.headerActionButton}
              >
                Sign in
              </BrandButton>
            </View>
          )}
        </View>

        <View style={styles.statusStrip}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        <View style={styles.hero}>
          <Heading compact>{heroHeading}</Heading>
          <BodyText>{heroBody}</BodyText>
        </View>

        {communitiesLoading ? (
          <StatePanel title="Loading communities..." />
        ) : communitiesError ? (
          <StatePanel title={communitiesError}>
            <BrandButton variant="secondary" onPress={() => void loadCommunities()}>
              Retry
            </BrandButton>
          </StatePanel>
        ) : (
          <>
            {user ? (
              <CommunitySection
                emptyTitle="Join a community and it will stay close at hand here."
                title="My Communities"
                communities={sections.myCommunities}
              />
            ) : null}

            <CommunitySection
              emptyTitle="You're up to date with the featured rooms."
              title="Discover"
              communities={sections.discover}
            />

            <View style={styles.footerCta}>
              <Text style={styles.footerLabel}>Looking for more?</Text>
              <BrandButton variant="secondary" href="/communities">
                Browse all communities
              </BrandButton>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function CommunitySection({
  communities,
  emptyTitle,
  title,
}: {
  communities: Community[];
  emptyTitle: string;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Eyebrow>{title}</Eyebrow>
      </View>
      {communities.length > 0 ? (
        communities.map((community) => (
          <CommunityPreviewCard
            key={community.id}
            initials={(community.emoji || community.name.slice(0, 2)).slice(0, 2)}
            name={community.name}
            cadence={formatCommunityCadence(community.cadence)}
            description={community.description}
            href={`/communities/${community.slug}`}
          />
        ))
      ) : (
        <StatePanel title={emptyTitle} />
      )}
    </View>
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
    gap: 10,
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  hero: {
    gap: 10,
    paddingTop: 2,
  },
  statusStrip: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  section: {
    gap: 11,
  },
  sectionHeader: {
    paddingTop: 4,
  },
  footerCta: {
    alignItems: 'stretch',
    gap: 8,
    paddingTop: 4,
  },
  footerLabel: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
