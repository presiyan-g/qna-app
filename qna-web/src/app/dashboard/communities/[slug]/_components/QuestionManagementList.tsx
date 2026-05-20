'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import {
  deleteQuestionAction,
  scheduleQuestionAction,
  type DashboardQuestionFormState,
} from '@/app/actions/questions';
import {
  QuestionManagementForm,
  type QuestionFormValues,
} from './QuestionManagementForm';

export type SerializedManagedQuestion = QuestionFormValues & {
  state: 'draft' | 'scheduled' | 'live' | 'closed' | 'deleted';
  closesAt: string | null;
  points: number;
};

const INITIAL: DashboardQuestionFormState = { ok: false };

export function QuestionManagementList({
  slug,
  questions,
}: {
  slug: string;
  questions: SerializedManagedQuestion[];
}) {
  const drafts = questions.filter((question) => question.state === 'draft');
  const scheduled = questions.filter((question) => question.state === 'scheduled');
  const published = questions.filter(
    (question) => question.state === 'live' || question.state === 'closed',
  );

  return (
    <div className="grid gap-6">
      <QuestionGroup title="Drafts" empty="No drafts yet">
        {drafts.map((question) => (
          <QuestionCard key={question.id} slug={slug} question={question} />
        ))}
      </QuestionGroup>
      <QuestionGroup title="Scheduled" empty="No upcoming questions">
        {scheduled.map((question) => (
          <QuestionCard key={question.id} slug={slug} question={question} />
        ))}
      </QuestionGroup>
      <QuestionGroup title="Published / history" empty="No published questions">
        {published.map((question) => (
          <QuestionCard key={question.id} slug={slug} question={question} />
        ))}
      </QuestionGroup>
    </div>
  );
}

function QuestionGroup({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <section>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-4 grid gap-4">
        {children.length > 0 ? (
          children
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-card p-5 text-sm text-muted">
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

function QuestionCard({
  slug,
  question,
}: {
  slug: string;
  question: SerializedManagedQuestion;
}) {
  const [editing, setEditing] = useState(false);
  const canManage = question.state === 'draft' || question.state === 'scheduled';

  return (
    <article className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-[12px] font-semibold text-primary">
            {formatState(question.state)}
          </span>
          <h3 className="mt-3 text-xl font-bold leading-snug">
            {question.prompt}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {question.scheduledFor
              ? `Publishes ${formatGmtDate(question.scheduledFor)}`
              : 'No publish time set'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="text-sm font-bold text-primary hover:underline"
            >
              {editing ? 'Cancel edit' : 'Edit'}
            </button>
          )}
          {canManage && <DeleteQuestionButton slug={slug} questionId={question.id} />}
          {!canManage && (
            <Link
              href={`/communities/${slug}/questions/${question.id}`}
              className="text-sm font-bold text-primary hover:underline"
            >
              View public question
            </Link>
          )}
        </div>
      </div>

      {editing && canManage ? (
        <div className="mt-5 rounded-lg border border-line bg-paper p-4">
          <QuestionManagementForm
            slug={slug}
            question={question}
            onSaved={() => setEditing(false)}
          />
        </div>
      ) : (
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {question.choices.map((choice, index) => (
            <li
              key={`${question.id}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[12px] font-bold text-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">{choice.label}</span>
              {choice.isCorrect === true && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                  Correct
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {canManage && <ScheduleQuestionForm slug={slug} question={question} />}
    </article>
  );
}

function ScheduleQuestionForm({
  slug,
  question,
}: {
  slug: string;
  question: SerializedManagedQuestion;
}) {
  const action = scheduleQuestionAction.bind(null, slug, question.id);
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-2 sm:flex-row">
      <input
        name="scheduledFor"
        type="datetime-local"
        defaultValue={toDatetimeLocalValue(question.scheduledFor)}
        aria-invalid={state.fieldErrors?.scheduledFor ? 'true' : undefined}
        className="min-w-0 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-paper disabled:opacity-60"
      >
        {pending ? 'Saving...' : question.state === 'draft' ? 'Schedule' : 'Reschedule'}
      </button>
      {state.fieldErrors?.scheduledFor && (
        <p className="text-[12px] text-red-700">
          {state.fieldErrors.scheduledFor}
        </p>
      )}
      {state.formError && (
        <p className="text-[12px] text-red-700">{state.formError}</p>
      )}
    </form>
  );
}

function DeleteQuestionButton({
  slug,
  questionId,
}: {
  slug: string;
  questionId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await deleteQuestionAction(slug, questionId);
            } catch {
              setError('Could not delete question.');
            }
          })
        }
        className="text-sm font-bold text-red-700 hover:underline disabled:opacity-60"
      >
        {pending ? 'Deleting...' : 'Delete'}
      </button>
      {error && <p className="mt-1 text-[12px] text-red-700">{error}</p>}
    </div>
  );
}

function formatState(value: SerializedManagedQuestion['state']): string {
  if (value === 'draft') return 'Draft';
  if (value === 'scheduled') return 'Scheduled';
  if (value === 'live') return 'Live';
  return 'Closed';
}

function formatGmtDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function toDatetimeLocalValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 16);
}
