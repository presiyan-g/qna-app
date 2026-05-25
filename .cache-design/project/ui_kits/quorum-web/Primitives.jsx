/* Quorum UI Kit · Primitives
   Tiny reusable building blocks. Exported to window so other
   Babel scripts in the page can use them. */

const Eyebrow = ({ children, style }) => (
  <p className="q-eyebrow" style={{ margin: 0, ...style }}>{children}</p>
);

const Meta = ({ children, style }) => (
  <span className="q-meta" style={style}>{children}</span>
);

const SerifI = ({ children, color }) => (
  <span className="q-serif-i" style={color ? { color } : undefined}>{children}</span>
);

/** Variants: primary | clay | lake | ghost | accent | soft */
const Btn = ({ variant = 'primary', size = 'lg', as: As = 'button', children, onClick, type, style, className = '' }) => {
  const sz = size === 'md' ? 'q-btn-md' : size === 'sm' ? 'q-btn-sm' : '';
  const v = `q-btn-${variant}`;
  return (
    <As
      type={type}
      onClick={onClick}
      className={`q-btn ${v} ${sz} ${className}`}
      style={style}
    >
      {children}
    </As>
  );
};

const Card = ({ children, hoverable, onClick, style, padding }) => (
  <div
    className={`q-card ${hoverable ? 'q-card-h' : ''}`}
    onClick={onClick}
    style={{ ...(padding !== undefined && { padding }), ...style }}
  >
    {children}
  </div>
);

const Chip = ({ variant = 'primary', children }) => (
  <span className={`q-chip q-chip-${variant}`}>{children}</span>
);

const Pill = ({ variant = 'primary', children }) => (
  <span className={`q-pill q-pill-${variant}`}>{children}</span>
);

const Avatar = ({ size = 34, radius = 9, children, style }) => (
  <span
    className="q-avatar"
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      fontSize: Math.round(size * 0.5),
      ...style,
    }}
  >
    {children}
  </span>
);

/** A 22x22 soft-primary disc with a primary check inside — matches
    the "✓" treatment in the For Creators checklist. */
const CheckDot = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="11" fill="var(--primary-soft)" />
    <path d="M6.5 11.5L9.5 14.5L15.5 8" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const Chevron = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden
    style={{ transition: 'transform 200ms var(--ease-out)', transform: open ? 'rotate(180deg)' : 'none' }}>
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Arrow = ({ dir = 'right', style }) => {
  const ch = dir === 'right' ? '→' : dir === 'left' ? '←' : '↑';
  return <span style={{ display: 'inline-block', ...style }}>{ch}</span>;
};

/** Section gutter — px-6 py-16 / md:px-12 md:py-20 in the codebase */
const Section = ({ children, id, style, padded = true, narrow = false, background }) => (
  <section
    id={id}
    style={{
      padding: padded ? '64px 0' : 0,
      background,
      ...style,
    }}
  >
    <div
      style={{
        maxWidth: narrow ? 'var(--container-doc)' : 'var(--container-max)',
        margin: '0 auto',
        padding: '0 24px',
      }}
    >
      {children}
    </div>
  </section>
);

Object.assign(window, { Eyebrow, Meta, SerifI, Btn, Card, Chip, Pill, Avatar, CheckDot, Chevron, Arrow, Section });
