This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Seed the database

The repo ships with a fully scripted demo seed: 20 communities, 500 demo users, ~400 questions, ~25k synthetic answers, ~600–800 comments, ~100 broadcasts. All data is deterministic and idempotent — re-running the seed against the same DB is a no-op.

### One-time setup

```bash
# Pointing at your Neon DB:
npm run db:migrate -w qna-web
```

### Seed

```powershell
# PowerShell (Windows):
$env:ALLOW_SEED="1"; npm run seed
```

```bash
# bash / zsh / macOS / Linux:
ALLOW_SEED=1 npm run seed
```

### Test accounts

Created by the seed. Password for all three: `demo1234`.

| Email                 | Role               | Notes                                                                 |
|-----------------------|--------------------|----------------------------------------------------------------------|
| `admin@demo.local`    | platform admin     | sees the admin panel at `/admin`                                      |
| `creator@demo.local`  | community creator  | owns `daily-ai-builders` and `chess-tactics-daily`; sees the creator dashboard |
| `member@demo.local`   | member             | joined to ~6 communities, has answered ~200 questions                |

The 500 `demo_member_NNN` users in the demo pool do not have a working password — they exist to populate communities, leaderboards, and answers, not to be logged into.

### Regenerating the AI-authored content

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

Hand-review the output JSON before committing — the AI gets a question wrong every now and then.
