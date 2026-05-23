import Link from 'next/link';
import { getQuestionLifecycleState, type CommunityQuestion } from '@/services/questions';
import type { CommunityRole } from '@/services/communities';
import { QuestionRow } from './QuestionRow';

export function QuestionsTabBody({
  slug,
  questions,
  viewerRole,
}: {
  slug: string;
  questions: CommunityQuestion[];
  viewerRole: CommunityRole | null;
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
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper hover:brightness-95"
          >
            + New question
          </Link>
        </div>
      )}

      {liveQuestion && <LiveQuestionHero slug={slug} question={liveQuestion} />}

      {otherQuestions.length === 0 && !liveQuestion ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-sm text-muted">
          No questions yet.
        </div>
      ) : (
        <ul className="grid gap-3">
          {otherQuestions.map((question) => (
            <li key={question.id}>
              <QuestionRow slug={slug} question={question} viewerRole={viewerRole} />
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
      className="block rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/50 to-card p-6 transition-shadow hover:shadow-md"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        ● Open now {closesAt && `· Closes ${formatClosesAt(closesAt)}`}
      </p>
      <h2 className="mt-2 text-2xl font-bold leading-tight md:text-[28px]">
        {question.prompt}
      </h2>
      <p className="mt-2 text-sm text-muted">{question.points} points</p>
      <span className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper">
        Answer now →
      </span>
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
