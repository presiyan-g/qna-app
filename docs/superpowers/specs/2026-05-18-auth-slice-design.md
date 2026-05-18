# Auth Slice — Design Spec

**Date:** 2026-05-18
**Scope:** `qna-web` only (web client). Mobile auth (REST) is a separate slice.
**Status:** Approved 2026-05-18.

---

## 1. Goal

Add email/password register, login, and logout to `qna-web`. After this slice ships, a visitor can:

1. Create an account at `/register` and be signed in immediately.
2. Sign in at `/login`.
3. See themselves as authed in the top nav (username chip + sign-out control).
4. Sign out and return to the public landing.

No other product surface depends on this yet, but every subsequent slice (browse communities, create community, answer questions, comments, leaderboard) does.

## 2. In scope / out of scope

### In scope (v1 auth slice)

- `users` table (Drizzle schema + first migration).
- Password hashing with `bcryptjs`.
- JWT-backed session in an HttpOnly cookie, verified with `jose`.
- Server Actions: `registerAction`, `loginAction`, `logoutAction`.
- `/register` and `/login` pages with their forms.
- `Nav.tsx` branches on auth state (anon vs authed).
- `getSession()` helper for Server Components, cached per request.

### Out of scope (explicitly deferred)

- Email verification, password reset, magic links, OAuth providers.
- REST `/api/auth/*` endpoints — these belong to the mobile slice (per `qna-web/AGENTS.md`: REST is for mobile, web uses Server Actions).
- Middleware-based route guards — no protected routes exist yet, so per-page `getSession()` checks suffice. Middleware lands with the first protected route.
- Community-level roles (`member` / `creator` per membership). Only platform-level `users.role` (`member` / `admin`) is modeled here.
- Rate limiting, captcha, account lockout. v1 relies on bcrypt cost being the only brake on brute force; revisit when traffic exists.
- Account deletion / data export.
- Test framework. Verification is manual + lint + build, matching the landing slice. Vitest lands with the first slice that has business logic worth unit-testing.

## 3. Stack decisions

| Decision | Choice | Rationale |
|---|---|---|
| Password hashing | `bcryptjs` (cost 10) | Pure JS, no native bindings, works on Vercel serverless without build hooks. AGENTS.md permits bcrypt or argon2; `bcryptjs` has the simplest DX. Behind `services/auth/passwords.ts` so we can swap to `argon2` without touching callers. |
| JWT library | `jose` | Modern, edge-compatible, well-maintained, de-facto choice for Next.js. |
| Session transport | HttpOnly cookie `qna_session`. `Secure` in production, `SameSite=Lax`, `Path=/`, 30-day expiry. JWT is the cookie value. | Server-rendered apps want HttpOnly. Lax (not Strict) so external links into the app retain the session. |
| Login identifier | Email (lowercased, unique). `username` is a separate public handle (unique, lowercased, used for display + future leaderboard). | Email = canonical login. Usernames stay independent so users can change them later without breaking login. |
| Form mechanism | Server Actions + React 19 `useActionState` | Per `qna-web/AGENTS.md`: web client uses Server Actions. Form components are `"use client"` only because `useActionState` requires it. |
| Post-auth destination | `/` (landing). Nav shows authed state. | No app dashboard exists yet. Future slices add `/discover` etc.; we'll change the redirect then. |
| Validation | Plain TypeScript guards in `services/auth/validation.ts` | A Zod dep isn't worth adding for ~4 fields. Easy to introduce later. |

## 4. Data model

### `users` table

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `email` | `text` | unique, not null | Stored lowercased; trim before insert. |
| `username` | `text` | unique, not null | Stored lowercased. 3–24 chars, `[a-z0-9_]`. |
| `password_hash` | `text` | not null | bcryptjs output. |
| `role` | `text` | not null, default `'member'` | `'member' \| 'admin'`. Enforce via TS union; no DB enum yet (cheap to add later if churn drops). |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | Bumped manually on update. |

Indexes: unique on `email` and unique on `username`. Both values are stored already-lowercased (normalized in the service layer before insert), so a plain column-level `.unique()` in Drizzle is sufficient — no functional `lower(...)` index needed. No additional indexes in v1.

No soft-delete in v1.

### Drizzle schema sketch

