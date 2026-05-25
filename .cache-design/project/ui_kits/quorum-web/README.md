# Quorum Web — UI Kit

High-fidelity, framework-light recreation of the Quorum web product. Every screen is interactive — click a community card to drill in, submit an answer to unlock comments, switch tabs, sign in / out.

## Structure

| File | What |
|---|---|
| `index.html` | Loads React + Babel + every JSX file in dependency order |
| `styles.css` | Quorum design tokens (imports `colors_and_type.css` from project root) + `.q-*` utility classes for buttons, cards, chips, inputs |
| `Primitives.jsx` | `Btn`, `Card`, `Chip`, `Pill`, `Avatar`, `Eyebrow`, `SerifI`, `CheckDot`, `Chevron`, `Arrow` |
| `Data.jsx` | Seed data: communities, sample question, comments, broadcasts, leaderboard, past questions |
| `Chrome.jsx` | `Nav` (sign-in or signed-in variants) + `Footer` |
| `LandingScreen.jsx` | `Hero`, `FeaturedCommunities`, `HowItWorks`, `ForCreators`, `CtaBand` |
| `BrowseScreen.jsx` | Search + category filter, community list cards |
| `CommunityScreen.jsx` | Community header, 4 tabs (Questions / Broadcasts / Leaderboard / About), sidebar |
| `QuestionScreen.jsx` | Answer flow → result panel → solution → comments unlock |
| `AuthScreens.jsx` | Login + Register inside the shared `AuthShell` |
| `DashboardScreen.jsx` | Creator dashboard — summary tiles + per-community cards with Manage / Draft / Broadcast buttons |
| `App.jsx` | Hash-based router (`#/screen/slug/tab`) — wires everything together |

## Navigation

The kit is a real click-thru prototype. Try this path:

1. **Home** → click **Browse communities** in the hero
2. **Browse** → click any community card
3. **Community** → switch between Questions / Broadcasts / Leaderboard / About tabs
4. Open the Today question → pick a choice → **Submit answer**
5. See the result panel and solution; comments unlock and you can post one
6. Use the URL hash (e.g. `#/dashboard`) to jump to the creator dashboard

## Where this differs from upstream

This is a stylized recreation, not a port:
- No Server Actions, no Drizzle, no real auth. Sign-in routes you to Browse with a `signedIn` flag flipped.
- The community page combines what the upstream codebase splits across `/page.tsx`, `/broadcasts`, `/leaderboard`, `/about`. Visually equivalent but rendered client-side via a tab switcher.
- We use the **new action color family** (clay-orange for "Leave community" and other secondary destructive-safe actions, lake-blue for "Open broadcast", "Edit", "Post comment", "Draft question") that the upstream codebase does not yet have. See [`/README.md`](../../README.md#color) for rationale.
- All hover animations use CSS transitions only — `transform`, `box-shadow`, `border-color`, `background-color`. No JS-driven motion.

## Caveats

- Mobile responsiveness is minimal — the layout targets desktop preview. The upstream codebase has responsive `md:` breakpoints we have not fully ported.
- Some surfaces from the upstream codebase are not recreated (Admin panel, broadcast composer, question composer with AI drafts, image uploader, community settings). Add them when the design needs them.
