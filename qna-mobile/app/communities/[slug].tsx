import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BodyText,
  BrandBadge,
  BrandButton,
  ConfirmDialog,
  Eyebrow,
  FormError,
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
import { formatCommunityCadence, formatCommunityRole } from '@/services/communities/format';
import {
  createQuestionsClient,
  QuestionsApiError,
  type QuestionSummary,
} from '@/services/questions/api';
import {
  formatPoints,
  formatQuestionStateLabel,
  formatRelativeTime,
  getQuestionState,
  type QuestionState,
} from '@/services/questions/format';

type DetailTab = 'questions' | 'broadcasts' | 'leaderboard' | 'about';

const TABS: { value: DetailTab; label: string }[] = [
  { value: 'questions', label: 'Questions' },
  { value: 'broadcasts', label: 'Posts' },
  { value: 'leaderboard', label: 'Ranks' },
  { value: 'about', label: 'About' },
];

export default function CommunityDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const { loading: authLoading, token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<DetailTab>('questions');
  const [community, setCommunity] = useState<Community | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const apiUrl = useRuntimeApiUrl();
  const communitiesClient = useMemo(() => createCommunitiesClient({ apiUrl }), [apiUrl]);
  const slugValue = Array.isArray(slug) ? slug[0] : slug;

  const loadCommunity = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!slugValue) return;

      setLoading(true);
      setError(null);
      try {
        const result = await communitiesClient.get(slugValue, token);
        if (!isActive()) return;
        setCommunity(result);
      } catch (err) {
        if (!isActive()) return;
        setError(err instanceof CommunitiesApiError ? err.message : 'Unable to load community.');
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [communitiesClient, slugValue, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadCommunity(() => active);

      return () => {
        active = false;
      };
    }, [loadCommunity]),
  );

  async function handleJoin() {
    if (!slugValue || joining) return;

    if (!user || !token) {
      router.push({
        pathname: '/login',
        params: { returnTo: `/communities/${slugValue}` },
      });
      return;
    }

    setJoining(true);
    setJoinError(null);
    try {
      const joined = await communitiesClient.join(slugValue, token);
      setCommunity(joined);
    } catch (err) {
      setJoinError(err instanceof CommunitiesApiError ? err.message : 'Unable to join community.');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!slugValue || !token || leaving) return;

    setLeaving(true);
    setJoinError(null);
    try {
      const left = await communitiesClient.leave(slugValue, token);
      setCommunity(left);
      setConfirmingLeave(false);
    } catch (err) {
      setJoinError(err instanceof CommunitiesApiError ? err.message : 'Unable to leave community.');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <StatePanel title="Loading community..." />
        ) : error || !community ? (
          <StatePanel title={error ?? 'Community not found.'}>
            <BrandButton variant="secondary" href="/communities">
              Back to communities
            </BrandButton>
          </StatePanel>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{community.emoji || community.name.slice(0, 2)}</Text>
                </View>
                <View style={styles.heroTitleGroup}>
                  {community.category ? <Eyebrow>{community.category.name}</Eyebrow> : null}
                  <Heading compact>{community.name}</Heading>
                </View>
              </View>
              <BodyText>{community.description}</BodyText>
              <View style={styles.metaGrid}>
                <MetaItem label="Cadence" value={formatCommunityCadence(community.cadence)} />
                <MetaItem
                  label="Members"
                  separated
                  value={formatMemberCount(community.memberCount)}
                />
                <MetaItem
                  label="Role"
                  separated
                  value={formatCommunityRole(community.currentUserRole)}
                />
              </View>
              {community.currentUserRole === 'member' ? (
                <View style={styles.membershipActions}>
                  <BrandBadge style={styles.membershipBadge}>Joined</BrandBadge>
                  <BrandButton
                    disabled={leaving}
                    variant="secondary"
                    onPress={() => setConfirmingLeave(true)}
                  >
                    {leaving ? 'Leaving...' : 'Leave community'}
                  </BrandButton>
                </View>
              ) : community.currentUserRole === 'creator' ? (
                <BrandBadge style={styles.membershipBadge}>Creator</BrandBadge>
              ) : (
                <BrandButton disabled={authLoading || joining} onPress={handleJoin}>
                  {joining ? 'Joining...' : 'Join community'}
                </BrandButton>
              )}
              <FormError>{joinError}</FormError>
            </View>

            <ScrollView
              horizontal
              contentContainerStyle={styles.tabs}
              showsHorizontalScrollIndicator={false}
            >
              {TABS.map((tab) => {
                const active = activeTab === tab.value;
                return (
                  <Pressable
                    key={tab.value}
                    accessibilityRole="button"
                    onPress={() => setActiveTab(tab.value)}
                    style={[styles.tabButton, active ? styles.activeTabButton : null]}
                  >
                    <Text style={[styles.tabText, active ? styles.activeTabText : null]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TabPanel activeTab={activeTab} community={community} />
          </>
        )}
      </ScrollView>
      <ConfirmDialog
        cancelLabel="Stay"
        confirmLabel="Leave"
        message="You can join again later, but this community will leave your active memberships."
        onCancel={() => setConfirmingLeave(false)}
        onConfirm={handleLeave}
        title="Leave community?"
        visible={confirmingLeave}
      />
    </Screen>
  );
}

function TabPanel({ activeTab, community }: { activeTab: DetailTab; community: Community }) {
  if (activeTab === 'about') {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>About</Text>
        <Text style={styles.panelBody}>{community.description}</Text>
        <MetaItem label="Category" value={community.category?.name ?? 'General'} />
        <MetaItem label="Created" separated value={formatDate(community.createdAt)} />
        <MetaItem label="Updated" separated value={formatDate(community.updatedAt)} />
      </View>
    );
  }

  if (activeTab === 'questions') {
    return <QuestionsTab community={community} />;
  }

  const scaffoldTab = activeTab as Exclude<DetailTab, 'about' | 'questions'>;
  const copy = {
    broadcasts: 'Notes from the creator will appear here when there is something new to read.',
    leaderboard: 'Scores and streaks will show here once members start answering.',
  } satisfies Record<Exclude<DetailTab, 'about' | 'questions'>, string>;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{TABS.find((tab) => tab.value === activeTab)?.label}</Text>
      <Text style={styles.panelBody}>{copy[scaffoldTab]}</Text>
    </View>
  );
}

function QuestionsTab({ community }: { community: Community }) {
  const router = useRouter();
  const { token } = useAuth();
  const apiUrl = useRuntimeApiUrl();
  const questionsClient = useMemo(() => createQuestionsClient({ apiUrl }), [apiUrl]);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await questionsClient.list(community.slug, { limit: 20, token });
        if (!isActive()) return;
        setQuestions(result.items);
      } catch (err) {
        if (!isActive()) return;
        setError(err instanceof QuestionsApiError ? err.message : 'Unable to load questions.');
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [community.slug, questionsClient, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadQuestions(() => active);

      return () => {
        active = false;
      };
    }, [loadQuestions]),
  );

  if (loading) {
    return <StatePanel title="Loading questions..." />;
  }
  if (error) {
    return (
      <StatePanel title={error}>
        <BrandButton variant="secondary" onPress={() => void loadQuestions()}>
          Retry
        </BrandButton>
      </StatePanel>
    );
  }
  if (questions.length === 0) {
    return <StatePanel title="No published questions yet. Check back when the creator schedules one." />;
  }

  return (
    <View style={styles.questionList}>
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          onPress={() =>
            router.push({
              pathname: '/communities/[slug]/questions/[id]',
              params: { slug: community.slug, id: question.id },
            })
          }
        />
      ))}
    </View>
  );
}

