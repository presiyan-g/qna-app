import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { BrandButton, EmphasizedText, Heading, Screen, StatePanel } from '@/components/Brand';
import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthContext';
import { useRuntimeApiUrl } from '@/services/config';
import {
  CommunitiesApiError,
  createCommunitiesClient,
} from '@/services/communities/api';
import {
  buildLiveQuestionItems,
  type LiveQuestionItem,
} from '@/services/home/shell';
import {
  QuestionsApiError,
  type QuestionSummary,
  createQuestionsClient,
} from '@/services/questions/api';
import { formatPoints } from '@/services/questions/format';
import { formatRelativeTime } from '@/services/util/time';

const COMMUNITY_PAGE_SIZE = 24;
const QUESTION_PAGE_SIZE = 20;

export default function LiveQuestionsScreen() {
  const router = useRouter();
  const { loading: authLoading, token, user } = useAuth();
  const [items, setItems] = useState<LiveQuestionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const apiUrl = useRuntimeApiUrl();
  const communitiesClient = useMemo(() => createCommunitiesClient({ apiUrl }), [apiUrl]);
  const questionsClient = useMemo(() => createQuestionsClient({ apiUrl }), [apiUrl]);

  const loadLiveQuestions = useCallback(
    async ({
      isActive = () => true,
      showSpinner = true,
    }: {
      isActive?: () => boolean;
      showSpinner?: boolean;
    } = {}) => {
      if (authLoading) return;

      if (!user || !token) {
        setItems([]);
        setError(null);
        setLoading(false);
        return;
      }

      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const communitiesResult = await communitiesClient.list({
          limit: COMMUNITY_PAGE_SIZE,
          offset: 0,
          token,
        });
        const joinedCommunities = communitiesResult.items.filter(
          (community) =>
            Boolean(community.currentUserRole) &&
            (community.unansweredQuestionCount ?? community.liveQuestionCount ?? 0) > 0,
        );
        const questionPages = await Promise.all(
          joinedCommunities.map(async (community) => {
            const result = await questionsClient.list(community.slug, {
              limit: QUESTION_PAGE_SIZE,
              offset: 0,
              token,
            });
            return [community.slug, result.items] as const;
          }),
        );
        if (!isActive()) return;

        const questionsByCommunitySlug: Record<string, QuestionSummary[]> =
          Object.fromEntries(questionPages);
        setItems(
          buildLiveQuestionItems({
            communities: communitiesResult.items,
            questionsByCommunitySlug,
          }),
        );
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof CommunitiesApiError || err instanceof QuestionsApiError) {
          setError(err.message);
        } else {
          setError('Unable to load live questions.');
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [authLoading, communitiesClient, questionsClient, token, user],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLiveQuestions({ showSpinner: false });
    setRefreshing(false);
  }, [loadLiveQuestions]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadLiveQuestions({ isActive: () => active });

      return () => {
        active = false;
      };
    }, [loadLiveQuestions]),
  );

  if (!authLoading && !user) {
    return (
      <Screen>
        <StatePanel
          variant="dashed"
          title="Sign in to see your live"
          titleAccent="questions."
        >
          <BrandButton href={{ pathname: '/login', params: { returnTo: '/live-questions' } }}>
            Sign in
          </BrandButton>
        </StatePanel>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => `${item.community.slug}:${item.question.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Heading compact accent="questions.">
              Live
            </Heading>
            <Text style={styles.headerCopy}>Open questions from your joined communities.</Text>
          </View>
        }
        ListEmptyComponent={
          loading || authLoading ? (
            <StatePanel title="Loading live questions..." />
          ) : error ? (
            <StatePanel title={error}>
              <BrandButton variant="secondary" onPress={() => void loadLiveQuestions()}>
                Retry
              </BrandButton>
            </StatePanel>
          ) : (
            <StatePanel
              variant="dashed"
              title="All caught"
              titleAccent="up."
            >
              <Text style={styles.headerCopy}>
                No live unanswered questions right now.
              </Text>
            </StatePanel>
          )
        }
        renderItem={({ item }) => (
          <LiveQuestionCard
            item={item}
            onPress={() =>
              router.push({
                pathname: '/communities/[slug]/questions/[id]',
                params: { slug: item.community.slug, id: item.question.id },
              })
            }
          />
        )}
      />
    </Screen>
  );
}

function LiveQuestionCard({
  item,
  onPress,
}: {
  item: LiveQuestionItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Open question: ${item.question.prompt}`}
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.communityBadge}>
          <Text style={styles.communityBadgeText} numberOfLines={1}>
            {(item.community.emoji || item.community.name.slice(0, 2)).slice(0, 2)}
          </Text>
        </View>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.communityName} numberOfLines={1}>
            {item.community.name}
          </Text>
          <Text style={styles.questionMeta}>
            Closes {formatRelativeTime(item.question.closesAt)}
          </Text>
        </View>
        <Text style={styles.points}>{formatPoints(item.question.points)}</Text>
      </View>
      <EmphasizedText style={styles.prompt}>{item.question.prompt}</EmphasizedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 20,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  headerCopy: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  communityBadge: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 42,
  },
  communityBadgeText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  cardTitleGroup: {
    flex: 1,
    gap: 3,
  },
  communityName: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
  questionMeta: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  points: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
  },
  prompt: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.72,
  },
});
