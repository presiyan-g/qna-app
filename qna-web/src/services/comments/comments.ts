import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { answers } from '@/db/schema/answers';
import { comments } from '@/db/schema/comments';
import { communities, communityMembers } from '@/db/schema/communities';
import { questions } from '@/db/schema/questions';
import { users } from '@/db/schema/users';
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
  question: typeof questions.$inferSelect;
  communityRole: CommunityRole | null;
  hasAnswered: boolean;
  isClosed: boolean;
};

export async function listQuestionComments({
  slug,
  questionId,
  userId,
  now = new Date(),
}: {
  slug: string;
  questionId: string;
  userId: string;
  now?: Date;
}): Promise<QuestionComment[]> {
  const context = await loadCommentQuestionContext({
    slug,
    questionId,
    userId,
    now,
  });

  const communityRole = context.communityRole;
  if (
    !communityRole ||
    !canListQuestionComments({
      communityRole,
      hasAnswered: context.hasAnswered,
      isClosed: context.isClosed,
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
      communityRole,
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
    },
  )[0];
}

export async function softDeleteComment({
  commentId,
  userId,
  slug,
  questionId,
  now = new Date(),
}: {
  commentId: string;
  userId: string;
  slug?: string;
  questionId?: string;
  now?: Date;
}): Promise<void> {
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
  if (!row.communityRole) throw new CommentPermissionError();

  if (
    !canSoftDeleteQuestionComment({
      authorUserId: row.comment.authorUserId,
      userId,
      communityRole: row.communityRole,
    })
  ) {
    throw new CommentPermissionError(
      'Only the comment author or community creator can delete comments.',
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
    .where(and(eq(questions.id, questionId), eq(questions.communityId, community.id)))
    .limit(1);
  if (!question) throw new CommentNotFoundError();

  const [answer] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(and(eq(answers.questionId, question.id), eq(answers.userId, userId)))
    .limit(1);

  return {
    question,
    communityRole: community.currentUserRole,
    hasAnswered: Boolean(answer),
    isClosed: question.closesAt.getTime() <= now.getTime(),
  };
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
