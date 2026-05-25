/* Quorum UI Kit · StreakRibbon
   Two modes:
     mode="volume"  (default) — cross-community activity. 4 intensity
                                  levels mapping to # of communities answered
                                  that day. Used on Profile.
     mode="binary"            — single-community. Each day was either
                                  answered, late/wrong, or missed.
                                  Used in the community sidebar. */

const StreakRibbon = ({ days, currentStreak, longestStreak, dense = false, mode = 'volume' }) => {
  const cells = days.map((d, i) => {
    let cls = 'cell';
    let tip = d.day;
    if (mode === 'binary') {
      // d.state: 'answered' | 'late' | 'missed'
      if (d.state === 'answered')    { cls += ' l3'; tip += ' · answered'; }
      else if (d.state === 'late')   { cls += ' late'; tip += ' · late / wrong'; }
      else                            {              tip += ' · missed'; }
    } else {
      // d.level: 0|1|2|3
      if (d.level) cls += ' l' + d.level;
      tip += d.level
        ? ` · ${d.level} ${d.level === 1 ? 'community' : 'communities'}`
        : ' · no answer';
    }
    return { cls, tip };
  });

  return (
    <div>
      {currentStreak !== undefined && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: dense ? 22 : 28, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {currentStreak}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>day streak</span>
          </div>
          {longestStreak !== undefined && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Longest · <b style={{ color: 'var(--ink)' }}>{longestStreak}</b>
            </span>
          )}
        </div>
      )}
      <div className="q-streak" style={dense ? { gridTemplateColumns: 'repeat(' + Math.min(days.length, 11) + ', 1fr)' } : null}>
        {cells.map((c, i) => (
          <div key={i} className={c.cls}>
            <span className="tip">{c.tip}</span>
          </div>
        ))}
      </div>

      {mode === 'volume' ? (
        <div className="q-streak-legend" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
          <span>Less</span>
          <span className="swatch" style={{ background: 'var(--line)' }} />
          <span className="swatch" style={{ background: '#C5D6CB' }} />
          <span className="swatch" style={{ background: '#7FA48E' }} />
          <span className="swatch" style={{ background: 'var(--primary)' }} />
          <span>More</span>
        </div>
      ) : (
        <div className="q-streak-legend" style={{ marginTop: 10, justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className="swatch" style={{ background: 'var(--primary)' }} /> Answered
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className="swatch" style={{ background: 'var(--action-clay-soft)' }} /> Late or wrong
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className="swatch" style={{ background: 'var(--line)' }} /> Missed
          </span>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { StreakRibbon });
