'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountSuspendedError } from '@/services/admin';
import {
  CommentNotFoundError,
  CommentPermissionError,
  CommentValidationError,
  postComment,
  softDeleteComment,
} from '@/services/comments';
import { getSession } from '@/services/auth';

export type CommentFormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<'body' | 'parentCommentId', string>>;
};

export async function postCommentAction(
  slug: string,
  questionId: string,
  parentCommentId: string | null,
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    await postComment({
      slug,
      questionId,
      userId: session.sub,
      body: formData.get('body'),
      parentCommentId,
    });
  } catch (err) {
    if (err instanceof CommentValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    if (
      err instanceof CommentPermissionError ||
      err instanceof CommentNotFoundError ||
      err instanceof AccountSuspendedError
    ) {
      return { ok: false, formError: err.message };
    }
    throw err;
  }

  revalidatePath(`/communities/${slug}/questions/${questionId}`);
  return { ok: true };
}

export async function deleteCommentAction(
  slug: string,
  questionId: string,
  commentId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  await softDeleteComment({
    slug,
    questionId,
    commentId,
    userId: session.sub,
    platformRole: session.role,
  });

  revalidatePath(`/communities/${slug}/questions/${questionId}`);
}
