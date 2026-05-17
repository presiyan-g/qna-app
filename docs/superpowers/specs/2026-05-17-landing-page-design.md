# Landing page design — Quorum (qna-web)

**Date**: 2026-05-17
**Owner**: Presiyan
**Status**: Design approved, ready for implementation planning
**Implements**: First slice of the qna-app build sequence — landing page UI only, no auth, no DB
**Location**: `qna-web/src/app/page.tsx` (replaces the default Next.js scaffold)

---

## 1. Goal & audience

Build the public landing page that a first-time visitor lands on. The page sells the **member-first** pitch: discover and join a niche daily-Q&A community. The "Start your own community" path exists but is secondary.

**Primary CTA**: Browse communities (later wired to `/discover` — for v1, this is a placeholder anchor).
**Secondary CTA**: Start your own (later wired to `/communities/new`).

**Out of scope for this slice**:
- Authentication (no register/login forms wired up — CTAs are static links/anchors)
- Real community data (all featured communities are hand-coded mock content in the page)
- Database access
- Mobile app changes

---

## 2. Brand & wordmark

- **Working name**: **Quorum** (placeholder; chosen for short, calm, community-meaning fit). Easy to find/replace later.
- **Wordmark**: text-only, weight 800, letter-spacing −0.01em, primary color. No logo mark for v1.
- **Tagline (footer)**: "A daily ritual for niche communities."

---

## 3. Visual system

### 3.1 Color palette — "Editorial Forest"

All values defined as CSS custom properties in `globals.css` (replacing the current placeholder vars). Light mode only — strip the existing `prefers-color-scheme: dark` block.

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FAF6EC` | Page background (warm ivory; "not white") |
| `--card` | `#FFFFFF` | Card / surface background |
| `--border` | `#E9E2CE` | Card borders, dividers |
| `--primary` | `#1F4032` | Deep forest green — primary buttons, headings, accents |
| `--primary-soft` | `#F4F1E3` | Pale tint of primary — used for the How-it-works strip background and emoji tile backgrounds |
| `--text` | `#232220` | Default text |
| `--muted` | `#6B6B66` | Secondary text, meta labels |
| `--accent` | `#D6A12B` | Mustard accent — used sparingly: CTA-band button on dark, serif italic accent on dark backgrounds |

Subtle shadows: `0 18px 40px -22px rgba(31, 64, 50, 0.28)` for floating community cards.

### 3.2 Typography

- **Sans (display + body)**: **Geist Sans** — already loaded via `next/font/google` in `layout.tsx`. Keep as the default `font-sans`.
- **Mono**: **Geist Mono** — already loaded. Not used on landing page; keep loaded.
- **Editorial accent**: **Instrument Serif** (italic only, weight 400). Loaded as a new `next/font/google` import. Used **only** for emphasized phrases inside headlines via a `.serif-italic` utility class. Examples in copy: "*One question at a time.*", "*that fits you.*", "*easier than a podcast.*", "*Answer today's question.*", "*closes.*"

Type scale (approximate, will translate to Tailwind utilities):
- h1 (hero): ~52px / line-height 1.05 / weight 700 / tracking −0.025em
- h2 (section title): ~36px / 1.1 / 700 / −0.02em
- h3 (creator pitch, CTA-band): ~30–38px / 1.1 / 700
- body / lede: 15–17px / 1.55
- eyebrow / label: 11px / uppercase / letter-spacing 0.16em / weight 700 / primary color
- card titles: 14–16px / 700
- meta / footnote: 10–12px / muted

### 3.3 Spacing & radius

- Section vertical padding: 56px (desktop), 40px (tablet), 32px (mobile)
- Container max-width: ~1200px, centered with 48px gutters (desktop); 24px gutters on mobile
- Card radius: 14–16px
- Pill/button radius: 999px (fully rounded)
- Big surface radius (CTA band, creator card): 20px

---

## 4. Page structure

Final order, top to bottom:

1. **Top nav** (sticky-on-scroll considered for v1.1; not sticky in v1)
2. **Hero** — platform-of-communities
3. **Featured communities** — 6-card grid
4. **How it works** — compact tinted strip with 3 inline steps
5. **For creators** — split card (copy + checklist)
6. **Final CTA band** — forest-green slab
7. **Footer** — wordmark + 4 link columns + legal line

### 4.1 Top nav

