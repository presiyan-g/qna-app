/* Quorum UI Kit · Profile screen
   Mirrors qna-web/src/app/users/[username]/page.tsx — username,
   joined date, total points, streak, memberships. */

const { Btn, Card, Chip, Eyebrow, Meta, SerifI, Avatar, Arrow, StreakRibbon, MY_STREAK, ME } = window;

const ProfileScreen = ({ go }) => {
  const me = ME;

  return (
    <main style={{ flex: 1, background: 'var(--paper)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a onClick={() => go('browse')} className="q-link-back">← Back to discover</a>

        {/* Header */}
        <div className="q-layout-header" style={{ marginTop: 24 }}>
          <Avatar size={88} radius={16} style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)' }}>
            {me.username.slice(0, 2).toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Eyebrow>Profile</Eyebrow>
            <h1 style={{ margin: '8px 0 0', fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              @{me.username}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>{me.joinedAt}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="md">Edit profile</Btn>
          </div>
        </div>

        {/* Stat row */}
        <div className="q-layout-3col" style={{ marginTop: 32 }}>
          <Card>
            <Eyebrow>Total points</Eyebrow>
            <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {me.totalPoints.toLocaleString('en-US')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>across {me.memberships.length} communities</p>
          </Card>
          <Card>
            <Eyebrow>Current streak</Eyebrow>
            <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--primary)' }}>
              {me.currentStreak} <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 400 }}>days</span>
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>longest · <b>{me.longestStreak}</b></p>
          </Card>
          <Card>
            <Eyebrow>Memberships</Eyebrow>
            <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {me.memberships.length}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              including <b>1 creator</b> role
            </p>
          </Card>
        </div>

        <div className="q-layout-2col-r" style={{ marginTop: 24 }}>
          {/* Activity (30 days) */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Eyebrow>Activity · last 30 days</Eyebrow>
              <span className="q-meta">{MY_STREAK.filter(d => d.level > 0).length}/30 active</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <StreakRibbon days={MY_STREAK} />
            </div>
            <p style={{ marginTop: 16, fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>
              You've shown up <b>{MY_STREAK.filter(d => d.level > 0).length} of the last 30 days</b>. Your longest run is <b>{me.longestStreak} days</b>. <SerifI>Keep going.</SerifI>
            </p>
          </Card>

          {/* Memberships */}
          <div>
            <Card>
              <Eyebrow>Communities</Eyebrow>
              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {me.memberships.map(m => (
                  <li key={m.slug}>
                    <a onClick={() => go('community', { slug: m.slug })}
                       style={{
                         display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10,
                         cursor: 'pointer', transition: 'background-color 150ms var(--ease-out)',
                       }}
                       onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-soft)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Avatar size={32} radius={8} style={{ fontSize: 16 }}>{m.emoji}</Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {m.role === 'creator' ? (
                            <span style={{ color: 'var(--action-clay-hover)', fontWeight: 700 }}>Creator</span>
                          ) : 'Member'}
                          {m.points > 0 && <> · {m.points} pts</>}
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

Object.assign(window, { ProfileScreen });
