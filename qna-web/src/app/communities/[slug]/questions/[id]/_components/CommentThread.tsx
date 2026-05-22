import {
  CommentPermissionError,
  listQuestionComments,
  type QuestionComment,
} from '@/services/comments';
import type { QuestionDetail } from '@/services/answers';
import {
  CommentForm,
  CommentList,
  type SerializedQuestionComment,
} from './CommentForm';

export async function CommentThread({
  slug,
  question,
  userId,
}: {
  slug: string;
  question: QuestionDetail;
  userId: string;
}) {
  const isCreator = question.currentUserRole === 'creator';
  const canRead = isCreator || Boolean(question.result) || question.isClosed;
  const canPost = isCreator || Boolean(question.result);

  if (!canRead) {
    return (
      <section className="rounded-lg border border-dashed border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Discussion
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          Answer to unlock the discussion
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The comment thread opens after you submit an answer.
        </p>
      </section>
    );
  }

  let comments: QuestionComment[] = [];
  try {
    comments = await listQuestionComments({
      slug,
      questionId: question.id,
      userId,
    });
  } catch (err) {
    if (err instanceof CommentPermissionError) {
      return (
        <section className="rounded-lg border border-line bg-card p-5">
          <p className="text-sm font-semibold text-muted">{err.message}</p>
        </section>
      );
    }
    throw err;
  }

  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Discussion
          </p>
          <h2 className="mt-2 text-2xl font-bold">Question thread</h2>
        </div>
        {!canPost && (
          <p className="max-w-[280px] text-sm leading-6 text-muted sm:text-right">
            You can read this closed discussion. Submit an answer to post.
          </p>
        )}
      </div>

      {canPost && (
        <div className="mt-5">
          <CommentForm slug={slug} questionId={question.id} />
        </div>
      )}

      <CommentList
        slug={slug}
        questionId={question.id}
        comments={comments.map(serializeComment)}
        canPost={canPost}
      />
    </section>
  );
}

function serializeComment(comment: QuestionComment): SerializedQuestionComment {
  return {
    ...comment,
    deletedAt: comment.deletedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: comment.replies.map(serializeComment),
  };
}
