# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public landing page for Quorum (`qna-web`) per the approved design spec at `docs/superpowers/specs/2026-05-17-landing-page-design.md`. Replaces the default Next.js scaffold at `/`.

**Architecture:** Single server-rendered route at `qna-web/src/app/page.tsx` that composes section components from `qna-web/src/app/_components/landing/`. One small `"use client"` component (`MobileMenu.tsx`) owns the hamburger drawer state. All copy and community data is hard-coded for v1; mock community data lives in a single `_data/communities.ts` module so it's trivial to swap for real DB queries later. Styling uses Tailwind v4's `@theme inline` to expose Editorial Forest palette tokens as utility classes (e.g. `bg-paper`, `text-ink`, `border-line`).

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Geist Sans / Geist Mono / Instrument Serif (all via `next/font/google`).

**Testing approach (note):** This is a purely presentational marketing page with no business logic, no data fetching, and no user input handling beyond a mobile menu toggle. The TDD-style unit tests the writing-plans skill normally prescribes would be cargo-cult here — there's nothing meaningful to assert beyond "the JSX I wrote renders." We deliberately do **not** add a test framework for this slice (Vitest + RTL would mean a new dependency tree, config, and example tests for one trivial component). Instead, each task's verification is: **(a)** visit the dev-server URL and visually confirm the section renders, **(b)** check responsive behavior at 1280 / 768 / 375 widths via browser devtools, and **(c)** the final task runs `npm run lint -w qna-web` and `npm run build -w qna-web` as the gate. When the auth slice arrives (real logic, real state) we'll add Vitest + RTL then.

**Total tasks:** 12. Each ends with a commit. The page becomes incrementally more "real" with each task — by Task 3 it has palette + fonts + section placeholders, by Task 12 it's the finished design.

---

## File map (built up across tasks)

| Path | Action | Task | Purpose |
|---|---|---|---|
| `qna-web/src/app/layout.tsx` | modify | 1 | Add Instrument Serif font, update metadata, strip dark mode class behavior |
| `qna-web/src/app/globals.css` | modify | 1 | Replace palette with Editorial Forest tokens via `@theme inline`, add `.serif-italic` utility, remove `prefers-color-scheme: dark` block |
| `qna-web/src/app/page.tsx` | modify | 2, then re-touched in 4–11 | Landing shell composing section components |
| `qna-web/src/app/_components/landing/_data/communities.ts` | create | 3 | Mock data for hero stack (3) + featured grid (6) |
| `qna-web/src/app/_components/landing/Nav.tsx` | create | 4 | Top nav (server component) |
| `qna-web/src/app/_components/landing/MobileMenu.tsx` | create | 4 | Hamburger drawer (`"use client"`) |
| `qna-web/src/app/_components/landing/Hero.tsx` | create | 5 | Hero with overlapping community card stack |
| `qna-web/src/app/_components/landing/CommunityCard.tsx` | create | 6 | Single community card used in featured grid |
| `qna-web/src/app/_components/landing/FeaturedCommunities.tsx` | create | 7 | 6-card grid section |
| `qna-web/src/app/_components/landing/HowItWorks.tsx` | create | 8 | Compact tinted strip with 3 inline steps |
| `qna-web/src/app/_components/landing/ForCreators.tsx` | create | 9 | Split-card section |
| `qna-web/src/app/_components/landing/CtaBand.tsx` | create | 10 | Forest-green CTA slab |
| `qna-web/src/app/_components/landing/Footer.tsx` | create | 11 | Wordmark + link columns + legal line |

---

## Task 1: Palette tokens, Instrument Serif font, metadata

**Files:**
- Modify: `qna-web/src/app/layout.tsx`
- Modify: `qna-web/src/app/globals.css`

- [ ] **Step 1: Replace `qna-web/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quorum — A daily ritual for niche communities",
  description:
    "Find niche communities that publish one question a day. Answer in 30 seconds, see the explanation instantly, and unlock the discussion only after you've taken a swing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink font-sans flex flex-col">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `qna-web/src/app/globals.css`**

```css
@import "tailwindcss";

