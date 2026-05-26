import 'server-only';
import { and, asc, count, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers, type Answer } from '@/db/schema/answers';
import { questionChoices, questions } from '@/db/schema/questions';
import {
  AccountSuspendedError,
  assertUserCanMutate,
  type PlatformRole,
} from '@/services/admin';
import { findUserStatusById } from '@/services/auth';
import { getCommunityBySlug, type CommunityRole } from '@/services/communities';
import {
  computeQuestionClosesAt,
  QuestionNotFoundError,
  type CommunityCadence,
} from '@/services/questions';
import {
  AnswerPermissionError,
  AnswerUnavailableError,
  AnswerValidationError,
} from './errors';
import { gradeAnswer } from './grading';

export type AnswerChoiceResource = {
  id: string;
  label: string;
  imageUrl: string | null;
  position: number;
  isCorrect: boolean | null;
  /**
   * How many members picked this choice. Only populated once the
   * viewer is allowed to see the solution (after they've answered, the
   * question has closed, or they moderate the community). Null
   * otherwise so we don't leak distribution before submission.
   */
  voteCount: number | null;
  /**
   * Share of the total answers this choice received, rounded to the
   * nearest whole percent. Null when voteCount is null. 0 if there
   * are zero answers (defensive — should not happen if a viewer is
   * seeing distribution as a result of their own answer).
   */
  votePct: number | null;
};

export type QuestionVoteDistribution = {
  totalAnswers: number;
  /** Map from choiceId → answer count. */
  countsByChoiceId: Map<string, number>;
};

export type AnswerResultResource = {
  id: string;
  questionId: string;
  selectedChoiceId: string;
  correctChoiceId: string;
  isCorrect: boolean;
  isLate: boolean;
  pointsAwarded: number;
  answeredAt: Date;
  selectedChoice: AnswerChoiceResource;
  correctChoice: AnswerChoiceResource;
};

export type QuestionDetail = {
  id: string;
  communityId: string;
  creatorUserId: string;
  prompt: string;
  explanation: string | null;
  imageUrl: string | null;
  scheduledFor: Date;
  publishedAt: Date | null;
  closesAt: Date;
  timeZone: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
  currentUserRole: CommunityRole | null;
  viewerCanModerate: boolean;
  canAnswer: boolean;
  canSeeSolution: boolean;
  isClosed: boolean;
  isScheduled: boolean;
  choices: AnswerChoiceResource[];
  result: AnswerResultResource | null;
};

type QuestionContext = {
  question: AnswerableQuestion;
  currentUserRole: CommunityRole | null;
  platformRole: PlatformRole;
  choices: (typeof questionChoices.$inferSelect)[];
  existingAnswer: Answer | null;
};

/**
 * Count how many answers have been submitted for each choice on this
 * question. Used to render the post-answer vote distribution bars.
 * Cheap: one indexed GROUP BY on (question_id, selected_choice_id).
 */
async function getChoiceVoteCounts(
  questionId: string,
): Promise<QuestionVoteDistribution> {
  const rows = await db
    .select({
      choiceId: answers.selectedChoiceId,
      count: count(),
    })
    .from(answers)
    .where(eq(answers.questionId, questionId))
    .groupBy(answers.selectedChoiceId);

  const countsByChoiceId = new Map<string, number>();
  let totalAnswers = 0;
  for (const row of rows) {
    const n = Number(row.count);
    countsByChoiceId.set(row.choiceId, n);
    totalAnswers += n;
  }
  return { totalAnswers, countsByChoiceId };
}

type AnswerableQuestion = typeof questions.$inferSelect & {
  scheduledFor: Date;
  closesAt: Date;
};

export async function getQuestionDetail({
  slug,
  questionId,
  userId,
  platformRole = 'member',
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: PlatformRole;
  now?: Date;
}): Promise<QuestionDetail> {
  const [context, status] = await Promise.all([
    loadQuestionContext({ slug, questionId, userId, platformRole }),
    findUserStatusById(userId),
  ]);
  const detail = toQuestionDetail(context, now, status === 'suspended');
  return withVoteDistribution(detail);
}

