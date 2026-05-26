import type { StreakRibbon as StreakRibbonData } from '@/services/profiles';

/**
 * 30-day activity grid. Pure server component — hover tooltips are
 * CSS-only (`.q-streak .q-streak-cell:hover .q-streak-tip`) defined in
 * globals.css, so this can render statically.
 *
 * Cells get class `l1`/`l2`/`l3` to step through the sage-green
 * progression (1 / 2 / 3+ communities answered that day). Day 0 stays
 * the neutral beige line color.
 */
export function StreakRibbon({ streak }: { streak: StreakRibbonData }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none tracking-tight text-primary">
            {streak.currentStreak}
          </span>
          <span className="text-xs text-muted">day streak</span>
        </div>
        <span className="text-[11px] text-muted">
          Longest ·{' '}
          <strong className="font-bold text-ink">{streak.longestStreak}</strong>
        </span>
      </div>

      <div className="q-streak">
        {streak.days.map((d) => (
          <div
            key={d.dateISO}
            className={`q-streak-cell${d.level ? ` l${d.level}` : ''}`}
            aria-label={`${d.dateISO}: ${describe(d.communityCount)}`}
          >
            <span className="q-streak-tip">
              {d.dateISO} · {describe(d.communityCount)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-2 text-[11px] text-muted">
        <span>Less</span>
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: 'var(--color-line)' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: '#C5D6CB' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: '#7FA48E' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: 'var(--color-primary)' }}
        />
        <span>More</span>
      </div>
    </section>
  );
}

function describe(count: number): string {
  if (count <= 0) return 'no answer';
  if (count === 1) return '1 community';
  return `${count} communities`;
}
