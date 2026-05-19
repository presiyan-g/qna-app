import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers, type Answer } from '@/db/schema/answers';
import { questionChoices, questions } from '@/db/schema/questions';
import { getCommunityBySlug, type CommunityRole } from '@/services/communities';
import { QuestionNotFoundError } from '@/services/questions';
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
  currentUserRole: CommunityRole;
  canAnswer: boolean;
  canSeeSolution: boolean;
  isClosed: boolean;
  isScheduled: boolean;
  choices: AnswerChoiceResource[];
  result: AnswerResultResource | null;
};

type QuestionContext = {
  question: typeof questions.$inferSelect;
  currentUserRole: CommunityRole;
  choices: (typeof questionChoices.$inferSelect)[];
  existingAnswer: Answer | null;
};

export async function getQuestionDetail({
  slug,
  questionId,
  userId,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  now?: Date;
}): Promise<QuestionDetail> {
  const context = await loadQuestionContext({ slug, questionId, userId });
  return toQuestionDetail(context, now);
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
  const context = await loadQuestionContext({ slug, questionId, userId });
  if (context.existingAnswer) return toQuestionDetail(context, now);

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
  return toQuestionDetail({ ...context, existingAnswer: answer }, now);
}

async function loadQuestionContext({
  slug,
  questionId,
  userId,
}: {
  slug: string;
  questionId: string;
  userId: string;
}): Promise<QuestionContext> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new QuestionNotFoundError();
  if (!community.currentUserRole) throw new AnswerPermissionError();

  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.communityId, community.id)))
    .limit(1);
  if (!question) throw new QuestionNotFoundError();

  const [choices, existingAnswer] = await Promise.all([
    db
      .select()
      .from(questionChoices)
      .where(eq(questionChoices.questionId, question.id))
      .orderBy(asc(questionChoices.position)),
    getExistingAnswer(question.id, userId),
  ]);

  return {
    question,
    currentUserRole: community.currentUserRole,
    choices,
    existingAnswer,
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

function toQuestionDetail(context: QuestionContext, now: Date): QuestionDetail {
  const { question, choices, existingAnswer } = context;
  const hasAnswer = Boolean(existingAnswer);
  const isClosed = question.closesAt.getTime() <= now.getTime();
  const isScheduled = question.scheduledFor.getTime() > now.getTime();
  const canSeeSolution =
    context.currentUserRole === 'creator' || hasAnswer || isClosed;
  const canAnswer = !isScheduled && !hasAnswer;
  const resourceChoices = choices.map((choice) =>
    toChoiceResource(choice, canSeeSolution),
  );
  const result = existingAnswer
    ? toAnswerResult(existingAnswer, choices, resourceChoices)
    : null;

  return {
    ...question,
    currentUserRole: context.currentUserRole,
    explanation: canSeeSolution ? question.explanation : null,
    canAnswer,
    canSeeSolution,
    isClosed,
    isScheduled,
    choices: resourceChoices,
    result,
  };
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
  };
}
