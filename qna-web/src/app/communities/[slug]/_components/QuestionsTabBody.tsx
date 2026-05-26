import Link from 'next/link';
import { EmptyState } from '@/app/_components/EmptyState';
import { getQuestionLifecycleState, type CommunityQuestion } from '@/services/questions';
import type { CommunityRole } from '@/services/communities';
import { QuestionRow } from './QuestionRow';

export function QuestionsTabBody({
  slug,
  questions,
  viewerRole,
  isAdmin = false,
}: {
  slug: string;
  questions: CommunityQuestion[];
  viewerRole: CommunityRole | null;
  isAdmin?: boolean;
}) {
  const sorted = [...questions].sort(sortByMostRecentFirst);
  const liveQuestion = sorted.find((q) => getQuestionLifecycleState(q) === 'live');
  const otherQuestions = sorted.filter((q) => q.id !== liveQuestion?.id);

  return (
    <div className="flex flex-col gap-5">
      {viewerRole === 'creator' && (
        <div className="flex items-center justify-between rounded-lg bg-primary-soft px-4 py-3">
          <p className="text-sm font-semibold text-primary">
            You&apos;re the creator — drafts and scheduling live here.
          </p>
          <Link
            href={`/communities/${slug}/questions/new`}
            className="q-btn q-btn-primary q-btn-md"
          >
            + New question
          </Link>
        </div>
      )}

      {liveQuestion && <LiveQuestionHero slug={slug} question={liveQuestion} />}

      {otherQuestions.length === 0 && !liveQuestion ? (
        <EmptyState
          title="No questions"
          titleAccent="yet."
          description={
            viewerRole === 'creator'
              ? "Draft your first one — it'll show up here the moment it's scheduled."
              : 'Check back when the next question opens.'
          }
        />
      ) : (
        <ul className="grid gap-3">
          {otherQuestions.map((question) => (
            <li key={question.id}>
              <QuestionRow
                slug={slug}
                question={question}
                viewerRole={viewerRole}
                isAdmin={isAdmin}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveQuestionHero({
  slug,
  question,
}: {
  slug: string;
  question: CommunityQuestion;
}) {
  const closesAt = question.closesAt;
  return (
    <Link
      href={`/communities/${slug}/questions/${question.id}`}
      className="q-today-card q-anim-in group block rounded-[18px] border border-line bg-card p-5 hover:border-primary hover:shadow-[0_18px_40px_-22px_rgba(31,64,50,0.28)] md:p-7"
    >
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Today&apos;s question
        </p>
        {closesAt ? (
          <span className="q-pill q-pill-soft">
            <span aria-hidden className="q-pulse-dot" />
            Closes {formatClosesAt(closesAt)}
          </span>
        ) : null}
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
          {question.points} points
        </span>
      </div>

      <h2 className="mt-5 text-[22px] font-bold leading-[1.25] tracking-[-0.01em] text-balance md:text-[26px]">
        {question.prompt}
      </h2>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted">
          <span className="serif-italic">It takes 30 seconds.</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-[18px] py-2.5 text-sm font-semibold text-paper transition-[background-color,box-shadow,transform,gap] duration-200 ease-out group-hover:bg-primary-hover group-hover:gap-2.5 group-hover:shadow-[0_6px_16px_-8px_rgba(31,64,50,0.4)]">
          Answer today&apos;s question
          <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

function sortByMostRecentFirst(a: CommunityQuestion, b: CommunityQuestion): number {
  const aTime = (a.scheduledFor ?? a.publishedAt ?? a.createdAt).getTime();
  const bTime = (b.scheduledFor ?? b.publishedAt ?? b.createdAt).getTime();
  return bTime - aTime;
}

function formatClosesAt(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'soon';
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `in ${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `in ${diffDay}d`;
}
