import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
import {
  CommentsApiError,
  createCommentsClient,
  type Comment,
} from '@/services/comments/api';
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
  getQuestionState,
  type QuestionState,
} from '@/services/questions/format';
import {
  toInspectableImage,
  type InspectableImage,
} from '@/services/questions/images';
import { getKeyboardAvoidingBehavior } from '@/services/util/keyboard';
import { formatRelativeTime } from '@/services/util/time';

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
  const [inspectedImage, setInspectedImage] = useState<InspectableImage | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleCommentInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, []);

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
  const promptImage = toInspectableImage({
    accessibilityLabel: 'Question image',
    uri: question.imageUrl,
  });

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={getKeyboardAvoidingBehavior(Platform.OS)}
        style={styles.keyboardView}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
        >
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
            {promptImage ? (
              <Pressable
                accessibilityHint="Opens the image full screen."
                accessibilityLabel={promptImage.accessibilityLabel}
                accessibilityRole="button"
                onPress={() => setInspectedImage(promptImage)}
                style={({ pressed }) => [pressed ? styles.pressed : null]}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  contentFit="contain"
                  source={{ uri: promptImage.uri }}
                  style={styles.promptImage}
                />
              </Pressable>
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
              onOpenImage={setInspectedImage}
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

          {slugValue && idValue ? (
            <CommentsSection
              slug={slugValue}
              questionId={idValue}
              question={question}
              currentUserId={user?.id ?? null}
              onComposerFocus={handleCommentInputFocus}
              token={token}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <ImagePreviewModal image={inspectedImage} onClose={() => setInspectedImage(null)} />
    </Screen>
  );
}

function ChoiceForm({
  choices,
  disabled,
  onOpenImage,
  onSelect,
  selectedChoiceId,
}: {
  choices: QuestionDetail['choices'];
  disabled: boolean;
  onOpenImage: (image: InspectableImage) => void;
  onSelect: (id: string) => void;
  selectedChoiceId: string | null;
}) {
  return (
    <View style={styles.choiceList}>
      {choices.map((choice) => {
        const selected = choice.id === selectedChoiceId;
        const choiceImage = toInspectableImage({
          accessibilityLabel: `Image for choice: ${choice.label}`,
          uri: choice.imageUrl,
        });
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
              {choiceImage ? (
                <Pressable
                  accessibilityHint="Opens the image full screen."
                  accessibilityLabel={choiceImage.accessibilityLabel}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => onOpenImage(choiceImage)}
                  style={({ pressed }) => [pressed ? styles.pressed : null]}
                >
                  <Image
                    accessibilityIgnoresInvertColors
                    contentFit="contain"
                    source={{ uri: choiceImage.uri }}
                    style={styles.choiceImage}
                  />
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ImagePreviewModal({
  image,
  onClose,
}: {
  image: InspectableImage | null;
  onClose: () => void;
}) {
  if (!image) return null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View style={styles.imageModal}>
        <View style={styles.imageModalHeader}>
          <Text style={styles.imageModalTitle}>{image.accessibilityLabel}</Text>
          <Pressable
            accessibilityLabel="Close image preview"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [
              styles.imageModalClose,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.imageModalCloseText}>Close</Text>
          </Pressable>
        </View>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={image.accessibilityLabel}
          contentFit="contain"
          source={{ uri: image.uri }}
          style={styles.imageModalImage}
        />
      </View>
    </Modal>
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

function CommentsSection({
  slug,
  questionId,
  question,
  currentUserId,
  onComposerFocus,
  token,
}: {
  slug: string;
  questionId: string;
  question: QuestionDetail;
  currentUserId: string | null;
  onComposerFocus: () => void;
  token: string | null;
}) {
  const apiUrl = useRuntimeApiUrl();
  const commentsClient = useMemo(() => createCommentsClient({ apiUrl }), [apiUrl]);

  const canList =
    question.currentUserRole !== null && (question.result !== null || question.isClosed);
  const canPost = question.currentUserRole !== null && question.result !== null;
  const hasToken = Boolean(token);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openReplyCommentId, setOpenReplyCommentId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadComments = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!canList || !token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await commentsClient.list(slug, questionId, token);
        if (!isActive()) return;
        setComments(result.items);
      } catch (err) {
        if (!isActive()) return;
        if (err instanceof CommentsApiError) {
          setError(err.message);
        } else {
          setError('Unable to load comments.');
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [canList, commentsClient, questionId, slug, token],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadComments(() => active);

      return () => {
        active = false;
      };
    }, [loadComments]),
  );

  async function handlePostTopLevel(body: string) {
    if (!token) return;
    await commentsClient.post(slug, questionId, { body }, token);
    await loadComments();
  }

  async function handlePostReply(parentCommentId: string, body: string) {
    if (!token) return;
    await commentsClient.post(slug, questionId, { body, parentCommentId }, token);
    setOpenReplyCommentId(null);
    await loadComments();
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || !token || deleting) return;
    setDeleting(true);
    try {
      await commentsClient.delete(slug, questionId, pendingDelete.id, token);
      setPendingDelete(null);
      await loadComments();
    } catch {
      // Refetch anyway in case it's already deleted.
      setPendingDelete(null);
      await loadComments();
    } finally {
      setDeleting(false);
    }
  }

  // Gates
  if (!hasToken) {
    return (
      <View style={styles.commentsGate}>
        <Eyebrow>Discussion</Eyebrow>
        <Heading compact>Sign in to join the conversation</Heading>
        <BodyText>
          See what other members said and add your own thoughts.
        </BodyText>
        <BrandButton
          href={{
            pathname: '/login',
            params: { returnTo: `/communities/${slug}/questions/${questionId}` },
          }}
        >
          Sign in
        </BrandButton>
      </View>
    );
  }

  if (question.currentUserRole === null) {
    return (
      <View style={styles.commentsGate}>
        <Eyebrow>Discussion</Eyebrow>
        <Heading compact>Join this community to read the discussion</Heading>
        <BodyText>
          Membership unlocks comments on every question in this community.
        </BodyText>
        <BrandButton
          href={{ pathname: '/communities/[slug]', params: { slug } }}
          variant="secondary"
        >
          Go to community
        </BrandButton>
      </View>
    );
  }

  if (!canList) {
    return (
      <View style={styles.commentsGate}>
        <Eyebrow>Discussion</Eyebrow>
        <Heading compact>Answer first to join the discussion</Heading>
        <BodyText>
          Once you submit your answer, you can read and post comments here.
        </BodyText>
      </View>
    );
  }

  return (
    <View style={styles.commentsSection}>
      <View style={styles.commentsHeader}>
        <Text style={styles.commentsEyebrow}>
          DISCUSSION{comments.length > 0 ? ` · ${comments.length}` : ''}
        </Text>
      </View>

      {canPost ? (
        <CommentComposer
          placeholder="Share your thoughts..."
          onFocus={onComposerFocus}
          onSubmit={handlePostTopLevel}
          submitLabel="Post"
        />
      ) : (
        <Text style={styles.commentsLockedNote}>
          Comments are closed for new posts on this question.
        </Text>
      )}

      {loading ? (
        <StatePanel title="Loading discussion..." />
      ) : error ? (
        <StatePanel title={error}>
          <BrandButton variant="secondary" onPress={() => void loadComments()}>
            Retry
          </BrandButton>
        </StatePanel>
      ) : comments.length === 0 ? (
        <Text style={styles.commentsEmpty}>
          No comments yet — start the discussion.
        </Text>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              depth={0}
              currentUserId={currentUserId}
              canReply={canPost}
              openReplyCommentId={openReplyCommentId}
              onOpenReply={(id) => setOpenReplyCommentId(id)}
              onCloseReply={() => setOpenReplyCommentId(null)}
              onComposerFocus={onComposerFocus}
              onSubmitReply={handlePostReply}
              onRequestDelete={(c) => setPendingDelete(c)}
            />
          ))}
        </View>
      )}

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        message="This will remove your comment for everyone."
        onCancel={() => (deleting ? undefined : setPendingDelete(null))}
        onConfirm={handleConfirmDelete}
        title="Delete this comment?"
        visible={pendingDelete !== null}
      />
    </View>
  );
}

function CommentComposer({
  placeholder,
  onFocus,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  placeholder: string;
  onFocus?: () => void;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const disabled = submitting || body.trim().length === 0;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setFieldError(null);
    try {
      await onSubmit(body.trim());
      setBody('');
    } catch (err) {
      if (err instanceof CommentsApiError) {
        setFieldError(err.fieldErrors.body ?? err.message);
      } else {
        setFieldError('Unable to post comment.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.composer}>
      <TextInput
        editable={!submitting}
        multiline
        onChangeText={setBody}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.composerInput}
        value={body}
      />
      <FormError>{fieldError}</FormError>
      <View style={styles.composerActions}>
        {onCancel ? (
          <BrandButton
            disabled={submitting}
            onPress={onCancel}
            style={styles.composerCancel}
            variant="secondary"
          >
            Cancel
          </BrandButton>
        ) : null}
        <BrandButton disabled={disabled} onPress={handleSubmit}>
          {submitting ? 'Posting...' : submitLabel}
        </BrandButton>
      </View>
    </View>
  );
}

function CommentRow({
  comment,
  depth,
  currentUserId,
  canReply,
  openReplyCommentId,
  onOpenReply,
  onCloseReply,
  onComposerFocus,
  onSubmitReply,
  onRequestDelete,
}: {
  comment: Comment;
  depth: 0 | 1;
  currentUserId: string | null;
  canReply: boolean;
  openReplyCommentId: string | null;
  onOpenReply: (commentId: string) => void;
  onCloseReply: () => void;
  onComposerFocus: () => void;
  onSubmitReply: (parentCommentId: string, body: string) => Promise<void>;
  onRequestDelete: (comment: Comment) => void;
}) {
  const isDeleted = comment.body === null;
  const isOwnComment =
    comment.author !== null && currentUserId !== null && comment.author.id === currentUserId;
  const showDelete = !isDeleted && comment.canDelete && isOwnComment;
  const showReply = !isDeleted && canReply && depth === 0;
  const replyOpen = openReplyCommentId === comment.id;

  return (
    <View style={[styles.commentRow, depth === 1 ? styles.commentRowReply : null]}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>
          {comment.author ? `@${comment.author.username}` : 'Anonymous'}
        </Text>
        <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
      </View>

      {isDeleted ? (
        <Text style={styles.commentDeleted}>Comment removed</Text>
      ) : (
        <Text style={styles.commentBody}>{comment.body}</Text>
      )}

      {(showReply || showDelete) && !isDeleted ? (
        <View style={styles.commentActions}>
          {showReply ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => (replyOpen ? onCloseReply() : onOpenReply(comment.id))}
            >
              <Text style={styles.commentActionText}>
                {replyOpen ? 'Cancel reply' : 'Reply'}
              </Text>
            </Pressable>
          ) : null}
          {showDelete ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => onRequestDelete(comment)}
            >
              <Text style={[styles.commentActionText, styles.commentActionDelete]}>
                Delete
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {replyOpen ? (
        <View style={styles.commentReplyComposer}>
          <CommentComposer
            placeholder={`Reply to @${comment.author?.username ?? 'comment'}...`}
            onFocus={onComposerFocus}
            onSubmit={(body) => onSubmitReply(comment.id, body)}
            onCancel={onCloseReply}
            submitLabel="Post reply"
          />
        </View>
      ) : null}

      {depth === 0 && comment.replies.length > 0 ? (
        <View style={styles.commentRepliesList}>
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              depth={1}
              currentUserId={currentUserId}
              canReply={canReply}
              openReplyCommentId={openReplyCommentId}
              onOpenReply={onOpenReply}
              onCloseReply={onCloseReply}
              onComposerFocus={onComposerFocus}
              onSubmitReply={onSubmitReply}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </View>
      ) : null}
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

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
  imageModal: {
    backgroundColor: '#111111',
    flex: 1,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  imageModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  imageModalTitle: {
    color: palette.paper,
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  imageModalClose: {
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  imageModalCloseText: {
    color: palette.paper,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  imageModalImage: {
    flex: 1,
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
  commentsGate: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  commentsSection: {
    gap: 12,
    paddingTop: 8,
  },
  commentsHeader: {
    paddingTop: 4,
  },
  commentsEyebrow: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  commentsLockedNote: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontStyle: 'italic',
  },
  commentsEmpty: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    paddingTop: 6,
  },
  commentsList: {
    gap: 12,
  },
  composer: {
    gap: 8,
  },
  composerInput: {
    backgroundColor: palette.paper,
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  composerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  composerCancel: {
    marginRight: 'auto',
  },
  commentRow: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  commentRowReply: {
    backgroundColor: palette.paper,
    borderLeftColor: palette.primary,
    borderLeftWidth: 2,
    borderRadius: 8,
    marginLeft: 14,
  },
  commentHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  commentAuthor: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  commentTime: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  commentBody: {
    color: palette.ink,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
  },
  commentDeleted: {
    color: palette.muted,
    fontFamily: fonts.serif,
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentActions: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 4,
  },
  commentActionText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  commentActionDelete: {
    color: '#A12B2B',
  },
  commentReplyComposer: {
    paddingTop: 8,
  },
  commentRepliesList: {
    gap: 8,
    paddingTop: 8,
  },
});
