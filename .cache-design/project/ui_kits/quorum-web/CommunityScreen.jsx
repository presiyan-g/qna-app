/* Quorum UI Kit · Community detail (with tabs)
   Mirrors qna-web/src/app/communities/[slug]/* */

const { Btn, Card, Chip, Pill, Eyebrow, Meta, SerifI, Avatar, Arrow,
        COMMUNITIES, SAMPLE_BROADCASTS, SAMPLE_LEADERBOARD, PAST_QUESTIONS,
        SAMPLE_QUESTION, MY_COMMUNITY_STREAK, MY_COMMUNITY_STATS, StreakRibbon } = window;

const CommunityHeader = ({ c, joined, onToggleJoin }) => (
  <div className="q-layout-header" style={{ marginTop: 24 }}>
    <Avatar size={88} radius={16} style={{ fontSize: 40 }}>{c.emoji}</Avatar>
    <div style={{ minWidth: 0 }}>
      <Eyebrow>{c.category} · {c.cadence} challenge</Eyebrow>
      <h1 style={{ margin: '8px 0 0', fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{c.name}</h1>
      <p style={{ margin: '8px 0 0', maxWidth: 640, fontSize: 14, lineHeight: 1.6, color: 'var(--muted)' }}>{c.description}</p>
      <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
        <span><b style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.memberCount.toLocaleString('en-US')}</b> members</span>
        <span aria-hidden>·</span>
        <span><b style={{ fontWeight: 600, color: 'var(--ink)' }}>1</b> open</span>
        <span aria-hidden>·</span>
        <span>Closes in <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.closesIn}</b></span>
      </div>
    </div>
    {joined ? (
      <div style={{ display: 'flex', gap: 8 }}>
        <span className="q-pill q-pill-soft">✓ Joined</span>
        <Btn variant="clay" size="md" onClick={onToggleJoin}>Leave</Btn>
      </div>
    ) : (
      <Btn variant="primary" size="md" onClick={onToggleJoin}>Join community</Btn>
    )}
  </div>
);

