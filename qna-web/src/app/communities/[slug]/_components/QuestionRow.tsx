import Link from 'next/link';
import type { CommunityRole } from '@/services/communities';
import { getQuestionLifecycleState, type CommunityQuestion } from '@/services/questions';

export type QuestionRowQuestion = Pick<
  CommunityQuestion,
  'id' | 'prompt' | 'scheduledFor' | 'closesAt' | 'publishedAt' | 'deletedAt'
>;

export function QuestionRow({
  slug,
  question,
  viewerRole,
  isAdmin = false,
}: {
  slug: string;
  question: QuestionRowQuestion;
  viewerRole: CommunityRole | null;
  isAdmin?: boolean;
}) {
  const state = getQuestionLifecycleState(question);
  const href = getRowHref({ slug, questionId: question.id, state, viewerRole, isAdmin });
  const dateLine = question.scheduledFor ?? question.publishedAt;

  return (
    <Link
      href={href}
      className="grid grid-cols-[64px_1fr_auto] items-center gap-4 rounded-lg border border-line bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="text-xs font-semibold text-muted">
        {dateLine ? formatDateBlock(dateLine) : '—'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink">
          {question.prompt}
        </p>
      </div>
      <StateBadge state={state} />
    </Link>
  );
}

function StateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    live: 'bg-primary text-paper',
    scheduled: 'bg-amber-100 text-amber-900',
    draft: 'bg-stone-200 text-stone-700',
    closed: 'bg-primary-soft text-primary',
    deleted: 'bg-stone-200 text-stone-500',
  };
  const labels: Record<string, string> = {
    live: '● Live',
    scheduled: 'Scheduled',
    draft: 'Draft',
    closed: 'Closed',
    deleted: 'Deleted',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
        styles[state] ?? 'bg-stone-200 text-stone-700'
      }`}
    >
      {labels[state] ?? state}
    </span>
  );
}

function getRowHref({
  slug,
  questionId,
  state,
  viewerRole,
  isAdmin,
}: {
  slug: string;
  questionId: string;
  state: string;
  viewerRole: CommunityRole | null;
  isAdmin: boolean;
}): string {
  const canEditUnpublished = viewerRole === 'creator' || isAdmin;
  if (canEditUnpublished && (state === 'draft' || state === 'scheduled')) {
    return `/communities/${slug}/questions/${questionId}/edit`;
  }
  return `/communities/${slug}/questions/${questionId}`;
}

function formatDateBlock(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
