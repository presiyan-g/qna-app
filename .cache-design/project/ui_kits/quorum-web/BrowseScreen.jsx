/* Quorum UI Kit · Browse screen
   Mirrors qna-web/src/app/communities/page.tsx */

const { Btn, Card, Chip, Eyebrow, Avatar, COMMUNITIES } = window;

const BrowseScreen = ({ go }) => {
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('');
  const categories = Array.from(new Set(COMMUNITIES.map(c => c.category)));
  const filtered = COMMUNITIES.filter(c => {
    const matchesQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.description.toLowerCase().includes(q.toLowerCase());
    const matchesCat = !cat || c.category === cat;
    return matchesQ && matchesCat;
  });

  return (
    <main style={{ flex: 1, background: 'var(--paper)', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Eyebrow>Communities</Eyebrow>
        <h1 style={{ margin: '12px 0 32px', fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Find a recurring challenge worth showing up for.
        </h1>

        <form onSubmit={e => e.preventDefault()} style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="q-search">
            <svg className="q-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="q-input"
              type="search"
              placeholder="Search by community name"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <select
            className="q-select q-select-solid"
            value={cat}
            onChange={e => setCat(e.target.value)}
            style={{ width: 220, minHeight: 48, fontSize: 14 }}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Btn variant="primary" size="md" as="button" type="submit" style={{ minHeight: 48 }}>Search</Btn>
          {(q || cat) && (
            <Btn variant="ghost" size="md" onClick={() => { setQ(''); setCat(''); }} style={{ minHeight: 48 }}>Clear</Btn>
          )}
        </form>

        <div className="q-layout-3col">
          {filtered.map(c => (
            <Card key={c.slug} hoverable onClick={() => go('community', { slug: c.slug })}>
              <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={40} radius={10}>{c.emoji}</Avatar>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>{c.name}</div>
                  <div style={{ marginTop: 3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                    {c.memberCount.toLocaleString('en-US')} members
                  </div>
                </div>
              </header>
              <p style={{ margin: '14px 0', fontSize: 13, lineHeight: 1.5 }}>{c.description}</p>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Chip variant="primary">{c.cadence}</Chip>
                  <Chip variant="line">{c.category}</Chip>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Closes in {c.closesIn}</span>
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="q-empty" style={{ marginTop: 32 }}>
            <Eyebrow>Nothing found</Eyebrow>
            <h3 style={{ marginTop: 8 }}>No matches — <SerifI>yet.</SerifI></h3>
            <p>Try a different search, drop the category filter, or browse the full list.</p>
            <div style={{ marginTop: 18 }}>
              <Btn variant="ghost" size="md" onClick={() => { setQ(''); setCat(''); }}>Clear filters</Btn>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

Object.assign(window, { BrowseScreen });
