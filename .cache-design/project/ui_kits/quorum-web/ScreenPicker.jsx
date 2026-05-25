/* Quorum UI Kit · Screens picker
   A small floating control in the bottom-right that lets you jump
   to any screen in the prototype. Discreet — looks like a pill,
   expands to a card listing all screens with their current label. */

const ScreenPicker = ({ current, go, viewerRole, setViewerRole }) => {
  const [open, setOpen] = React.useState(false);
  const screens = [
    { key: 'home',      label: 'Landing',         params: {} },
    { key: 'browse',    label: 'Browse',          params: {} },
    { key: 'login',     label: 'Sign in',         params: {} },
    { key: 'register',  label: 'Register',        params: {} },
    { key: 'community', label: 'Community',       params: { slug: 'daily-ai-builders' } },
    { key: 'community', label: 'Community · Broadcasts',  params: { slug: 'daily-ai-builders', tab: 'broadcasts' } },
    { key: 'community', label: 'Community · Leaderboard', params: { slug: 'daily-ai-builders', tab: 'leaderboard' } },
    { key: 'community', label: 'Community · About',       params: { slug: 'daily-ai-builders', tab: 'about' } },
    { key: 'question',  label: 'Question + answer',       params: { slug: 'daily-ai-builders' } },
    { key: 'compose',   label: 'Draft question · creator', params: { slug: 'daily-ai-builders' } },
    { key: 'dashboard', label: 'Creator dashboard',       params: {} },
    { key: 'profile',   label: 'Profile',                  params: {} },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 50, fontFamily: 'var(--font-sans)' }}>
      {open && (
        <div style={{
          position: 'absolute', right: 0, bottom: 'calc(100% + 8px)',
          width: 260, padding: 6,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14,
          boxShadow: 'var(--shadow-lift)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ padding: '8px 10px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--primary)' }}>
            View as
          </div>
          <div style={{ padding: '0 6px 8px', display: 'flex', gap: 4 }}>
            {['member', 'creator'].map(role => {
              const active = viewerRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setViewerRole(role)}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 8, border: 0, cursor: 'pointer',
                    fontSize: 12, fontWeight: active ? 700 : 600,
                    fontFamily: 'var(--font-sans)', textTransform: 'capitalize',
                    background: active ? 'var(--primary)' : 'var(--primary-soft)',
                    color: active ? 'var(--paper)' : 'var(--primary)',
                    transition: 'background-color 150ms var(--ease-out)',
                  }}
                >
                  {role}
                </button>
              );
            })}
          </div>
          <div style={{ height: 1, background: 'var(--line)', margin: '2px 6px 4px' }} />
          <div style={{ padding: '4px 10px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--primary)' }}>
            Jump to screen
          </div>
          {screens.map((s, i) => {
            const active = current === s.key && (
              !s.params.tab ||
              (window.location.hash.split('/')[3] || 'questions') === s.params.tab
            );
            return (
              <button
                key={i}
                onClick={() => { setOpen(false); go(s.key, s.params); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 9,
                  border: 0, background: active ? 'var(--primary-soft)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--ink)',
                  fontSize: 13, fontWeight: active ? 700 : 500, textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'background-color 150ms var(--ease-out), color 150ms var(--ease-out)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--primary-soft)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{s.label}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </button>
            );
          })}
          <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
            Or click through — the prototype is fully interactive.
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          background: 'var(--primary)', color: 'var(--paper)',
          border: 0, borderRadius: 9999,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          boxShadow: 'var(--shadow-lift)',
          transition: 'background-color 200ms var(--ease-out), transform 120ms var(--ease-out)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
        Screens
        <span style={{ fontSize: 10, opacity: .7, fontFamily: 'var(--font-mono)' }}>
          {open ? '×' : '12'}
        </span>
      </button>
    </div>
  );
};

Object.assign(window, { ScreenPicker });
