# Project Overview
This is a Node.js monorepo: Next.js back-end + Web client (`qna-web`) and Expo mobile (`qna-mobile`). Product scope lives in @PROJECT.md
- Workspace `qna-web`: Next.js web app with server-side API routes and React front-end components.
- Workspace `qna-mobile`: React Native mobile app built with Expo, communicating with the backend via REST API.

Monorepo workflow. Workspaces are wired via root `package.json`; prefer `npm run <script> -w <pkg>` from root. Install deps from the repo root (npm install) so workspaces hoist correctly — don't run npm install inside a sub-package.

# Technologies:
- Backend: Next.js + Drizzle ORM + PostgreSQL (Neon serverless).
- Web client: Next.js + React + TypeScript + Tailwind, talks to back-end via Server Actions.
- Mobile client: React Native + Expo, talks to back-end via RESTful API.
- File storage: Cloudflare R2 (object storage). 

# Architecture:
- **Service layer**: business logic lives in services used by RESTful API endpoints and Server Actions.
- **Modular design**: Split the app into self-contained modules to avoid long, complex files with monolithic code.
- User files (images, attachments) go to R2 via signed URLs. Never base64 or BYTEA blobs in PostgreSQL.


# Database
- Schema changes go through Drizzle migrations only - never hand-edit the DB or generate ad-hoc SQL.
- Use Drizzle's query API; avoid raw SQL unless there's a measured reason.

# Authentication
- JWT for auth and authorization (custom or Auth.js — pick one and stick to it).
- Hash passwords with bcrypt or argon2; never store plaintext.
- Enforce role checks in API endpoints, server components, and middleware — don't rely on UI hiding.
- Two role layers: platform role on the user (member/admin) and community role per membership (member/creator). Always check the right one for the operation.


# Scalability
Server-side paging for any list endpoint; assume tables can hold large datasets. No unbounded SELECT * to the client.

# Deployment
- Next.js app → Vercel (serverless). Expo app → Web export to Vercel. Env vars: DATABASE_URL, JWT_SECRET configured in the host, never committed.
- Secrets never live in the repo. Use .env.local locally and host-managed env vars in production. Commit a .env.example listing required keys with placeholder values.

