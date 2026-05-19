import type { CommunityQuestion } from '@/services/questions';

export function QuestionList({
  questions,
}: {
  questions: CommunityQuestion[];
}) {
  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Questions
        </p>
        <h2 className="mt-3 text-2xl font-bold">No questions scheduled yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The creator has not added the first challenge for this community.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Questions
        </p>
        <h2 className="mt-2 text-2xl font-bold">Community schedule</h2>
      </div>
      {questions.map((question) => (
        <article
          key={question.id}
          className="rounded-lg border border-line bg-card p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-[12px] font-semibold text-primary">
                {getQuestionState(question)}
              </span>
              <h3 className="mt-3 text-xl font-bold leading-snug">
                {question.prompt}
              </h3>
            </div>
            <div className="shrink-0 text-sm text-muted sm:text-right">
              <p className="font-semibold text-ink">
                {formatGmtDate(question.scheduledFor)}
              </p>
              <p>{question.points} points</p>
            </div>
          </div>

          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.choices.map((choice) => (
              <li
                key={choice.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[12px] font-bold text-muted">
                  {choice.position}
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

          {canShowExplanation(question) && (
            <p className="mt-4 rounded-lg border border-line bg-primary-soft p-3 text-sm leading-6 text-muted">
              {question.explanation}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}

function getQuestionState(question: CommunityQuestion): string {
  const now = Date.now();
  if (question.closesAt.getTime() <= now) return 'Closed';
  if (question.scheduledFor.getTime() > now) return 'Scheduled';
  return 'Published';
}

function canShowExplanation(question: CommunityQuestion): boolean {
  return (
    Boolean(question.explanation) &&
    question.choices.some((choice) => choice.isCorrect === true)
  );
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
