'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  submitAnswerAction,
  type AnswerFormState,
} from '@/app/actions/answers';
import type { AnswerChoiceResource } from '@/services/answers';

const INITIAL_STATE: AnswerFormState = { ok: false };

export function AnswerForm({
  slug,
  questionId,
  choices,
  isLate,
}: {
  slug: string;
  questionId: string;
  choices: AnswerChoiceResource[];
  isLate: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitAnswerAction.bind(null, slug, questionId),
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <form action={formAction} className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Your answer
          </p>
          <h2 className="mt-2 text-2xl font-bold">Choose one option</h2>
        </div>
        {isLate && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[12px] font-bold text-amber-800">
            Late answer: 0 points
          </span>
        )}
      </div>

      <fieldset className="mt-5 grid gap-3">
        {choices.map((choice) => (
          <label
            key={choice.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper p-4 text-sm transition hover:border-primary"
          >
            <input
              className="mt-1 h-4 w-4 accent-primary"
              type="radio"
              name="choiceId"
              value={choice.id}
              disabled={pending}
            />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[12px] font-bold text-muted">
              {choice.position}
            </span>
            <span className="min-w-0 flex-1 leading-6">{choice.label}</span>
          </label>
        ))}
      </fieldset>

      {state.fieldErrors?.choiceId && (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {state.fieldErrors.choiceId}
        </p>
      )}
      {state.formError && (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {state.formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-bold text-paper transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
      >
        {pending ? 'Submitting...' : 'Submit answer'}
      </button>
    </form>
  );
}
