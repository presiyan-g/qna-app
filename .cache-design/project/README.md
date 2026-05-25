# Quorum Design System

> A daily ritual for niche communities — one question, one answer, one conversation at a time.

This design system documents the visual language, content tone, components, and screens of **Quorum**, a platform for scheduled Q&A communities. Use it to design any new surface — a marketing page, an admin tool, a slide deck, a brand asset — and have it feel native to Quorum on day one.

---

## What is Quorum?

Quorum is a platform for **scheduled Q&A communities**. A creator builds a niche community (e.g. *Daily AI Builders*, *Chess Tactics Daily*, *Modern CSS Daily*), schedules one multiple-choice question on a cadence (daily / weekly / custom), members answer in 30 seconds, see instant grading + explanation, and only then unlock the discussion thread.

The product loop is:

> **scheduled question → answer → instant grading → explanation → comments → leaderboard → repeat**

Quorum is not a generic quiz app. It positions itself as:

> *A platform for recurring knowledge challenges in niche communities.*

### Surfaces

- **Web app** (Next.js): landing, browse, community detail, question detail, leaderboard, broadcasts, creator dashboard, admin
- **Mobile app** (Expo / React Native): my communities, today's question, result, profile
- Shared backend: Drizzle + Postgres (Neon), R2 file storage, JWT auth

---

## Sources used to build this system

