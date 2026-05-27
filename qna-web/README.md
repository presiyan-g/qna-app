# qna-web

The Next.js workspace for Quorum. It holds **both** the back-end (REST API + Server Actions + Drizzle data access + Cloudflare R2 uploads) and the web client UI.

Repo-wide context: [../README.md](../README.md). Product scope: [../PROJECT.md](../PROJECT.md). Engineering rules: [../AGENTS.md](../AGENTS.md) (with web-specific overrides in [./AGENTS.md](AGENTS.md)).

Live deployment: <https://qna-app-quorum-web.vercel.app>

## Stack

- Next.js 15 (App Router) + React + TypeScript + Tailwind
- Drizzle ORM over Neon serverless Postgres
- bcryptjs password hashing, HS256 JWT (30 d expiry), HTTP-only cookies for the web, Bearer tokens for the REST API
- Cloudflare R2 (S3 SDK) for community covers, question images, and broadcast images
- OpenRouter for the "Draft with AI" feature in the question composer

## Routes

Web routes under `src/app/` (excluding `api/`):

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing with featured communities |
| `/(auth)/login` `/(auth)/register` | Auth |
| `/communities` | Browse the community directory (paginated, category filter) |
| `/communities/new` | Create community |
| `/communities/[slug]` | Community home (questions tab) |
| `/communities/[slug]/edit` | Community settings (creator only) |
| `/communities/[slug]/about` | About tab |
| `/communities/[slug]/questions/new` | Question composer (creator only) |
| `/communities/[slug]/questions/[id]` | Question detail — answer form, instant grading, comments |
| `/communities/[slug]/questions/[id]/edit` | Edit unpublished question |
| `/communities/[slug]/broadcasts` | Public broadcast feed |
| `/communities/[slug]/broadcasts/[postId]` | Broadcast detail |
| `/communities/[slug]/leaderboard` | Community leaderboard (7-day, 30-day, all-time) |
| `/dashboard` | Cross-community creator hub |
| `/dashboard/communities/[slug]` | Per-community question management |
| `/my-communities` | Member's joined communities |
| `/users/[username]` | Public profile (totals + memberships + streak ribbon) |
| `/admin` | Platform admin shell |
| `/admin/users` `/admin/users/[id]` | Admin user management |
| `/admin/communities` | Admin community moderation |

REST API under `src/app/api/**` (consumed by the Expo mobile app):

| Group | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Communities | `GET/POST /api/communities`, `GET/PATCH /api/communities/[slug]`, `POST /api/communities/[slug]/join` |
| Questions | `GET/POST /api/communities/[slug]/questions`, `GET/PATCH/DELETE /api/communities/[slug]/questions/[id]`, `POST /api/communities/[slug]/questions/[id]/answers`, `GET /api/questions/live` |
| Comments | `GET/POST /api/communities/[slug]/questions/[id]/comments`, `DELETE …/[commentId]` |
| Broadcasts | `GET/POST /api/communities/[slug]/broadcasts`, `PATCH/DELETE …/[postId]` |
| Leaderboard | `GET /api/communities/[slug]/leaderboard?window=7d|30d|all` |
| Users | `GET /api/users/[username]` |
| Uploads | `POST /api/uploads/presign` (returns presigned R2 POST + form fields) |

Logout is **client-side only** — delete the stored token. There is no `/api/auth/logout`; JWT is stateless and there is no revocation list.

## Folder layout

```
qna-web/
├─ src/
│  ├─ app/                Routes (pages + /api/**)
│  ├─ components/         Reusable React UI (landing, community, questions, comments, broadcasts, dashboard, admin, auth, profile)
│  ├─ services/           Business logic — called by API routes AND Server Actions
│  │  ├─ auth/            Users, passwords (bcrypt), JWT, sessions
│  │  ├─ communities/     Communities, memberships, resource policies
│  │  ├─ questions/       CRUD, state machine, closing logic, dashboard queries
│  │  ├─ answers/         Submission + grading (10 pts correct, 0 late, 0 wrong)
│  │  ├─ comments/        Thread assembly + cursor pagination + policy
│  │  ├─ broadcasts/      Posts + cursor pagination + policy
│  │  ├─ leaderboard/     Ranking, tie-break, window builders
│  │  ├─ profiles/        Public profile + streak calculation
│  │  ├─ uploads/         R2 presigning + validation + URL rewriting
│  │  ├─ admin/           Admin actions + audit log
│  │  └─ ai-usage/        Per-user AI quota and logging
│  ├─ lib/
│  │  └─ ai/              OpenRouter provider + question-draft prompt
│  └─ db/
│     └─ schema/          Drizzle table definitions
├─ drizzle/               Generated SQL migrations (committed)
└─ scripts/               Seed script + AI seed generation + seed-data/ JSON
```

