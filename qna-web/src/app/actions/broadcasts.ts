'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountSuspendedError } from '@/services/admin';
import { getSession } from '@/services/auth';
import {
  BroadcastNotFoundError,
  BroadcastPermissionError,
  BroadcastValidationError,
  createBroadcastPost,
  softDeleteBroadcastPost,
  updateBroadcastPost,
} from '@/services/broadcasts';

export type BroadcastFormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<'body' | 'imageUrl', string>>;
};

export async function createBroadcastAction(
  slug: string,
  _prev: BroadcastFormState,
  formData: FormData,
): Promise<BroadcastFormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    await createBroadcastPost({
      slug,
      userId: session.sub,
      body: formData.get('body'),
      imageUrl: formData.get('imageUrl'),
    });
  } catch (err) {
    return toBroadcastFormError(err);
  }

  revalidateBroadcastPaths(slug);
  return { ok: true };
}

export async function updateBroadcastAction(
  slug: string,
  postId: string,
  _prev: BroadcastFormState,
  formData: FormData,
): Promise<BroadcastFormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    await updateBroadcastPost({
      slug,
      postId,
      userId: session.sub,
      body: formData.get('body'),
      imageUrl: formData.get('imageUrl'),
    });
  } catch (err) {
    return toBroadcastFormError(err);
  }

  revalidateBroadcastPaths(slug, postId);
  return { ok: true };
}

export async function deleteBroadcastAction(
  slug: string,
  postId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  await softDeleteBroadcastPost({
    slug,
    postId,
    userId: session.sub,
    platformRole: session.role,
  });

  revalidateBroadcastPaths(slug, postId);
}

function toBroadcastFormError(err: unknown): BroadcastFormState {
  if (err instanceof BroadcastValidationError) {
    return { ok: false, fieldErrors: err.fieldErrors };
  }
  if (
    err instanceof BroadcastPermissionError ||
    err instanceof BroadcastNotFoundError ||
    err instanceof AccountSuspendedError
  ) {
    return { ok: false, formError: err.message };
  }
  throw err;
}

function revalidateBroadcastPaths(slug: string, postId?: string) {
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/broadcasts`);
  if (postId) revalidatePath(`/communities/${slug}/broadcasts/${postId}`);
}
