'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountSuspendedError } from '@/services/admin';
import { getSession } from '@/services/auth';
import {
  CommunityConflictError,
  CommunityNotFoundError,
  CommunityPermissionError,
  CommunityValidationError,
  archiveCommunity,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  updateCommunity,
  validateCreateCommunityInput,
  validateUpdateCommunityInput,
} from '@/services/communities';

export type CommunityFormState = {
  ok: false;
  formError?: string;
  fieldErrors?: Partial<
    Record<
      'name' | 'description' | 'emoji' | 'cadence' | 'categoryId' | 'coverImageUrl',
      string
    >
  >;
};

export async function createCommunityAction(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  let slug = '';
  try {
    const input = validateCreateCommunityInput({
      name: formData.get('name'),
      description: formData.get('description'),
      emoji: formData.get('emoji'),
      cadence: formData.get('cadence'),
      categoryId: formData.get('categoryId'),
      coverImageUrl: formData.get('coverImageUrl'),
    });
    const community = await createCommunity({
      creatorUserId: session.sub,
      input,
    });
    slug = community.slug;
  } catch (err) {
    if (err instanceof CommunityValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    if (err instanceof CommunityConflictError) {
      return { ok: false, fieldErrors: { name: err.message } };
    }
    if (err instanceof AccountSuspendedError) {
      return { ok: false, formError: err.message };
    }
    throw err;
  }

  revalidatePath('/communities');
  redirect(`/communities/${slug}`);
}

export async function updateCommunityAction(
  slug: string,
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    const input = validateUpdateCommunityInput({
      name: formData.get('name'),
      description: formData.get('description'),
      emoji: formData.get('emoji'),
      cadence: formData.get('cadence'),
      categoryId: formData.get('categoryId'),
      coverImageUrl: formData.get('coverImageUrl'),
    });
    await updateCommunity({
      slug,
      userId: session.sub,
      platformRole: session.role,
      input,
    });
  } catch (err) {
    if (err instanceof CommunityValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    if (err instanceof CommunityPermissionError) {
      return { ok: false, formError: err.message };
    }
    if (err instanceof CommunityNotFoundError) {
      return { ok: false, formError: 'Community not found.' };
    }
    if (err instanceof AccountSuspendedError) {
      return { ok: false, formError: err.message };
    }
    throw err;
  }

  revalidatePath('/communities');
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/edit`);
  revalidatePath(`/communities/${slug}/about`);
  redirect(`/communities/${slug}`);
}

export async function archiveCommunityAction(slug: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    await archiveCommunity({
      slug,
      userId: session.sub,
      platformRole: session.role,
    });
  } catch (err) {
    if (err instanceof CommunityPermissionError) {
      throw err;
    }
    if (err instanceof CommunityNotFoundError) {
      // already gone — fall through to redirect
    } else if (err instanceof AccountSuspendedError) {
      throw err;
    } else {
      throw err;
    }
  }

  revalidatePath('/communities');
  redirect('/communities');
}

export async function joinCommunityAction(slug: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  await joinCommunity({ slug, userId: session.sub });
  revalidatePath('/communities');
  revalidatePath(`/communities/${slug}`);
  redirect(`/communities/${slug}`);
}

export async function leaveCommunityAction(slug: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  await leaveCommunity({ slug, userId: session.sub });
  revalidatePath('/communities');
  revalidatePath(`/communities/${slug}`);
  redirect(`/communities/${slug}`);
}