```ts
// qna-web/src/db/schema/users.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('member').$type<'member' | 'admin'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

`src/db/schema/index.ts` re-exports `users`.

## 5. Module layout

```
qna-web/src/
  db/
    client.ts                          (existing)
    schema/
      users.ts                         NEW
      index.ts                         MODIFIED — re-export users
  services/
    auth/
      passwords.ts                     NEW — hashPassword(), verifyPassword()
      jwt.ts                           NEW — signSessionToken(), verifySessionToken()
      session.ts                       NEW — getSession(), setSessionCookie(), clearSessionCookie()
      users.ts                         NEW — createUser(), findUserByEmail(), findUserById()
      validation.ts                    NEW — validateRegisterInput(), validateLoginInput()
      index.ts                         NEW — public surface
  app/
    (auth)/                            NEW — route group, no URL prefix
      login/page.tsx                   NEW
      register/page.tsx                NEW
      _components/
        AuthShell.tsx                  NEW — shared centered card wrapper
        LoginForm.tsx                  NEW — "use client", useActionState
        RegisterForm.tsx               NEW — "use client", useActionState
    actions/
      auth.ts                          NEW — "use server" — register/login/logout
    _components/landing/
      Nav.tsx                          MODIFIED — branch on session
      UserMenu.tsx                     NEW — "use client" dropdown w/ sign-out form
```

**Boundaries.** Services own all DB access and crypto. Server Actions are thin: parse FormData → validate → call services → set/clear cookie → redirect. Components never import from `services/` directly except via `getSession()` (which only reads the cookie, no DB).

## 6. Flows

### 6.1 Register

1. User fills `email`, `username`, `password` on `/register`.
2. Form posts to `registerAction(prevState, formData)`.
3. Action calls `validateRegisterInput`:
   - `email`: trim, lowercase, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
   - `username`: trim, lowercase, 3–24 chars, `/^[a-z0-9_]+$/`.
   - `password`: length ≥ 8, ≤ 128.
4. Action calls `createUser({ email, username, password })`:
   - `hashPassword(password)`.
   - `INSERT` via Drizzle.
   - On unique-constraint violation: throw a typed `AuthConflictError` indicating which field.
5. Action signs a 30-day JWT `{ sub: userId, role }` via `signSessionToken`.
6. Action sets `qna_session` cookie via `setSessionCookie`.
7. Action `redirect('/')`.

If validation or insert fails, the action returns `{ ok: false, fieldErrors }` and the form re-renders with errors.

### 6.2 Login

1. User fills `email`, `password` on `/login`.
2. Form posts to `loginAction`.
3. Action calls `validateLoginInput` (cheap: email format + non-empty password).
4. Action calls `findUserByEmail(emailLower)`.
5. If user exists, `verifyPassword(password, user.passwordHash)`.
6. **On any failure** (no user, bad password) return a single generic `formError: 'Invalid email or password.'`. Never reveal which leg failed.
7. On success: sign JWT, set cookie, `redirect('/')`.

### 6.3 Logout

1. `UserMenu` renders a one-button `<form action={logoutAction}>`.
2. `logoutAction` calls `clearSessionCookie()` then `redirect('/')`.

### 6.4 Session read

`getSession()` lives in `services/auth/session.ts`:

```ts
import { cache } from 'react';
import { cookies } from 'next/headers';
import { verifySessionToken } from './jwt';

