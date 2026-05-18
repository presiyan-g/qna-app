# Auth Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/password register + login + logout to `qna-web` per the approved design at `docs/superpowers/specs/2026-05-18-auth-slice-design.md`. After this slice, a visitor can create an account, sign in, see authed state in the nav, and sign out.

**Architecture:** Drizzle-managed `users` table on Neon Postgres. Auth services in `src/services/auth/` own password hashing (`bcryptjs`), JWT signing/verifying (`jose`), session cookie management, and DB access. Server Actions in `src/app/actions/auth.ts` are thin: parse FormData → validate → call services → set/clear `qna_session` HttpOnly cookie → `redirect()`. Pages live under a `(auth)` route group with a minimal centered layout. The landing `Nav.tsx` becomes a Server Component that reads `getSession()` and branches between anon and authed states. No middleware, no REST endpoints, no test framework — those come with later slices.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Drizzle ORM + Neon serverless Postgres · `bcryptjs` · `jose`.

**Testing approach (note):** Same posture as the landing slice — no Vitest/RTL yet because there's still no slice with enough business logic to justify the setup cost. Verification per task is one or more of: (a) Drizzle migration applies cleanly to the dev Neon DB, (b) `db-check.mjs` confirms the connection, (c) manual register/login/logout end-to-end in the browser, (d) `npm run lint -w qna-web` and `npm run build -w qna-web` as the closing gate. We add Vitest in the next slice that ships real branching logic worth testing in isolation (likely the question-grading slice).

**Total tasks:** 9. Each ends with a commit.

---

## Prerequisites

Before Task 1, confirm the engineer has a working Neon project and a `qna-web/.env.local` containing:

```
DATABASE_URL=postgresql://...sslmode=require
JWT_SECRET=<long-random-value, e.g. `openssl rand -base64 48`>
```

`.env.local` is gitignored — never commit it. The `.env.example` (added in Task 1) is the committed reference.

---

## File map (built up across tasks)

| Path | Action | Task | Purpose |
|---|---|---|---|
| `qna-web/drizzle.config.ts` | commit existing | 1 | Drizzle config (already on disk, unstaged) |
| `qna-web/.env.example` | commit existing | 1 | Env var reference |
| `qna-web/src/db/client.ts` | commit existing | 1 | Neon + Drizzle client |
| `qna-web/src/db/schema/index.ts` | commit existing | 1 | Schema barrel (currently empty stub) |
| `qna-web/scripts/db-check.mjs` | commit existing | 1 | Connection smoke test |
| `qna-web/package.json` | commit existing diff | 1 | Drizzle + Neon deps + db scripts |
| `scripts/run-workspaces.mjs` | commit existing diff | 1 | Windows-friendly npm spawn |
| `.gitignore`, `qna-web/.gitignore` | commit existing | 1 | Lockfile + env rules |
| `package-lock.json` | commit existing | 1 | Hoisted root lockfile |
| `qna-mobile/package-lock.json`, `qna-web/package-lock.json` | delete (already) | 1 | Removed; only root lockfile from now on |
| `qna-web/package.json` | modify | 2 | Add `bcryptjs`, `@types/bcryptjs`, `jose` |
| `qna-web/src/db/schema/users.ts` | create | 3 | Drizzle `users` table |
| `qna-web/src/db/schema/index.ts` | modify | 3 | Re-export `users` |
| `qna-web/drizzle/0000_*.sql` | generate | 3 | First migration (users table) |
| `qna-web/src/services/auth/passwords.ts` | create | 4 | `hashPassword`, `verifyPassword` |
| `qna-web/src/services/auth/jwt.ts` | create | 4 | `signSessionToken`, `verifySessionToken` |
| `qna-web/src/services/auth/session.ts` | create | 4 | `getSession`, `setSessionCookie`, `clearSessionCookie` |
| `qna-web/src/services/auth/users.ts` | create | 4 | `createUser`, `findUserByEmail` |
| `qna-web/src/services/auth/validation.ts` | create | 4 | Input guards + normalization |
| `qna-web/src/services/auth/errors.ts` | create | 4 | Typed auth errors |
| `qna-web/src/services/auth/index.ts` | create | 4 | Public surface |
| `qna-web/src/app/actions/auth.ts` | create | 5 | `registerAction`, `loginAction`, `logoutAction` |
| `qna-web/src/app/(auth)/layout.tsx` | create | 6 | Centered card layout for auth pages |
| `qna-web/src/app/(auth)/_components/AuthShell.tsx` | create | 6 | Shared card wrapper |
| `qna-web/src/app/(auth)/login/page.tsx` | create | 6 | Login page |
| `qna-web/src/app/(auth)/_components/LoginForm.tsx` | create | 6 | Login form (client) |
| `qna-web/src/app/(auth)/register/page.tsx` | create | 7 | Register page |
| `qna-web/src/app/(auth)/_components/RegisterForm.tsx` | create | 7 | Register form (client) |
| `qna-web/src/app/_components/landing/Nav.tsx` | modify | 8 | Branch on session |
| `qna-web/src/app/_components/landing/MobileMenu.tsx` | modify | 8 | Branch on session in drawer |
| `qna-web/src/app/_components/landing/UserMenu.tsx` | create | 8 | Username chip + sign-out form |