- **GitHub repo:** [`presiyan-g/qna-app`](https://github.com/presiyan-g/qna-app) (`master` branch)
  - `qna-web/src/app/_components/landing/*` — Hero, Nav, Footer, CTA, How-it-works, ForCreators
  - `qna-web/src/app/communities/**` — community detail, question detail, broadcasts, leaderboard
  - `qna-web/src/app/dashboard/*` — creator dashboard
  - `qna-web/src/app/(auth)/*` — login / register forms
  - `qna-web/src/app/globals.css` — Tailwind v4 `@theme inline` color + font tokens (the canonical source of truth)
  - `PROJECT.md` — product specification
- The mobile app (`qna-mobile/`) was **not** explored in depth; visuals here are derived from the web codebase. See [Caveats](#caveats) below.

> Want to make this design system *better*? Open the upstream repo and read the live components — every interaction, role check, and edge case lives there. This document is a stylized fingerprint of that codebase, not a replacement for it.

---

## How the user wants this evolved

The original codebase ships with one action color (the deep green `--color-primary`) and a single gold accent. The user asked for:

1. **More action colors** so secondary / tertiary actions feel intentional rather than vanilla.
2. **Hover animations** that feel alive but never gimmicky.
3. **Modern feel — without degrading performance.**

This system layers an **action color family** (primary green stays the headline; a warm clay-orange handles secondary/destructive-safe actions; a desaturated lake blue handles informational / link-style actions; gold remains the in-content highlight) and a **motion system** built entirely on CSS transitions of `transform`, `opacity`, `background-color`, and `box-shadow` — GPU-cheap, no JS, no layout thrash.

---

## File index

| File / folder | What it is |
|---|---|
| `README.md` | This document — brand, content, visual foundations, iconography |
| `SKILL.md` | Agent-Skills front-matter; lets this folder work as a Claude Code skill |
| `colors_and_type.css` | Single source of truth for color + type CSS variables (both raw and semantic) |
| `fonts/` | Self-hosted woff2 files for Geist Sans, Geist Mono, Instrument Serif |
| `assets/` | Logos, brand marks, sample community covers, generic illustrations |
| `preview/` | Static HTML cards that populate the Design System tab (one card per concept) |
| `ui_kits/quorum-web/` | High-fidelity recreation of the web app — JSX components + interactive `index.html` |

---

## Content fundamentals

Quorum's voice is **warm, calm, and editorial**. It reads like a thoughtful product newsletter, not like a SaaS product brochure.

### Person & tone

- **Second person** when talking to members ("You answer in 30 seconds.")
- **First-person plural** is avoided. The product never says "we built this" in product copy.
- **Imperative** for CTAs ("Pick a community", "Browse communities", "Start your own", "Find your people.")
- **Calm declarative** for body copy. No exclamation marks except in rare community names.
- **No marketing puffery** — never says "revolutionary", "AI-powered", "best-in-class". When AI ships in v1 (draft generation), the copy is dry: "Draft with AI".

### Mixed serif italic emphasis

The single most identifiable copy pattern is a sans-serif headline with one phrase in **Instrument Serif italic**:

> Find your people. *One question at a time.*
> A daily loop that *closes.*
> Building a niche community is *easier than a podcast.*
> Find the corner of the internet *that fits you.*
> Pick a community. *Answer today's question.*

The italic phrase is always the **emotional payoff** — the part you'd say with feeling if you were reading it out loud. It uses the brand primary color, never the body ink.

### Eyebrows

Every major section starts with an 11px **bold uppercase eyebrow**, `letter-spacing: 0.16em`, in primary green:

> `DISCOVER DAILY Q&A COMMUNITIES`
> `FOR CREATORS`
> `HOW IT WORKS`
> `FEATURED COMMUNITIES`
> `LATEST BROADCAST`

These act like newsroom kickers — they orient the reader before the headline lands.

### Casing

- **Sentence case** for everything except eyebrows. Headlines and buttons are *never* Title Case.
- Buttons: "Browse communities →", "Start your own", "Sign in", "Join free", "Create community"
- Page titles: "Find a recurring challenge worth showing up for."
- Status pills: "Live today", "Missing today", "Scheduled" — sentence case.
- **Eyebrows** are the only ALL CAPS surface, and always with the 0.16em tracking.

### Numerics & data

- Member counts: `1,284 members` (comma-grouped, lowercase unit)
- Time-to-close: `12h`, `6h 22m`, `4h` (compact, no leading zero)
- Dates: `Mar 14, 2026, 4:00 PM UTC` (`Intl.DateTimeFormat` with `timeZone: 'UTC'`, `timeZoneName: 'short'`)
- Points: `+10 points`, `0 points` (always with the word "points", never just a number)
- Ranks: `#1`, `#2` (hash prefix, primary green)
- Categories / cadence pills: ALL CAPS, 9px, soft-primary background

### Emoji

Emoji are **member-controlled, not brand-controlled**. Communities pick their own emoji (♟, 🤖, 🎨) as their avatar. Quorum's own marketing surfaces use **zero emoji**. The checkmark in "For creators" is a literal `✓` glyph (U+2713), not an emoji.

### Sample voice

> *"A daily ritual for niche communities."*
> *"It takes 30 seconds. Tomorrow there's another one."*
> *"If you teach something, even a narrow slice of it, you have enough to launch a community."*
> *"No spoilers, no lurkers."*

Short. Concrete. A little dry. Always assumes the reader is smart.

---

## Visual foundations

### Color

The palette is **warm earthy paper-and-ink** with a single forest-green action color and a single gold print-magazine accent. The user-requested expansion adds two more action colors that stay inside the earthy register.

#### Base palette (canonical — preserved from codebase)

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FAF6EC` | Page background. Warm cream, not white. |
| `--card` | `#FFFFFF` | Card surfaces that sit *on* paper. |
| `--line` | `#E9E2CE` | Dividers, borders, hairlines. Warm beige. |
| `--ink` | `#232220` | Body text. Near-black with warm undertone. |
| `--muted` | `#6B6B66` | Secondary text, captions, eyebrows-of-eyebrows. |
| `--primary` | `#1F4032` | Deep forest green. The headline action color. |
| `--primary-soft` | `#F4F1E3` | Tinted background for primary chips, soft buttons, avatar tiles. |
| `--accent` | `#D6A12B` | Antique gold. Used as in-content highlight on dark CTAs and as serif-italic highlight on green-on-green panels. |

#### Action color family (new — extends the system)

The user wanted more action colors. We add two, each tonally compatible with the warm earthy base:

| Token | Hex | Use |
|---|---|---|
| `--action-clay` | `#C2543A` | **Warm clay-orange.** Secondary CTA, "Leave community", warning-but-not-destructive states. |
| `--action-clay-soft` | `#F8E6DE` | Soft clay tint for chips, hover backgrounds, badge fills. |
| `--action-lake` | `#3A6E8F` | **Desaturated lake blue.** Tertiary / informational actions, link-style buttons, "Edit" pills, "Open broadcast" affordances. |
| `--action-lake-soft` | `#E3ECF2` | Soft lake tint for chips and hover trays. |

These are not random — they are pulled toward the existing primary green and gold so a Quorum surface using all four still reads as one palette.

**Semantic mapping** (use this as your default, deviate only with reason):

| Action persona | Color | Examples |
|---|---|---|
| **Engage with what exists** | Forest green (primary) | Submit answer, Join community, Sign in, Manage |
| **Create / author / start something new** | Clay | Start your own, Create, Start your community, Draft question |
| **Informational / passive / open something** | Lake | Edit, Open broadcast, Post comment, Broadcast |
| **Deemphasized secondary** | Ghost (line + ink) | Cancel, Clear filters, "Back to home" |
| **In-content highlight on dark surface only** | Accent gold | "Browse communities →" on the dark CTA band |

**Action priority** on a single surface: green → clay → lake → ghost. Never use two saturated colors as competing CTAs on the same surface — but green + clay *side by side* (e.g. hero "Browse" + "Start your own") works because they represent distinct personas, not competing options.

#### Status colors (preserved)

The codebase already encodes status colors via Tailwind's amber and stone/red palettes. We mirror those rather than reinventing:

| Token | Hex | Use |
|---|---|---|
| `--status-warn-bg` | `#FEF3C7` | "Late answer", "Scheduled" pills (Tailwind amber-100) |
| `--status-warn-fg` | `#92400E` | Text on warn (Tailwind amber-900) |
| `--status-danger-bg` | `#FEE2E2` | Form error backgrounds |
| `--status-danger-fg` | `#B91C1C` | Destructive text + error messages |
| `--status-neutral-bg` | `#E7E5E4` | "Draft", "Deleted" pills (Tailwind stone-200) |
| `--status-neutral-fg` | `#44403C` | Text on neutral (Tailwind stone-700) |

### Type

| Family | Use |
|---|---|
| **Geist** (variable, sans) | Default UI font — body, headlines, buttons, labels |
| **Geist Mono** | Code, monospaced data, fingerprints / IDs in admin |
| **Instrument Serif Italic** (400 weight) | *Emotional emphasis* in headlines, the "payoff" phrase in mixed-italic display |

**All three are loaded from Google Fonts in the canonical app via `next/font`.** This design system mirrors that with self-hosted woff2 files in `fonts/` plus a Google Fonts CDN fallback in HTML cards.

#### Type scale (semantic CSS variables)

| Variable | px | Weight | Tracking | Use |
|---|---|---|---|---|
| `--text-display` | 52 / 46 / 40 | 700 | -0.025em | Hero, page H1 |
| `--text-h1` | 38 / 34 / 32 | 700 | -0.02em | Section headlines |
| `--text-h2` | 30 / 28 | 700 | -0.02em | Card titles, CTA headlines |
| `--text-h3` | 24 | 700 | -0.01em | Sub-section / panel titles |
| `--text-body-lg` | 17 | 400 | normal | Hero body, intro paragraphs |
| `--text-body` | 15 | 400 | normal | Default paragraph |
| `--text-small` | 13 | 400 | normal | Captions, supporting text |
| `--text-xs` | 12 | 400 | normal | Timestamps, fine print |
| `--text-eyebrow` | 11 | 700 | 0.16em | The signature uppercase kicker |
| `--text-meta` | 10 | 700 | 0.1em | Member-count tags, category chips |

Line-heights are tight on display (1.05–1.1), relaxed on body (1.5–1.6).

### Spacing & layout

- Page max-width: **1200px**, with `px-6 md:px-12` gutters
- Auth max-width: **440px**
- Question detail max-width: **900px**
- Section padding: `py-16 md:py-20` for marketing, `py-12 md:py-16` for app screens
- Card padding: 20 px (`p-5`) for standard cards, 28–40 px for hero panels
- Inline gaps: `gap-3` (12px) for tight rows, `gap-6 / gap-9` for major grids

### Border radii

Quorum uses a **mixed-radius system**: cards are softly rounded, buttons are fully pill. Avoid `rounded-md` (4px) — it reads as default-bootstrap.

| Token | px | Use |
|---|---|---|
| `--radius-sm` | 8 | Form inputs, small buttons, image thumbnails |
| `--radius-md` | 10 | Default `rounded-lg` — cards, panels, image previews |
| `--radius-lg` | 14 | Featured cards (community card, hero stack) |
| `--radius-xl` | 20 | CTA bands, "For creators" panel |
| `--radius-pill` | 9999 | All buttons, all chips, all status pills |

### Shadows & elevation

The system runs **almost shadowless**. Cards rely on the warm `--line` hairline against `--paper` for separation. Two shadow tokens, used sparingly:

| Token | Value | Use |
|---|---|---|
| `--shadow-card` | `0 1px 2px 0 rgba(31, 64, 50, 0.04)` | Default card resting elevation (so subtle it's almost invisible — used on hover) |
| `--shadow-lift` | `0 18px 40px -22px rgba(31, 64, 50, 0.28)` | Floating elements: hero stack cards, dropdowns, the focus ring on a hovered featured card |

Notice the shadow color is **tinted with the primary green** (rgba 31, 64, 50). This is what keeps the surface warm even when lifted.

### Backgrounds & imagery

- The base canvas is **paper** (`#FAF6EC`), never pure white.
- Featured-section bands use **soft primary** (`#F4F1E3`) — the "How it works" band is the canonical example. Border-y in `primary/10`.
- The CTA band at the bottom of the landing page is the **only fully saturated primary surface**: deep green background with gold serif-italic highlight inside the headline.
- **No gradients.** No glass-morphism. No glow.
- **No full-bleed photography** in the existing product. Community cover images exist but are user-uploaded photos shown inside `rounded-xl border border-line`, not bleeding.
- **No hand-drawn illustrations.** No repeating patterns / textures.
- This system intentionally **does not invent** new imagery treatments. If you need a hero image, treat it as a contained photo inside a rounded card.

### Hover, press & focus

This is where the user explicitly asked us to push further. The rules:

- **Cards (community card, dashboard card, broadcast, question row):** transition `transform 200ms ease-out` + `box-shadow 200ms ease-out` + `border-color 150ms ease-out`. On hover, lift `-2px`, swap border to `primary`, swap shadow from `none` → `--shadow-card`. *No scale, no rotation.*
- **Primary button:** transition `transform 120ms ease-out` + `box-shadow 200ms ease-out` + `background-color 200ms ease-out`. Hover: shift to `#193428` (5% darker), add a soft `0 6px 16px -8px rgba(31,64,50,0.4)` glow. Active: `transform: translateY(1px)` + `box-shadow: none`.
- **Clay / Lake action buttons:** same shape as primary but with their own glow color (`rgba(194,84,58,0.4)` for clay, `rgba(58,110,143,0.4)` for lake).
- **Line button (secondary / ghost):** border swaps to `primary` and text swaps to `primary` on hover. Background fills with `primary-soft`.
- **Tabs:** active = bottom `2px` primary underline; hover = text fades to `ink` over 150ms.
- **Links:** body links are `text-primary` with no underline by default, `hover:underline`. Footer links are `text-muted` → `text-ink` on hover (no underline).
- **Inputs:** focus ring is `2px ring-primary/20` *plus* border swap to `primary`. No bright outline.
- **Focus visible:** every interactive element relies on the same primary-tinted ring, never the browser default blue.

All motion uses CSS transitions only — never JS-driven animation, never `transition: all`, always a finite property list. This keeps the renderer happy and the perceived weight light.

### Borders

- Default border: `1px solid var(--line)` (`#E9E2CE`)
- Active / hovered card border: `1px solid var(--primary)`
- Tab underline: `2px solid var(--primary)` (bottom edge only)
- Tab inactive underline: `2px solid transparent` (reserves the space so hover doesn't shift layout)
- Dotted / dashed: used only for **empty states** (e.g. "No broadcasts yet" panel uses `border-dashed`)

### Transparency & blur

- **Almost none.** The brand explicitly avoids glassy effects.
- One exception: the CTA band uses `text-paper/75` for its sub-headline (paper at 75% opacity over green) — this is the only "transparency-as-style" in the system. Don't add more.
- No backdrop blur. No semi-transparent navs.

### Layout rules

- Top nav is **not fixed**. It scrolls with the page. (`relative border-b border-line bg-paper`)
- Footer is sticky-bottom via flex column on `<main>`, not via fixed positioning.
- App pages use a two-column layout (`grid` with `[1fr_300px]` or similar) for sidebar + main content.
- Mobile breakpoint is `md:` (768px). Below that, navs collapse to a hamburger and grids stack to single column.

### Card anatomy

```
┌──────────────────────────────────────┐  <-- 1px solid --line, --radius-lg (14px), bg-card
│  ┌──┐  Community name                │
│  │🤖│  1,284 MEMBERS                 │
│  └──┘                                │
│                                      │
│  When designing an MCP server…       │
│                                      │
│  [DAILY]  [AI]            View →     │
└──────────────────────────────────────┘
```

- Avatar tile: 34×34, `rounded-[9px]`, `bg-primary-soft`, emoji/initials at 17px
- Eyebrow: 10px uppercase, `text-muted`
- Body: 13px
- Footer: pills (9px ALL CAPS) on left, hover-link on right
- Hover: see above

---

## Iconography

### Approach

Quorum uses **almost no icons**. The codebase's most-used "icon" is the literal `✓` glyph in the For Creators checklist. The few SVGs that exist are inline and tiny (the dropdown chevron in `UserMenu.tsx` is a 10×10 hand-drawn path).

Mascot icons, isometric flat icons, neumorphic icon sets — **none** of those fit. If you need icons for new surfaces, follow these rules:

1. **First choice: use a Unicode glyph.** `✓` `→` `←` `·` `●` are all used in production.
2. **Second choice: use [Lucide](https://lucide.dev/) at `1.6` stroke-width, `currentColor`.** Lucide's "warm sans" feel matches Geist. Use it via the CDN: `<script src="https://unpkg.com/lucide@latest"></script>` and `<i data-lucide="message-circle"></i>`. *This is a substitution we are flagging — the upstream codebase doesn't ship an icon library; we picked Lucide as the closest match and registered it here for forward designs.*
3. **Third choice: a 16×16 hand-drawn SVG** with `stroke-width="1.6"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `currentColor`, no fill. Match the chevron in `UserMenu.tsx`.
4. **Never** use emoji as icons in product chrome. Emoji belongs only to **user-chosen community avatars**.
5. **Never** use a vendor's brand glyph as an icon (no GitHub octocat, no AI provider logos) unless it's specifically about that vendor.

### Asset files in `assets/`

| File | Purpose |
|---|---|
| `quorum-wordmark.svg` | The Quorum wordmark — extracted from the Nav component's `font-extrabold tracking-tight text-primary` treatment, made into a static SVG for use in headers, decks, favicon |
| `quorum-mark.svg` | A monogram "Q" mark — derived from the wordmark, for use as a favicon, app icon, or small contexts |
| `community-tile-ai.svg`, `community-tile-chess.svg`, `community-tile-css.svg` | The three seed community avatar tiles, sized at 88×88 (the community-header avatar size) for use in mocks |
| `chevron-down.svg` | The 12×12 chevron used in `UserMenu.tsx`, extracted for reuse |
| `check.svg` | The For Creators `✓` rendered as a soft-primary disc, 22×22 |

### Things this design system does NOT ship

- **No icon font.** Quorum's web codebase has no `react-icons`, `heroicons`, `lucide-react`, or webfont icon set. We flag this as something to confirm with the user before adopting Lucide.
- **No imagery library.** Hero illustrations / spot art don't exist in the product. If a mock needs them, treat them as placeholders.
- **No mobile UI kit.** The Expo app exists in the repo (`qna-mobile/`) but we didn't explore it; mobile mocks for this system should use the iOS / Android starter frames with Quorum's web typography and colors until the mobile UI gets its own pass.

---

## Caveats

- **Mobile app not explored.** The Expo source at `qna-mobile/` was not read. Any mobile mock derived from this system inherits the web vocabulary; it may not reflect actual mobile UI choices.
- **Icon library is a substitution.** The upstream codebase has no icon library. We picked Lucide as the closest stylistic match to Geist + the inline 1.6-stroke chevron. Confirm with the design owner.
- **Fonts.** Geist Sans, Geist Mono, and Instrument Serif are loaded via Google Fonts CDN in HTML cards. Self-hosted woff2 files in `fonts/` are stubs — production designs should pull from `next/font` (or the equivalent) for subset optimization.
- **Action color expansion is new.** Clay-orange and Lake-blue are introduced *by this system*, in response to the brief; they do not appear in the upstream codebase yet. Validate with the brand owner before rolling into production.

---

## Index for designers (and agents)

- Start with **`colors_and_type.css`** — every other file depends on these variables.
- Look at **`preview/`** for atomic specimen cards (one card per token / state / component).
- Look at **`ui_kits/quorum-web/index.html`** for the full interactive recreation of the marketing site + community detail + answer flow.
- Read **`SKILL.md`** if you're plugging this into Claude Code.