- Left: wordmark "Quorum" (primary color)
- Center: text links — **Discover**, **For creators** (no "How it works" link since it's now an inline strip; "How it works" is still in the footer for SEO/sitemap completeness — intentional asymmetry)
- Right: **Sign in** (ghost) + **Join free** (primary pill button)
- Horizontal padding: 48px desktop / 24px mobile
- Border-bottom: 1px `--border`
- Mobile (<768px): center links and right-side CTAs collapse behind a hamburger icon (only the wordmark + hamburger remain on the bar). Tapping the hamburger toggles a full-width inline drawer that pushes content down (not an overlay) with the links and CTAs stacked vertically. Closing happens via tapping the hamburger again or scrolling.

### 4.2 Hero

Two-column grid (1.05fr / 1fr on desktop; stacks on mobile, cards stack below copy).

**Left column:**
- Eyebrow: "Discover daily Q&A communities"
- h1: **"Find your people. *One question at a time.*"** (italic span = serif)
- Lede: "Niche communities — from AI builders to chess tacticians — publish one question a day. You answer in 30 seconds, see the explanation instantly, and unlock the discussion only after you've taken a swing."
- CTA row: **Browse communities →** (primary) + **Start your own** (secondary)

**Right column — community stack** (decorative, not interactive in v1):
Three small community cards, absolutely positioned, slightly rotated, with subtle drop shadows, overlapping. Each card shows:
- Emoji tile (34×34, `--primary-soft` background, rounded 9px)
- Community name (weight 700, 14px)
- Member count meta (uppercase, 10px, muted)
- Sample question text (13px, 1.45 line-height)

Initial three:
- Chess Tactics Daily (♟, 812 members) — "White to move. Find the forced mate in 3."
- Daily AI Builders (🤖, 1,284 members) — "When designing an MCP server, what should you expose first?"
- Modern CSS Daily (🎨, 496 members) — "Which container query unit scales with the parent's inline-size?"

Rotations: −3.5° / +1.5° / −1°. Stagger via `top` and `left` so they overlap diagonally.

### 4.3 Featured communities

- Centered section header: eyebrow "Featured communities" + h2 "Find the corner of the internet *that fits you.*"
- 3-column grid of 6 community cards on desktop; 2-col at tablet; 1-col on mobile.
- Each card (vertical flex, 14px radius, 20px padding, 12px gap):
  - Top row: emoji tile + community name + member count meta
  - Today's question text (13px, 1.5 line-height)
  - Footer row: "Active now" pill (primary-soft background, primary text, uppercase 9px) on the left, "Closes Xh Ym" on the right
- Hover state: subtle translateY(−2px) + slight shadow

Initial 6 communities (hard-coded for v1):
1. Daily AI Builders (🤖, 1,284)
2. Chess Tactics Daily (♟, 812)
3. Modern CSS Daily (🎨, 496)
4. Macro & Markets (📈, 2,103)
5. Biotech Reading Club (🧬, 340)
6. Contracts & Clauses (⚖️, 1,022)

### 4.4 How it works (compact strip)

Tinted band that spans the full width (no max-width container — bleeds edge-to-edge).

- Background: `--primary-soft`
- Borders: 1px `rgba(31,64,50,0.08)` top and bottom
- Padding: 28px vertical, 48px horizontal
- Grid: `auto 1fr 1fr 1fr` — label cell + 3 step cells

**Label cell** (left, right-bordered):
- Eyebrow "How it works"
- Tagline: "A daily loop that *closes.*" (italic = serif)

**Each step**:
- Small numbered circle (22px, primary background, ivory text, weight 700)
- Step title (13px, weight 700)
- Step body (12px, muted, 1.45 line-height)

Steps:
1. **Pick a community** — "Join one that fits — daily, weekly, your call."
2. **Answer the question** — "Submit in seconds. See the explanation instantly."
3. **Unlock the discussion** — "Comments open only after you've answered."

Mobile: collapse the 4-col grid into a stacked layout (label on top, 3 steps below).

### 4.5 For creators

Single card (white, 1px border, 20px radius, 40px padding) with a 2-column grid inside.

**Left column:**
- Eyebrow "For creators"
- h3: "Building a niche community is *easier than a podcast.*"
- Paragraph: "If you teach something — even a narrow slice of it — you have enough to launch a community. Schedule one question. Members answer, learn, talk. You see exactly who shows up."
- CTA: **Start your community →** (primary pill)

**Right column — checklist** (4 items, 14px gap):
- ✓ **Schedule recurring questions** — daily, weekly, or your own cadence.
- ✓ **Instant grading + explanations** — members learn the moment they answer.
- ✓ **Discussion unlocks after answering** — no spoilers, no lurkers.
- ✓ **Leaderboards & broadcasts** — keep the regulars coming back.

Each ✓ sits in a 22px circle (`--primary-soft` bg, primary text). Bold parts stand out; descriptive tails are normal weight.

Mobile: stack columns; checklist sits below the copy block.

### 4.6 Final CTA band

Full-width slab (still inside the page's max-width container, with 20px radius and 48px outer margin).

- Background: `--primary` (forest green)
- Text: `--bg` (ivory) for the headline and paragraph; muted ivory for the supporting line
- h3: "Pick a community. *Answer today's question.*" — italic span uses `--accent` (mustard) for contrast on dark
- Sub: "It takes 30 seconds. Tomorrow there's another one."
- CTA row, centered: **Browse communities →** (background = mustard accent, text = `#2A2A28`) + **Start your own** (transparent button with semi-transparent ivory border)

### 4.7 Footer

- 5-column grid: 1.5fr (wordmark + tagline) + 4× 1fr (link columns)
- Columns:
  - **Product**: Discover, How it works, For creators, Pricing
  - **Communities**: Daily AI Builders, Chess Tactics, Modern CSS, Browse all
  - **Company**: About, Blog, Contact
  - **Legal**: Privacy, Terms, Cookies
- Column heading: 11px uppercase eyebrow in primary
- Links: 13px, muted (no underline)
- Legal row below grid: top-border 1px, justified between, 12px muted text
  - Left: "© 2026 Quorum. All rights reserved."
  - Right: "Made for niche communities, one question at a time."

For v1, all footer links are placeholder anchors (`#`) — they don't need to resolve.

---

## 5. Responsive behavior

| Breakpoint | Hero | Featured grid | How it works | Creators | Footer |
|---|---|---|---|---|---|
| ≥1024px | 2-col side by side | 3-col | label + 3 steps inline | 2-col | 5-col |
| 640–1024px | 2-col, smaller text | 2-col | label on top, 3 steps in row | 1-col stacked | 2-col (links wrap) |
| <640px | 1-col, cards stack below copy with reduced rotation | 1-col | fully stacked vertical | 1-col stacked | 1-col stacked |

Nav on mobile: hamburger that toggles a stacked drawer with Discover, For creators, Sign in, Join free.

---

## 6. Component inventory

The landing route stays at `qna-web/src/app/page.tsx` as a server component that composes section components. To keep files focused per AGENTS.md, split sections into separate components under `qna-web/src/app/_components/landing/`. (Not using a `(marketing)` route group yet — single marketing page in v1, would be premature ceremony.)

- `Nav.tsx` — top nav (server component). Imports `MobileMenu.tsx` for the hamburger.
- `MobileMenu.tsx` — small `"use client"` component owning the open/closed state of the mobile drawer. Receives the link list as props from `Nav.tsx`.
- `Hero.tsx` — hero section, stacked community cards rendered inline (no client interactivity).
- `FeaturedCommunities.tsx` — grid wrapper.
- `CommunityCard.tsx` — single card used by `FeaturedCommunities`.
- `HowItWorks.tsx` — compact strip.
- `ForCreators.tsx` — split-card section.
- `CtaBand.tsx` — final dark slab.
- `Footer.tsx` — bottom footer.

All components are server components except `MobileMenu.tsx`. Mock data (the 6 featured communities and the 3 hero stack communities) lives in a single `qna-web/src/app/_components/landing/_data/communities.ts` so it's easy to find and later replace with a service call.

---

## 7. Fonts

Update `qna-web/src/app/layout.tsx`:
- Keep Geist Sans + Geist Mono imports
- Add `Instrument_Serif` from `next/font/google` with `weight: '400'`, `style: 'italic'`, `subsets: ['latin']`
- Expose as `--font-instrument-serif` CSS variable on the `<html>` element

In `globals.css`:
- Replace the existing palette block with the Editorial Forest tokens
- Remove the `prefers-color-scheme: dark` block
- Set `body { font-family: var(--font-geist-sans), system-ui, sans-serif; }`
- Add a `.serif-italic` utility: `font-family: var(--font-instrument-serif), Georgia, serif; font-style: italic; font-weight: 400; color: var(--primary);`

---

## 8. Metadata

Update `<head>` metadata in `layout.tsx`:
- `title`: "Quorum — A daily ritual for niche communities"
- `description`: "Find niche communities that publish one question a day. Answer in 30 seconds, see the explanation instantly, and unlock the discussion only after you've taken a swing."
- (OG image + favicon left for a later slice)

---

## 9. Acceptance criteria

The slice is done when:
1. Visiting `/` in the dev server (`npm run dev -w qna-web`) renders the landing page exactly as specified above.
2. The page is fully responsive across the breakpoints in §5.
3. No console errors or warnings in the browser.
4. `npm run lint -w qna-web` passes.
5. The page is server-rendered (no `"use client"` directives except for `MobileMenu.tsx`).
6. The old Next.js scaffold (Vercel/Templates/Documentation buttons) is gone.

---

## 10. Out of scope for this slice (deferred)

- Real navigation routes — `/discover`, `/communities/new`, etc. (links are placeholders)
- Authenticated state in the nav (only "Sign in" / "Join free" shown — no "Logged in as X" yet)
- Real featured-community data from DB (will replace mock data when community schema lands)
- Sticky nav on scroll
- Animations beyond simple hover transforms
- Dark mode
- A11y deep pass beyond semantic HTML and contrast checks (will be revisited before launch)
- Testimonials, FAQ, product walkthrough sections (chose to skip in brainstorm)