---

## Task 1: Commit the in-progress DB + monorepo bootstrap

The previous session left Drizzle/Neon scaffolding and a monorepo lockfile reshuffle uncommitted. Bundle it into one prep commit so the auth work starts on a clean tree.

**Files (all already on disk):**
- Modify: `.gitignore`
- Modify: `qna-web/.gitignore`
- Modify: `qna-web/package.json`
- Modify: `scripts/run-workspaces.mjs`
- Delete: `qna-web/package-lock.json` (workspace lockfiles removed in favor of root)
- Delete: `qna-mobile/package-lock.json`
- Add: `package-lock.json` (root, hoisted)
- Add: `qna-web/.env.example`
- Add: `qna-web/drizzle.config.ts`
- Add: `qna-web/scripts/db-check.mjs`
- Add: `qna-web/src/db/client.ts`
- Add: `qna-web/src/db/schema/index.ts`

- [ ] **Step 1: Inspect what's currently unstaged**

Run from repo root:

```bash
git status
git diff --stat
```

Expected: the modifications listed above, plus untracked `package-lock.json`, `qna-web/.env.example`, `qna-web/drizzle.config.ts`, `qna-web/scripts/`, `qna-web/src/db/`. No source-code changes in `qna-web/src/app/**` beyond what's already committed.

- [ ] **Step 2: Confirm dependencies are installed**

```bash
npm install
```

Expected: completes without error, root `node_modules/` populated, no `package-lock.json` resurrection in `qna-web/` or `qna-mobile/`.

- [ ] **Step 3: Smoke-test the Neon connection**

Make sure `qna-web/.env.local` exists with a real `DATABASE_URL` (see Prerequisites), then run:

```bash
node qna-web/scripts/db-check.mjs
```

Expected output:

```
OK - connected to Neon
{ version: 'PostgreSQL ...', db: '...', now: ... }
```

If it fails with `FAIL: DATABASE_URL is not set`, create `.env.local` and retry. If it fails with a connection error, fix the URL before proceeding — the next tasks depend on a working DB.

- [ ] **Step 4: Stage and commit**

```bash
git add .gitignore qna-web/.gitignore qna-web/package.json scripts/run-workspaces.mjs package-lock.json qna-web/.env.example qna-web/drizzle.config.ts qna-web/scripts/db-check.mjs qna-web/src/db/client.ts qna-web/src/db/schema/index.ts
git add -u qna-web/package-lock.json qna-mobile/package-lock.json
git commit -m "chore(db): bootstrap Drizzle + Neon, hoist lockfile to repo root"
```

Verify the commit only contains the files listed above:

```bash
git show --stat HEAD
```

If anything else slipped in, amend or reset and re-stage cleanly.

---

## Task 2: Install auth dependencies (`bcryptjs`, `jose`)

**Files:**
- Modify: `qna-web/package.json` (via `npm install`)
- Modify: `package-lock.json` (root, automatically)

- [ ] **Step 1: Install runtime deps + types**

Run from repo root:

```bash
npm install -w qna-web bcryptjs jose
npm install -w qna-web --save-dev @types/bcryptjs
```

Expected: three packages added to `qna-web/package.json`. The root `package-lock.json` updates in place.

Inspect the diff:

```bash
git diff qna-web/package.json
```

Expected: `"bcryptjs": "^X.Y.Z"`, `"jose": "^X.Y.Z"` under `dependencies`; `"@types/bcryptjs": "^X.Y.Z"` under `devDependencies`.

- [ ] **Step 2: Commit**

