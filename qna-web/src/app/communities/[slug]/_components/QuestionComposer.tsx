'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  createQuestionAction,
  type QuestionFormState,
} from '@/app/actions/questions';

const INITIAL: QuestionFormState = { ok: false };

export function QuestionComposer({
  slug,
}: {
  slug: string;
}) {
  const action = createQuestionAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {state.ok && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Question scheduled.
        </div>
      )}
      {state.formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </div>
      )}

      <FieldError error={state.fieldErrors?.prompt}>
        <label htmlFor="question-prompt" className="text-[13px] font-semibold">
          Question
        </label>
        <textarea
          id="question-prompt"
          name="prompt"
          rows={4}
          aria-invalid={state.fieldErrors?.prompt ? 'true' : undefined}
          className="resize-none rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="What should members answer?"
        />
      </FieldError>

      <FieldError error={state.fieldErrors?.explanation}>
        <label
          htmlFor="question-explanation"
          className="text-[13px] font-semibold"
        >
          Explanation
        </label>
        <textarea
          id="question-explanation"
          name="explanation"
          rows={4}
          aria-invalid={state.fieldErrors?.explanation ? 'true' : undefined}
          className="resize-none rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Why is the correct answer correct?"
        />
      </FieldError>

      <FieldError error={state.fieldErrors?.scheduledFor}>
        <label
          htmlFor="question-scheduled-for"
          className="text-[13px] font-semibold"
        >
          Publish time (GMT)
        </label>
        <input
          id="question-scheduled-for"
          name="scheduledFor"
          type="datetime-local"
          aria-invalid={state.fieldErrors?.scheduledFor ? 'true' : undefined}
          className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </FieldError>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[13px] font-semibold">Choices</label>
          <span className="text-[12px] font-medium text-muted">
            Select the correct answer
          </span>
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="grid grid-cols-[36px_1fr] gap-2">
            <label className="flex h-11 items-center justify-center rounded-lg border border-line bg-paper">
              <input
                type="radio"
                name="correctChoice"
                value={index}
                defaultChecked={index === 0}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <input
              name="choiceLabel"
              type="text"
              placeholder={`Choice ${index + 1}`}
              className="min-w-0 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ))}
        {state.fieldErrors?.choices && (
          <p className="text-[12px] text-red-700">
            {state.fieldErrors.choices}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? 'Scheduling...' : 'Schedule question'}
      </button>
    </form>
  );
}


function FieldError({
  children,
  error,
}: {
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {children}
      {error && <p className="text-[12px] text-red-700">{error}</p>}
    </div>
  );
}
