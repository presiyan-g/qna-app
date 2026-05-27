# Quorum — a daily ritual for niche communities

A Node.js monorepo for a community Q&A platform. One Next.js workspace serves the web client **and** the REST/Server-Action back-end; an Expo workspace ships the same product to iOS, Android, and the web export.

Members answer one scheduled question per community, get instant grading + explanation, then unlock the discussion thread underneath. Creators schedule the questions, post broadcasts to their community, and watch a per-community leaderboard.

## Live

| | URL |
| --- | --- |
| Web app (Next.js) | <https://qna-app-quorum-web.vercel.app> |
| Mobile app (Expo web export) | <https://qna-app-quorum-mobile.vercel.app> |
| Source | <https://github.com/presiyan-g/qna-app> |

### Demo accounts

All three share the password `demo1234`:

| Email | Role | Notes |
| --- | --- | --- |
| `admin@demo.local` | platform admin | sees the admin panel at `/admin` |
| `creator@demo.local` | community creator | owns `daily-ai-builders` and `chess-tactics-daily`; sees the creator dashboard |
| `member@demo.local` | member | joined to ~6 communities, has answered ~200 questions |

The seed also creates ~500 `demo_member_NNN` accounts to populate communities, leaderboards, and answer history — they are not meant to be logged in to.

## Workspaces

- **`qna-web`** — Next.js (App Router) + React + TypeScript + Tailwind. Hosts the web UI, REST API under `/api/**` (consumed by the mobile app), and Server Actions (consumed by the web UI). Drizzle ORM over Neon Postgres. See [qna-web/README.md](qna-web/README.md).
- **`qna-mobile`** — Expo (React Native) for iOS, Android, and a web export. Talks to the back-end only via REST and Bearer tokens. See [qna-mobile/README.md](qna-mobile/README.md).

Product scope lives in [PROJECT.md](PROJECT.md). Agent-facing engineering rules live in [AGENTS.md](AGENTS.md), with per-workspace overrides in `qna-web/AGENTS.md` and `qna-mobile/AGENTS.md`.

## Architecture at a glance

```
                              ┌─────────────────────────┐
   Web browser ─── HTTPS ───▶│  Next.js (App Router)   │
                              │  • Server Actions       │
                              │  • Server Components    │
                              │                         │
   Expo client ─── HTTPS ───▶│  REST API /api/**       │──┐
   (iOS / Android / Web)      │  • JWT bearer tokens    │  │
                              └────────────┬────────────┘  │
                                           │ Drizzle       │ AWS S3 SDK
                                ┌──────────▼──────┐  ┌─────▼──────────┐
                                │  Neon Postgres  │  │ Cloudflare R2  │
                                │  (serverless)   │  │ (object store) │
                                └─────────────────┘  └────────────────┘
```

- **Service layer.** Business logic lives in `qna-web/src/services/**` (auth, communities, questions, answers, comments, broadcasts, leaderboard, profiles, uploads, admin, ai, ai-usage). Both REST routes and Server Actions call into the same services — no Drizzle queries in components.
- **Two role layers.** Platform role on the user (`member` | `admin`) and community role per membership (`member` | `creator`). Authorization is enforced in API routes, server components, middleware, and the service layer.
- **Auth.** bcryptjs password hashing, HS256 JWT (30 day expiry) in an HTTP-only cookie for the web and as a `Authorization: Bearer …` header for the mobile app.
- **Files.** Direct uploads to Cloudflare R2 via presigned POST URLs (`POST /api/uploads/presign`). The DB stores only the public URL.
- **AI.** OpenRouter is used for the "Draft with AI" feature in the question composer and for one-time generation of seed content (committed JSON under `qna-web/scripts/seed-data/`). Per-user AI usage is logged to `ai_usage`.

### Screens

- **Web (≈22 routes):** landing, register / login, browse communities, create community, community home, community edit, community about, question detail, question composer, question edit, broadcasts feed, broadcast detail, leaderboard, creator dashboard, per-community creator dashboard, my-communities, public user profile, admin shell, admin users list, admin user detail, admin communities list.
- **Mobile (7 screens):** login, register, home, communities directory, community detail (4 tabs: questions, posts, ranks, about), question detail with grading + comments, live questions feed, profile.

### Database

