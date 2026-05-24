'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountSuspendedError } from '@/services/admin';
import { getSession } from '@/services/auth';
import {
  createQuestion,
  createQuestionDraft,
  QuestionImmutableError,
  QuestionNotFoundError,
  QuestionPermissionError,
  QuestionsValidationError,
  scheduleQuestion,
  softDeleteUnpublishedQuestion,
  updateUnpublishedQuestion,
  validateCreateQuestionInput,
  validateDraftQuestionInput,
  validateScheduleQuestionInput,
} from '@/services/questions';

export type QuestionFormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<
    Record<
      'prompt' | 'explanation' | 'scheduledFor' | 'closesAt' | 'choices' | 'imageUrl',
      string
    >
  >;
};

export type DashboardQuestionFormState = QuestionFormState;

export async function createQuestionAction(
  slug: string,
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    const input = validateCreateQuestionInput({
      prompt: formData.get('prompt'),
      explanation: formData.get('explanation'),
      scheduledFor: formData.get('scheduledFor'),
      closesAt: formData.get('closesAt'),
      choices: toChoiceInputs(formData),
    });

    await createQuestion({
      slug,
      creatorUserId: session.sub,
      input,
    });
  } catch (err) {
    if (err instanceof QuestionsValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    if (
      err instanceof QuestionPermissionError ||
      err instanceof AccountSuspendedError
    ) {
      return { ok: false, formError: err.message };
    }
    throw err;
  }

  revalidatePath(`/communities/${slug}`);
  return { ok: true };
}

export async function createQuestionDraftAction(
  slug: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/communities/${slug}`);

  try {
    const input = validateDraftQuestionInput({
      prompt: formData.get('prompt'),
      explanation: formData.get('explanation'),
      imageUrl: formData.get('imageUrl'),
      choices: toChoiceInputs(formData),
    });

    await createQuestionDraft({
      slug,
      creatorUserId: session.sub,
      input,
    });
  } catch (err) {
    return toDashboardQuestionFormError(err);
  }

  revalidateCommunityQuestionPaths(slug);
  return { ok: true };
}

export async function createScheduledQuestionAction(
  slug: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/communities/${slug}`);

  try {
    const input = validateCreateQuestionInput({
      prompt: formData.get('prompt'),
      explanation: formData.get('explanation'),
      imageUrl: formData.get('imageUrl'),
      scheduledFor: formData.get('scheduledFor'),
      closesAt: formData.get('closesAt'),
      choices: toChoiceInputs(formData),
    });

    await createQuestion({
      slug,
      creatorUserId: session.sub,
      input,
    });
  } catch (err) {
    return toDashboardQuestionFormError(err);
  }

  revalidateCommunityQuestionPaths(slug);
  return { ok: true };
}

export async function publishQuestionNowAction(
  slug: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/communities/${slug}`);

  try {
    const input = validateCreateQuestionInput({
      prompt: formData.get('prompt'),
      explanation: formData.get('explanation'),
      imageUrl: formData.get('imageUrl'),
      scheduledFor: new Date().toISOString(),
      closesAt: formData.get('closesAt'),
      choices: toChoiceInputs(formData),
    });

    await createQuestion({
      slug,
      creatorUserId: session.sub,
      input,
    });
  } catch (err) {
    return toDashboardQuestionFormError(err);
  }

  revalidateCommunityQuestionPaths(slug);
  return { ok: true };
}

export async function updateQuestionAction(
  slug: string,
  questionId: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/communities/${slug}`);

  try {
    const input = validateDraftQuestionInput({
      prompt: formData.get('prompt'),
      explanation: formData.get('explanation'),
      imageUrl: formData.get('imageUrl'),
      choices: toChoiceInputs(formData),
    });

    await updateUnpublishedQuestion({
      slug,
      questionId,
      creatorUserId: session.sub,
      input,
    });
  } catch (err) {
    return toDashboardQuestionFormError(err);
  }

  revalidateCommunityQuestionPaths(slug);
  return { ok: true };
}

export async function scheduleQuestionAction(
  slug: string,
  questionId: string,
  _prev: DashboardQuestionFormState,
  formData: FormData,
): Promise<DashboardQuestionFormState> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/communities/${slug}`);

  try {
    const input = validateScheduleQuestionInput({
      scheduledFor: formData.get('scheduledFor'),
      closesAt: formData.get('closesAt'),
    });

    await scheduleQuestion({
      slug,
      questionId,
      creatorUserId: session.sub,
      input,
    });
  } catch (err) {
    return toDashboardQuestionFormError(err);
  }

  revalidateCommunityQuestionPaths(slug);
  return { ok: true };
}

export async function deleteQuestionAction(
  slug: string,
  questionId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/communities/${slug}`);

  await softDeleteUnpublishedQuestion({
    slug,
    questionId,
    creatorUserId: session.sub,
  });

  revalidateCommunityQuestionPaths(slug);
}

function toChoiceInputs(formData: FormData) {
  const imageUrls = formData.getAll('choiceImageUrl');
  const correctChoice = formData.get('correctChoice');
  return formData.getAll('choiceLabel').map((label, index) => ({
    label,
    imageUrl: imageUrls[index] ?? null,
    isCorrect: correctChoice === String(index),
  }));
}

function toDashboardQuestionFormError(
  err: unknown,
): DashboardQuestionFormState {
  if (err instanceof QuestionsValidationError) {
    return { ok: false, fieldErrors: err.fieldErrors };
  }
  if (
    err instanceof QuestionPermissionError ||
    err instanceof QuestionImmutableError ||
    err instanceof QuestionNotFoundError ||
    err instanceof AccountSuspendedError
  ) {
    return { ok: false, formError: err.message };
  }
  throw err;
}

function revalidateCommunityQuestionPaths(slug: string): void {
  revalidatePath('/dashboard');
  revalidatePath(`/communities/${slug}`);
}
