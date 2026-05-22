import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import {
  AnswerPermissionError,
  type AnswerChoiceResource,
  type QuestionDetail,
  getQuestionDetail,
} from '@/services/answers';
import { getSession } from '@/services/auth';
import { QuestionNotFoundError } from '@/services/questions';
import { AnswerForm } from './_components/AnswerForm';
import { CommentThread } from './_components/CommentThread';

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function QuestionDetailPage({ params }: PageProps) {
  const [{ slug, id }, session] = await Promise.all([params, getSession()]);
  if (!session) redirect('/login');

  let question: QuestionDetail;
  try {
    question = await getQuestionDetail({
      slug,
      questionId: id,
      userId: session.sub,
    });
  } catch (err) {
    if (err instanceof QuestionNotFoundError) notFound();
    if (err instanceof AnswerPermissionError) {
      return <PermissionScreen slug={slug} message={err.message} />;
    }
    throw err;
  }

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
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
                <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-[12px] font-semibold text-primary">
                  {getQuestionState(question)}
                </span>
                <h1 className="mt-4 text-[32px] font-bold leading-tight md:text-[44px]">
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
              <ResultPanel question={question} />
            ) : question.canAnswer ? (
              <AnswerForm
                slug={slug}
                questionId={question.id}
                choices={question.choices}
                isLate={question.isClosed}
              />
            ) : (
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
            )}

            {!question.result && question.canSeeSolution && (
              <SolutionPanel question={question} />
            )}

            <CommentThread slug={slug} question={question} userId={session.sub} />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function PermissionScreen({
  slug,
  message,
}: {
  slug: string;
  message: string;
}) {
  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Members only
          </p>
          <h1 className="mt-3 text-3xl font-bold">Join to answer</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
          <Link
            href={`/communities/${slug}`}
            className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-paper"
          >
            Go to community
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ResultPanel({ question }: { question: QuestionDetail }) {
  if (!question.result) return null;
  const result = question.result;

  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Result
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            {result.isCorrect ? 'Correct answer' : 'Wrong answer'}
          </h2>
        </div>
        <span className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-paper">
          {result.pointsAwarded} points awarded
        </span>
      </div>

      {result.isLate && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          This answer was submitted after the close time, so it earned 0 points.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <AnswerSummary title="Your answer" choice={result.selectedChoice} />
        <AnswerSummary title="Correct answer" choice={result.correctChoice} />
      </div>

      <SolutionPanel question={question} framed={false} />
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