export async function submitQuestionAnswer({
  slug,
  questionId,
  userId,
  choiceId,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  choiceId: unknown;
  now?: Date;
}): Promise<QuestionDetail> {
  await assertAccountCanMutate(userId);

  const context = await loadQuestionContext({ slug, questionId, userId, platformRole: 'member' });
  if (context.existingAnswer) return toQuestionDetail(context, now, false);

  if (context.question.scheduledFor.getTime() > now.getTime()) {
    throw new AnswerUnavailableError();
  }

  if (typeof choiceId !== 'string' || choiceId.trim() === '') {
    throw new AnswerValidationError({ choiceId: 'Choose an answer.' });
  }

  const selectedChoice = context.choices.find((choice) => choice.id === choiceId);
  if (!selectedChoice) {
    throw new AnswerValidationError({
      choiceId: "Choose one of this question's answers.",
    });
  }

  const graded = gradeAnswer({
    isCorrect: selectedChoice.isCorrect,
    closesAt: context.question.closesAt,
    answeredAt: now,
    points: context.question.points,
  });

  const [created] = await db
    .insert(answers)
    .values({
      questionId: context.question.id,
      userId,
      selectedChoiceId: selectedChoice.id,
      isCorrect: selectedChoice.isCorrect,
      isLate: graded.isLate,
      pointsAwarded: graded.pointsAwarded,
      answeredAt: now,
    })
    .onConflictDoNothing({
      target: [answers.questionId, answers.userId],
    })
    .returning();

  const answer = created ?? (await getExistingAnswer(context.question.id, userId));
  const detail = toQuestionDetail({ ...context, existingAnswer: answer }, now, false);
  return withVoteDistribution(detail);
}

/**
 * Decorate choices with voteCount / votePct, but only when the viewer
 * is entitled to see the solution. We intentionally compute this AFTER
 * toQuestionDetail so the gate (`canSeeSolution`) is authoritative —
 * never leak the distribution to a member who hasn't submitted yet.
 */
async function withVoteDistribution(
  detail: QuestionDetail,
): Promise<QuestionDetail> {
  if (!detail.canSeeSolution) return detail;
  const { totalAnswers, countsByChoiceId } = await getChoiceVoteCounts(
    detail.id,
  );
  // Defensive: if nobody has answered yet (e.g. a moderator viewing
  // before submissions), surface zeros / 0% so the UI can still render
  // the empty distribution instead of falling back to the null branch.
  const choices = detail.choices.map((choice) => {
    const voteCount = countsByChoiceId.get(choice.id) ?? 0;
    const votePct =
      totalAnswers > 0 ? Math.round((voteCount / totalAnswers) * 100) : 0;
    return { ...choice, voteCount, votePct };
  });
  return { ...detail, choices };
}

async function loadQuestionContext({
  slug,
  questionId,
  userId,
  platformRole,
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole: PlatformRole;
}): Promise<QuestionContext> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new QuestionNotFoundError();
  if (!community.currentUserRole && platformRole !== 'admin') {
    throw new AnswerPermissionError();
  }

  const [question] = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.communityId, community.id),
        isNull(questions.deletedAt),
        isNotNull(questions.scheduledFor),
      ),
    )
    .limit(1);
  if (!question) throw new QuestionNotFoundError();
  const answerableQuestion = toAnswerableQuestion(
    question,
    community.cadence as CommunityCadence,
  );

  const [choices, existingAnswer] = await Promise.all([
    db
      .select()
      .from(questionChoices)
      .where(eq(questionChoices.questionId, answerableQuestion.id))
      .orderBy(asc(questionChoices.position)),
    getExistingAnswer(answerableQuestion.id, userId),
  ]);

  return {
    question: answerableQuestion,
    currentUserRole: community.currentUserRole,
    platformRole,
    choices,
    existingAnswer,
  };
}

