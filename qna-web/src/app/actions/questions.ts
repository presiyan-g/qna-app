'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import {
  createQuestion,
  QuestionPermissionError,
  QuestionsValidationError,
  validateCreateQuestionInput,
} from '@/services/questions';

export type QuestionFormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Partial<
    Record<'prompt' | 'explanation' | 'scheduledFor' | 'choices', string>
  >;
};

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
    if (err instanceof QuestionPermissionError) {
      return { ok: false, formError: err.message };
    }
    throw err;
  }

  revalidatePath(`/communities/${slug}`);
  return { ok: true };
}

function toChoiceInputs(formData: FormData) {
  const correctChoice = formData.get('correctChoice');
  return formData.getAll('choiceLabel').map((label, index) => ({
    label,
    isCorrect: correctChoice === String(index),
  }));
}
