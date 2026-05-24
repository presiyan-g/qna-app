import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BodyText,
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
import { formatCommunityCadence } from '@/services/communities/format';
import {
  createQuestionsClient,
  QuestionsApiError,
  type QuestionSummary,
} from '@/services/questions/api';
import {
  formatPoints,
  formatQuestionStateLabel,
  getQuestionState,
  type QuestionState,
} from '@/services/questions/format';
import {
  BroadcastsApiError,
  createBroadcastsClient,
  type Broadcast,
} from '@/services/broadcasts/api';
import {
  createLeaderboardClient,
  LeaderboardApiError,
  type LeaderboardEntry,
  type LeaderboardResult,
  type LeaderboardWindow,
} from '@/services/leaderboard/api';
import { formatRelativeTime } from '@/services/util/time';

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
            {community.coverImageUrl ? (
              <Image
                accessibilityIgnoresInvertColors
                contentFit="cover"
                source={{ uri: community.coverImageUrl }}
                style={styles.coverImage}
              />
            ) : null}
            <View style={styles.hero}>
              <View style={styles.heroHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {(community.emoji || community.name.slice(0, 2)).slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.heroTitleGroup}>
                  {community.category ? <Eyebrow>{community.category.name}</Eyebrow> : null}
                  <Heading compact>{community.name}</Heading>
                </View>
              </View>
              <View style={styles.membershipRow}>
                {community.currentUserRole === 'member' ? (
                  <>
                    <View style={styles.joinedPill}>
                      <Text style={styles.joinedPillText}>✓ Joined</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={leaving}
                      onPress={() => setConfirmingLeave(true)}
                      style={({ pressed }) => [
                        styles.leaveButton,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={styles.leaveButtonText}>
                        {leaving ? 'Leaving...' : 'Leave'}
                      </Text>
                    </Pressable>
                  </>
                ) : community.currentUserRole === 'creator' ? (
                  <View style={styles.joinedPill}>
                    <Text style={styles.joinedPillText}>Creator</Text>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={authLoading || joining}
                    onPress={handleJoin}
                    style={({ pressed }) => [
                      styles.joinButton,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={styles.joinButtonText}>
                      {joining ? 'Joining...' : 'Join community'}
                    </Text>
                  </Pressable>
                )}
              </View>
              <BodyText>{community.description}</BodyText>
              <View style={styles.metaGrid}>
                <MetaItem label="Cadence" value={formatCommunityCadence(community.cadence)} />
                <MetaItem
                  label="Members"
                  separated
                  value={formatMemberCount(community.memberCount)}
                />
              </View>
              <FormError>{joinError}</FormError>
            </View>

            <View style={styles.tabsWrapper}>
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
            </View>

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

  if (activeTab === 'broadcasts') {
    return <BroadcastsTab community={community} />;
  }

  if (activeTab === 'leaderboard') {
    return <LeaderboardTab community={community} />;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{TABS.find((tab) => tab.value === activeTab)?.label}</Text>
      <Text style={styles.panelBody}>Coming soon.</Text>
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

function BroadcastsTab({ community }: { community: Community }) {
  const { token } = useAuth();
  const apiUrl = useRuntimeApiUrl();
  const broadcastsClient = useMemo(() => createBroadcastsClient({ apiUrl }), [apiUrl]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<BroadcastsApiError | null>(null);

  const loadBroadcasts = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await broadcastsClient.list(community.slug, { limit: 20, token });
        if (!isActive()) return;
        setBroadcasts(result.items);
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof BroadcastsApiError) {
          setError(err);
        } else {
          setError(new BroadcastsApiError('Unable to load posts.', 0, 'unknown'));
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [broadcastsClient, community.slug, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadBroadcasts(() => active);

      return () => {
        active = false;
      };
    }, [loadBroadcasts]),
  );

  if (loading) {
    return <StatePanel title="Loading posts..." />;
  }

  if (error) {
    if (error.code === 'unauthenticated') {
      return (
        <StatePanel title="Sign in to see posts">
          <Text style={styles.panelBody}>
            Broadcasts are creator updates shared with members of this community.
          </Text>
          <BrandButton
            href={{ pathname: '/login', params: { returnTo: `/communities/${community.slug}` } }}
          >
            Sign in
          </BrandButton>
        </StatePanel>
      );
    }
    if (error.code === 'forbidden') {
      return (
        <StatePanel title="Join this community to see posts">
          <Text style={styles.panelBody}>Membership unlocks broadcasts from the creator.</Text>
        </StatePanel>
      );
    }
    return (
      <StatePanel title={error.message || 'Unable to load posts.'}>
        <BrandButton variant="secondary" onPress={() => void loadBroadcasts()}>
          Retry
        </BrandButton>
      </StatePanel>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <StatePanel title="No posts yet">
        <Text style={styles.panelBody}>Creators will share updates here.</Text>
      </StatePanel>
    );
  }

  return (
    <View style={styles.broadcastList}>
      {broadcasts.map((post) => (
        <BroadcastCard key={post.id} post={post} />
      ))}
    </View>
  );
}

function BroadcastCard({ post }: { post: Broadcast }) {
  return (
    <View style={styles.broadcastCard}>
      <View style={styles.broadcastHeader}>
        <Text style={styles.broadcastAuthor}>@{post.author.username}</Text>
        <Text style={styles.broadcastTime}>{formatRelativeTime(post.publishedAt)}</Text>
      </View>
      <Text style={styles.broadcastBody}>{post.body}</Text>
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.broadcastImage}
          contentFit="cover"
          transition={150}
        />
      ) : null}
    </View>
  );
}

const LEADERBOARD_WINDOWS: { value: LeaderboardWindow; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All-time' },
];

function LeaderboardTab({ community }: { community: Community }) {
  const { token } = useAuth();
  const apiUrl = useRuntimeApiUrl();
  const leaderboardClient = useMemo(
    () => createLeaderboardClient({ apiUrl }),
    [apiUrl],
  );
  const [selectedWindow, setSelectedWindow] = useState<LeaderboardWindow>('7d');
  const [data, setData] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LeaderboardApiError | null>(null);

  const loadLeaderboard = useCallback(
    async (windowValue: LeaderboardWindow, isActive: () => boolean = () => true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await leaderboardClient.get(community.slug, {
          window: windowValue,
          token,
        });
        if (!isActive()) return;
        setData(result);
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof LeaderboardApiError) {
          setError(err);
        } else {
          setError(new LeaderboardApiError('Unable to load leaderboard.', 0, 'unknown'));
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [community.slug, leaderboardClient, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadLeaderboard(selectedWindow, () => active);

      return () => {
        active = false;
      };
    }, [loadLeaderboard, selectedWindow]),
  );

  const entries = data?.entries ?? [];
  const viewerEntry = data?.viewerEntry ?? null;
  const viewerOutsideTopTen =
    viewerEntry !== null && !entries.some((row) => row.userId === viewerEntry.userId);

  return (
    <View style={styles.leaderboardContainer}>
      <View style={styles.windowSwitcher}>
        {LEADERBOARD_WINDOWS.map((option) => {
          const active = option.value === selectedWindow;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => setSelectedWindow(option.value)}
              style={[
                styles.windowPill,
                active ? styles.windowPillActive : styles.windowPillInactive,
              ]}
            >
              <Text
                style={[
                  styles.windowPillText,
                  active ? styles.windowPillTextActive : styles.windowPillTextInactive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <StatePanel title="Loading leaderboard..." />
      ) : error ? (
        <StatePanel title={error.message || 'Unable to load leaderboard.'}>
          <BrandButton variant="secondary" onPress={() => void loadLeaderboard(selectedWindow)}>
            Retry
          </BrandButton>
        </StatePanel>
      ) : entries.length === 0 ? (
        <StatePanel title="No scores yet">
          <Text style={styles.panelBody}>Be the first to answer today&apos;s question.</Text>
        </StatePanel>
      ) : (
        <>
          <View style={styles.leaderboardList}>
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isViewer={viewerEntry?.userId === entry.userId}
              />
            ))}
          </View>

          {viewerOutsideTopTen ? (
            <View style={styles.viewerFooter}>
              <Text style={styles.viewerFooterLabel}>YOUR RANK</Text>
              <LeaderboardRow entry={viewerEntry} isViewer />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function LeaderboardRow({
  entry,
  isViewer,
}: {
  entry: LeaderboardEntry;
  isViewer: boolean;
}) {
  const topThree = entry.rank <= 3;

  return (
    <View
      style={[
        styles.leaderboardRow,
        isViewer ? styles.leaderboardRowViewer : null,
      ]}
    >
      <View
        style={[
          styles.rankPill,
          topThree ? styles.rankPillTop : styles.rankPillRegular,
        ]}
      >
        <Text
          style={[
            styles.rankPillText,
            topThree ? styles.rankPillTextTop : styles.rankPillTextRegular,
          ]}
        >
          {entry.rank}
        </Text>
      </View>
      <Text style={styles.leaderboardUsername} numberOfLines={1}>
        @{entry.username}
      </Text>
      <Text style={styles.leaderboardPoints}>{formatPoints(entry.points)}</Text>
    </View>
  );
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
  coverImage: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    height: 180,
    width: '100%',
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
    overflow: 'hidden',
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
  membershipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  joinedPill: {
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  joinedPillText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  leaveButton: {
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  leaveButtonText: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  joinButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  joinButtonText: {
    color: palette.paper,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
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
  tabsWrapper: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 20,
  },
  tabButton: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    marginBottom: -1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activeTabButton: {
    borderBottomColor: palette.primary,
  },
  tabText: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  activeTabText: {
    color: palette.primary,
    fontWeight: '800',
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
  broadcastList: {
    gap: 12,
  },
  broadcastCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  broadcastHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  broadcastAuthor: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  broadcastTime: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  broadcastBody: {
    color: palette.ink,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
  },
  broadcastImage: {
    aspectRatio: 16 / 9,
    borderRadius: 10,
    marginTop: 4,
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
  },
  leaderboardContainer: {
    gap: 14,
  },
  windowSwitcher: {
    flexDirection: 'row',
    gap: 8,
  },
  windowPill: {
    borderRadius: 999,
    borderWidth: 1,
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  windowPillActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  windowPillInactive: {
    backgroundColor: palette.card,
    borderColor: palette.line,
  },
  windowPillText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  windowPillTextActive: {
    color: palette.paper,
  },
  windowPillTextInactive: {
    color: palette.ink,
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardRow: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leaderboardRowViewer: {
    borderColor: palette.primary,
    borderWidth: 1.5,
  },
  rankPill: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  rankPillTop: {
    backgroundColor: palette.primary,
  },
  rankPillRegular: {
    backgroundColor: palette.paper,
    borderColor: palette.line,
    borderWidth: 1,
  },
  rankPillText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  rankPillTextTop: {
    color: palette.paper,
  },
  rankPillTextRegular: {
    color: palette.ink,
  },
  leaderboardUsername: {
    color: palette.ink,
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '700',
  },
  leaderboardPoints: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  viewerFooter: {
    gap: 6,
    paddingTop: 6,
  },
  viewerFooterLabel: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
