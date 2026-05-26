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
  // Map each lifecycle state to a pill variant. Semantics:
  //   live      → primary  (the open, committing state)
  //   scheduled → warn     (waiting / not-yet — same family as a
  //                         time-sensitive heads-up)
  //   draft     → neutral  (work-in-progress, no urgency)
  //   closed    → soft     (settled / archival)
  //   deleted   → neutral
  const variant: Record<string, string> = {
    live: 'q-pill-primary',
    scheduled: 'q-pill-warn',
    draft: 'q-pill-neutral',
    closed: 'q-pill-soft',
    deleted: 'q-pill-neutral',
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
      className={`q-pill ${variant[state] ?? 'q-pill-neutral'} shrink-0`}
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
