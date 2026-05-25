---
name: quorum-design
description: Use this skill to generate well-branded interfaces and assets for Quorum, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Key files

- `README.md` — brand, voice, content fundamentals, visual foundations, iconography, caveats
- `colors_and_type.css` — single source of truth for color + type + motion CSS variables
- `assets/` — wordmark, monogram, chevron, check disc, community tile examples
- `fonts/` — webfont notes (Geist Sans, Geist Mono, Instrument Serif — Google Fonts)
- `preview/*.html` — atomic specimen cards for every token / component / state
- `ui_kits/quorum-web/` — full interactive recreation of the web product (React + Babel, no build step)

## Cheatsheet for an expert Quorum designer

- Page canvas: warm cream paper `#FAF6EC`, never pure white. Card surfaces sit on paper, separated by a 1px `#E9E2CE` hairline (rarely a shadow).
- Primary CTA: forest green `#1F4032` on a fully-rounded pill button.
- **Action color family (new):** clay-orange `#C2543A` for secondary (Leave, Unsubscribe), lake-blue `#3A6E8F` for tertiary / informational (Edit, Open broadcast, Post comment). Priority is **forest → clay → lake → ghost**; never two saturated action colors competing on one surface.
- Display headlines: bold sans + one phrase in **Instrument Serif italic 400** in primary green. The italic phrase is always the emotional payoff.
- Every major section starts with an 11px **uppercase eyebrow**, 0.16em tracking, primary green.
- Hover motion: cards lift `-2px` + border swaps to primary + soft shadow. Buttons get a soft glow + 5% darker fill. Active = `translateY(1px)`. CSS transitions only — never `transition: all`, never JS animation.
- Voice: second-person, sentence case (never title case), no exclamation marks, no marketing puffery. Short sentences. Assumes the reader is smart.
- Icons: prefer Unicode glyphs (`✓ → ← ●`); Lucide at 1.6 stroke width for everything else. Emoji is reserved for user-chosen community avatars.

When in doubt, open `ui_kits/quorum-web/index.html` and see how an existing screen handles the problem.
