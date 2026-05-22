import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BodyText,
  BrandButton,
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
  createQuestionsClient,
  QuestionsApiError,
  type QuestionDetail,
  type QuestionResult,
} from '@/services/questions/api';
import {
  formatPoints,
  formatQuestionStateLabel,
  formatRelativeTime,
  getQuestionState,
  type QuestionState,
} from '@/services/questions/format';

export default function QuestionDetailScreen() {
  const { slug, id } = useLocalSearchParams<{ slug?: string; id?: string }>();
  const { loading: authLoading, token, user } = useAuth();
  const apiUrl = useRuntimeApiUrl();
  const questionsClient = useMemo(() => createQuestionsClient({ apiUrl }), [apiUrl]);
  const slugValue = normalizeParam(slug);
  const idValue = normalizeParam(id);

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadQuestion = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!slugValue || !idValue) {
        setError('Question not found.');
        setLoading(false);
        return;
      }
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setErrorStatus(null);
      try {
        const result = await questionsClient.get(slugValue, idValue, token);
        if (!isActive()) return;
        setQuestion(result);
        if (result.result?.selectedChoiceId) {
          setSelectedChoiceId(result.result.selectedChoiceId);
        }
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof QuestionsApiError) {
          setError(err.message);
          setErrorStatus(err.status);
        } else {
          setError('Unable to load question.');
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [idValue, questionsClient, slugValue, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadQuestion(() => active);

      return () => {
        active = false;
      };
    }, [loadQuestion]),
  );

  // Anonymous: stop loading once auth resolves; render sign-in gate.
  useEffect(() => {
    if (!authLoading && !token) {
      setLoading(false);
    }
  }, [authLoading, token]);

  async function handleSubmit() {
    if (!slugValue || !idValue || !token || !selectedChoiceId || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await questionsClient.submitAnswer(
        slugValue,
        idValue,
        selectedChoiceId,
        token,
      );
      setQuestion((current) =>
        current
          ? {
              ...current,
              canAnswer: response.canAnswer,
              isClosed: response.isClosed,
              isScheduled: response.isScheduled,
              choices: response.choices.length > 0 ? response.choices : current.choices,
              explanation: response.explanation ?? current.explanation,
              result: response.result,
            }
          : current,
      );
    } catch (err) {
      if (err instanceof QuestionsApiError) {
        if (err.status === 409) {
          // Question state changed; reload.
          void loadQuestion();
          return;
        }
        setSubmitError(err.message);
      } else {
        setSubmitError('Unable to submit your answer.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Anonymous gate
  if (!authLoading && !token) {
    return (
      <Screen>
        <View style={styles.gateContainer}>
          <Eyebrow>Sign in required</Eyebrow>
          <Heading compact>Sign in to view this question.</Heading>
          <BodyText>Create an account or sign in to answer today&apos;s challenge.</BodyText>
          <BrandButton
            href={{
              pathname: '/login',
              params: { returnTo: `/communities/${slugValue}/questions/${idValue}` },
            }}
          >
            Sign in
          </BrandButton>
          <BrandButton
            href={{
              pathname: '/register',
              params: { returnTo: `/communities/${slugValue}/questions/${idValue}` },
            }}
            variant="secondary"
          >
            Create account
          </BrandButton>
        </View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <StatePanel title="Loading question..." />
      </Screen>
    );
  }

  if (errorStatus === 403) {
    return (
      <Screen>
        <View style={styles.gateContainer}>
          <Eyebrow>Members only</Eyebrow>
          <Heading compact>Join the community to answer.</Heading>
          <BodyText>This question is open to community members. Join to take part.</BodyText>
          <BrandButton href={{ pathname: '/communities/[slug]', params: { slug: slugValue ?? '' } }}>
            Go to community
          </BrandButton>
        </View>
      </Screen>
    );
  }

  if (error || !question) {
    return (
      <Screen>
        <StatePanel title={error ?? 'Question not found.'}>
          <BrandButton
            href={{ pathname: '/communities/[slug]', params: { slug: slugValue ?? '' } }}
            variant="secondary"
          >
            Back to community
          </BrandButton>
        </StatePanel>
      </Screen>
    );
  }

  const state = getQuestionState(question);
  const hasResult = Boolean(question.result);
  const showChoiceForm = !hasResult && question.canAnswer;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <View style={[styles.stateBadge, stateBadgeStyles[state].container]}>
            <Text style={[styles.stateBadgeText, stateBadgeStyles[state].text]}>
              {formatQuestionStateLabel(state).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.metaText}>{getQuestionTimeHint(question, state)}</Text>
          <Text style={styles.pointsText}>{formatPoints(question.points)}</Text>
        </View>

        <View style={styles.promptCard}>
          <Heading compact>{question.prompt}</Heading>
          {question.imageUrl ? (
            <Image
              accessibilityLabel="Question image"
              contentFit="cover"
              source={{ uri: question.imageUrl }}
              style={styles.promptImage}
            />
          ) : null}
        </View>

        {state === 'scheduled' ? (
          <StatePanel
            title={`This question goes live ${formatRelativeTime(
              question.publishedAt ?? question.scheduledFor,
            )}.`}
          />
        ) : showChoiceForm ? (
          <ChoiceForm
            choices={question.choices}
            disabled={submitting}
            onSelect={setSelectedChoiceId}
            selectedChoiceId={selectedChoiceId}
          />
        ) : hasResult && question.result ? (
          <ResultPanel result={question.result} explanation={question.explanation} />
        ) : (
          <StatePanel title="This question is closed and you didn't submit an answer." />
        )}

        {showChoiceForm ? (
          <View style={styles.submitArea}>
            <FormError>{submitError}</FormError>
            <BrandButton disabled={!selectedChoiceId || submitting} onPress={handleSubmit}>
              {submitting ? 'Submitting...' : 'Submit answer'}
            </BrandButton>
          </View>
        ) : null}

        {!showChoiceForm && !hasResult && user && question.currentUserRole === null ? (
          <BrandButton
            href={{ pathname: '/communities/[slug]', params: { slug: slugValue ?? '' } }}
            variant="secondary"
          >
            Join community to answer
          </BrandButton>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ChoiceForm({
  choices,
  disabled,
  onSelect,
  selectedChoiceId,
}: {
  choices: QuestionDetail['choices'];
  disabled: boolean;
  onSelect: (id: string) => void;
  selectedChoiceId: string | null;
}) {
  return (
    <View style={styles.choiceList}>
      {choices.map((choice) => {
        const selected = choice.id === selectedChoiceId;
        return (
          <Pressable
            key={choice.id}
            accessibilityLabel={`Choice: ${choice.label}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(choice.id)}
            style={({ pressed }) => [
              styles.choiceItem,
              selected ? styles.choiceItemSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.choiceRadio}>
              {selected ? <View style={styles.choiceRadioDot} /> : null}
            </View>
            <View style={styles.choiceBody}>
              <Text style={styles.choiceLabel}>{choice.label}</Text>
              {choice.imageUrl ? (
                <Image
                  accessibilityLabel="Choice image"
                  contentFit="cover"
                  source={{ uri: choice.imageUrl }}
                  style={styles.choiceImage}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ResultPanel({
  explanation,
  result,
}: {
  explanation: string | null;
  result: QuestionResult;
}) {
  const headerStyle = result.isLate
    ? styles.resultHeaderLate
    : result.isCorrect
      ? styles.resultHeaderCorrect
      : styles.resultHeaderWrong;
  const headerTextStyle = result.isLate
    ? styles.resultHeaderTextLate
    : result.isCorrect
      ? styles.resultHeaderTextCorrect
      : styles.resultHeaderTextWrong;
  const headerLabel = result.isLate
    ? 'LATE'
    : result.isCorrect
      ? 'CORRECT'
      : 'WRONG';

  return (
    <View style={styles.resultCard}>
      <View style={[styles.resultHeader, headerStyle]}>
        <Text style={[styles.resultHeaderText, headerTextStyle]}>{headerLabel}</Text>
        <Text style={[styles.resultHeaderText, headerTextStyle]}>
          {formatPoints(result.pointsAwarded)}
        </Text>
      </View>
      <View style={styles.resultBody}>
        <ResultRow label="Your answer" value={result.selectedChoice.label} />
        <ResultRow label="Correct answer" value={result.correctChoice.label} />
        {result.isLate ? (
          <Text style={styles.resultNote}>Late — saved for learning, no points.</Text>
        ) : null}
        {explanation ? (
          <View style={styles.explanationBlock}>
            <Text style={styles.explanationLabel}>Why</Text>
            <Text style={styles.explanationBody}>{explanation}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultRowLabel}>{label}</Text>
      <Text style={styles.resultRowValue}>{value}</Text>
    </View>
  );
}

function getQuestionTimeHint(question: QuestionDetail, state: QuestionState): string {
  if (state === 'scheduled') {
    return `Goes live ${formatRelativeTime(question.publishedAt ?? question.scheduledFor)}`;
  }
  if (state === 'live') {
    return `Closes ${formatRelativeTime(question.closesAt)}`;
  }
  return `Closed ${formatRelativeTime(question.closesAt)}`;
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
  },
  metaRow: {
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
  metaText: {
    color: palette.muted,
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  pointsText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
  },
  promptCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  promptImage: {
    aspectRatio: 16 / 9,
    backgroundColor: palette.paper,
    borderRadius: 10,
    width: '100%',
  },
  choiceList: {
    gap: 10,
  },
  choiceItem: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  choiceItemSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  choiceRadio: {
    alignItems: 'center',
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  choiceRadioDot: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  choiceBody: {
    flex: 1,
    gap: 10,
  },
  choiceLabel: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '700',
  },
  choiceImage: {
    aspectRatio: 16 / 9,
    backgroundColor: palette.paper,
    borderRadius: 8,
    width: '100%',
  },
  submitArea: {
    gap: 10,
  },
  resultCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultHeaderCorrect: {
    backgroundColor: palette.primarySoft,
  },
  resultHeaderWrong: {
    backgroundColor: '#FDECEC',
  },
  resultHeaderLate: {
    backgroundColor: palette.card,
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
  },
  resultHeaderText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultHeaderTextCorrect: {
    color: palette.primary,
  },
  resultHeaderTextWrong: {
    color: '#7F1D1D',
  },
  resultHeaderTextLate: {
    color: palette.muted,
  },
  resultBody: {
    gap: 10,
    padding: 14,
  },
  resultRow: {
    gap: 3,
  },
  resultRowLabel: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  resultRowValue: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '700',
  },
  resultNote: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontStyle: 'italic',
  },
  explanationBlock: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 12,
  },
  explanationLabel: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  explanationBody: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  gateContainer: {
    alignItems: 'stretch',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});