export const getSession = cache(async () => {
  const token = (await cookies()).get('qna_session')?.value;
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
});
```

`Nav.tsx` (Server Component) awaits `getSession()` and branches. `React.cache` means multiple Server Components in the same render share the result.

### 6.5 Visiting `/login` or `/register` while authed

Both pages call `getSession()` at the top of the Server Component. If a session exists, they `redirect('/')` immediately. Prevents the confusing "I'm logged in but the form is asking me to log in again" state.

## 7. Error handling

- Server Actions return a discriminated state shape:
  ```ts
  type AuthState =
    | { ok: true }                                        // never actually returned — success redirects
    | { ok: false; formError?: string; fieldErrors?: Partial<Record<'email' | 'username' | 'password', string>> };
  ```
- Validation errors → `fieldErrors`.
- Uniqueness collisions (register only) → `fieldErrors.email` / `fieldErrors.username`, e.g. `"That email is already in use."`.
- Login bad credentials → `formError: 'Invalid email or password.'`.
- Truly unexpected errors (DB down, JWT_SECRET missing) → throw and let Next.js's error boundary handle. Don't try to display infra failures inline.

## 8. Security notes

- **HttpOnly cookie** — JS in the browser cannot read the session token.
- **`SameSite=Lax`** — protects against most CSRF on state-changing actions. Server Actions ride POST with same-origin enforcement, which is enough for v1; CSRF tokens can be added if we expose any cross-site-callable surface.
- **`Secure` flag in production** — set from `process.env.NODE_ENV === 'production'`.
- **JWT_SECRET** — read once at module load, fail loudly at boot if missing. Already declared in `.env.example`.
- **bcrypt cost 10** — ~50–100ms per hash on Vercel's CPU, acceptable for both register and login latency.
- **Generic login error** — `'Invalid email or password.'` regardless of which leg failed, to avoid email enumeration.
- **Register email enumeration** — the slice does leak email existence through the conflict message ("That email is already in use."). Acceptable trade-off for UX; rate-limit when traffic justifies it.
- **No password requirements beyond length** — explicit per-character rules push users toward weaker patterns. Length-only (≥ 8) is the modern recommendation.

## 9. UI / visual design

Both auth pages share `AuthShell`:

- Full-viewport centered layout on `bg-paper`.
- Card: `bg-card`, `border border-line`, `rounded-[14px]`, `max-w-[440px]`, generous padding.
- Headline uses the existing Instrument Serif italic accent treatment from the landing:
  - `/login` → "Welcome *back.*"
  - `/register` → "Join the *conversation.*"
- Inputs: same `border-line` + `rounded-lg` aesthetic; `focus:ring-primary` for focus.
- Primary submit: forest-green pill button, identical to the landing's "Join free" CTA.
- Field errors render in `text-sm text-red-700` below each input. Form-level errors render in a small banner above the submit.
- Footer line under the card: "Already have an account? *Sign in.*" / "New here? *Create an account.*"
- Wordmark at the top of the card links back to `/`.

The pages reuse `Nav.tsx`? **No** — auth pages don't need the nav. They get a minimal layout with just the wordmark in the card. Keeps the focus on the form.

### Nav.tsx changes

- Server component awaits `getSession()`.
- If `session == null`: render current "Sign in / Join free" buttons, but point them at `/login` and `/register` (currently `#sign-in` / `#join`).
- If `session != null`: render `<UserMenu username={...} />` — a `"use client"` dropdown showing the username and a sign-out button that posts to `logoutAction`. For v1 the "dropdown" can be a simple inline `<details>` element or a button-toggled menu; aim for the smallest sensible interaction.

### Mobile menu

Same logic — anon shows "Sign in / Join free", authed shows username + "Sign out" inside the existing drawer.

## 10. Verification approach

No test framework yet. Each task verifies with one or more of:

- **Drizzle migration applied** against the user's Neon dev DB (`npm run db:generate -w qna-web` then `npm run db:migrate -w qna-web`), confirmed via the existing `db-check.mjs` smoke script or a fresh `\dt` in Drizzle Studio.
- **Manual end-to-end**:
  1. Visit `/register` → fill form → submit → land on `/` with nav showing username.
  2. Refresh `/` → still authed (cookie survives).
  3. Click sign-out → land on `/` with nav showing "Sign in / Join free".
  4. Visit `/login` → fill form with the same creds → land on `/` authed.
  5. Try bad password → generic error, still on `/login`.
  6. Try duplicate email at `/register` → field error on email.
- **Lint + build gates** at the end: `npm run lint -w qna-web`, `npm run build -w qna-web`.

## 11. Risks and rollback

- **`jose` + serverless cold start** — JWT verification is fast (~1ms). Negligible.
- **`bcryptjs` slower than native bcrypt** — acceptable at our scale (<100ms per call). Swap to `argon2` later behind the existing `passwords.ts` interface if it becomes a bottleneck.
- **JWT_SECRET rotation** — rotating invalidates every existing session in one shot. Acceptable for v1; revisit when we have engaged users.
- **Migration on a shared dev DB** — Drizzle migrations are forward-only in this setup. If we need to back out, generate a reverse migration manually; v1 doesn't have a dedicated rollback story.

## 12. Open follow-ups (for later slices)

- Add middleware once the first protected route exists.
- Add `community_members` + community-level roles.
- Add REST `/api/auth/*` for the mobile client (separate spec).
- Add Vitest for the password / JWT / validation modules.
- Email verification + password reset (likely a single later slice once we wire transactional email).

---

## Appendix A — Task preview (full plan to follow)

1. Commit the in-progress DB bootstrap as `chore(db): bootstrap Drizzle + Neon` (drizzle config, client, .env.example, db-check script — all currently unstaged).
2. Install `bcryptjs`, `@types/bcryptjs`, `jose`.
3. Add `users` schema + generate first migration + apply to dev DB.
4. Build `services/auth/*` (passwords, jwt, session, users, validation, index).
5. Server Actions in `app/actions/auth.ts`.
6. `/login` page + `LoginForm` + `AuthShell`.
7. `/register` page + `RegisterForm`.
8. `Nav.tsx` + `UserMenu.tsx` update for logged-in state (anon links re-pointed too).
9. Final verification: lint, build, manual end-to-end run.
