# QnA App

A Node.js monorepo for a community Q&A product with a Next.js web/backend app and an Expo mobile app.

Product notes and scope live in [PROJECT.md](PROJECT.md).

## Workspaces

- `qna-web` - Next.js app with React UI, server actions, REST API routes, Drizzle ORM, Neon Postgres, and Cloudflare R2 uploads.
- `qna-mobile` - Expo / React Native app that talks to the backend REST API.

## Prerequisites

- Node.js and npm
- A Neon Postgres database
- Cloudflare R2 credentials for uploads
- Optional: OpenRouter API key for AI draft generation and seed-data regeneration

## Setup

Install dependencies from the repository root so npm workspaces hoist packages correctly:

```bash
npm install
```

Create local env files from the examples:

```bash
cp qna-web/.env.example qna-web/.env.local
cp qna-mobile/.env.example qna-mobile/.env
```

Fill in at least:

- `qna-web/.env.local`: `DATABASE_URL`, `JWT_SECRET`, and R2 settings
- `qna-mobile/.env`: `QNA_API_URL`, usually `http://localhost:3000/api`

Never commit real secrets.

## Development

Run both workspaces:

```bash
npm run dev
```

Run one workspace:

```bash
npm run dev -w qna-web
npm run dev -w qna-mobile
```

The web app runs on Next.js, typically at `http://localhost:3000`. The mobile app starts Expo and can be opened in Expo Go, an emulator, or the web target.

## Common Commands

```bash
npm run build              # build all workspaces
npm test                   # run web tests
npm run test -w qna-mobile # run mobile tests
npm run lint -w qna-web
npm run lint -w qna-mobile
```

Database commands run through the web workspace:

```bash
npm run db:generate -w qna-web
npm run db:migrate -w qna-web
npm run db:studio -w qna-web
```

Seed demo data after migrating:

```bash
# PowerShell
$env:ALLOW_SEED="1"; npm run seed
```

See [qna-web/README.md](qna-web/README.md) for seed accounts and seed-data regeneration.

## Architecture Notes

- Keep business logic in service modules used by both REST API endpoints and server actions.
- Use Drizzle migrations for schema changes; do not hand-edit the database.
- Use Drizzle query APIs unless raw SQL is clearly justified.
- Page all list endpoints server-side.
- Store user files in R2 via signed URLs; do not store base64 files or binary blobs in Postgres.
- Enforce authorization in API routes, server components, middleware, and services as appropriate.

## Deployment

- `qna-web` deploys to Vercel as the Next.js app.
- `qna-mobile` can be exported for web and deployed to Vercel.
- Production secrets belong in host-managed environment variables, not in the repository.
