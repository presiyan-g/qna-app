/* Quorum UI Kit · Creator Dashboard
   Mirrors qna-web/src/app/dashboard/page.tsx */

const { Btn, Card, Eyebrow, Avatar, COMMUNITIES } = window;

const Summary = ({ label, value }) => (
  <Card>
    <Eyebrow>{label}</Eyebrow>
    <p style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 700 }}>{value.toLocaleString('en-US')}</p>
  </Card>
);

const Signal = ({ label, value }) => (
  <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
    <dt style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>{label}</dt>
    <dd style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700 }}>{value}</dd>
  </div>
);

const DashboardScreen = ({ go }) => {
  const myCommunities = COMMUNITIES.slice(0, 4);
  const liveToday = 2;
  const missingToday = 1;
  return (
    <main style={{ flex: 1, background: 'var(--paper)', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Eyebrow>Creator</Eyebrow>
        <h1 style={{ margin: '8px 0 32px', fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Dashboard</h1>

        <div className="q-layout-3col" style={{ marginBottom: 32 }}>
          <Summary label="Communities" value={myCommunities.length} />
          <Summary label="Live today" value={liveToday} />
          <Summary label="Missing today" value={missingToday} />
        </div>

        <div className="q-layout-2col-eq">
          {myCommunities.map((c, i) => {
            const statusLabel = i === 0 || i === 2 ? 'Live today' : i === 1 ? 'Scheduled today' : 'Missing today';
            return (
              <Card key={c.slug}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <Avatar size={48} radius={10} style={{ fontSize: 22 }}>{c.emoji}</Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Eyebrow>{c.cadence} challenge</Eyebrow>
                    <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{c.name}</h2>
                  </div>
                </div>

                <dl style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <Signal label="Members" value={c.memberCount.toLocaleString('en-US')} />
                  <Signal label="Today" value={statusLabel} />
                  <Signal label="Next question" value={`Mar ${15 + i}, 4:00 PM UTC`} />
                  <Signal label="Latest broadcast" value={i === 3 ? 'None yet' : 'Mar 12, 10:30 AM'} />
                </dl>

                <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <Btn variant="primary" size="md" onClick={() => go('community', { slug: c.slug })}>Manage</Btn>
                  <Btn variant="clay" size="md" onClick={() => go('compose', { slug: c.slug })}>Draft question</Btn>
                  <Btn variant="lake" size="md">Broadcast</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
};

Object.assign(window, { DashboardScreen });
