import Link from 'next/link';
import { Check } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import {
  AnswerPermissionError,
  type AnswerChoiceResource,
  type QuestionDetail,
  getQuestionDetail,
} from '@/services/answers';
import { getSession } from '@/services/auth';
import {
  getCommunityBySlug,
  type CommunityWithMembership,
} from '@/services/communities';
import { QuestionNotFoundError } from '@/services/questions';
import { AnswerForm } from './_components/AnswerForm';
import { CommentThread } from './_components/CommentThread';
import { DeleteQuestionButton } from './_components/DeleteQuestionButton';
import { ShareCardModal } from './_components/ShareCardModal';

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams?: Promise<{ cursor?: string | string[] }>;
};

export default async function QuestionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug, id }, query, session] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ cursor?: string | string[] }>({}),
    getSession(),
  ]);
  if (!session) redirect('/login');
  const cursor = firstParam(query?.cursor) ?? null;

  let question: QuestionDetail;
  let community: CommunityWithMembership | null = null;
  try {
    // The community is fetched here (in addition to the lookup
    // already inside getQuestionDetail) so the ShareCardModal has
    // brand details — name, emoji, cadence — without bloating the
    // QuestionDetail type. Two cheap indexed reads in parallel.
    [question, community] = await Promise.all([
      getQuestionDetail({
        slug,
        questionId: id,
        userId: session.sub,
        platformRole: session.role,
      }),
      getCommunityBySlug(slug, session.sub),
    ]);
  } catch (err) {
    if (err instanceof QuestionNotFoundError) notFound();
    if (err instanceof AnswerPermissionError) {
      return <PermissionScreen slug={slug} message={err.message} />;
    }
    throw err;
  }

  const canModerate = question.viewerCanModerate;
  const isCreator = question.currentUserRole === 'creator';
  const showAnswerForm =
    question.canAnswer && question.currentUserRole !== null;

  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href={`/communities/${slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        Back to community
      </Link>

      <article className="mt-8 rounded-lg border border-line bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="q-pill q-pill-soft">
              {getQuestionState(question)}
            </span>
            {/* Question prompts vary wildly in length — from "White to
                move, find the forced mate" to multi-paragraph
                scenarios. The design's 36px assumes the short case;
                long prompts at that size become a wall of huge text
                on mobile. Scale matches UX research for readable
                long-form prompts: 20px mobile → 28px desktop, with
                leading-snug (1.375) for comfortable multi-line flow.
                text-balance evens out line breaks. */}
            <h1 className="mt-3 text-[20px] font-bold leading-snug tracking-[-0.01em] text-balance sm:text-[22px] md:text-[24px] lg:text-[28px]">
              {question.prompt}
            </h1>
          </div>
          <div className="shrink-0 text-sm text-muted sm:text-right">
            <p className="font-semibold text-ink">
              {formatGmtDate(question.scheduledFor)}
            </p>
            <p>{question.points} points</p>
          </div>
        </div>
        {canModerate && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="mr-auto text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              {isCreator ? 'Creator actions' : 'Admin actions'}
            </span>
            <Link
              href={`/communities/${slug}/questions/${id}/edit`}
              className="q-btn q-btn-lake q-btn-sm"
            >
              Edit
            </Link>
            <DeleteQuestionButton slug={slug} questionId={id} />
          </div>
        )}
        {question.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.imageUrl}
            alt=""
            className="mt-6 max-h-[420px] w-full rounded-lg border border-line object-contain"
          />
        )}
      </article>

      <div className="mt-6 grid gap-6">
        {question.result ? (
          <ResultPanel question={question} community={community} />
        ) : showAnswerForm ? (
          <AnswerForm
            slug={slug}
            questionId={question.id}
            choices={question.choices}
            isLate={question.isClosed}
          />
        ) : !canModerate ? (
          <div className="rounded-lg border border-line bg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Not open yet
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              This question opens on schedule
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Come back after {formatGmtDate(question.scheduledFor)} to
              submit your answer.
            </p>
          </div>
        ) : null}

        {!question.result && question.canSeeSolution && (
          <SolutionPanel question={question} />
        )}

        <CommentThread
          slug={slug}
          question={question}
          userId={session.sub}
          cursor={cursor}
        />
      </div>
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function PermissionScreen({
  slug,
  message,
}: {
  slug: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-card p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Members only
      </p>
      <h1 className="mt-3 text-3xl font-bold">Join to answer</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
      <Link href={`/communities/${slug}`} className="q-btn q-btn-primary mt-5">
        Go to community
      </Link>
    </div>
  );
}

function ResultPanel({
  question,
  community,
}: {
  question: QuestionDetail;
  community: CommunityWithMembership | null;
}) {
  if (!question.result) return null;
  const result = question.result;
  const totalAnswers = question.choices.reduce(
    (sum, choice) => sum + (choice.voteCount ?? 0),
    0,
  );

  return (
    <section className="flex flex-col gap-5">
      {/* Staggered fade-ups so the result settles in, then the vote
          distribution, then the explanation — feels earned rather
          than blasted at the user. */}
      <div className="q-anim-in rounded-[14px] border border-line bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            {result.isCorrect && (
              <span className="q-anim-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-paper">
                <Check size={22} strokeWidth={3} aria-hidden />
              </span>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Result
              </p>
              <h2 className="mt-1.5 text-2xl font-bold">
                {result.isCorrect ? (
                  <>
                    You got it.{' '}
                    <span className="serif-italic">Beautiful.</span>
                  </>
                ) : (
                  'Wrong answer'
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <span
              className="q-pill q-pill-primary"
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              {result.pointsAwarded} points awarded
            </span>
            {result.isCorrect && community ? (
              <ShareCardModal
                community={{
                  name: community.name,
                  emoji: community.emoji,
                  cadence: community.cadence,
                }}
                prompt={question.prompt}
                choice={result.selectedChoice}
              />
            ) : null}
          </div>
        </div>

        {result.isLate && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            This answer was submitted after the close time, so it earned 0 points.
          </p>
        )}

        {!result.isCorrect && (
          <div
            className="mt-4 rounded-[10px] border p-4"
            style={{
              background: 'var(--color-action-clay-soft)',
              borderColor: 'var(--color-action-clay-soft)',
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-action-clay-hover)' }}
            >
              You picked
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              <strong>{result.selectedChoice.position}.</strong>{' '}
              {result.selectedChoice.label}
            </p>
          </div>
        )}
      </div>

      <div className="q-anim-in-d100">
        <VoteDistribution
          question={question}
          chosenChoiceId={result.selectedChoiceId}
          totalAnswers={totalAnswers}
        />
      </div>

      <div className="q-anim-in-d200">
        <SolutionPanel question={question} />
      </div>
    </section>
  );
}

function VoteDistribution({
  question,
  chosenChoiceId,
  totalAnswers,
}: {
  question: QuestionDetail;
  chosenChoiceId: string;
  totalAnswers: number;
}) {
  return (
    <section className="rounded-[14px] border border-line bg-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Community vote
        </p>
        <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted">
          {totalAnswers} {totalAnswers === 1 ? 'answer' : 'answers'}
        </span>
      </div>
      <ol className="mt-3.5 grid list-none gap-2 p-0">
        {question.choices.map((choice) => {
          const isCorrect = choice.isCorrect === true;
          const isMine = choice.id === chosenChoiceId;
          const pct = choice.votePct ?? 0;
          const rowBg = isCorrect ? 'var(--color-primary-soft)' : 'var(--color-paper)';
          const rowBorder = isCorrect ? 'var(--color-primary)' : 'var(--color-line)';
          const barBg = isCorrect
            ? 'rgba(31,64,50,0.16)'
            : 'rgba(31,64,50,0.06)';
          // The "is-mine" highlight is an inset ring rather than a
          // border swap so it stacks cleanly on top of the
          // is-correct treatment when the viewer got it right.
          const mineRing = isMine
            ? '0 0 0 2px var(--color-accent) inset, 0 0 0 4px rgba(214,161,43,0.2)'
            : undefined;
          return (
            <li
              key={choice.id}
              className="relative grid grid-cols-[28px_1fr_56px] items-center gap-3.5 overflow-hidden rounded-[10px] border px-3.5 py-3"
              style={{
                background: rowBg,
                borderColor: rowBorder,
                boxShadow: mineRing,
              }}
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 origin-left"
                style={{
                  width: `${pct}%`,
                  background: barBg,
                  animation: 'q-bar-fill 700ms cubic-bezier(0.16,1,0.3,1) 100ms both',
                }}
              />
              <span
                className="relative z-[1] text-[13px] font-bold tabular-nums"
                style={{
                  color: isCorrect
                    ? 'var(--color-primary)'
                    : 'var(--color-muted)',
                }}
              >
                {choice.position}.
              </span>
              <span className="relative z-[1] text-sm leading-[1.5] text-ink">
                {choice.label}
                {isMine && (
                  <span
                    className="ml-2 inline-block rounded-[4px] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-[0.1em]"
                    style={{
                      background: 'var(--color-accent)',
                      color: '#2A2A28',
                    }}
                  >
                    You
                  </span>
                )}
              </span>
              <span className="relative z-[1] text-right text-[13px] font-bold tabular-nums text-ink">
                {pct}%
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SolutionPanel({
  question,
  framed = true,
}: {
  question: QuestionDetail;
  framed?: boolean;
}) {
  const correctChoice = question.choices.find((choice) => choice.isCorrect);
  const className = framed
    ? 'rounded-lg border border-line bg-card p-5'
    : 'mt-5 border-t border-line pt-5';

  return (
    <section className={className}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Explanation
      </p>
      {correctChoice && (
        <p className="mt-3 text-sm font-semibold text-ink">
          Correct answer: {correctChoice.label}
        </p>
      )}
      <p className="mt-3 text-sm leading-6 text-muted">
        {question.explanation ?? 'The explanation unlocks after you answer.'}
      </p>
    </section>
  );
}

function AnswerSummary({
  title,
  choice,
}: {
  title: string;
  choice: AnswerChoiceResource;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        {title}
      </p>
      <div className="mt-2 flex items-start gap-3">
        {choice.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={choice.imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md border border-line object-cover"
          />
        )}
        <p className="text-sm leading-6 text-ink">
          <span className="font-bold">{choice.position}.</span> {choice.label}
        </p>
      </div>
    </div>
  );
}

function getQuestionState(question: QuestionDetail): string {
  if (question.result) return 'Answered';
  if (question.isClosed) return 'Closed';
  if (question.isScheduled) return 'Scheduled';
  return 'Open';
}

function formatGmtDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(value);
}
