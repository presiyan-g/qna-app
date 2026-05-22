'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountSuspendedError } from '@/services/admin';
import { getSession } from '@/services/auth';
import {
  CommunityConflictError,
  CommunityValidationError,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  validateCreateCommunityInput,
} from '@/services/communities';

export type CommunityFormState = {
  ok: false;
  formError?: string;
  fieldErrors?: Partial<
    Record<
      'name' | 'description' | 'emoji' | 'cadence' | 'categoryId',
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
