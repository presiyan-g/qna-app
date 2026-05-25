/* Quorum UI Kit · Landing screen
   Mirrors qna-web/src/app/_components/landing/{Hero,FeaturedCommunities,HowItWorks,ForCreators,CtaBand}.tsx */

const { Btn, Card, Chip, Eyebrow, SerifI, Avatar, CheckDot, Arrow, COMMUNITIES } = window;

const Hero = ({ go }) => {
  const stack = COMMUNITIES.slice(0, 3);
  const positions = [
    { top: 0,   left: 0,   transform: 'rotate(-3.5deg)' },
    { top: 80,  left: 90,  transform: 'rotate(1.5deg)', zIndex: 10 },
    { top: 175, left: 30,  transform: 'rotate(-1deg)' },
  ];
  return (
    <section style={{ padding: '64px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }} className="q-layout-hero">
        <div>
          <Eyebrow>Discover daily Q&A communities</Eyebrow>
          <h1 style={{ margin: '16px 0 16px', fontSize: 52, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.025em' }}>
            Find your people. <SerifI>One question at a time.</SerifI>
          </h1>
          <p style={{ margin: '0 0 24px', maxWidth: '46ch', fontSize: 17, lineHeight: 1.6, color: 'var(--muted)' }}>
            Niche communities — from AI builders to chess tacticians — publish one question a day. You answer in 30 seconds, see the explanation instantly, and unlock the discussion only after you've taken a swing.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Btn variant="primary" onClick={() => go('browse')}>Browse communities <Arrow /></Btn>
            <Btn variant="clay" onClick={() => go('create')}>Start your own</Btn>
          </div>
        </div>

        <div style={{ position: 'relative', margin: '0 auto', height: 320, width: '100%', maxWidth: 420 }}>
          {stack.map((c, i) => (
            <article key={c.slug}
              style={{
                position: 'absolute', width: 260, borderRadius: 14, border: '1px solid var(--line)',
                background: 'var(--card)', padding: '16px 18px',
                boxShadow: '0 18px 40px -22px rgba(31,64,50,0.28)',
                ...positions[i],
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                <Avatar size={34} radius={9}>{c.emoji}</Avatar>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>{c.name}</div>
                  <div style={{ marginTop: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                    {c.memberCount.toLocaleString('en-US')} members
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{c.todayQuestion}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { n: 1, title: 'Pick a community', body: 'Join one that fits — daily, weekly, your call.' },
    { n: 2, title: 'Answer the question', body: 'Submit in seconds. See the explanation instantly.' },
    { n: 3, title: 'Unlock the discussion', body: "Comments open only after you've answered." },
  ];
  return (
    <section style={{ borderTop: '1px solid rgba(31,64,50,0.10)', borderBottom: '1px solid rgba(31,64,50,0.10)', background: 'var(--primary-soft)', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 32, alignItems: 'center' }}>
        <div style={{ borderRight: '1px solid rgba(31,64,50,0.15)', paddingRight: 32 }}>
          <Eyebrow>How it works</Eyebrow>
          <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
            A daily loop that <SerifI>closes.</SerifI>
          </p>
        </div>
        {steps.map(s => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2, width: 22, height: 22, flexShrink: 0, borderRadius: '50%', background: 'var(--primary)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {s.n}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{s.title}</div>
              <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--muted)' }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const FeaturedCommunities = ({ go }) => (
  <section style={{ padding: '64px 24px 80px' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 44, textAlign: 'center' }}>
        <Eyebrow>Featured communities</Eyebrow>
        <h2 style={{ marginTop: 12, fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Find the corner of the internet <SerifI>that fits you.</SerifI>
        </h2>
      </header>
      <div className="q-layout-3col">
        {COMMUNITIES.slice(0, 6).map(c => (
          <Card key={c.slug} hoverable onClick={() => go('community', { slug: c.slug })}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={34} radius={9}>{c.emoji}</Avatar>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{c.name}</div>
                <div style={{ marginTop: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                  {c.memberCount.toLocaleString('en-US')} members
                </div>
              </div>
            </header>
            <p style={{ margin: '12px 0', fontSize: 13, lineHeight: 1.5 }}>{c.description}</p>
            <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Chip variant="primary">{c.cadence}</Chip>
                <Chip variant="line">{c.category}</Chip>
              </div>
              <span>View community</span>
            </footer>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

const ForCreators = ({ go }) => {
  const items = [
    { head: 'Schedule recurring questions', tail: 'daily, weekly, or your own cadence.' },
    { head: 'Instant grading + explanations', tail: 'members learn the moment they answer.' },
    { head: 'Discussion unlocks after answering', tail: 'no spoilers, no lurkers.' },
    { head: 'Leaderboards & broadcasts', tail: 'keep the regulars coming back.' },
  ];
  return (
    <section id="creators" style={{ padding: '64px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="q-layout-2col-eq" style={{
          padding: 40, borderRadius: 20, border: '1px solid var(--line)', background: 'var(--card)',
          gap: 36, alignItems: 'center',
        }}>
          <div>
            <Eyebrow>For creators</Eyebrow>
            <h3 style={{ margin: '16px 0 14px', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Building a niche community is <SerifI>easier than a podcast.</SerifI>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.6, color: 'var(--muted)' }}>
              If you teach something, even a narrow slice of it, you have enough to launch a community. Schedule one question. Members answer, learn, talk. You see exactly who shows up.
            </p>
            <Btn variant="clay" onClick={() => go('create')}>Start your community <Arrow /></Btn>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
            {items.map(item => (
              <li key={item.head} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14 }}>
                <CheckDot />
                <span><strong>{item.head}</strong> — {item.tail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

const CtaBand = ({ go }) => (
  <section style={{ padding: '0 24px 64px' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', borderRadius: 20, background: 'var(--primary)', color: 'var(--paper)', padding: '56px 48px', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        Pick a community. <SerifI color="var(--accent)">Answer today's question.</SerifI>
      </h3>
      <p style={{ margin: '0 0 24px', fontSize: 16, color: 'rgba(250,246,236,0.75)' }}>
        It takes 30 seconds. Tomorrow there's another one.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Btn variant="accent" onClick={() => go('browse')}>Browse communities <Arrow /></Btn>
        <Btn variant="ghost-dark" onClick={() => go('create')}>Start your own</Btn>
      </div>
    </div>
  </section>
);

const LandingScreen = ({ go }) => (
  <main style={{ flex: 1, background: 'var(--paper)', color: 'var(--ink)' }}>
    <Hero go={go} />
    <FeaturedCommunities go={go} />
    <HowItWorks />
    <ForCreators go={go} />
    <CtaBand go={go} />
  </main>
);

Object.assign(window, { LandingScreen, Hero, HowItWorks, FeaturedCommunities, ForCreators, CtaBand });
