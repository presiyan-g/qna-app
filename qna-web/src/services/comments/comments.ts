import 'server-only';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { comments } from '@/db/schema/comments';
import { communities, communityMembers } from '@/db/schema/communities';
import { questions } from '@/db/schema/questions';
import { users } from '@/db/schema/users';
import {
  AccountSuspendedError,
  assertUserCanMutate,
  type PlatformRole,
} from '@/services/admin';
import { findUserStatusById } from '@/services/auth';
import { getCommunityBySlug, type CommunityRole } from '@/services/communities';
import {
  CommentNotFoundError,
  CommentPermissionError,
  CommentValidationError,
} from './errors';
import {
  canListQuestionComments,
  canPostQuestionComment,
  canSoftDeleteQuestionComment,
} from './policy';
import {
  buildCommentThread,
  type CommentThreadRow,
  type QuestionComment,
} from './thread';
import { validateCommentBody } from './validation';

type CommentQuestionContext = {
  question: CommentableQuestion;
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
  isClosed: boolean;
};

type CommentableQuestion = typeof questions.$inferSelect & {
  closesAt: Date;
};

export async function listQuestionComments({
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
}): Promise<QuestionComment[]> {
  const context = await loadCommentQuestionContext({
    slug,
    questionId,
    userId,
    now,
  });

  if (
    !canListQuestionComments({
      communityRole: context.communityRole,
      hasAnswered: context.hasAnswered,
      isClosed: context.isClosed,
      platformRole,
    })
  ) {
    throw new CommentPermissionError();
  }

  const rows = await db
    .select({
      comment: comments,
      authorUsername: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorUserId, users.id))
    .where(eq(comments.questionId, context.question.id))
    .orderBy(desc(comments.createdAt));

  return buildCommentThread(
    rows.map(toCommentThreadRow),
    {
      userId,
      communityRole: context.communityRole,
      platformRole,
    },
  );
}

export async function postComment({
  slug,
  questionId,
  userId,
  body,
  parentCommentId,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  body: unknown;
  parentCommentId?: unknown;
  now?: Date;
}): Promise<QuestionComment> {
  await assertAccountCanMutate(userId);

  const context = await loadCommentQuestionContext({
    slug,
    questionId,
    userId,
    now,
  });

  const communityRole = context.communityRole;
  if (
    !communityRole ||
    !canPostQuestionComment({
      communityRole,
      hasAnswered: context.hasAnswered,
    })
  ) {
    throw new CommentPermissionError(
      'Answer this question before joining the discussion.',
    );
  }

  const trimmedBody = validateCommentBody(body);
  const parentId = await validateParentCommentId(
    parentCommentId,
    context.question.id,
  );

  const [created] = await db
    .insert(comments)
    .values({
      questionId: context.question.id,
      authorUserId: userId,
      parentCommentId: parentId,
      body: trimmedBody,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [author] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!author) throw new CommentNotFoundError();

  return buildCommentThread(
    [
      {
        ...created,
        authorUsername: author.username,
      },
    ],
    {
      userId,
      communityRole,
      platformRole: 'member',
    },
  )[0];
}

export async function softDeleteComment({
  commentId,
  userId,
  platformRole = 'member',
  slug,
  questionId,
  now = new Date(),
}: {
  commentId: string;
  userId: string;
  platformRole?: PlatformRole;
  slug?: string;
  questionId?: string;
  now?: Date;
}): Promise<void> {
  await assertAccountCanMutate(userId);

  const where = and(
    eq(comments.id, commentId),
    questionId ? eq(questions.id, questionId) : undefined,
    slug ? eq(communities.slug, slug) : undefined,
    slug ? eq(communities.status, 'active') : undefined,
  );

  const [row] = await db
    .select({
      comment: comments,
      communityRole: communityMembers.role,
    })
    .from(comments)
    .innerJoin(questions, eq(comments.questionId, questions.id))
    .innerJoin(communities, eq(questions.communityId, communities.id))
    .leftJoin(
      communityMembers,
      and(
        eq(communityMembers.communityId, questions.communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .where(where)
    .limit(1);

  if (!row) throw new CommentNotFoundError();

  if (
    !canSoftDeleteQuestionComment({
      authorUserId: row.comment.authorUserId,
      userId,
      communityRole: row.communityRole,
      platformRole,
    })
  ) {
    throw new CommentPermissionError(
      'Only the comment author, community creator, or platform admin can delete comments.',
    );
  }

  if (row.comment.deletedAt) return;

  await db
    .update(comments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(comments.id, commentId));
}

async function loadCommentQuestionContext({
  slug,
  questionId,
  userId,
  now,
}: {
  slug: string;
  questionId: string;
  userId: string;
  now: Date;
}): Promise<CommentQuestionContext> {
  const community = await getCommunityBySlug(slug, userId);
  if (!community) throw new CommentNotFoundError();

  const [question] = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.communityId, community.id),
        isNull(questions.deletedAt),
        isNotNull(questions.closesAt),
      ),
    )
    .limit(1);
  if (!question) throw new CommentNotFoundError();
  const commentableQuestion = toCommentableQuestion(question);

  const [answer] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(
      and(eq(answers.questionId, commentableQuestion.id), eq(answers.userId, userId)),
    )
    .limit(1);

  return {
    question: commentableQuestion,
    communityRole: community.currentUserRole,
    hasAnswered: Boolean(answer),
    isClosed: commentableQuestion.closesAt.getTime() <= now.getTime(),
  };
}

function toCommentableQuestion(
  question: typeof questions.$inferSelect,
): CommentableQuestion {
  if (!question.closesAt || question.deletedAt) {
    throw new CommentNotFoundError();
  }
  return question as CommentableQuestion;
}

async function validateParentCommentId(
  parentCommentId: unknown,
  questionId: string,
): Promise<string | null> {
  if (parentCommentId == null || parentCommentId === '') return null;

  if (typeof parentCommentId !== 'string') {
    throw new CommentValidationError({
      parentCommentId: 'Choose a valid top-level comment to reply to.',
    });
  }

  const [parent] = await db
    .select({
      id: comments.id,
      parentCommentId: comments.parentCommentId,
    })
    .from(comments)
    .where(and(eq(comments.id, parentCommentId), eq(comments.questionId, questionId)))
    .limit(1);

  if (!parent || parent.parentCommentId) {
    throw new CommentValidationError({
      parentCommentId: 'Choose a valid top-level comment to reply to.',
    });
  }

  return parent.id;
}

function toCommentThreadRow(row: {
  comment: typeof comments.$inferSelect;
  authorUsername: string;
}): CommentThreadRow {
  return {
    ...row.comment,
    authorUsername: row.authorUsername,
  };
}

async function assertAccountCanMutate(userId: string): Promise<void> {
  const status = await findUserStatusById(userId);
  if (!status) throw new AccountSuspendedError('User account is unavailable.');
  assertUserCanMutate({ status });
}