@theme inline {
  --color-paper: #FAF6EC;
  --color-card: #FFFFFF;
  --color-line: #E9E2CE;
  --color-primary: #1F4032;
  --color-primary-soft: #F4F1E3;
  --color-ink: #232220;
  --color-muted: #6B6B66;
  --color-accent: #D6A12B;

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-serif: var(--font-instrument-serif);
}

@utility serif-italic {
  font-family: var(--font-instrument-serif), Georgia, serif;
  font-style: italic;
  font-weight: 400;
  color: var(--color-primary);
}

body {
  font-family: var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

Notes:
- Removed the old `:root` palette block and the `@media (prefers-color-scheme: dark)` block — light mode only per spec §3.
- Token names are Tailwind-friendly (`paper`, `card`, `line`, `ink`, etc.) so utilities read well (`bg-paper`, `text-ink`, `border-line`, `bg-primary`, `text-primary`, `text-muted`, `bg-accent`, `font-serif`).
- `.serif-italic` is a single-class shortcut for the headline accent — used many places. Apply via `className="serif-italic"`.

- [ ] **Step 3: Smoke-check the change in the dev server**

Run from repo root:

```bash
npm run dev -w qna-web
```

Visit http://localhost:3000. Expected:
- Page background is warm ivory (`#FAF6EC`), not white.
- No dark-mode flash on reload.
- The default scaffold (Vercel/Templates/Documentation buttons) is still there — Task 2 replaces it.
- Browser console has no errors about missing fonts or unknown CSS.

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/layout.tsx qna-web/src/app/globals.css
git commit -m "chore(landing): add Editorial Forest palette tokens + Instrument Serif font"
```

---

## Task 2: Replace default page with landing shell

Wipes the Next.js scaffold and renders 7 placeholder sections so each subsequent task slots one in.

**Files:**
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Replace `qna-web/src/app/page.tsx`**

```tsx
export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1 bg-paper text-ink">
      <section className="border-b border-line px-6 py-4 text-xs uppercase tracking-widest text-muted">
        [nav placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [hero placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [featured communities placeholder]
      </section>
      <section className="bg-primary-soft px-6 py-8 text-center text-xs uppercase tracking-widest text-muted">
        [how it works placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [for creators placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [final CTA placeholder]
      </section>
      <section className="border-t border-line px-6 py-8 text-center text-xs uppercase tracking-widest text-muted">
        [footer placeholder]
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Visit `/` and confirm**

Run `npm run dev -w qna-web` from repo root. At http://localhost:3000, you should see 7 stacked placeholder bands on the ivory background; the tinted band for "how it works" is visibly different. No console errors. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add qna-web/src/app/page.tsx
git commit -m "feat(landing): page shell with 7 section placeholders"
```

---

## Task 3: Community mock data

Centralizes all hard-coded community data in one module so the future swap to a service call is a one-file change.

**Files:**
- Create: `qna-web/src/app/_components/landing/_data/communities.ts`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/_data/communities.ts`**

```ts
export type CommunitySample = {
  slug: string;
  name: string;
  emoji: string;
  memberCount: number;
  todayQuestion: string;
  closesIn: string; // e.g. "6h 22m"
};

export const HERO_STACK: CommunitySample[] = [
  {
    slug: "chess-tactics-daily",
    name: "Chess Tactics Daily",
    emoji: "♟",
    memberCount: 812,
    todayQuestion: "White to move. Find the forced mate in 3.",
    closesIn: "12h",
  },
  {
    slug: "daily-ai-builders",
    name: "Daily AI Builders",
    emoji: "🤖",
    memberCount: 1284,
    todayQuestion:
      "When designing an MCP server, what should you expose first?",
    closesIn: "6h 22m",
  },
  {
    slug: "modern-css-daily",
    name: "Modern CSS Daily",
    emoji: "🎨",
    memberCount: 496,
    todayQuestion:
      "Which container query unit scales with the parent's inline-size?",
    closesIn: "4h",
  },
];

export const FEATURED_COMMUNITIES: CommunitySample[] = [
  {
    slug: "daily-ai-builders",
    name: "Daily AI Builders",
    emoji: "🤖",
    memberCount: 1284,
    todayQuestion:
      "When designing an MCP server, what should you expose first?",
    closesIn: "6h 22m",
  },
  {
    slug: "chess-tactics-daily",
    name: "Chess Tactics Daily",
    emoji: "♟",
    memberCount: 812,
    todayQuestion: "White to move. Find the forced mate in 3.",
    closesIn: "12h",
  },
  {
    slug: "modern-css-daily",
    name: "Modern CSS Daily",
    emoji: "🎨",
    memberCount: 496,
    todayQuestion:
      "Which container query unit scales with the parent's inline-size?",
    closesIn: "4h",
  },
  {
    slug: "macro-and-markets",
    name: "Macro & Markets",
    emoji: "📈",
    memberCount: 2103,
    todayQuestion:
      "Which yield curve inversion preceded a recession the fastest?",
    closesIn: "9h",
  },
  {
    slug: "biotech-reading-club",
    name: "Biotech Reading Club",
    emoji: "🧬",
    memberCount: 340,
    todayQuestion: "What does the trial's HR of 0.62 mean for survival?",
    closesIn: "16h",
  },
  {
    slug: "contracts-and-clauses",
    name: "Contracts & Clauses",
    emoji: "⚖️",
    memberCount: 1022,
    todayQuestion:
      "Which boilerplate clause survives termination by default?",
    closesIn: "8h",
  },
];

export function formatMemberCount(n: number): string {
  return n.toLocaleString("en-US");
}
```

- [ ] **Step 2: Commit (no UI changes yet — pure data)**

```bash
git add qna-web/src/app/_components/landing/_data/communities.ts
git commit -m "feat(landing): community mock data for hero + featured grid"
```

---

## Task 4: Top nav + MobileMenu

Adds the top navigation. Desktop shows wordmark + links + CTAs. Mobile collapses links and CTAs behind a hamburger that toggles an inline push-down drawer.

**Files:**
- Create: `qna-web/src/app/_components/landing/Nav.tsx`
- Create: `qna-web/src/app/_components/landing/MobileMenu.tsx`
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/MobileMenu.tsx`**

```tsx
"use client";

import { useState } from "react";

type Link = { href: string; label: string };

export function MobileMenu({ links }: { links: Link[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink"
      >
        <span className="sr-only">Toggle menu</span>
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-10 border-b border-line bg-paper px-6 py-4 shadow-sm">
          <ul className="flex flex-col gap-3 text-sm font-medium text-ink">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="block py-1.5">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <a
              href="#sign-in"
              className="rounded-full px-4 py-2.5 text-center text-sm font-semibold text-ink"
            >
              Sign in
            </a>
            <a
              href="#join"
              className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper"
            >
              Join free
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `qna-web/src/app/_components/landing/Nav.tsx`**

```tsx
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { href: "#discover", label: "Discover" },
  { href: "#for-creators", label: "For creators" },
];

export function Nav() {
  return (
    <header className="relative border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 md:px-12">
        <a href="/" className="text-[19px] font-extrabold tracking-tight text-primary">
          Quorum
        </a>

        <nav className="hidden md:flex md:gap-7 text-sm font-medium text-muted">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2.5 text-sm">
          <a href="#sign-in" className="rounded-full px-4 py-2.5 font-semibold text-ink">
            Sign in
          </a>
          <a
            href="#join"
            className="rounded-full bg-primary px-4 py-2.5 font-semibold text-paper"
          >
            Join free
          </a>
        </div>

        <MobileMenu links={NAV_LINKS} />
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Wire `Nav` into `qna-web/src/app/page.tsx`**

Replace the `[nav placeholder]` section. Whole file becomes:

```tsx
import { Nav } from "./_components/landing/Nav";

export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1 bg-paper text-ink">
      <Nav />
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [hero placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [featured communities placeholder]
      </section>
      <section className="bg-primary-soft px-6 py-8 text-center text-xs uppercase tracking-widest text-muted">
        [how it works placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [for creators placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [final CTA placeholder]
      </section>
      <section className="border-t border-line px-6 py-8 text-center text-xs uppercase tracking-widest text-muted">
        [footer placeholder]
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

`npm run dev -w qna-web`, visit `/`. Expected:
- Desktop (≥768px): wordmark on left, "Discover · For creators" in center area, "Sign in · Join free" on right. Border-bottom under the bar.
- Mobile (resize browser <768px or devtools at 375px): only wordmark + a circular hamburger icon visible. Tap → drawer pushes content down with vertical links + Sign in / Join free. Tap again → closes.

No console errors. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add qna-web/src/app/_components/landing/Nav.tsx qna-web/src/app/_components/landing/MobileMenu.tsx qna-web/src/app/page.tsx
git commit -m "feat(landing): top nav + mobile hamburger drawer"
```

---

## Task 5: Hero with overlapping community card stack

**Files:**
- Create: `qna-web/src/app/_components/landing/Hero.tsx`
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/Hero.tsx`**

```tsx
import { HERO_STACK, formatMemberCount } from "./_data/communities";

const STACK_POSITIONS = [
  "top-0 left-0 -rotate-[3.5deg]",
  "top-[80px] left-[90px] rotate-[1.5deg] z-10",
  "top-[175px] left-[30px] -rotate-1",
];

export function Hero() {
  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 md:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Discover daily Q&amp;A communities
          </p>
          <h1 className="mb-4 text-[40px] font-bold leading-[1.05] tracking-[-0.025em] md:text-[52px]">
            Find your people.{" "}
            <span className="serif-italic">One question at a time.</span>
          </h1>
          <p className="mb-6 max-w-[46ch] text-[17px] leading-relaxed text-muted">
            Niche communities — from AI builders to chess tacticians —
            publish one question a day. You answer in 30 seconds, see the
            explanation instantly, and unlock the discussion only after
            you've taken a swing.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#discover"
              className="rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper"
            >
              Browse communities →
            </a>
            <a
              href="#"
              className="rounded-full border border-line px-[22px] py-[13px] text-sm font-semibold text-ink"
            >
              Start your own
            </a>
          </div>
        </div>

        {/* Community stack */}
        <div className="relative mx-auto h-[320px] w-full max-w-[420px]">
          {HERO_STACK.map((c, i) => (
            <article
              key={c.slug}
              className={`absolute w-[260px] rounded-[14px] border border-line bg-card px-[18px] py-4 shadow-[0_18px_40px_-22px_rgba(31,64,50,0.28)] ${STACK_POSITIONS[i]}`}
            >
              <div className="mb-2.5 flex items-center gap-[11px]">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-primary-soft text-[17px]">
                  {c.emoji}
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">{c.name}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
                    {formatMemberCount(c.memberCount)} members
                  </div>
                </div>
              </div>
              <div className="text-[13px] leading-snug">{c.todayQuestion}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire `Hero` into `page.tsx`**

Replace `[hero placeholder]` section with `<Hero />` (add import at top: `import { Hero } from "./_components/landing/Hero";`).

- [ ] **Step 3: Verify**

`npm run dev -w qna-web`. At `/`:
- Desktop: headline + lede + two CTAs on left, three rotated overlapping community cards on right.
- The italic "One question at a time." renders in Instrument Serif italic, primary color.
- Mobile (<768px): hero collapses to single column, community stack appears below copy. Stack still has rotations but should fit within the viewport width.
- No layout shifts or console errors.

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/_components/landing/Hero.tsx qna-web/src/app/page.tsx
git commit -m "feat(landing): hero with overlapping community card stack"
```

---

## Task 6: CommunityCard component

The featured-grid card. Reused for all 6 entries in Task 7.

**Files:**
- Create: `qna-web/src/app/_components/landing/CommunityCard.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/CommunityCard.tsx`**

```tsx
import { formatMemberCount, type CommunitySample } from "./_data/communities";

export function CommunityCard({ community }: { community: CommunitySample }) {
  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-line bg-card p-5 transition-transform hover:-translate-y-0.5">
      <header className="flex items-center gap-3">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-primary-soft text-[17px]">
          {community.emoji}
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight">{community.name}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
            {formatMemberCount(community.memberCount)} members
          </div>
        </div>
      </header>

      <p className="text-[13px] leading-relaxed">
        <span className="font-semibold">Today:</span> {community.todayQuestion}
      </p>

      <footer className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <span className="rounded-full bg-primary-soft px-[9px] py-[3px] text-[9px] font-bold uppercase tracking-wider text-primary">
          Active now
        </span>
        <span>Closes {community.closesIn}</span>
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: Commit (no visible UI change — component is used in Task 7)**

```bash
git add qna-web/src/app/_components/landing/CommunityCard.tsx
git commit -m "feat(landing): CommunityCard component"
```

---

## Task 7: Featured communities grid

**Files:**
- Create: `qna-web/src/app/_components/landing/FeaturedCommunities.tsx`
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/FeaturedCommunities.tsx`**

```tsx
import { CommunityCard } from "./CommunityCard";
import { FEATURED_COMMUNITIES } from "./_data/communities";

export function FeaturedCommunities() {
  return (
    <section id="discover" className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-11 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Featured communities
          </p>
          <h2 className="text-[32px] font-bold leading-tight tracking-[-0.02em] md:text-[36px]">
            Find the corner of the internet{" "}
            <span className="serif-italic">that fits you.</span>
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_COMMUNITIES.map((c) => (
            <CommunityCard key={c.slug} community={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire `FeaturedCommunities` into `page.tsx`**

Add the import and replace the `[featured communities placeholder]` section with `<FeaturedCommunities />`.

- [ ] **Step 3: Verify**

At `/`:
- Below hero: centered eyebrow "Featured communities" + headline.
- 3×2 grid of 6 cards on desktop, 2×3 at tablet (640–1024px), 1-column on mobile.
- Each card hovers up 2px on mouseover (desktop).
- Italic accent on "that fits you." renders correctly.

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/_components/landing/FeaturedCommunities.tsx qna-web/src/app/page.tsx
git commit -m "feat(landing): featured communities grid"
```

---

## Task 8: How it works (compact strip)

**Files:**
- Create: `qna-web/src/app/_components/landing/HowItWorks.tsx`
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/HowItWorks.tsx`**

```tsx
const STEPS = [
  {
    n: 1,
    title: "Pick a community",
    body: "Join one that fits — daily, weekly, your call.",
  },
  {
    n: 2,
    title: "Answer the question",
    body: "Submit in seconds. See the explanation instantly.",
  },
  {
    n: 3,
    title: "Unlock the discussion",
    body: "Comments open only after you've answered.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-primary/10 bg-primary-soft px-6 py-7 md:px-12">
      <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[auto_1fr_1fr_1fr] md:items-center md:gap-8">
        <div className="md:border-r md:border-primary/15 md:pr-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            How it works
          </p>
          <p className="mt-1 text-sm font-semibold leading-tight">
            A daily loop that <span className="serif-italic">closes.</span>
          </p>
        </div>

        {STEPS.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-paper">
              {s.n}
            </div>
            <div>
              <div className="text-[13px] font-bold leading-tight">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire `HowItWorks` into `page.tsx`**

Add import. Replace the `[how it works placeholder]` section with `<HowItWorks />` (remove its prior `bg-primary-soft` wrapper — the strip provides its own).

- [ ] **Step 3: Verify**

At `/`:
- Tinted strip below featured grid; label on the left, three small numbered steps inline on desktop.
- On mobile, label stacks on top and steps stack vertically.
- Strip is visually lighter weight than full sections (smaller padding, smaller text).

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/_components/landing/HowItWorks.tsx qna-web/src/app/page.tsx
git commit -m "feat(landing): how-it-works compact strip"
```

---

## Task 9: For creators section

**Files:**
- Create: `qna-web/src/app/_components/landing/ForCreators.tsx`
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/ForCreators.tsx`**

```tsx
const CHECKLIST = [
  {
    head: "Schedule recurring questions",
    tail: "daily, weekly, or your own cadence.",
  },
  {
    head: "Instant grading + explanations",
    tail: "members learn the moment they answer.",
  },
  {
    head: "Discussion unlocks after answering",
    tail: "no spoilers, no lurkers.",
  },
  {
    head: "Leaderboards & broadcasts",
    tail: "keep the regulars coming back.",
  },
];

export function ForCreators() {
  return (
    <section id="for-creators" className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto grid max-w-[1200px] items-center gap-9 rounded-[20px] border border-line bg-card p-8 md:grid-cols-2 md:p-10">
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            For creators
          </p>
          <h3 className="mb-3.5 text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[30px]">
            Building a niche community is{" "}
            <span className="serif-italic">easier than a podcast.</span>
          </h3>
          <p className="mb-5 text-[15px] leading-relaxed text-muted">
            If you teach something — even a narrow slice of it — you have
            enough to launch a community. Schedule one question. Members
            answer, learn, talk. You see exactly who shows up.
          </p>
          <a
            href="#"
            className="inline-flex rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper"
          >
            Start your community →
          </a>
        </div>

        <ul className="grid gap-3.5">
          {CHECKLIST.map((item) => (
            <li key={item.head} className="flex items-start gap-3 text-sm">
              <span
                aria-hidden
                className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
              >
                ✓
              </span>
              <span>
                <strong>{item.head}</strong> — {item.tail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire `ForCreators` into `page.tsx`**

Add import. Replace `[for creators placeholder]` section with `<ForCreators />`.

- [ ] **Step 3: Verify**

At `/`:
- White card with subtle border, split into copy (left) and checklist (right) on desktop.
- Single column stack on mobile.
- Italic accent renders.

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/_components/landing/ForCreators.tsx qna-web/src/app/page.tsx
git commit -m "feat(landing): for-creators split-card section"
```

---

## Task 10: Final CTA band

**Files:**
- Create: `qna-web/src/app/_components/landing/CtaBand.tsx`
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/CtaBand.tsx`**

```tsx
export function CtaBand() {
  return (
    <section className="px-6 pb-16 md:px-12">
      <div className="mx-auto max-w-[1200px] rounded-[20px] bg-primary px-8 py-14 text-center text-paper md:px-12">
        <h3 className="mb-3.5 text-[32px] font-bold leading-tight tracking-[-0.02em] md:text-[38px]">
          Pick a community.{" "}
          <span
            className="font-serif italic font-normal"
            style={{ color: "var(--color-accent)" }}
          >
            Answer today&apos;s question.
          </span>
        </h3>
        <p className="mb-6 text-base text-paper/75">
          It takes 30 seconds. Tomorrow there&apos;s another one.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#discover"
            className="rounded-full bg-accent px-[22px] py-[13px] text-sm font-semibold text-[#2A2A28]"
          >
            Browse communities →
          </a>
          <a
            href="#"
            className="rounded-full border border-paper/30 px-[22px] py-[13px] text-sm font-semibold text-paper"
          >
            Start your own
          </a>
        </div>
      </div>
    </section>
  );
}
```

Note: this is the one place the serif italic accent uses `--color-accent` (mustard) instead of `--color-primary` (forest) because the band background is forest green — using primary would be invisible. We override with an inline `style` rather than adding a second utility class for a one-off.

- [ ] **Step 2: Wire `CtaBand` into `page.tsx`**

Add import. Replace `[final CTA placeholder]` section with `<CtaBand />`.

- [ ] **Step 3: Verify**

At `/`:
- Forest-green slab with rounded corners. "Answer today's question." in mustard serif italic.
- Mustard primary button + ghost secondary button.
- Mobile: buttons wrap, slab fills width.

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/_components/landing/CtaBand.tsx qna-web/src/app/page.tsx
git commit -m "feat(landing): final CTA band"
```

---

## Task 11: Footer

**Files:**
- Create: `qna-web/src/app/_components/landing/Footer.tsx`
- Modify: `qna-web/src/app/page.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/Footer.tsx`**

```tsx
const COLUMNS: { heading: string; links: string[] }[] = [
  { heading: "Product", links: ["Discover", "How it works", "For creators", "Pricing"] },
  {
    heading: "Communities",
    links: ["Daily AI Builders", "Chess Tactics", "Modern CSS", "Browse all"],
  },
  { heading: "Company", links: ["About", "Blog", "Contact"] },
  { heading: "Legal", links: ["Privacy", "Terms", "Cookies"] },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper px-6 pb-8 pt-10 md:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <div className="text-[19px] font-extrabold tracking-tight text-primary">
              Quorum
            </div>
            <p className="mt-2 max-w-[28ch] text-[13px] leading-relaxed text-muted">
              A daily ritual for niche communities.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h5 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                {col.heading}
              </h5>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-muted hover:text-ink">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted md:flex-row md:justify-between">
          <span>© 2026 Quorum. All rights reserved.</span>
          <span>Made for niche communities, one question at a time.</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Wire `Footer` into `page.tsx`**

Replace `[footer placeholder]` with `<Footer />`. Add import. The final `page.tsx` should be:

```tsx
import { Nav } from "./_components/landing/Nav";
import { Hero } from "./_components/landing/Hero";
import { FeaturedCommunities } from "./_components/landing/FeaturedCommunities";
import { HowItWorks } from "./_components/landing/HowItWorks";
import { ForCreators } from "./_components/landing/ForCreators";
import { CtaBand } from "./_components/landing/CtaBand";
import { Footer } from "./_components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1 bg-paper text-ink">
      <Nav />
      <Hero />
      <FeaturedCommunities />
      <HowItWorks />
      <ForCreators />
      <CtaBand />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 3: Verify**

At `/`:
- Footer renders at bottom with wordmark + tagline on left, 4 link columns.
- Below: top-bordered legal row, copyright left, tagline right.
- Mobile: wordmark column spans full width, link columns stack to 2-up, legal row stacks vertically.

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/_components/landing/Footer.tsx qna-web/src/app/page.tsx
git commit -m "feat(landing): footer with link columns + legal row"
```

---

## Task 12: Final verification + cleanup

**Files:** none (verification only); may modify any file if issues surface.

- [ ] **Step 1: Visual sweep at three breakpoints**

Start dev server: `npm run dev -w qna-web`. In browser devtools, check the page at:
- **1280px** (desktop): hero 2-col, featured 3-col grid, footer 5-col.
- **768px** (tablet): hero 2-col with smaller text, featured 2-col grid, footer 5-col (links may wrap).
- **375px** (mobile): nav collapses to hamburger, hero single-column with cards stacked under copy, featured 1-col, how-it-works strip stacks vertically, footer 2-col then stacks.

For each: visually compare against the design spec §5 (responsive table). Note any layout breakage.

- [ ] **Step 2: Lint**

```bash
npm run lint -w qna-web
```

Expected: zero errors. If errors surface (unused imports, missing keys, etc.), fix them and continue.

- [ ] **Step 3: Production build**

```bash
npm run build -w qna-web
```

Expected: build succeeds, no type errors, no warnings about client/server component misuse. Static page should be marked as `○ (Static)` in the build output route table.

- [ ] **Step 4: Stop dev server, verify no leftover scaffold artifacts**

The `qna-web/public/` directory still has `next.svg`, `vercel.svg`, `globe.svg`, `file.svg`, `window.svg` from the Next.js scaffold. None of these are referenced by the landing page anymore. **Leave them in place** — removing them is out of scope for this slice; they cost nothing to ship and a later cleanup pass can remove them.

- [ ] **Step 5: Commit any fixes**

If Steps 1–3 surfaced fixes, commit them:

```bash
git add -A
git commit -m "fix(landing): post-implementation polish"
```

If nothing changed, skip the commit.

---

## Done

After Task 12, the landing page slice is shippable. The next slice per the build sequence is the **auth slice** (users table + JWT + register/login/logout end-to-end). That's a separate spec + plan; do not start it here.