function QuestionCard({
  question,
  onPress,
}: {
  question: QuestionSummary;
  onPress: () => void;
}) {
  const state = getQuestionState(question);
  const stateBadgeStyle = stateBadgeStyles[state];
  const timeHint = getQuestionTimeHint(question, state);

  return (
    <Pressable
      accessibilityLabel={`Open question: ${question.prompt}`}
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.questionCard, pressed ? styles.pressed : null]}
    >
      <View style={styles.questionMetaRow}>
        <View style={[styles.stateBadge, stateBadgeStyle.container]}>
          <Text style={[styles.stateBadgeText, stateBadgeStyle.text]}>
            {formatQuestionStateLabel(state).toUpperCase()}
          </Text>
        </View>
        {timeHint ? <Text style={styles.questionMetaText}>{timeHint}</Text> : null}
        <Text style={styles.questionPointsText}>{formatPoints(question.points)}</Text>
      </View>
      <Text style={styles.questionPrompt} numberOfLines={3}>
        {question.prompt}
      </Text>
    </Pressable>
  );
}

function getQuestionTimeHint(question: QuestionSummary, state: QuestionState): string | null {
  if (state === 'scheduled') {
    const target = question.publishedAt ?? question.scheduledFor;
    if (!target) return null;
    return `Goes live ${formatRelativeTime(target)}`;
  }
  if (state === 'live') {
    return `Closes ${formatRelativeTime(question.closesAt)}`;
  }
  return `Closed ${formatRelativeTime(question.closesAt)}`;
}

const stateBadgeStyles: Record<
  QuestionState,
  { container: { backgroundColor: string; borderColor: string }; text: { color: string } }
> = {
  scheduled: {
    container: { backgroundColor: palette.card, borderColor: palette.line },
    text: { color: palette.muted },
  },
  live: {
    container: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
    text: { color: palette.primary },
  },
  closed: {
    container: { backgroundColor: palette.card, borderColor: palette.line },
    text: { color: palette.ink },
  },
};

function MetaItem({
  label,
  separated = false,
  value,
}: {
  label: string;
  separated?: boolean;
  value: string;
}) {
  return (
    <View style={[styles.metaItem, separated ? styles.separatedMetaItem : null]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function formatMemberCount(count: number) {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
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
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  badgeText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: '800',
  },
  heroTitleGroup: {
    flex: 1,
    gap: 4,
  },
  membershipActions: {
    gap: 10,
  },
  membershipBadge: {
    minHeight: 50,
  },
  metaGrid: {
    gap: 8,
  },
  metaItem: {
    gap: 3,
  },
  separatedMetaItem: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  metaLabel: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  tabButton: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  activeTabButton: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  tabText: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
  },
  activeTabText: {
    color: palette.paper,
  },
  panel: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  panelTitle: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: '800',
  },
  panelBody: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  questionList: {
    gap: 11,
  },
  questionCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  questionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stateBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  stateBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  questionMetaText: {
    color: palette.muted,
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  questionPointsText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
  },
  questionPrompt: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.72,
  },
});