11 tables in `qna-web/src/db/schema/**`, evolved across 16 Drizzle migrations under `qna-web/drizzle/`: `users`, `communities`, `community_categories`, `community_members`, `questions`, `question_choices`, `answers`, `comments`, `broadcast_posts`, `admin_audit_logs`, `ai_usage`. Schema details in [PROJECT.md §7](PROJECT.md#7-database-model).

## Repo layout

```
qna-app/
├─ qna-web/                Next.js + REST API + Server Actions + DB
│  ├─ src/app/             Routes (pages + /api/**)
│  ├─ src/services/        Business logic (called by both API and Server Actions)
│  ├─ src/components/      Reusable React UI
│  ├─ src/db/schema/       Drizzle schema definitions
│  ├─ drizzle/             Generated SQL migrations (committed)
│  └─ scripts/             Seed + AI seed generation
├─ qna-mobile/             Expo (React Native) client + web export
│  ├─ app/                 Expo Router screens (incl. tab navigator)
│  ├─ services/            REST API clients per domain
│  └─ components/          Brand UI library (Brand.tsx) + shared bits
├─ docs/superpowers/       Slice specs and plans authored during development
├─ scripts/                Cross-workspace scripts (e.g. parallel dev runner)
├─ AGENTS.md               Repo-wide agent instructions
├─ PROJECT.md              Product scope + v1 status
└─ README.md               You are here
```

## Local development

### Prerequisites

- Node.js 20+ and npm
- A Neon Postgres database (or any Postgres reachable over `DATABASE_URL`)
- Cloudflare R2 bucket and API token (for image uploads)
- OpenRouter API key (only required for "Draft with AI" and re-running the AI seed generator)

### Setup

Install once from the repo root so npm workspaces hoist correctly:

```bash
npm install
```

Create local env files from the examples:

```bash
cp qna-web/.env.example qna-web/.env.local
cp qna-mobile/.env.example qna-mobile/.env
```

Fill in at minimum:

- `qna-web/.env.local`: `DATABASE_URL`, `JWT_SECRET`, the five `R2_*` variables, and optionally `OPENROUTER_API_KEY`.
- `qna-mobile/.env`: `QNA_API_URL`, normally `http://localhost:3000/api` for dev.

### Migrate and seed

```bash
npm run db:migrate -w qna-web

# PowerShell:
$env:ALLOW_SEED="1"; npm run seed
# bash:
ALLOW_SEED=1 npm run seed
```

The seed is deterministic and idempotent: 20 communities, 500 demo users, ~400 questions, ~25 000 synthetic answers, ~600–800 comments, ~100 broadcasts. Re-running against the same DB is a no-op. AI-authored content is committed as JSON; it does **not** re-run the OpenRouter calls on a normal seed.

### Run

```bash
npm run dev                     # both workspaces in parallel
npm run dev -w qna-web          # just the Next.js app (http://localhost:3000)
npm run dev -w qna-mobile       # just Expo (press w / a / i for web / Android / iOS)
```

### Common scripts

```bash
npm run build                   # build both workspaces
npm test                        # run web test suite
npm run test -w qna-mobile      # run mobile test suite
npm run lint -w qna-web
npm run lint -w qna-mobile
npm run db:generate -w qna-web  # generate a new Drizzle migration from schema diff
npm run db:studio -w qna-web    # open Drizzle Studio
```

See [qna-web/README.md](qna-web/README.md) for full seed instructions and the AI seed regeneration commands.

## Deployment

Both apps deploy to **Vercel**. Production secrets are configured in the host environment (never in the repo).

- `qna-web` ships as a normal Next.js project. Required env: `DATABASE_URL`, `JWT_SECRET`, `R2_*`. Optional: `OPENROUTER_API_KEY`.
- `qna-mobile` ships as an Expo **web export** (static). Required env: `QNA_API_URL` pointing at the deployed `qna-web` `/api` base.

## Engineering rules (the short version)

Full version in [AGENTS.md](AGENTS.md):

- Schema changes go through **Drizzle migrations only** — never hand-edit the DB.
- Business logic lives in **services**, not in components or routes.
- All list endpoints **page server-side**. No unbounded `SELECT *` to the client.
- Files go to **Cloudflare R2 via signed URLs**. Never base64 or `bytea` in Postgres.
- Authorization is enforced in **services + middleware + API routes** — not by hiding UI.
- Web client uses **Server Actions**; mobile client uses **REST**. Keep REST stable; don't tailor it to web-only needs.
