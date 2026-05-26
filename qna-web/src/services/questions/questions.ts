import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
} from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import {
  questionChoices,
  questions,
  type Question,
  type QuestionChoice,
} from '@/db/schema/questions';
import {
  AccountSuspendedError,
  assertUserCanMutate,
  type PlatformRole,
} from '@/services/admin';
import { findUserStatusById } from '@/services/auth';
import {
  getCommunityBySlug,
  listMyCommunities,
  type CommunityWithMembership,
} from '@/services/communities';
import { computeQuestionClosesAt, type CommunityCadence } from './closing';
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

export type ViewerAnswerSummary = {
  selectedChoiceId: string;
  isCorrect: boolean;
};

export type CommunityQuestion = Omit<Question, 'explanation'> & {
  explanation: string | null;
  choices: SafeQuestionChoice[];
  choiceCount: number;
};

export type ScheduledCommunityQuestion = CommunityQuestion & {
  scheduledFor: Date;
  closesAt: Date;
  viewerAnswer: ViewerAnswerSummary | null;
  revealedCorrectChoiceId: string | null;
};

type ListCommunityQuestionsOptions = {
  slug: string;
  userId?: string | null;
  limit?: number;
  offset?: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type ListCommunityQuestionsResult = {
  items: ScheduledCommunityQuestion[];
  totalCount: number;
};

export type LiveQuestionItem = {
  community: CommunityWithMembership;
  question: ScheduledCommunityQuestion;
};

export async function listCommunityQuestions({
  slug,
  userId = null,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: ListCommunityQuestionsOptions): Promise<ListCommunityQuestionsResult> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) return { items: [], totalCount: 0 };

  return listCommunityQuestionsForCommunity({
    community,
    viewerUserId: userId,
    limit,
    offset,
  });
}

export async function listCommunityQuestionsForCommunity({
  community,
  viewerUserId = null,
  limit = DEFAULT_LIMIT,
  offset = 0,
}: {
  community: Pick<CommunityWithMembership, 'id' | 'currentUserRole'>;
  viewerUserId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ListCommunityQuestionsResult> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const safeOffset = Math.max(offset, 0);
  const canSeeCorrectAnswers = community.currentUserRole === 'creator';

  const whereClause = and(
    eq(questions.communityId, community.id),
    isNull(questions.deletedAt),
    isNotNull(questions.scheduledFor),
    isNotNull(questions.closesAt),
  );

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(questions)
      .where(whereClause)
      .orderBy(desc(questions.scheduledFor))
      .limit(safeLimit)
      .offset(safeOffset),
    db.select({ value: count() }).from(questions).where(whereClause),
  ]);

  const totalCount = Number(countResult[0]?.value ?? 0);

  const scheduledRows = rows.map(toScheduledQuestion);
  const withChoiceRows = await withChoices(scheduledRows, canSeeCorrectAnswers);

  const baseQuestions: ScheduledCommunityQuestion[] = withChoiceRows.map(
    (q, i) => ({
      ...q,
      scheduledFor: scheduledRows[i].scheduledFor,
      closesAt: scheduledRows[i].closesAt,
      viewerAnswer: null,
      revealedCorrectChoiceId: null,
    }),
  );

  const questionIds = baseQuestions.map((q) => q.id);
  const [correctMap, answerMap] = await Promise.all([
    fetchCorrectChoiceMap(questionIds),
    fetchViewerAnswerMap(questionIds, viewerUserId),
  ]);

  const now = Date.now();
  const isMember =
    community.currentUserRole === 'member' ||
    community.currentUserRole === 'creator';
  const isCreator = community.currentUserRole === 'creator';

  const items = baseQuestions.map((q) => {
    const viewerAnswer = answerMap.get(q.id) ?? null;
    const closedNow = q.closesAt.getTime() <= now;
    const isRevealed =
      isCreator || viewerAnswer !== null || (closedNow && isMember);
    const revealedCorrectChoiceId = isRevealed
      ? (correctMap.get(q.id) ?? null)
      : null;
    return { ...q, viewerAnswer, revealedCorrectChoiceId };
  });

  return { items, totalCount };
}

