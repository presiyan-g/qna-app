# qna-mobile

The Expo (React Native) client for Quorum. Ships to iOS, Android, and a Vercel-hosted web export. Talks to the back-end only via the REST API in `qna-web/src/app/api/**`.

Repo-wide context: [../README.md](../README.md). Product scope: [../PROJECT.md](../PROJECT.md). Engineering rules: [../AGENTS.md](../AGENTS.md), plus mobile-specific overrides in [./AGENTS.md](AGENTS.md).

Live web export: <https://qna-app-quorum-mobile.vercel.app>

## Stack

- Expo SDK with Expo Router (file-based routing under `app/`)
- React Native + `react-native-web` (the same code builds for native and web)
- `expo-secure-store` for the JWT (with a localStorage fallback for the web export)
- Per-domain REST clients under `services/**`
- One Brand UI library in `components/Brand.tsx` (buttons, inputs, headings, cards, streak ribbon, etc.)

## Screens

Bottom-tab navigator with four tabs. All screens are functional, not stubs — the auth flow, answer + grading loop, comments, leaderboard, and profile work end-to-end against the deployed back-end.

| Path | Purpose |
| --- | --- |
| `app/login.tsx` | Email + password login. Stores the returned JWT in `expo-secure-store`. |
| `app/register.tsx` | Registration with field-level validation matching the REST contract. |
| `app/(tabs)/index.tsx` | **Home** — joined communities, live question count badge, discover hero. |
| `app/(tabs)/live-questions.tsx` | **Live** — paginated feed of currently open questions across joined communities, sorted by `closes_at`. |
| `app/(tabs)/communities/index.tsx` | **Discover** — paginated community directory (24 / page) with cover images, member counts, categories, join state. |
| `app/(tabs)/communities/[slug].tsx` | Community detail — multi-tab (Questions, Posts, Ranks, About), join/leave, full 7/30/all-time leaderboard with the viewer's rank highlighted. |
| `app/(tabs)/communities/[slug]/questions/[id].tsx` | Question detail — choice form (with choice images if present), instant grading, explanation, vote distribution, comments thread (unlocks after answer or after question closes). |
| `app/(tabs)/profile.tsx` | The viewer's own profile — username, joined date, total points, current streak, longest streak, 30-day streak ribbon, community memberships with roles, logout. |
| `app/(tabs)/users/[username].tsx` | Any user's public profile (same component, different data source). |

The auth REST contract is documented in [AGENTS.md](AGENTS.md) and mirrored client-side in `services/auth/api.ts`.

## Folder layout

```
qna-mobile/
├─ app/                        Expo Router screens
│  ├─ _layout.tsx              Root layout (loads fonts, wraps AuthProvider)
│  ├─ login.tsx / register.tsx
│  └─ (tabs)/                  Tab navigator
│     ├─ _layout.tsx
│     ├─ index.tsx             Home
│     ├─ live-questions.tsx    Live
│     ├─ profile.tsx
│     ├─ communities/[slug].tsx
│     ├─ communities/[slug]/questions/[id].tsx
│     └─ users/[username].tsx
├─ services/                   REST clients per domain (auth, communities, questions, comments, broadcasts, leaderboard, users)
├─ components/                 Brand.tsx + UserProfileView + HeaderBackButton
├─ assets/                     Fonts and images
└─ app.json                    Expo config
```

## Environment

Copy `qna-mobile/.env.example` to `qna-mobile/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `QNA_API_URL` | yes | Base URL of the back-end REST API. Local: `http://localhost:3000/api`. Production: `https://qna-app-quorum-web.vercel.app/api`. |

The web export reads the same variable at build time.

## Scripts

```bash
npm run start -w qna-mobile        # Expo dev server — press w / a / i for web / Android / iOS
npm run web -w qna-mobile          # Expo web dev server only
npm run android -w qna-mobile
npm run ios -w qna-mobile
npm run lint -w qna-mobile
npm run test -w qna-mobile         # ~15 unit tests on the REST clients and helpers
npm run build -w qna-mobile        # static web export to ./dist (deploys to Vercel)
```

## Running against a local back-end

1. Start the back-end:
   ```bash
   npm run dev -w qna-web
   ```
2. Make sure `qna-mobile/.env` has `QNA_API_URL=http://localhost:3000/api` (use your LAN IP instead of `localhost` if you want to load on a physical phone).
3. Start Expo:
   ```bash
   npm run start -w qna-mobile
   ```
4. Press `w` for the web target, `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

## Conventions

- **REST only.** Mobile talks to the back-end through `services/**` REST clients. No Server Actions, no direct DB access.
- **Auth.** JWT stored in `expo-secure-store` (with a `localStorage` fallback for the web target). Sent as `Authorization: Bearer <token>`. On any `401`, clear the token and route to login.
- **Cross-platform.** Anything that doesn't run on web (native-only APIs, native dialogs) must be guarded with `Platform.OS` and have a web fallback (modals instead of `Alert.alert`, etc.). The web export is a deployment target.
- **One screen per file** under `app/` (Expo Router). Don't cram unrelated screens together.
- **Responsive.** Layouts must work on phones and tablets. Tablet variants use the Brand library's spacing/typography scale.
- **Mobile is end-user only.** Creator-heavy workflows (composer, dashboard, admin) stay in the web app.

## Deployment

The web export deploys to Vercel as a static site. The build command is `npm run build -w qna-mobile`; the output directory is `qna-mobile/dist`. Set `QNA_API_URL` in the Vercel project to the deployed back-end's `/api` base.

For native distribution, use Expo EAS to produce an Android `.apk` / `.aab` or an iOS `.ipa`. Not part of the v1 deployment.