const CommunityTabs = ({ current, onSwitch }) => {
  const tabs = [
    { key: 'questions', label: 'Questions', count: 1 },
    { key: 'broadcasts', label: 'Broadcasts', count: 2 },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'about', label: 'About' },
  ];
  return (
    <nav style={{ marginTop: 32, display: 'flex', gap: 4, borderBottom: '1px solid var(--line)' }}>
      {tabs.map(t => {
        const active = t.key === current;
        return (
          <button key={t.key} onClick={() => onSwitch(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 18px', fontSize: 14, fontWeight: 600,
              color: active ? 'var(--primary)' : 'var(--muted)',
              borderTop: 0, borderLeft: 0, borderRight: 0,
              borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'color 150ms var(--ease-out), border-color 200ms var(--ease-out)',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--muted)'; }}>
            {t.label}
            {typeof t.count === 'number' && (
              <span style={{
                background: active ? 'var(--primary)' : 'var(--primary-soft)',
                color: active ? 'var(--paper)' : 'var(--primary)',
                borderRadius: 9999, padding: '1px 8px', fontSize: 11, fontWeight: 700, lineHeight: 1.4,
              }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

const QuestionRow = ({ q, onOpen }) => {
  const pill =
    q.state === 'live'   ? <Pill variant="primary"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />Live</Pill> :
    q.state === 'closed' ? <Pill variant="soft">Closed</Pill> :
    q.state === 'draft'  ? <Pill variant="neutral">Draft</Pill> :
                           <Pill variant="warn">Scheduled</Pill>;
  return (
    <a onClick={onOpen} className="q-card q-card-h"
       style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 16, alignItems: 'center', padding: '14px 18px', borderRadius: 10, cursor: 'pointer' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{q.date}</span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{q.prompt}</span>
      {pill}
    </a>
  );
};

const QuestionsTab = ({ c, go, viewerRole = 'member' }) => {
  const sq = SAMPLE_QUESTION;
  const isCreator = viewerRole === 'creator';
  const pct = Math.round((sq.answeredCount / sq.totalMembers) * 100);
  return (
    <div style={{ marginTop: 24 }} className="q-layout-2col-r">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* HERO today card */}
        <a className="q-today" onClick={() => go('question', { slug: c.slug })} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div className="q-today-meta">
            <Eyebrow>Today's question</Eyebrow>
            <span className="q-today-countdown"><span className="dot" />Closes in {c.closesIn}</span>
            <span className="q-meta">{sq.points} points</span>
          </div>
          <p className="q-today-prompt">{c.todayQuestion}</p>
          {isCreator && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  <b style={{ color: 'var(--ink)' }}>{sq.answeredCount}</b> of {sq.totalMembers.toLocaleString('en-US')} have answered
                  <span className="q-meta" style={{ marginLeft: 8, color: 'var(--action-clay-hover)' }}>· Creator view</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{pct}%</span>
              </div>
              <div className="q-progress">
                <div className="q-progress-fill" style={{ width: pct + '%' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              <SerifI>It takes 30 seconds.</SerifI>
            </span>
            <Btn variant="primary" size="md" onClick={e => { e.stopPropagation(); go('question', { slug: c.slug }); }}>
              Answer today's question <Arrow />
            </Btn>
          </div>
        </a>

        {/* Past questions */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <Eyebrow>Past questions</Eyebrow>
            {isCreator && (
              <Btn variant="clay" size="sm" onClick={() => go('compose', { slug: c.slug })}>+ Draft new</Btn>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PAST_QUESTIONS.map(q => <QuestionRow key={q.id} q={q} onOpen={() => go('question', { slug: c.slug })} />)}
          </div>
        </div>
      </div>
      <Sidebar c={c} go={go} />
    </div>
  );
};

const Sidebar = ({ c, go }) => (
  <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <Card>
      <Eyebrow>Your streak here</Eyebrow>
      <div style={{ marginTop: 12 }}>
        <StreakRibbon
          mode="binary"
          days={MY_COMMUNITY_STREAK}
          currentStreak={MY_COMMUNITY_STATS.currentStreak}
          longestStreak={MY_COMMUNITY_STATS.longestStreak}
          dense
        />
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
        Answered <b style={{ color: 'var(--ink)' }}>{MY_COMMUNITY_STATS.answeredCount} of the last {MY_COMMUNITY_STATS.windowDays}</b> daily questions.
      </p>
    </Card>

    <Card>
      <Eyebrow>Latest broadcast</Eyebrow>
      <p style={{ margin: '12px 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
        {SAMPLE_BROADCASTS[0].body.slice(0, 110)}…
      </p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
        @{SAMPLE_BROADCASTS[0].author} · {SAMPLE_BROADCASTS[0].when}
      </p>
      <a onClick={() => go('community', { slug: c.slug, tab: 'broadcasts' })} className="q-link-primary"
         style={{ display: 'inline-block', marginTop: 12, fontSize: 13, cursor: 'pointer' }}>
        Open broadcast →
      </a>
    </Card>

    <Card>
      <Eyebrow>Leaderboard · all-time</Eyebrow>
      <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8 }}>
        {SAMPLE_LEADERBOARD.slice(0, 3).map((e, i) => (
          <li key={e.username} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span><b>{i + 1}.</b> @{e.username}</span>
            <b>{e.points.toLocaleString('en-US')}</b>
          </li>
        ))}
      </ul>
      <a onClick={() => go('community', { slug: c.slug, tab: 'leaderboard' })} className="q-link-primary"
         style={{ display: 'inline-block', marginTop: 12, fontSize: 13, cursor: 'pointer' }}>
        View full leaderboard →
      </a>
    </Card>
  </aside>
);

const BroadcastsTab = ({ c }) => (
  <div style={{ marginTop: 24, display: 'grid', gap: 16, maxWidth: 760 }}>
    {SAMPLE_BROADCASTS.map(b => (
      <Card key={b.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <a className="q-link-primary" style={{ fontSize: 14, fontWeight: 700 }}>@{b.author}</a>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>{b.when}</p>
          </div>
          <a className="q-link-primary" style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Open</a>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--ink)' }}>{b.body}</p>
      </Card>
    ))}
  </div>
);

const LeaderboardTab = ({ c }) => {
  const [win, setWin] = React.useState('7d');
  const windows = [
    { v: '7d', l: '7 days' }, { v: '30d', l: '30 days' }, { v: 'all', l: 'All-time' },
  ];
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <nav style={{ display: 'inline-flex', padding: 4, border: '1px solid var(--line)', borderRadius: 9999, background: 'var(--card)' }}>
          {windows.map(w => {
            const active = win === w.v;
            return (
              <button key={w.v} onClick={() => setWin(w.v)} style={{
                padding: '8px 18px', fontSize: 13, fontWeight: active ? 700 : 600,
                color: active ? 'var(--paper)' : 'var(--muted)',
                background: active ? 'var(--primary)' : 'transparent',
                border: 0, borderRadius: 9999, cursor: 'pointer',
                transition: 'all 200ms var(--ease-out)',
                fontFamily: 'var(--font-sans)',
              }}>{w.l}</button>
            );
          })}
        </nav>
      </div>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        {SAMPLE_LEADERBOARD.map((e, i) => (
          <div key={e.username} style={{
            display: 'grid', gridTemplateColumns: '64px 1fr 140px 200px',
            alignItems: 'center', gap: 16, padding: '16px 20px',
            borderTop: i === 0 ? 0 : '1px solid var(--line)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
              {i === 0 && <span style={{ color: 'var(--accent)', marginRight: 4 }}>★</span>}
              #{e.rank}
            </div>
            <a style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>@{e.username}</a>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{e.points.toLocaleString('en-US')}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>points</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--muted)' }}>{e.when}</div>
          </div>
        ))}
      </Card>
    </div>
  );
};

const AboutTab = ({ c }) => (
  <div style={{ marginTop: 24 }} className="q-layout-2col-r">
    <Card>
      <Eyebrow>About</Eyebrow>
      <h3 style={{ margin: '12px 0 8px', fontSize: 24, fontWeight: 700 }}>
        Recurring knowledge challenges for <SerifI>{c.name.toLowerCase()}.</SerifI>
      </h3>
      <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{c.description}</p>
      <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
        <Chip variant="primary">{c.cadence}</Chip>
        <Chip variant="line">{c.category}</Chip>
      </div>
    </Card>
    <Card>
      <Eyebrow>Creator</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <Avatar size={40} radius={10}>P</Avatar>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>@presiyan</div>
          <Meta>Started Mar 2026</Meta>
        </div>
      </div>
    </Card>
  </div>
);

const CommunityScreen = ({ slug, initialTab = 'questions', viewerRole = 'member', go }) => {
  const c = COMMUNITIES.find(x => x.slug === slug) || COMMUNITIES[0];
  const [tab, setTab] = React.useState(initialTab);
  const [joined, setJoined] = React.useState(false);

  return (
    <main style={{ flex: 1, background: 'var(--paper)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <a onClick={() => go('browse')} className="q-link-back">← Back to communities</a>
        <CommunityHeader c={c} joined={joined} onToggleJoin={() => setJoined(v => !v)} />
        <CommunityTabs current={tab} onSwitch={setTab} />
        {tab === 'questions' && <QuestionsTab c={c} go={go} viewerRole={viewerRole} />}
        {tab === 'broadcasts' && <BroadcastsTab c={c} />}
        {tab === 'leaderboard' && <LeaderboardTab c={c} />}
        {tab === 'about' && <AboutTab c={c} />}
      </div>
    </main>
  );
};

Object.assign(window, { CommunityScreen });