## Environment

Copy `qna-web/.env.example` to `qna-web/.env.local` and fill in:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string (`sslmode=require`) |
| `JWT_SECRET` | yes | HS256 signing secret (≥ 32 random bytes) |
| `R2_ENDPOINT` | yes | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | yes | R2 bucket name |
| `R2_PUBLIC_URL` | yes | Public read URL prefix for the bucket |
| `R2_ACCESS_KEY_ID` | yes | R2 API token id |
| `R2_SECRET_ACCESS_KEY` | yes | R2 API token secret |
| `OPENROUTER_API_KEY` | optional | Enables "Draft with AI" and the AI seed generator |
| `OPENROUTER_BASE_URL` | optional | Defaults to `https://openrouter.ai/api/v1` |
| `ALLOW_SEED` | seed only | Must be `1` to allow the seed script to run |

## Scripts

```bash
npm run dev -w qna-web              # Next.js dev server (http://localhost:3000)
npm run build -w qna-web            # production build
npm run start -w qna-web            # serve the production build locally
npm run lint -w qna-web
npm run test -w qna-web             # 43 unit/integration tests
npm run db:generate -w qna-web      # generate a new Drizzle migration from schema diff
npm run db:migrate -w qna-web       # apply migrations to DATABASE_URL
npm run db:studio -w qna-web        # Drizzle Studio
npm run seed                        # seed demo data (from repo root, sets ALLOW_SEED)
npm run seed:generate               # re-run OpenRouter to regenerate seed-data/*.json
```

## Seeding the database

The seed is fully scripted: 20 communities, 500 demo users, ~400 questions, ~25 000 synthetic answers, ~600–800 comments, ~100 broadcasts. Data is deterministic and idempotent — re-running against the same DB is a no-op.

```bash
npm run db:migrate -w qna-web
```

```powershell
# PowerShell (Windows):
$env:ALLOW_SEED="1"; npm run seed
```

```bash
# bash / zsh:
ALLOW_SEED=1 npm run seed
```

### Test accounts

Password for all three: `demo1234`.

| Email | Role | Notes |
| --- | --- | --- |
| `admin@demo.local` | platform admin | `/admin` panel |
| `creator@demo.local` | community creator | owns `daily-ai-builders` and `chess-tactics-daily` |
| `member@demo.local` | member | joined to ~6 communities, ~200 answers |

The 500 `demo_member_NNN` users do not have working passwords — they exist to populate communities, leaderboards, and answers.

### Regenerating AI-authored content

Questions, broadcasts, and comments are AI-generated once via OpenRouter and committed under `scripts/seed-data/`. To regenerate:

```powershell
# All three kinds (takes ~30 minutes):
$env:OPENROUTER_API_KEY="..."; npm run seed:generate

# Single kind:
$env:OPENROUTER_API_KEY="..."; npm run seed:generate -- --only questions
$env:OPENROUTER_API_KEY="..."; npm run seed:generate -- --only broadcasts
$env:OPENROUTER_API_KEY="..."; npm run seed:generate -- --only comments

# Single community:
$env:OPENROUTER_API_KEY="..."; npm run seed:generate -- --community chess-tactics-daily

# Skip communities whose questions file already exists:
$env:OPENROUTER_API_KEY="..."; npm run seed:generate -- --only questions --skip-if-exists
```

Hand-review the output JSON before committing — the model gets a question wrong every now and then.

## Conventions

- **Drizzle migrations only** for schema changes. Never hand-edit the DB. Generated migrations live in `drizzle/` and are committed.
- **Services own data access.** No raw Drizzle in components or routes — call into `src/services/**`. Both REST routes and Server Actions go through the same service functions.
- **Web client uses Server Actions; mobile client uses REST.** The REST API is the mobile contract — keep it stable and don't tailor responses to web-only needs.
- **Server-first.** Default to server components. Use `"use client"` only when something genuinely needs browser-only behavior (event handlers, refs, browser APIs, controlled forms).
- **Cursor paginate** the comment thread and the broadcast feed. Offset-paginate the rest of the lists. Never return unbounded lists.
- **Files go to R2** via presigned POST. The DB only stores the public URL.
- **Authorization** is enforced in services + middleware + API routes. Two role layers: platform (`member`/`admin`) and community (`member`/`creator`). Don't rely on hidden UI.

## Deployment

Deployed to Vercel as a standard Next.js project. Required env vars in the host: `DATABASE_URL`, `JWT_SECRET`, and the five `R2_*` vars. `OPENROUTER_API_KEY` is optional and only needed if you want the AI draft feature in production.
