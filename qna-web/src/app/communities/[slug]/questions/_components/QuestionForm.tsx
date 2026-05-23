'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createQuestionDraftAction,
  createScheduledQuestionAction,
  publishQuestionNowAction,
  updateQuestionAction,
  type DashboardQuestionFormState,
} from '@/app/actions/questions';
import { ImageUploader } from '@/app/_components/ImageUploader';

export type QuestionFormChoice = {
  label: string;
  imageUrl: string | null;
  isCorrect: boolean | null;
};

export type QuestionFormValues = {
  id: string;
  prompt: string;
  explanation: string | null;
  imageUrl: string | null;
  scheduledFor: string | null;
  choices: QuestionFormChoice[];
};

const INITIAL: DashboardQuestionFormState = { ok: false };

export function QuestionForm({
  slug,
  communityId,
  question,
  onSaved,
}: {
  slug: string;
  communityId: string;
  question?: QuestionFormValues;
  onSaved?: () => void;
}) {
  return question ? (
    <EditQuestionForm slug={slug} communityId={communityId} question={question} onSaved={onSaved} />
  ) : (
    <CreateQuestionForm slug={slug} communityId={communityId} />
  );
}

function CreateQuestionForm({ slug, communityId }: { slug: string; communityId: string }) {
  const draftAction = createQuestionDraftAction.bind(null, slug);
  const scheduledAction = createScheduledQuestionAction.bind(null, slug);
  const publishNowAction = publishQuestionNowAction.bind(null, slug);
  const [draftState, draftFormAction, draftPending] = useActionState(
    draftAction,
    INITIAL,
  );
  const [scheduledState, scheduledFormAction, scheduledPending] =
    useActionState(scheduledAction, INITIAL);
  const [publishNowState, publishNowFormAction, publishNowPending] =
    useActionState(publishNowAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const state = pickActiveState(scheduledState, publishNowState, draftState);
  const pending = draftPending || scheduledPending || publishNowPending;

  useEffect(() => {
    if (draftState.ok || scheduledState.ok || publishNowState.ok) {
      formRef.current?.reset();
    }
  }, [draftState.ok, scheduledState.ok, publishNowState.ok]);

  return (
    <QuestionFields
      ref={formRef}
      state={state}
      communityId={communityId}
      choices={emptyChoices()}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="submit"
            formAction={draftFormAction}
            disabled={pending}
            className="rounded-full border border-primary/25 bg-paper px-5 py-3 text-sm font-bold text-ink transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary disabled:opacity-60"
          >
            {draftPending ? 'Saving...' : 'Save draft'}
          </button>
          <button
            type="submit"
            formAction={scheduledFormAction}
            disabled={pending}
            className="rounded-full border border-primary bg-primary-soft px-5 py-3 text-sm font-bold text-primary transition-colors hover:brightness-95 disabled:opacity-60"
          >
            {scheduledPending ? 'Scheduling...' : 'Schedule for later'}
          </button>
          <button
            type="submit"
            formAction={publishNowFormAction}
            disabled={pending}
            className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-paper transition-colors hover:brightness-110 disabled:opacity-60"
          >
            {publishNowPending ? 'Publishing...' : 'Publish now'}
          </button>
        </div>
      }
    />
  );
}

function pickActiveState(
  ...states: DashboardQuestionFormState[]
): DashboardQuestionFormState {
  for (const state of states) {
    if (state.ok || state.formError || state.fieldErrors) return state;
  }
  return states[states.length - 1] ?? INITIAL;
}

function EditQuestionForm({
  slug,
  communityId,
  question,
  onSaved,
}: {
  slug: string;
  communityId: string;
  question: QuestionFormValues;
  onSaved?: () => void;
}) {
  const action = updateQuestionAction.bind(null, slug, question.id);
  const [state, formAction, pending] = useActionState(action, INITIAL);

  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [onSaved, state.ok]);

  return (
    <QuestionFields
      state={state}
      action={formAction}
      communityId={communityId}
      prompt={question.prompt}
      explanation={question.explanation ?? ''}
      imageUrl={question.imageUrl ?? ''}
      scheduledFor={question.scheduledFor}
      choices={question.choices}
      footer={
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-paper disabled:opacity-60"
        >
          {pending ? 'Saving...' : 'Save changes'}
        </button>
      }
    />
  );
}

