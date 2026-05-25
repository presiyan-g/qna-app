/* Quorum UI Kit · Chrome (Nav + Footer)
   Matches qna-web/src/app/_components/landing/{Nav,Footer}.tsx */

const { Btn, Chevron } = window;

const Nav = ({ go, current, signedIn = false, username = 'you' }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const links = signedIn
    ? [{ key: 'browse', label: 'Discover' }, { key: 'my', label: 'My communities' }]
    : [{ key: 'browse', label: 'Discover' }, { key: 'creators', label: 'For creators' }];

  return (
    <header style={{ position: 'relative', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="q-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
        <a onClick={() => go('home')} className="q-link q-link-brand" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>Quorum</a>

        <nav style={{ display: 'flex', gap: 28, fontSize: 14, fontWeight: 500 }}>
          {links.map(l => (
            <a key={l.key}
               onClick={() => go(l.key)}
               style={{ color: current === l.key ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer', transition: 'color 150ms var(--ease-out)' }}
               onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
               onMouseLeave={e => e.currentTarget.style.color = current === l.key ? 'var(--ink)' : 'var(--muted)'}>
              {l.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {signedIn ? (
            <React.Fragment>
              <Btn variant="ghost" size="sm" onClick={() => go('dashboard')}>Dashboard</Btn>
              <Btn variant="clay" size="sm" onClick={() => go('create')}>Create</Btn>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="q-btn-soft"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    border: 0, borderRadius: 9999, padding: '7px 12px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--primary-soft)', color: 'var(--primary)',
                  }}
                >
                  @{username} <Chevron open={menuOpen} />
                </button>
                {menuOpen && (
                  <div role="menu" style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 180,
                    background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
                    overflow: 'hidden', boxShadow: 'var(--shadow-lift)', zIndex: 20, padding: '4px 0',
                  }}>
                    <a onClick={() => { setMenuOpen(false); go('profile'); }} className="q-menuitem" style={menuItem}>Profile</a>
                    <a onClick={() => { setMenuOpen(false); go('home'); }} className="q-menuitem" style={menuItem}>Log out</a>
                  </div>
                )}
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <a onClick={() => go('login')} className="q-link q-link-ink" style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>Sign in</a>
              <Btn variant="primary" size="md" onClick={() => go('register')}>Join free</Btn>
            </React.Fragment>
          )}
        </div>
      </div>
    </header>
  );
};

const menuItem = {
  display: 'block', padding: '9px 16px', fontSize: 13, fontWeight: 500,
  color: 'var(--ink)', cursor: 'pointer',
  transition: 'background-color 150ms var(--ease-out)',
};

const Footer = () => {
  const COLS = [
    { heading: 'Product', links: ['Discover', 'How it works', 'For creators', 'Pricing'] },
    { heading: 'Communities', links: ['Daily AI Builders', 'Chess Tactics', 'Modern CSS', 'Browse all'] },
    { heading: 'Company', links: ['About', 'Blog', 'Contact'] },
    { heading: 'Legal', links: ['Privacy', 'Terms', 'Cookies'] },
  ];
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)', padding: '40px 0 32px' }}>
      <div className="q-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4, 1fr)', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--primary)' }}>Quorum</div>
            <p style={{ marginTop: 8, maxWidth: '28ch', fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>
              A daily ritual for niche communities.
            </p>
          </div>
          {COLS.map(col => (
            <div key={col.heading}>
              <h5 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>
                {col.heading}
              </h5>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="q-link-muted" style={{ fontSize: 13, transition: 'color 150ms var(--ease-out)' }}
                       onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                       onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 20, fontSize: 12, color: 'var(--muted)' }}>
          <span>© 2026 Quorum. All rights reserved.</span>
          <span>Made for niche communities, one question at a time.</span>
        </div>
      </div>
    </footer>
  );
};

Object.assign(window, { Nav, Footer });
