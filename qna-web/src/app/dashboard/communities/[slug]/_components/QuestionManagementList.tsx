'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState, useTransition } from 'react';
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

type TabKey = 'drafts' | 'scheduled' | 'published';

const INITIAL: DashboardQuestionFormState = { ok: false };

const TABS: Array<{ key: TabKey; label: string; empty: string }> = [
  { key: 'drafts', label: 'Drafts', empty: 'No drafts yet.' },
  { key: 'scheduled', label: 'Scheduled', empty: 'No upcoming questions.' },
  { key: 'published', label: 'Published', empty: 'No published questions yet.' },
];

export function QuestionManagementList({
  slug,
  questions,
}: {
  slug: string;
  questions: SerializedManagedQuestion[];
}) {
  const grouped = useMemo(() => groupQuestions(questions), [questions]);
  const initialTab: TabKey =
    grouped.drafts.length > 0
      ? 'drafts'
      : grouped.scheduled.length > 0
        ? 'scheduled'
        : 'published';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const activeQuestions = grouped[activeTab];
  const activeMeta = TABS.find((tab) => tab.key === activeTab)!;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Question lifecycle"
        className="flex flex-wrap gap-1 rounded-full border border-primary/15 bg-card p-1"
      >
        {TABS.map((tab) => {
          const count = grouped[tab.key].length;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={
                isActive
                  ? 'inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper shadow-sm transition-colors'
                  : 'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-primary-soft hover:text-primary'
              }
            >
              <span>{tab.label}</span>
              <span
                className={
                  isActive
                    ? 'rounded-full bg-paper/20 px-2 py-0.5 text-[11px] font-bold text-paper'
                    : 'rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary'
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4">
        {activeQuestions.length > 0 ? (
          activeQuestions.map((question) => (
            <QuestionCard key={question.id} slug={slug} question={question} />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-card px-6 py-10 text-center text-sm text-muted">
            {activeMeta.empty}
          </div>
        )}
      </div>
    </div>
  );
}

function groupQuestions(questions: SerializedManagedQuestion[]) {
  return {
    drafts: questions.filter((question) => question.state === 'draft'),
    scheduled: questions.filter((question) => question.state === 'scheduled'),
    published: questions.filter(
      (question) => question.state === 'live' || question.state === 'closed',
    ),
  };
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