```bash
git add qna-web/package.json package-lock.json
git commit -m "chore(auth): add bcryptjs + jose dependencies"
```

---

## Task 3: Add `users` schema + first migration

Adds the table the auth services will read and write. Generates a Drizzle migration and applies it to Neon.

**Files:**
- Create: `qna-web/src/db/schema/users.ts`
- Modify: `qna-web/src/db/schema/index.ts`
- Generate: `qna-web/drizzle/0000_<name>.sql` (+ meta files)

- [ ] **Step 1: Create `qna-web/src/db/schema/users.ts`**

```ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role')
    .$type<'member' | 'admin'>()
    .notNull()
    .default('member'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Step 2: Replace `qna-web/src/db/schema/index.ts`**

```ts
export * from './users';
```

- [ ] **Step 3: Generate the migration**

From repo root:

```bash
npm run db:generate -w qna-web
```

Expected output: drizzle-kit prints something like `1 tables / 0 enums` and writes `qna-web/drizzle/0000_<random_name>.sql` plus `qna-web/drizzle/meta/_journal.json` and `meta/0000_snapshot.json`.

Inspect the generated SQL:

```bash
cat qna-web/drizzle/0000_*.sql
```

Expected:
- `CREATE TABLE "users" (...)` with all six columns and the unique constraints on `email` and `username`.
- No `DROP` statements (this is the first migration).

If the SQL looks wrong, delete the generated files, fix `users.ts`, and re-run `db:generate`.

- [ ] **Step 4: Apply the migration to Neon**

```bash
npm run db:migrate -w qna-web
```

Expected: prints `migrations applied successfully` (or similar). On `gen_random_uuid()` failure, the Neon project needs `pgcrypto` enabled — run once:

```bash
node qna-web/scripts/db-check.mjs
# if migration fails with pgcrypto, drop into Drizzle Studio or psql and run:
# CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Then re-run `npm run db:migrate -w qna-web`.

- [ ] **Step 5: Verify the table exists**

Add a one-off check or use Drizzle Studio:

```bash
npm run db:studio -w qna-web
```

