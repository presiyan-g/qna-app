/* Quorum UI Kit · ShareCard modal
   Printable, shareable card for a correct answer. */

const { Btn, SerifI } = window;

const ShareCardModal = ({ q, community, choice, onClose }) => {
  // Close on backdrop click or Esc
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="q-modal-backdrop" onClick={onClose}>
      <div className="q-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <div>
            <p className="q-eyebrow" style={{ margin: 0 }}>Share</p>
            <h3 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Your correct answer.
            </h3>
          </div>
          <button onClick={onClose} style={{
            border: 0, background: 'transparent', color: 'var(--muted)',
            fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>

        <div className="q-share-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(250,246,236,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
              }}>{community.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{community.name}</div>
                <div style={{ fontSize: 10, opacity: .7, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{community.cadence}</div>
              </div>
            </div>
            <span className="wm">Quorum</span>
          </div>

          <p style={{
            margin: '24px 0 16px', fontSize: 22, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em',
            position: 'relative', zIndex: 1,
          }}>
            "{q.prompt}"
          </p>

          <div style={{
            background: 'rgba(250,246,236,0.10)', border: '1px solid rgba(250,246,236,0.2)',
            borderRadius: 10, padding: 14, position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A2A28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--accent)' }}>
                Got it
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                {choice.position}. {choice.label}
              </div>
            </div>
          </div>

          <p style={{
            margin: '20px 0 0', fontSize: 12, opacity: .7,
            position: 'relative', zIndex: 1, textAlign: 'right',
          }}>
            <SerifI color="rgba(250,246,236,0.85)">One question at a time.</SerifI>
          </p>
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn variant="ghost" size="md" onClick={onClose}>Close</Btn>
          <Btn variant="primary" size="md" onClick={() => { window.print(); }}>
            Save as PNG
          </Btn>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ShareCardModal });
