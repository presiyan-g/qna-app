import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
} from 'drizzle-orm';
import { db } from '@/db/client';
import {
  questionChoices,
  questions,
  type Question,
  type QuestionChoice,
} from '@/db/schema/questions';
import { AccountSuspendedError, assertUserCanMutate } from '@/services/admin';
import { findUserStatusById } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { QuestionNotFoundError, QuestionPermissionError } from './errors';
import { assertCanManageQuestion } from './management-policy';
import type {
  CreateQuestionInput,
  DraftQuestionInput,
  ScheduleQuestionInput,
} from './validation';

export type SafeQuestionChoice = Pick<
  QuestionChoice,
  'id' | 'label' | 'imageUrl' | 'position'
> & {
  isCorrect: boolean | null;
};

export type CommunityQuestion = Omit<Question, 'explanation'> & {
  explanation: string | null;
  choices: SafeQuestionChoice[];
  choiceCount: number;
};

export type ScheduledCommunityQuestion = CommunityQuestion & {
  scheduledFor: Date;
  closesAt: Date;
};

type ListCommunityQuestionsOptions = {
  slug: string;
  userId?: string | null;
  limit?: number;
  offset?: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function listCommunityQuestions({
  slug,
  userId = null,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: ListCommunityQuestionsOptions): Promise<ScheduledCommunityQuestion[]> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) return [];

  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const safeOffset = Math.max(offset, 0);
  const canSeeCorrectAnswers = community.currentUserRole === 'creator';

  const rows = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.communityId, community.id),
        isNull(questions.deletedAt),
        isNotNull(questions.scheduledFor),
        isNotNull(questions.closesAt),
      ),
    )
    .orderBy(desc(questions.scheduledFor))
    .limit(safeLimit)
    .offset(safeOffset);

  const scheduledRows = rows.map(toScheduledQuestion);
  return withChoices(scheduledRows, canSeeCorrectAnswers) as Promise<
    ScheduledCommunityQuestion[]
  >;
}

export async function createQuestion({
  slug,
  creatorUserId,
  input,
}: {
  slug: string;
  creatorUserId: string;
  input: CreateQuestionInput;
}): Promise<ScheduledCommunityQuestion> {
  await assertAccountCanMutate(creatorUserId);

  const community = await getCommunityBySlug(slug, creatorUserId);
  if (!community || community.currentUserRole !== 'creator') {
    throw new QuestionPermissionError();
  }

  const [created] = await db
    .insert(questions)
    .values({
      communityId: community.id,
      creatorUserId,
      prompt: input.prompt,
      explanation: input.explanation,
      imageUrl: input.imageUrl,
      scheduledFor: input.scheduledFor,
      closesAt: input.closesAt,
      timeZone: input.timeZone,
      points: input.points,
      publishedAt: input.scheduledFor,
    })
    .returning();

  try {
    await db.insert(questionChoices).values(
      input.choices.map((choice) => ({
        questionId: created.id,
        label: choice.label,
        imageUrl: choice.imageUrl,
        isCorrect: choice.isCorrect,
        position: choice.position,
      })),
    );
  } catch (err) {
    await db.delete(questions).where(eq(questions.id, created.id));
    throw err;
  }

  const [question] = await withChoices([toScheduledQuestion(created)], true);
  return question as ScheduledCommunityQuestion;
}

export async function listDashboardQuestions({
  communityId,
}: {
  communityId: string;
  now?: Date;
}): Promise<CommunityQuestion[]> {
  const rows = await db
    .select()
    .from(questions)
    .where(and(eq(questions.communityId, communityId), isNull(questions.deletedAt)))
    .orderBy(desc(questions.scheduledFor), desc(questions.createdAt))
    .limit(MAX_LIMIT);

  return withChoices(rows, true);
}

export async function createQuestionDraft({
  slug,
  creatorUserId,
  input,
}: {
  slug: string;
  creatorUserId: string;
  input: DraftQuestionInput;
}): Promise<CommunityQuestion> {
  await assertAccountCanMutate(creatorUserId);

  const community = await getCommunityBySlug(slug, creatorUserId);
  if (!community || community.currentUserRole !== 'creator') {
    throw new QuestionPermissionError();
  }

  const [created] = await db
    .insert(questions)
    .values({
      communityId: community.id,
      creatorUserId,
      prompt: input.prompt,
      explanation: input.explanation,
      imageUrl: input.imageUrl,
      scheduledFor: null,
      publishedAt: null,
      closesAt: null,
      timeZone: input.timeZone,
      points: input.points,
    })
    .returning();

  try {
    await insertQuestionChoices(created.id, input.choices);
  } catch (err) {
    await db.delete(questions).where(eq(questions.id, created.id));
    throw err;
  }

  const [question] = await withChoices([created], true);
  return question;
}

