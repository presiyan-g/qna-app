import Link from 'next/link';
import type { CommunityStreakRibbon as CommunityStreakRibbonData } from '@/services/profiles';

/**
 * Per-community streak ribbon — the "binary" companion to the
 * profile's cross-community volume ribbon. Each cell is one of:
 *
 *   correct       → primary green
 *   late-or-wrong → clay-soft  ("tried but didn't land")
 *   missed        → neutral line color
 *
 * For non-members, we show a "Join to start a streak" preview card
 * so the surface still has presence on the sidebar — and so
 * non-members get a clear nudge to actually join.
 *
 * Pure server component. Hover tooltips use the same CSS-only
 * pattern as the profile streak (`.q-streak-cell:hover .q-streak-tip`).
 */
export function CommunityStreakRibbon({
  streak,
  isMember,
  slug,
}: {
  streak: CommunityStreakRibbonData | null;
  isMember: boolean;
  slug: string;
}) {
  if (!isMember || !streak) {
    return <NonMemberStreakCard slug={slug} />;
  }

  const answeredDays = streak.days.filter((d) => d.state !== 'missed').length;
  const window = streak.days.length;

  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Your streak
      </p>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none tracking-tight text-primary">
            {streak.currentStreak}
          </span>
          <span className="text-xs text-muted">
            day {streak.currentStreak === 1 ? 'streak' : 'streak'}
          </span>
        </div>
        <span className="text-[11px] text-muted">
          Longest ·{' '}
          <strong className="font-bold text-ink">{streak.longestStreak}</strong>
        </span>
      </div>

      <div className="mt-3 q-streak">
        {streak.days.map((d) => {
          const cls =
            d.state === 'correct'
              ? 'correct'
              : d.state === 'late-or-wrong'
                ? 'late'
                : '';
          return (
            <div
              key={d.dateISO}
              className={`q-streak-cell${cls ? ` ${cls}` : ''}`}
              aria-label={`${d.dateISO}: ${describe(d.state)}`}
            >
              <span className="q-streak-tip">
                {d.dateISO} · {describe(d.state)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted">
        <span>Missed</span>
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: 'var(--color-line)' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: 'var(--color-action-clay-soft)' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: 'var(--color-primary)' }}
        />
        <span>Got it</span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        Answered{' '}
        <strong className="font-bold text-ink">
          {answeredDays} of {window} days
        </strong>{' '}
        in this community.
      </p>
    </section>
  );
}

/**
 * Lightweight teaser for visitors who haven't joined yet. The CTA
 * routes through the standard /login flow (Join button lives on
 * the community header, but we link to login here since unjoined
 * viewers may not be authenticated at all).
 */
function NonMemberStreakCard({ slug }: { slug: string }) {
  return (
    <section className="rounded-lg border border-dashed border-line bg-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        Your streak
      </p>
      <h2 className="mt-2 text-base font-bold">
        Join to start a streak.
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Members track how many days in a row they nail the daily
        question. <span className="serif-italic">It adds up fast.</span>
      </p>

      {/* Static placeholder grid so the surface has visual presence
          even before the user joins — purely decorative beige cells
          (no real data). */}
      <div className="mt-4 q-streak" aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="q-streak-cell" />
        ))}
      </div>

      <Link
        href={`/communities/${slug}/about`}
        className="mt-4 inline-block text-sm font-semibold text-action-lake transition-colors duration-150 ease-out hover:text-action-lake-hover hover:underline"
      >
        How it works →
      </Link>
    </section>
  );
}

function describe(state: 'correct' | 'late-or-wrong' | 'missed'): string {
  switch (state) {
    case 'correct':
      return 'got it';
    case 'late-or-wrong':
      return 'late or wrong';
    case 'missed':
      return 'no answer';
  }
}
