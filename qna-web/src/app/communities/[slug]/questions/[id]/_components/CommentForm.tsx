'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteCommentAction,
  postCommentAction,
  type CommentFormState,
} from '@/app/actions/comments';

const INITIAL_STATE: CommentFormState = { ok: false };

export type SerializedQuestionComment = {
  id: string;
  questionId: string;
  parentCommentId: string | null;
  author: {
    id: string;
    username: string;
  } | null;
  body: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
  replies: SerializedQuestionComment[];
};

export function CommentForm({
  slug,
  questionId,
  parentCommentId = null,
  onPosted,
}: {
  slug: string;
  questionId: string;
  parentCommentId?: string | null;
  onPosted?: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    postCommentAction.bind(null, slug, questionId, parentCommentId),
    INITIAL_STATE,
  );

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    onPosted?.();
    router.refresh();
  }, [onPosted, router, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      <textarea
        name="body"
        maxLength={2000}
        disabled={pending}
        rows={parentCommentId ? 3 : 4}
        placeholder={parentCommentId ? 'Write a reply...' : 'Add to the discussion...'}
        className="min-h-24 w-full resize-y rounded-lg border border-line bg-paper px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-65"
      />

      {state.fieldErrors?.body && (
        <p className="text-sm font-semibold text-red-700">
          {state.fieldErrors.body}
        </p>
      )}
      {state.fieldErrors?.parentCommentId && (
        <p className="text-sm font-semibold text-red-700">
          {state.fieldErrors.parentCommentId}
        </p>
      )}
      {state.formError && (
        <p className="text-sm font-semibold text-red-700">{state.formError}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-paper transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {pending ? 'Posting...' : parentCommentId ? 'Post reply' : 'Post comment'}
        </button>
      </div>
    </form>
  );
}

export function CommentList({
  slug,
  questionId,
  comments,
  canPost,
}: {
  slug: string;
  questionId: string;
  comments: SerializedQuestionComment[];
  canPost: boolean;
}) {
  if (comments.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-line bg-paper p-4 text-sm leading-6 text-muted">
        No comments yet.
      </p>
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          slug={slug}
          questionId={questionId}
          comment={comment}
          canPost={canPost}
          isReply={false}
        />
      ))}
    </div>
  );
}

function CommentItem({
  slug,
  questionId,
  comment,
  canPost,
  isReply,
}: {
  slug: string;
  questionId: string;
  comment: SerializedQuestionComment;
  canPost: boolean;
  isReply: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const isDeleted = Boolean(comment.deletedAt);

  return (
    <article
      className={
        isReply
          ? 'border-l border-line pl-4'
          : 'rounded-lg border border-line bg-paper p-4'
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {isDeleted || !comment.author ? (
            <p className="text-sm font-bold text-ink">[deleted]</p>
          ) : (
            <Link
              href={`/users/${comment.author.username}`}
              className="text-sm font-bold text-ink hover:text-primary hover:underline"
            >
              {comment.author.username}
            </Link>
          )}
          <p className="text-[12px] text-muted">{formatTimestamp(comment.createdAt)}</p>
        </div>
        {comment.canDelete && (
          <DeleteCommentButton
            slug={slug}
            questionId={questionId}
            commentId={comment.id}
          />
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">
        {isDeleted ? '[deleted]' : comment.body}
      </p>

      {!isReply && canPost && !isDeleted && (
        <button
          type="button"
          onClick={() => setReplying((value) => !value)}
          className="mt-3 text-sm font-bold text-primary hover:underline"
        >
          {replying ? 'Cancel reply' : 'Reply'}
        </button>
      )}

      {replying && (
        <div className="mt-4">
          <CommentForm
            slug={slug}
            questionId={questionId}
            parentCommentId={comment.id}
            onPosted={() => setReplying(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-4 grid gap-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              slug={slug}
              questionId={questionId}
              comment={reply}
              canPost={canPost}
              isReply
            />
          ))}
        </div>
      )}
    </article>
  );
}

function DeleteCommentButton({
  slug,
  questionId,
  commentId,
}: {
  slug: string;
  questionId: string;
  commentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="text-left sm:text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await deleteCommentAction(slug, questionId, commentId);
              router.refresh();
            } catch {
              setError('Could not delete comment.');
            }
          })
        }
        className="text-sm font-bold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-65"
      >
        {pending ? 'Deleting...' : 'Delete'}
      </button>
      {error && <p className="mt-1 text-[12px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
