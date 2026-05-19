import 'server-only';
import { asc, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  questionChoices,
  questions,
  type Question,
  type QuestionChoice,
} from '@/db/schema/questions';
import { getCommunityBySlug } from '@/services/communities';
import { QuestionPermissionError } from './errors';
import type { CreateQuestionInput } from './validation';

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
}: ListCommunityQuestionsOptions): Promise<CommunityQuestion[]> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) return [];

  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const safeOffset = Math.max(offset, 0);
  const canSeeCorrectAnswers = community.currentUserRole === 'creator';

  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.communityId, community.id))
    .orderBy(desc(questions.scheduledFor))
    .limit(safeLimit)
    .offset(safeOffset);

  return withChoices(rows, canSeeCorrectAnswers);
}

export async function createQuestion({
  slug,
  creatorUserId,
  input,
}: {
  slug: string;
  creatorUserId: string;
  input: CreateQuestionInput;
}): Promise<CommunityQuestion> {
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

  const [question] = await withChoices([created], true);
  return question;
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
