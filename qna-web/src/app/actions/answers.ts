'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  AnswerPermissionError,
  AnswerUnavailableError,
  AnswerValidationError,
  submitQuestionAnswer,
} from '@/services/answers';
import { AccountSuspendedError } from '@/services/admin';
import { getSession } from '@/services/auth';
import { QuestionNotFoundError } from '@/services/questions';

export type AnswerFormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<'choiceId', string>>;
};

export async function submitAnswerAction(
  slug: string,
  questionId: string,
  _prev: AnswerFormState,
  formData: FormData,
): Promise<AnswerFormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    await submitQuestionAnswer({
      slug,
      questionId,
      userId: session.sub,
      choiceId: formData.get('choiceId'),
    });
  } catch (err) {
    if (err instanceof AnswerValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    if (
      err instanceof AnswerPermissionError ||
      err instanceof AnswerUnavailableError ||
      err instanceof QuestionNotFoundError ||
      err instanceof AccountSuspendedError
    ) {
      return { ok: false, formError: err.message };
    }
    throw err;
  }

  revalidatePath(`/communities/${slug}/questions/${questionId}`);
  return { ok: true };
}
