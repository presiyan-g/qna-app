import type { PlatformRole } from '@/services/admin';
import type { CommunityRole } from '@/services/communities';
import { canSoftDeleteQuestionComment } from './policy';

export type CommentThreadRow = {
  id: string;
  questionId: string;
  parentCommentId: string | null;
  authorUserId: string;
  authorUsername: string;
  body: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuestionComment = {
  id: string;
  questionId: string;
  parentCommentId: string | null;
  author: {
    id: string;
    username: string;
  } | null;
  body: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  canDelete: boolean;
  replies: QuestionComment[];
};

type Viewer = {
  userId: string;
  communityRole: CommunityRole | null;
  platformRole: PlatformRole;
};

export function buildCommentThread(
  rows: CommentThreadRow[],
  viewer: Viewer,
): QuestionComment[] {
  const comments = rows.map((row) => toCommentResource(row, viewer));
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const topLevel: QuestionComment[] = [];

  for (const comment of comments) {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId)?.replies.push(comment);
    } else {
      topLevel.push(comment);
    }
  }

  for (const comment of topLevel) {
    comment.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return topLevel.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function toCommentResource(
  row: CommentThreadRow,
  viewer: Viewer,
): QuestionComment {
  const isDeleted = Boolean(row.deletedAt);

  return {
    id: row.id,
    questionId: row.questionId,
    parentCommentId: row.parentCommentId,
    author: isDeleted
      ? null
      : {
          id: row.authorUserId,
          username: row.authorUsername,
        },
    body: isDeleted ? null : row.body,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canDelete:
      !isDeleted &&
      canSoftDeleteQuestionComment({
        authorUserId: row.authorUserId,
        userId: viewer.userId,
        communityRole: viewer.communityRole,
        platformRole: viewer.platformRole,
      }),
    replies: [],
  };
}
