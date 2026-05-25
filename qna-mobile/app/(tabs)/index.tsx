import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import {
  BodyText,
  BrandButton,
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
  const router = useRouter();
  const { token, user } = useAuth();
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
  const liveQuestionCount = sections.myCommunities.reduce(
    (total, community) =>
      total + (community.unansweredQuestionCount ?? community.liveQuestionCount ?? 0),
    0,
  );

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
        <Pressable
          accessibilityHint={
            liveQuestionCount > 0
              ? 'Opens the live questions ready for you to answer.'
              : undefined
          }
          accessibilityRole={liveQuestionCount > 0 ? 'link' : 'text'}
          disabled={liveQuestionCount === 0}
          onPress={() => router.push('/live-questions')}
          style={({ pressed }) => [
            styles.statusStrip,
            liveQuestionCount > 0 ? styles.statusStripAction : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.statusText}>{statusMessage}</Text>
          {liveQuestionCount > 0 ? <Text style={styles.statusArrow}>Open</Text> : null}
        </Pressable>

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
  hero: {
    gap: 10,
    paddingTop: 2,
  },
  statusStrip: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusStripAction: {
    borderColor: palette.primary,
  },
  statusText: {
    color: palette.primary,
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusArrow: {
    color: palette.ink,
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
  pressed: {
    opacity: 0.72,
  },
});