function toAnswerableQuestion(
  question: typeof questions.$inferSelect,
  cadence: CommunityCadence,
): AnswerableQuestion {
  if (!question.scheduledFor || question.deletedAt) {
    throw new QuestionNotFoundError();
  }
  return {
    ...question,
    scheduledFor: question.scheduledFor,
    closesAt:
      question.closesAt ??
      computeQuestionClosesAt({
        cadence,
        scheduledFor: question.scheduledFor,
        requestedClosesAt: null,
      }),
  };
}

async function getExistingAnswer(
  questionId: string,
  userId: string,
): Promise<Answer | null> {
  const [answer] = await db
    .select()
    .from(answers)
    .where(and(eq(answers.questionId, questionId), eq(answers.userId, userId)))
    .limit(1);
  return answer ?? null;
}

function toQuestionDetail(
  context: QuestionContext,
  now: Date,
  isSuspended: boolean,
): QuestionDetail {
  const { question, choices, existingAnswer, platformRole } = context;
  const isAdmin = platformRole === 'admin';
  const hasAnswer = Boolean(existingAnswer);
  const isClosed = question.closesAt.getTime() <= now.getTime();
  const isScheduled = question.scheduledFor.getTime() > now.getTime();
  const viewerCanModerate =
    !isSuspended &&
    (context.currentUserRole === 'creator' || isAdmin);
  const canSeeSolution =
    viewerCanModerate || hasAnswer || isClosed;
  const canAnswer =
    !isSuspended && !isAdmin && !isScheduled && !hasAnswer && context.currentUserRole !== null;
  const resourceChoices = choices.map((choice) =>
    toChoiceResource(choice, canSeeSolution),
  );
  const result = existingAnswer
    ? toAnswerResult(existingAnswer, choices, resourceChoices)
    : null;

  return {
    ...question,
    currentUserRole: context.currentUserRole,
    viewerCanModerate,
    explanation: canSeeSolution ? question.explanation : null,
    canAnswer,
    canSeeSolution,
    isClosed,
    isScheduled,
    choices: resourceChoices,
    result,
  };
}

async function assertAccountCanMutate(userId: string): Promise<void> {
  const status = await findUserStatusById(userId);
  if (!status) throw new AccountSuspendedError('User account is unavailable.');
  assertUserCanMutate({ status });
}

function toAnswerResult(
  answer: Answer,
  rawChoices: (typeof questionChoices.$inferSelect)[],
  resourceChoices: AnswerChoiceResource[],
): AnswerResultResource {
  const correctChoice = rawChoices.find((choice) => choice.isCorrect);
  const selectedChoice = resourceChoices.find(
    (choice) => choice.id === answer.selectedChoiceId,
  );
  const correctChoiceResource = correctChoice
    ? resourceChoices.find((choice) => choice.id === correctChoice.id)
    : null;

  if (!selectedChoice || !correctChoice || !correctChoiceResource) {
    throw new Error('Answer result could not be built for this question.');
  }

  return {
    id: answer.id,
    questionId: answer.questionId,
    selectedChoiceId: answer.selectedChoiceId,
    correctChoiceId: correctChoice.id,
    isCorrect: answer.isCorrect,
    isLate: answer.isLate,
    pointsAwarded: answer.pointsAwarded,
    answeredAt: answer.answeredAt,
    selectedChoice,
    correctChoice: correctChoiceResource,
  };
}

function toChoiceResource(
  choice: typeof questionChoices.$inferSelect,
  canSeeSolution: boolean,
): AnswerChoiceResource {
  return {
    id: choice.id,
    label: choice.label,
    imageUrl: choice.imageUrl,
    position: choice.position,
    isCorrect: canSeeSolution ? choice.isCorrect : null,
    // Vote distribution is filled in by withVoteDistribution() after
    // toQuestionDetail. Leaving these null here is the correct default
    // for any code path that bypasses the decorator.
    voteCount: null,
    votePct: null,
  };
}