const QuestionFields = function QuestionFields({
  action,
  state,
  communityId,
  prompt = '',
  explanation = '',
  imageUrl = '',
  scheduledFor,
  choices,
  footer,
  ref,
}: {
  action?: (payload: FormData) => void;
  state: DashboardQuestionFormState;
  communityId: string;
  prompt?: string;
  explanation?: string;
  imageUrl?: string;
  scheduledFor?: string | null;
  choices: QuestionFormChoice[];
  footer: ReactNode;
  ref?: React.Ref<HTMLFormElement>;
}) {
  const [choiceRows, setChoiceRows] = useState(() => normalizeChoices(choices));
  const correctIndex = useMemo(
    () => Math.max(0, choiceRows.findIndex((choice) => choice.isCorrect)),
    [choiceRows],
  );

  return (
    <form ref={ref} action={action} className="flex flex-col gap-5">
      {state.ok && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Saved.
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
          defaultValue={prompt}
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
          defaultValue={explanation}
          aria-invalid={state.fieldErrors?.explanation ? 'true' : undefined}
          className="resize-none rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Why is the correct answer correct?"
        />
      </FieldError>

      <ImageUploader
        name="imageUrl"
        scope="question-prompt"
        communityId={communityId}
        label="Question image (optional)"
        initialUrl={imageUrl || null}
        helpText="JPEG, PNG, or WebP up to 5 MB."
      />

      <FieldError error={state.fieldErrors?.scheduledFor}>
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="question-scheduled-for"
            className="text-[13px] font-semibold"
          >
            Publish time (GMT)
          </label>
          <span className="text-[11px] font-medium text-muted">
            Only required when scheduling
          </span>
        </div>
        <input
          id="question-scheduled-for"
          name="scheduledFor"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(scheduledFor)}
          aria-invalid={state.fieldErrors?.scheduledFor ? 'true' : undefined}
          className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </FieldError>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[13px] font-semibold">Choices</label>
          <button
            type="button"
            disabled={choiceRows.length >= 6}
            onClick={() =>
              setChoiceRows((rows) => [
                ...rows,
                { label: '', imageUrl: null, isCorrect: false },
              ])
            }
            className="text-[12px] font-bold text-primary disabled:text-muted"
          >
            Add choice
          </button>
        </div>
        {choiceRows.map((choice, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-3">
            <div className="grid grid-cols-[36px_1fr_auto] gap-2">
              <label className="flex h-11 items-center justify-center rounded-lg border border-line bg-card">
                <input
                  type="radio"
                  name="correctChoice"
                  value={index}
                  defaultChecked={index === correctIndex}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              <input
                name="choiceLabel"
                type="text"
                defaultValue={choice.label}
                placeholder={`Choice ${index + 1}`}
                className="min-w-0 rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                disabled={choiceRows.length <= 2}
                onClick={() =>
                  setChoiceRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
                }
                className="rounded-lg border border-line px-3 text-sm font-bold text-muted disabled:opacity-40"
              >
                Remove
              </button>
            </div>
            <ImageUploader
              name="choiceImageUrl"
              scope="question-choice"
              communityId={communityId}
              label={`Choice ${index + 1} image (optional)`}
              initialUrl={choice.imageUrl ?? null}
            />
          </div>
        ))}
        {state.fieldErrors?.choices && (
          <p className="text-[12px] text-red-700">
            {state.fieldErrors.choices}
          </p>
        )}
      </div>

      {footer}
    </form>
  );
};

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

function emptyChoices(): QuestionFormChoice[] {
  return [
    { label: '', imageUrl: null, isCorrect: true },
    { label: '', imageUrl: null, isCorrect: false },
    { label: '', imageUrl: null, isCorrect: false },
    { label: '', imageUrl: null, isCorrect: false },
  ];
}

function normalizeChoices(choices: QuestionFormChoice[]): QuestionFormChoice[] {
  return choices.length >= 2 ? choices : emptyChoices();
}

function toDatetimeLocalValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 16);
}