Visit the URL it prints, confirm the `users` table is listed with the expected columns. Stop the studio (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add qna-web/src/db/schema/users.ts qna-web/src/db/schema/index.ts qna-web/drizzle/
git commit -m "feat(auth): users table + initial migration"
```

---

## Task 4: Auth services

Six tiny modules behind one barrel. Every consumer (Server Actions, `getSession`) goes through `src/services/auth/index.ts`.

**Files:**
- Create: `qna-web/src/services/auth/passwords.ts`
- Create: `qna-web/src/services/auth/jwt.ts`
- Create: `qna-web/src/services/auth/session.ts`
- Create: `qna-web/src/services/auth/users.ts`
- Create: `qna-web/src/services/auth/validation.ts`
- Create: `qna-web/src/services/auth/errors.ts`
- Create: `qna-web/src/services/auth/index.ts`

- [ ] **Step 1: Create `qna-web/src/services/auth/errors.ts`**

```ts
export class AuthConflictError extends Error {
  readonly field: 'email' | 'username';
  constructor(field: 'email' | 'username', message?: string) {
    super(message ?? `That ${field} is already in use.`);
    this.name = 'AuthConflictError';
    this.field = field;
  }
}

export class AuthValidationError extends Error {
  readonly fieldErrors: Record<string, string>;
  constructor(fieldErrors: Record<string, string>) {
    super('Validation failed');
    this.name = 'AuthValidationError';
    this.fieldErrors = fieldErrors;
  }
}
```

- [ ] **Step 2: Create `qna-web/src/services/auth/passwords.ts`**

```ts
import bcrypt from 'bcryptjs';

const COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 3: Create `qna-web/src/services/auth/jwt.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const SECRET_BYTES = new TextEncoder().encode(SECRET);

const ALG = 'HS256';
const EXPIRES_IN = '30d';

export type SessionPayload = {
  sub: string;
  role: 'member' | 'admin';
};

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET_BYTES);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, SECRET_BYTES, {
    algorithms: [ALG],
  });
  if (typeof payload.sub !== 'string') {
    throw new Error('Invalid session: missing sub');
  }
  const role = payload.role;
  if (role !== 'member' && role !== 'admin') {
    throw new Error('Invalid session: bad role claim');
  }
  return { sub: payload.sub, role };
}
```

- [ ] **Step 4: Create `qna-web/src/services/auth/session.ts`**

```ts
import { cache } from 'react';
import { cookies } from 'next/headers';
import { signSessionToken, verifySessionToken, type SessionPayload } from './jwt';

const COOKIE_NAME = 'qna_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
});

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
```

- [ ] **Step 5: Create `qna-web/src/services/auth/validation.ts`**

```ts
import { AuthValidationError } from './errors';

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function validateRegisterInput(raw: {
  email: unknown;
  username: unknown;
  password: unknown;
}): RegisterInput {
  const fieldErrors: Record<string, string> = {};

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const username = typeof raw.username === 'string' ? raw.username.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';

  if (!email) fieldErrors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.';

  if (!username) fieldErrors.username = 'Username is required.';
  else if (!USERNAME_RE.test(username))
    fieldErrors.username = '3–24 characters, lowercase letters, numbers, and underscores only.';

  if (!password) fieldErrors.password = 'Password is required.';
  else if (password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
  else if (password.length > 128) fieldErrors.password = 'Password is too long.';

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthValidationError(fieldErrors);
  }
  return { email, username, password };
}

export function validateLoginInput(raw: {
  email: unknown;
  password: unknown;
}): LoginInput {
  const fieldErrors: Record<string, string> = {};

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';

  if (!email) fieldErrors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.';

  if (!password) fieldErrors.password = 'Password is required.';

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthValidationError(fieldErrors);
  }
  return { email, password };
}
```

- [ ] **Step 6: Create `qna-web/src/services/auth/users.ts`**

```ts
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, type User } from '@/db/schema/users';
import { hashPassword } from './passwords';
import { AuthConflictError } from './errors';
import type { RegisterInput } from './validation';

export async function createUser(input: RegisterInput): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  try {
    const [row] = await db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        passwordHash,
      })
      .returning();
    return row;
  } catch (err) {
    // Postgres unique-violation code is 23505. The Neon driver surfaces it
    // on the error object; we sniff the message for the constraint name to
    // know whether email or username collided.
    const msg = err instanceof Error ? err.message : String(err);
    const isUnique = /unique/i.test(msg) || /duplicate key/i.test(msg);
    if (isUnique && /email/i.test(msg)) {
      throw new AuthConflictError('email');
    }
    if (isUnique && /username/i.test(msg)) {
      throw new AuthConflictError('username');
    }
    throw err;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
}
```

Note on the `@/` import alias: Next.js scaffolds `tsconfig.json` with `"paths": { "@/*": ["./src/*"] }`. Verify with `cat qna-web/tsconfig.json | grep paths`. If absent, use relative imports (`../../db/client`) throughout this file instead. (Default Next.js 16 scaffold does configure `@/*` — this is the expected state.)

- [ ] **Step 7: Create `qna-web/src/services/auth/index.ts`**

```ts
export {
  hashPassword,
  verifyPassword,
} from './passwords';

export {
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from './jwt';

export {
  getSession,
  setSessionCookie,
  clearSessionCookie,
} from './session';

export {
  createUser,
  findUserByEmail,
  findUserById,
} from './users';

export {
  validateRegisterInput,
  validateLoginInput,
  type RegisterInput,
  type LoginInput,
} from './validation';

export {
  AuthConflictError,
  AuthValidationError,
} from './errors';
```

- [ ] **Step 8: Type-check the service layer**

The fastest way to flush type errors before the build gate is to run lint, which type-checks via `eslint-config-next`:

```bash
npm run lint -w qna-web
```

Expected: no errors. If there are issues (missing types, bad imports), fix them and re-run.

- [ ] **Step 9: Commit**

```bash
git add qna-web/src/services/auth/
git commit -m "feat(auth): password, JWT, session, and user services"
```

---

## Task 5: Server Actions (`registerAction`, `loginAction`, `logoutAction`)

The thin glue layer between forms and services. All three live in one file.

**Files:**
- Create: `qna-web/src/app/actions/auth.ts`

- [ ] **Step 1: Create `qna-web/src/app/actions/auth.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import {
  AuthConflictError,
  AuthValidationError,
  clearSessionCookie,
  createUser,
  findUserByEmail,
  setSessionCookie,
  validateLoginInput,
  validateRegisterInput,
  verifyPassword,
} from '@/services/auth';

export type AuthFormState = {
  ok: false;
  formError?: string;
  fieldErrors?: Partial<Record<'email' | 'username' | 'password', string>>;
};

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const input = validateRegisterInput({
      email: formData.get('email'),
      username: formData.get('username'),
      password: formData.get('password'),
    });
    const user = await createUser(input);
    await setSessionCookie({ sub: user.id, role: user.role });
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    if (err instanceof AuthConflictError) {
      return { ok: false, fieldErrors: { [err.field]: err.message } };
    }
    throw err;
  }
  redirect('/');
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const input = validateLoginInput({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    const user = await findUserByEmail(input.email);
    if (!user) {
      return { ok: false, formError: 'Invalid email or password.' };
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return { ok: false, formError: 'Invalid email or password.' };
    }
    await setSessionCookie({ sub: user.id, role: user.role });
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    throw err;
  }
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/');
}
```

Notes:
- `redirect()` from `next/navigation` throws a special signal — never wrap the call in a try/catch that swallows it. We deliberately call `redirect()` outside the `try` block.
- `logoutAction` has the form-action signature `() => Promise<void>` (or accepts `FormData`), which is what `<form action={logoutAction}>` expects.

- [ ] **Step 2: Lint**

```bash
npm run lint -w qna-web
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add qna-web/src/app/actions/auth.ts
git commit -m "feat(auth): register/login/logout server actions"
```

---

## Task 6: Auth route group + `/login` page

Sets up the `(auth)` layout once (used by both `/login` in this task and `/register` in Task 7), creates the shared shell, then builds the login page and its client form.

**Files:**
- Create: `qna-web/src/app/(auth)/layout.tsx`
- Create: `qna-web/src/app/(auth)/_components/AuthShell.tsx`
- Create: `qna-web/src/app/(auth)/login/page.tsx`
- Create: `qna-web/src/app/(auth)/_components/LoginForm.tsx`

- [ ] **Step 1: Create `qna-web/src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-6 py-12">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `qna-web/src/app/(auth)/_components/AuthShell.tsx`**

```tsx
import Link from 'next/link';

type Props = {
  eyebrow: string;
  titlePlain: string;
  titleAccent: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthShell({
  eyebrow,
  titlePlain,
  titleAccent,
  children,
  footer,
}: Props) {
  return (
    <div className="w-full max-w-[440px]">
      <Link
        href="/"
        className="mb-8 block text-center text-[19px] font-extrabold tracking-tight text-primary"
      >
        Quorum
      </Link>
      <div className="rounded-[14px] border border-line bg-card px-7 py-8 md:px-9 md:py-10">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mb-7 text-[28px] font-bold leading-tight tracking-[-0.02em]">
          {titlePlain}{' '}
          <span className="serif-italic">{titleAccent}</span>
        </h1>
        {children}
      </div>
      <p className="mt-6 text-center text-[13px] text-muted">{footer}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `qna-web/src/app/(auth)/_components/LoginForm.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type AuthFormState } from '@/app/actions/auth';

const INITIAL: AuthFormState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </div>
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="mt-1 text-center text-[13px] text-muted">
        New here?{' '}
        <Link href="/register" className="font-semibold text-ink hover:underline">
          Create an account
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type: 'email' | 'password' | 'text';
  autoComplete?: string;
  error?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error && (
        <p id={`${id}-error`} className="text-[12px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `qna-web/src/app/(auth)/login/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { AuthShell } from '../_components/AuthShell';
import { LoginForm } from '../_components/LoginForm';

export const metadata = {
  title: 'Sign in — Quorum',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/');

  return (
    <AuthShell
      eyebrow="Sign in"
      titlePlain="Welcome"
      titleAccent="back."
      footer={null}
    >
      <LoginForm />
    </AuthShell>
  );
}
```

- [ ] **Step 5: Manual verification**

Run the dev server:

```bash
npm run dev -w qna-web
```

In the browser:
1. Visit http://localhost:3000/login — should render the centered card with "Welcome *back.*" headline.
2. Click "Create an account" — should navigate to `/register` (it'll 404 until Task 7 — that's expected).
3. Submit the form empty — should show field errors under both inputs.
4. Submit with a random non-existent email and a password — should show "Invalid email or password." in the banner.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add qna-web/src/app/\(auth\)/
git commit -m "feat(auth): login page + form"
```

(On Windows PowerShell the path globbing may differ — alternative: `git add qna-web/src/app/` and rely on git status to show only the `(auth)` additions.)

---

## Task 7: `/register` page + form

Reuses the layout and `AuthShell` from Task 6.

**Files:**
- Create: `qna-web/src/app/(auth)/register/page.tsx`
- Create: `qna-web/src/app/(auth)/_components/RegisterForm.tsx`

- [ ] **Step 1: Create `qna-web/src/app/(auth)/_components/RegisterForm.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registerAction, type AuthFormState } from '@/app/actions/auth';

const INITIAL: AuthFormState = { ok: false };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </div>
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.fieldErrors?.email}
      />
      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        hint="3–24 lowercase letters, numbers, or underscores."
        error={state.fieldErrors?.username}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="mt-1 text-center text-[13px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-ink hover:underline">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  name: string;
  type: 'email' | 'password' | 'text';
  autoComplete?: string;
  error?: string;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error ? (
        <p id={`${id}-error`} className="text-[12px] text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Create `qna-web/src/app/(auth)/register/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { AuthShell } from '../_components/AuthShell';
import { RegisterForm } from '../_components/RegisterForm';

export const metadata = {
  title: 'Create your account — Quorum',
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect('/');

  return (
    <AuthShell
      eyebrow="Create your account"
      titlePlain="Join the"
      titleAccent="conversation."
      footer={null}
    >
      <RegisterForm />
    </AuthShell>
  );
}
```

- [ ] **Step 3: Manual verification — first real account**

```bash
npm run dev -w qna-web
```

1. Visit http://localhost:3000/register — card renders with "Join the *conversation.*".
2. Submit empty → all three field errors appear.
3. Submit `email=not-an-email username=ab password=short` → validation errors on every field.
4. Submit valid values, e.g. `you@example.com`, `you_test`, `correct horse battery`:
   - Server Action redirects to `/`.
   - Open browser devtools → Application → Cookies → confirm `qna_session` is set, HttpOnly, SameSite=Lax.
   - The landing page renders; the nav still shows "Sign in / Join free" (Task 8 fixes that).
5. Open Drizzle Studio in another terminal (`npm run db:studio -w qna-web`) and confirm a row exists in `users` with your email + a bcrypt-style hash in `password_hash`. Stop Studio when done.
6. Try registering again with the same email → field error "That email is already in use."
7. Try registering with a different email but the same username → field error "That username is already in use."

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add qna-web/src/app/\(auth\)/register/ qna-web/src/app/\(auth\)/_components/RegisterForm.tsx
git commit -m "feat(auth): register page + form"
```

---

## Task 8: Nav reads session, shows logged-in state

Threads `getSession()` into the existing `Nav.tsx`. Adds a `UserMenu` component for the authed state and updates `MobileMenu.tsx` to show the right entries inside the drawer. Also re-points the anon links from the placeholder anchors (`#sign-in` / `#join`) to real routes.

**Files:**
- Modify: `qna-web/src/app/_components/landing/Nav.tsx`
- Modify: `qna-web/src/app/_components/landing/MobileMenu.tsx`
- Create: `qna-web/src/app/_components/landing/UserMenu.tsx`

- [ ] **Step 1: Create `qna-web/src/app/_components/landing/UserMenu.tsx`**

```tsx
import { logoutAction } from '@/app/actions/auth';

export function UserMenu({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary">
        @{username}
      </span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-ink hover:bg-primary-soft"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
```

This is a Server Component — Server Actions can be referenced directly in `<form action={...}>` from server components, no `"use client"` needed.

- [ ] **Step 2: Replace `qna-web/src/app/_components/landing/Nav.tsx`**

```tsx
import Link from 'next/link';
import { findUserById, getSession } from '@/services/auth';
import { MobileMenu } from './MobileMenu';
import { UserMenu } from './UserMenu';

const NAV_LINKS = [
  { href: '#discover', label: 'Discover' },
  { href: '#for-creators', label: 'For creators' },
];

export async function Nav() {
  const session = await getSession();
  const user = session ? await findUserById(session.sub) : null;

  return (
    <header className="relative border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/"
          className="text-[19px] font-extrabold tracking-tight text-primary"
        >
          Quorum
        </Link>

        <nav className="hidden md:flex md:gap-7 text-sm font-medium text-muted">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2.5 text-sm">
          {user ? (
            <UserMenu username={user.username} />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2.5 font-semibold text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-primary px-4 py-2.5 font-semibold text-paper"
              >
                Join free
              </Link>
            </>
          )}
        </div>

        <MobileMenu links={NAV_LINKS} username={user?.username ?? null} />
      </div>
    </header>
  );
}
```

Notes:
- We currently fetch the user row on every render to display the username. That's one extra DB read per page render; acceptable for v1. A later optimization can cache user-by-id with `React.cache`, but skip for now.
- The session helper itself is already cached per request via `React.cache`, so multiple consumers don't double-verify the JWT.

- [ ] **Step 3: Replace `qna-web/src/app/_components/landing/MobileMenu.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logoutAction } from '@/app/actions/auth';

type NavLink = { href: string; label: string };

export function MobileMenu({
  links,
  username,
}: {
  links: NavLink[];
  username: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
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
            {username ? (
              <>
                <span className="rounded-full bg-primary-soft px-4 py-2.5 text-center text-sm font-semibold text-primary">
                  @{username}
                </span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-full border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 text-center text-sm font-semibold text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper"
                >
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Manual verification — full loop**

```bash
npm run dev -w qna-web
```

1. Visit http://localhost:3000 logged out (clear `qna_session` in devtools if needed):
   - Nav shows "Sign in" and "Join free" — both are real links, `Sign in → /login`, `Join free → /register`.
   - Mobile (resize to 375px or use devtools): hamburger drawer shows the same anon links plus the discovery links.
2. Click `Join free` → register with new creds → redirected to `/`.
3. After redirect:
   - Nav shows `@<your-username>` chip and a `Sign out` button.
   - Mobile drawer mirrors that — chip + Sign out.
4. Refresh the page → still authed (cookie + JWT survive).
5. Click `Sign out`:
   - Cookie is cleared (verify in devtools).
   - Page reloads to `/`.
   - Nav is back to anon state.
6. Click `Sign in` → log in with the creds you just registered → redirected to `/`, nav shows authed state again.
7. While authed, manually visit `/login` and `/register` → both should redirect to `/`.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add qna-web/src/app/_components/landing/Nav.tsx qna-web/src/app/_components/landing/MobileMenu.tsx qna-web/src/app/_components/landing/UserMenu.tsx
git commit -m "feat(auth): nav reads session + user menu + mobile drawer auth state"
```

---

## Task 9: Final verification + cleanup

**Files:** none (verification only); may modify any file if issues surface.

- [ ] **Step 1: Lint**

```bash
npm run lint -w qna-web
```

Expected: zero errors. Fix anything reported.

- [ ] **Step 2: Production build**

```bash
npm run build -w qna-web
```

Expected:
- Build succeeds, no type errors.
- Build output route table includes:
  - `○ /` (Static — landing was static, but now reads cookies via Nav → it'll likely become Dynamic. Either `○` or `ƒ` is acceptable; what matters is that the build doesn't fail with "couldn't prerender".)
  - `ƒ /login` (Dynamic, since it reads cookies)
  - `ƒ /register` (Dynamic)

If `/` fails to prerender, that's the cookie read in `Nav` forcing it dynamic — that's expected and fine. The route output for `/` will show `ƒ (Dynamic)` instead of `○ (Static)`.

- [ ] **Step 3: End-to-end smoke at three breakpoints**

```bash
npm run dev -w qna-web
```

For each breakpoint (1280 / 768 / 375 in devtools), step through:
- Register a fresh account (use unique email each time).
- Confirm landing nav shows the auth state.
- Refresh — session survives.
- Sign out.
- Sign back in.
- Visit `/login` / `/register` while authed → redirected to `/`.

Stop the dev server.

- [ ] **Step 4: Commit any fixes**

If Steps 1–3 surfaced fixes, commit:

```bash
git add -A
git commit -m "fix(auth): post-implementation polish"
```

If nothing changed, skip the commit.

- [ ] **Step 5: Branch state check**

```bash
git status
git log --oneline -15
```

Expected: working tree clean. Last commits trace the slice (`chore(db): ...`, `chore(auth): ...`, `feat(auth): ...` series).

---

## Done

After Task 9, the auth slice is shippable. The next natural slice is **browse communities + community membership** (per `PROJECT.md` §4 must-haves), which will:
- Need `community_members` table + the community-level role layer.
- Be the first slice to introduce a protected route, which is when we add middleware.
- Be the first slice to justify Vitest (real branching: join eligibility, role checks).

That's a separate spec + plan — do not start it here.