export async function listLiveQuestionsForUser({
  userId,
  limit = DEFAULT_LIMIT,
}: {
  userId: string;
  limit?: number;
}): Promise<LiveQuestionItem[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const communities = await listMyCommunities({
    userId,
    limit: MAX_LIMIT,
    offset: 0,
  });
  const communityIds = communities
    .filter((community) => community.unansweredQuestionCount > 0)
    .map((community) => community.id);
  if (communityIds.length === 0) return [];

  const rows = await db
    .select()
    .from(questions)
    .leftJoin(
      answers,
      and(eq(answers.questionId, questions.id), eq(answers.userId, userId)),
    )
    .where(
      and(
        inArray(questions.communityId, communityIds),
        isNull(questions.deletedAt),
        isNotNull(questions.publishedAt),
        isNotNull(questions.scheduledFor),
        isNotNull(questions.closesAt),
        lte(questions.publishedAt, new Date()),
        gt(questions.closesAt, new Date()),
        isNull(answers.id),
      ),
    )
    .orderBy(asc(questions.closesAt), desc(questions.scheduledFor))
    .limit(safeLimit);

  const liveRows = rows
    .map((row) => row.questions)
    .filter(
      (question): question is Question & { scheduledFor: Date; closesAt: Date } =>
        question.closesAt !== null &&
        question.scheduledFor !== null,
    );
  if (liveRows.length === 0) return [];

  const questionsWithChoices = await withChoices(liveRows, false);
  const communitiesById = new Map(
    communities.map((community) => [community.id, community]),
  );

  const items: LiveQuestionItem[] = [];
  for (const [index, question] of questionsWithChoices.entries()) {
    const community = communitiesById.get(question.communityId);
    if (!community) continue;
    items.push({
      community,
      question: {
        ...question,
        scheduledFor: liveRows[index].scheduledFor,
        closesAt: liveRows[index].closesAt,
        viewerAnswer: null,
        revealedCorrectChoiceId: null,
      },
    });
  }
  return items;
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

  const closesAt = computeQuestionClosesAt({
    cadence: community.cadence as CommunityCadence,
    scheduledFor: input.scheduledFor,
    requestedClosesAt: input.requestedClosesAt,
  });

  const [created] = await db
    .insert(questions)
    .values({
      communityId: community.id,
      creatorUserId,
      prompt: input.prompt,
      explanation: input.explanation,
      imageUrl: input.imageUrl,
      scheduledFor: input.scheduledFor,
      closesAt,
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

  const scheduled = toScheduledQuestion(created);
  const [question] = await withChoices([scheduled], true);
  return {
    ...question,
    scheduledFor: scheduled.scheduledFor,
    closesAt: scheduled.closesAt,
    viewerAnswer: null,
    revealedCorrectChoiceId: null,
  };
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
  userId,
  platformRole = 'member',
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: PlatformRole;
  input: DraftQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion> {
  await assertAccountCanMutate(userId);

  const { question } = await loadQuestionForManagement({
    slug,
    questionId,
    userId,
    platformRole,
  });

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
  userId,
  platformRole = 'member',
  input,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole?: PlatformRole;
  input: ScheduleQuestionInput;
  now?: Date;
}): Promise<CommunityQuestion> {
  await assertAccountCanMutate(userId);

  const { question, community } = await loadQuestionForManagement({
    slug,
    questionId,
    userId,
    platformRole,
  });
  assertCanManageQuestion(question, { platformRole, now });

  const closesAt = computeQuestionClosesAt({
    cadence: community.cadence as CommunityCadence,
    scheduledFor: input.scheduledFor,
    requestedClosesAt: input.requestedClosesAt,
  });

  const [updated] = await db
    .update(questions)
    .set({
      scheduledFor: input.scheduledFor,
      publishedAt: input.publishedAt,
      closesAt,
      timeZone: input.timeZone,
      updatedAt: now,
    })
    .where(eq(questions.id, question.id))
    .returning();

  const [resource] = await withChoices([updated], true);
  return resource;
}

export async function softDeleteQuestion({
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
}): Promise<void> {
  await assertAccountCanMutate(userId);

  const { question } = await loadQuestionForManagement({
    slug,
    questionId,
    userId,
    platformRole,
  });

  if (platformRole !== 'admin') {
    assertCanManageQuestion(question, { platformRole, now });
  }

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

  return rows.map((row) => ({
    ...row,
    explanation: canSeeCorrectAnswers ? row.explanation : null,
    choices: choicesByQuestion.get(row.id) ?? [],
    choiceCount: choicesByQuestion.get(row.id)?.length ?? 0,
  }));
}

async function fetchCorrectChoiceMap(
  questionIds: string[],
): Promise<Map<string, string>> {
  if (questionIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: questionChoices.id,
      questionId: questionChoices.questionId,
    })
    .from(questionChoices)
    .where(
      and(
        inArray(questionChoices.questionId, questionIds),
        eq(questionChoices.isCorrect, true),
      ),
    );
  return new Map(rows.map((r) => [r.questionId, r.id]));
}

async function fetchViewerAnswerMap(
  questionIds: string[],
  viewerUserId: string | null,
): Promise<Map<string, ViewerAnswerSummary>> {
  if (!viewerUserId || questionIds.length === 0) return new Map();
  const rows = await db
    .select({
      questionId: answers.questionId,
      selectedChoiceId: answers.selectedChoiceId,
      isCorrect: answers.isCorrect,
    })
    .from(answers)
    .where(
      and(
        eq(answers.userId, viewerUserId),
        inArray(answers.questionId, questionIds),
      ),
    );
  return new Map(
    rows.map((r) => [
      r.questionId,
      { selectedChoiceId: r.selectedChoiceId, isCorrect: r.isCorrect },
    ]),
  );
}

async function loadQuestionForManagement({
  slug,
  questionId,
  userId,
  platformRole,
}: {
  slug: string;
  questionId: string;
  userId: string;
  platformRole: PlatformRole;
}): Promise<{ question: Question; community: CommunityWithMembership }> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new QuestionPermissionError();
  if (community.currentUserRole !== 'creator' && platformRole !== 'admin') {
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

  return { question, community };
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