export async function updateUnpublishedQuestion({
  slug,
  questionId,
  creatorUserId,
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  creatorUserId: string;
  input: DraftQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion> {
  await assertAccountCanMutate(creatorUserId);

  const { question } = await loadQuestionForManagement({
    slug,
    questionId,
    creatorUserId,
  });
  assertCanManageQuestion(question, now);

  const [updated] = await db
    .update(questions)
    .set({
      prompt: input.prompt,
      explanation: input.explanation,
      imageUrl: input.imageUrl,
      points: input.points,
      updatedAt: now,
    })
    .where(eq(questions.id, question.id))
    .returning();

  await db.delete(questionChoices).where(eq(questionChoices.questionId, question.id));
  await insertQuestionChoices(question.id, input.choices);

  const [resource] = await withChoices([updated], true);
  return resource;
}

export async function scheduleQuestion({
  slug,
  questionId,
  creatorUserId,
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  creatorUserId: string;
  input: ScheduleQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion> {
  await assertAccountCanMutate(creatorUserId);

  const { question } = await loadQuestionForManagement({
    slug,
    questionId,
    creatorUserId,
  });
  assertCanManageQuestion(question, now);

  const [updated] = await db
    .update(questions)
    .set({
      scheduledFor: input.scheduledFor,
      publishedAt: input.publishedAt,
      closesAt: input.closesAt,
      timeZone: input.timeZone,
      updatedAt: now,
    })
    .where(eq(questions.id, question.id))
    .returning();

  const [resource] = await withChoices([updated], true);
  return resource;
}

export async function softDeleteUnpublishedQuestion({
  slug,
  questionId,
  creatorUserId,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  creatorUserId: string;
  now?: Date;
}): Promise<void> {
  await assertAccountCanMutate(creatorUserId);

  const { question } = await loadQuestionForManagement({
    slug,
    questionId,
    creatorUserId,
  });
  assertCanManageQuestion(question, now);

  await db
    .update(questions)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(questions.id, question.id));
}

async function withChoices(
  rows: Question[],
  canSeeCorrectAnswers: boolean,
): Promise<CommunityQuestion[]> {
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return [];

  const choiceRows = await db
    .select()
    .from(questionChoices)
    .where(inArray(questionChoices.questionId, ids))
    .orderBy(asc(questionChoices.position));

  const choicesByQuestion = new Map<string, SafeQuestionChoice[]>();
  for (const choice of choiceRows) {
    const existing = choicesByQuestion.get(choice.questionId) ?? [];
    existing.push({
      id: choice.id,
      label: choice.label,
      imageUrl: choice.imageUrl,
      position: choice.position,
      isCorrect: canSeeCorrectAnswers ? choice.isCorrect : null,
    });
    choicesByQuestion.set(choice.questionId, existing);
  }

  const countRows = await db
    .select({
      questionId: questionChoices.questionId,
      value: count(),
    })
    .from(questionChoices)
    .where(inArray(questionChoices.questionId, ids))
    .groupBy(questionChoices.questionId);
  const counts = new Map(
    countRows.map((row) => [row.questionId, Number(row.value)]),
  );

  return rows.map((row) => ({
    ...row,
    explanation: canSeeCorrectAnswers ? row.explanation : null,
    choices: choicesByQuestion.get(row.id) ?? [],
    choiceCount: counts.get(row.id) ?? 0,
  }));
}

async function loadQuestionForManagement({
  slug,
  questionId,
  creatorUserId,
}: {
  slug: string;
  questionId: string;
  creatorUserId: string;
}): Promise<{ question: Question }> {
  const community = await getCommunityBySlug(slug, creatorUserId);
  if (!community || community.currentUserRole !== 'creator') {
    throw new QuestionPermissionError();
  }

  const [question] = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.communityId, community.id),
        isNull(questions.deletedAt),
      ),
    )
    .limit(1);
  if (!question) throw new QuestionNotFoundError();

  return { question };
}

async function insertQuestionChoices(
  questionId: string,
  choices: DraftQuestionInput['choices'],
): Promise<void> {
  await db.insert(questionChoices).values(
    choices.map((choice) => ({
      questionId,
      label: choice.label,
      imageUrl: choice.imageUrl,
      isCorrect: choice.isCorrect,
      position: choice.position,
    })),
  );
}

function toScheduledQuestion(question: Question): Question & {
  scheduledFor: Date;
  closesAt: Date;
} {
  if (!question.scheduledFor || !question.closesAt || question.deletedAt) {
    throw new QuestionNotFoundError();
  }
  return question as Question & { scheduledFor: Date; closesAt: Date };
}

async function assertAccountCanMutate(userId: string): Promise<void> {
  const status = await findUserStatusById(userId);
  if (!status) throw new AccountSuspendedError('User account is unavailable.');
  assertUserCanMutate({ status });
}
