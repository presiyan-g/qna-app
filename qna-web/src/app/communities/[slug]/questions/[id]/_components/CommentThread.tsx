import Link from 'next/link';
import { getSession } from '@/services/auth';
import {
  CommentCursorError,
  CommentPermissionError,
  listQuestionComments,
  type CommentPage,
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
  cursor = null,
}: {
  slug: string;
  question: QuestionDetail;
  userId: string;
  cursor?: string | null;
}) {
  const session = await getSession();
  const platformRole = session?.role ?? 'member';
  const isAdmin = platformRole === 'admin';
  const isCreator = question.currentUserRole === 'creator';
  const canRead =
    isAdmin || isCreator || Boolean(question.result) || question.isClosed;
  const canPost = isCreator || Boolean(question.result);

  if (!canRead) {
    return (
      <section className="rounded-[14px] border border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Discussion
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          Locked until you answer
        </h2>
        {/* Dashed-border callout matches the design's locked-state
            pattern: the surface itself reads as "wait, this opens
            once you act" rather than a permanent empty state. */}
        <div className="mt-4 rounded-[10px] border border-dashed border-line bg-paper px-5 py-6 text-center">
          <p className="text-sm leading-relaxed text-muted">
            Comments open the moment you submit your answer.{' '}
            <span className="serif-italic">No spoilers, no lurkers.</span>
          </p>
        </div>
      </section>
    );
  }

  let page: CommentPage = {
    items: [],
    pagination: { limit: 0, nextCursor: null },
  };
  try {
    page = await listQuestionComments({
      slug,
      questionId: question.id,
      userId,
      platformRole,
      cursor,
    });
  } catch (err) {
    if (err instanceof CommentPermissionError) {
      return (
        <section className="rounded-lg border border-line bg-card p-5">
          <p className="text-sm font-semibold text-muted">{err.message}</p>
        </section>
      );
    }
    if (err instanceof CommentCursorError) {
      return (
        <section className="rounded-lg border border-line bg-card p-5">
          <p className="text-sm font-semibold text-muted">
            That comment page link is invalid.{' '}
            <Link
              href={`/communities/${slug}/questions/${question.id}`}
              className="font-bold text-primary hover:underline"
            >
              Start over
            </Link>
            .
          </p>
        </section>
      );
    }
    throw err;
  }
  const comments = page.items;

  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Discussion
            </p>
            {/* The "Unlocked" pill is a calm signal that the user
                earned access by submitting an answer — distinct from
                a permission/eligibility nudge. */}
            {canPost && (
              <span className="q-pill q-pill-soft" aria-label="Unlocked">
                Unlocked
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-bold">Question thread</h2>
        </div>
        {!canPost && !isAdmin && (
          <p className="max-w-[280px] text-sm leading-6 text-muted sm:text-right">
            You can read this closed discussion. Submit an answer to post.
          </p>
        )}
        {isAdmin && !canPost && (
          <p className="max-w-[280px] text-sm leading-6 text-muted sm:text-right">
            Admin view — read-only.
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

      {page.pagination.nextCursor && (
        <div className="mt-6 flex justify-center">
          <Link
            href={`/communities/${slug}/questions/${question.id}?cursor=${encodeURIComponent(page.pagination.nextCursor)}`}
            className="q-btn q-btn-ghost q-btn-md"
          >
            Older comments
          </Link>
        </div>
      )}
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
