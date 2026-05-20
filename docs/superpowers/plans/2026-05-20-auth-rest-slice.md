# Auth REST Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/auth/me` so the Expo mobile client can authenticate against the existing JWT/bcryptjs auth system over REST.

**Architecture:** Thin Next.js App Router route handlers under `qna-web/src/app/api/auth/` that delegate to the existing services in `src/services/auth/` (validation, user creation, password verification, JWT signing). Endpoints return the JWT as a Bearer token in the JSON body (mobile stores it in `expo-secure-store`), not a cookie. `getApiSession()` in [api-session.ts](qna-web/src/services/auth/api-session.ts) already accepts `Authorization: Bearer <token>`, so all existing API routes will work as-is once mobile has a token.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Neon Postgres), `jose` JWT (HS256, 30d), bcryptjs, `node:test` + `tsx --test` for tests.

---

## Design Decisions

- **Token transport:** JSON body field `token` (not Set-Cookie). Mobile stores in `expo-secure-store` and sends `Authorization: Bearer <token>` on subsequent requests.
- **No `/api/auth/logout`:** With stateless JWTs and no server-side revocation list, logout is purely a client-side `expo-secure-store.deleteItemAsync` call. Adding a no-op endpoint violates YAGNI. Revisit when we add token revocation.
- **No account-suspended check on login:** Matches the existing `loginAction` behavior in [actions/auth.ts](qna-web/src/app/actions/auth.ts). Suspension is enforced at action-time via `AccountSuspendedError` from each protected route. The user resource includes `status` so mobile can render a suspended banner.
- **Login is email-only:** Matches `validateLoginInput`. Username login is not in scope.
- **Error response shape:** Mirrors existing API routes (e.g., [api/communities/route.ts](qna-web/src/app/api/communities/route.ts)) — `{ error: string, fieldErrors?: Record<string, string> }` with status codes 400 / 401 / 409 / 422.
- **Rate limiting:** Out of scope. Tracked as a follow-up. Listed in [project-roadmap memory](C:\Users\Presiyan\.claude\projects\D--Projects-qna-app\memory\project_roadmap.md).
- **Tests:** Project convention is to unit-test pure logic in services. Route handlers in this codebase do not have integration tests (see [api/communities/route.ts](qna-web/src/app/api/communities/route.ts) — no `.test.ts`). We follow the convention: TDD the new pure mapper, then smoke-test the live endpoints with curl.

---

## File Structure

**Create:**
- `qna-web/src/services/auth/user-resource.ts` — Pure mapper: `User` → API resource (strips `passwordHash`, serializes dates).
- `qna-web/src/services/auth/user-resource.test.ts` — Unit tests for the mapper.
- `qna-web/src/app/api/auth/register/route.ts` — `POST` handler.
- `qna-web/src/app/api/auth/login/route.ts` — `POST` handler.
- `qna-web/src/app/api/auth/me/route.ts` — `GET` handler.

**Modify:**
- `qna-web/src/services/auth/index.ts` — Export `toUserResource` and `UserResource`.

---

## Response Contract

All endpoints return JSON. On success:

```jsonc
// POST /api/auth/register → 201
// POST /api/auth/login → 200
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "username": "alice",
    "role": "member",
    "status": "active",
    "createdAt": "2026-05-20T12:00:00.000Z"
  }
}
```

```jsonc
// GET /api/auth/me → 200
{ "user": { ...same shape... } }
```

On error:

```jsonc
// 400 — bad JSON body
{ "error": "Invalid JSON body." }

// 401 — login: bad credentials | /me: missing/invalid token
{ "error": "Invalid email or password." }
{ "error": "Authentication required." }

// 409 — register: email or username already taken
{ "error": "That email is already in use.", "fieldErrors": { "email": "That email is already in use." } }

// 422 — validation error
{ "error": "Validation failed.", "fieldErrors": { "password": "Use at least 8 characters." } }
```

---

### Task 1: User resource mapper (TDD)

**Files:**
- Create: `qna-web/src/services/auth/user-resource.ts`
- Test: `qna-web/src/services/auth/user-resource.test.ts`

- [ ] **Step 1: Write the failing test**

`qna-web/src/services/auth/user-resource.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toUserResource } from './user-resource';
import type { User } from '@/db/schema/users';

const baseUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'alice@example.com',
  username: 'alice',
  passwordHash: 'never-leak-me',
  role: 'member',
  status: 'active',
  createdAt: new Date('2026-05-20T12:00:00.000Z'),
  updatedAt: new Date('2026-05-20T12:00:00.000Z'),
};

describe('toUserResource', () => {
  it('exposes safe fields with ISO dates', () => {
    assert.deepEqual(toUserResource(baseUser), {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'alice@example.com',
      username: 'alice',
      role: 'member',
      status: 'active',
      createdAt: '2026-05-20T12:00:00.000Z',
    });
  });

  it('never includes passwordHash', () => {
    const resource = toUserResource(baseUser) as Record<string, unknown>;
    assert.equal('passwordHash' in resource, false);
  });

  it('carries admin role through unchanged', () => {
    const admin = { ...baseUser, role: 'admin' as const };
    assert.equal(toUserResource(admin).role, 'admin');
  });

  it('carries suspended status through unchanged', () => {
    const suspended = { ...baseUser, status: 'suspended' as const };
    assert.equal(toUserResource(suspended).status, 'suspended');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w qna-web`
Expected: FAIL with `Cannot find module './user-resource'` (or similar).

- [ ] **Step 3: Implement the mapper**

`qna-web/src/services/auth/user-resource.ts`:

```ts
import 'server-only';
import type { User } from '@/db/schema/users';

export type UserResource = {
  id: string;
  email: string;
  username: string;
  role: User['role'];
  status: User['status'];
  createdAt: string;
};

export function toUserResource(user: User): UserResource {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
```

Note: the `'server-only'` import is consistent with the rest of the auth services. The test file does not import `'server-only'` itself (it imports the mapper, which transitively will fail at runtime in a browser bundle — but `tsx --test` runs in Node, so this is fine).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w qna-web`
Expected: PASS, four assertions in `toUserResource`. All pre-existing tests still pass.

- [ ] **Step 5: Export from auth index**

Modify `qna-web/src/services/auth/index.ts` — append:

```ts
export {
  toUserResource,
  type UserResource,
} from './user-resource';
```

- [ ] **Step 6: Commit**

```bash
git add qna-web/src/services/auth/user-resource.ts qna-web/src/services/auth/user-resource.test.ts qna-web/src/services/auth/index.ts
git commit -m "feat(auth): add toUserResource mapper for REST endpoints"
```

---

### Task 2: POST /api/auth/register

**Files:**
- Create: `qna-web/src/app/api/auth/register/route.ts`

- [ ] **Step 1: Implement the route handler**

`qna-web/src/app/api/auth/register/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import {
  AuthConflictError,
  AuthValidationError,
  createUser,
  signSessionToken,
  toUserResource,
  validateRegisterInput,
} from '@/services/auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  try {
    const input = validateRegisterInput({
      email: raw.email,
      username: raw.username,
      password: raw.password,
    });
    const user = await createUser(input);
    const token = await signSessionToken({ sub: user.id, role: user.role });
    return NextResponse.json(
      { token, user: toUserResource(user) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: 'Validation failed.', fieldErrors: err.fieldErrors },
        { status: 422 },
      );
    }
    if (err instanceof AuthConflictError) {
      return NextResponse.json(
        { error: err.message, fieldErrors: { [err.field]: err.message } },
        { status: 409 },
      );
    }
    throw err;
  }
}
```

- [ ] **Step 2: Smoke test against running dev server**

In one terminal:
```bash
npm run dev -w qna-web
```

In another, generate a unique-enough payload and run:
```bash
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"smoketest+$(date +%s)@example.com\",\"username\":\"smoke$(date +%s)\",\"password\":\"correct-horse-battery\"}"
```

Expected: `HTTP/1.1 201 Created`, JSON body with `token` (long JWT string) and `user` object containing `id`, `email`, `username`, `role: "member"`, `status: "active"`, `createdAt`. Verify response body does NOT contain `passwordHash`.

Then verify error cases:
```bash
# Bad JSON → 400
curl -i -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "not json"

# Validation → 422
curl -i -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"bad\",\"username\":\"x\",\"password\":\"short\"}"

# Conflict (replay same email from the 201) → 409
# Use the email from the successful smoke test above
```

Expected statuses: 400, 422, 409 in that order with the documented response shapes.

- [ ] **Step 3: Commit**

```bash
git add qna-web/src/app/api/auth/register/route.ts
git commit -m "feat(auth): add POST /api/auth/register REST endpoint"
```

---

### Task 3: POST /api/auth/login

**Files:**
- Create: `qna-web/src/app/api/auth/login/route.ts`

- [ ] **Step 1: Implement the route handler**

`qna-web/src/app/api/auth/login/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import {
  AuthValidationError,
  findUserByEmail,
  signSessionToken,
  toUserResource,
  validateLoginInput,
  verifyPassword,
} from '@/services/auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  try {
    const input = validateLoginInput({
      email: raw.email,
      password: raw.password,
    });
    const user = await findUserByEmail(input.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }
    const token = await signSessionToken({ sub: user.id, role: user.role });
    return NextResponse.json(
      { token, user: toUserResource(user) },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: 'Validation failed.', fieldErrors: err.fieldErrors },
        { status: 422 },
      );
    }
    throw err;
  }
}
```

- [ ] **Step 2: Smoke test**

With dev server running and using the email from Task 2's successful registration:

```bash
# Success → 200
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"<email from task 2>\",\"password\":\"correct-horse-battery\"}"

# Wrong password → 401
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"<email from task 2>\",\"password\":\"wrong\"}"

# Unknown email → 401 (must give same generic message — do not leak existence)
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"nobody-$(date +%s)@example.com\",\"password\":\"whatever\"}"

# Validation → 422
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"bad\",\"password\":\"\"}"
```

Expected: 200 (with token + user), 401, 401 (same `error` text as the wrong-password 401), 422. Save the token from the 200 response — Task 4 uses it.

- [ ] **Step 3: Commit**

```bash
git add qna-web/src/app/api/auth/login/route.ts
git commit -m "feat(auth): add POST /api/auth/login REST endpoint"
```

---

### Task 4: GET /api/auth/me

**Files:**
- Create: `qna-web/src/app/api/auth/me/route.ts`

- [ ] **Step 1: Implement the route handler**

`qna-web/src/app/api/auth/me/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { findUserById, toUserResource } from '@/services/auth';
import { getApiSession } from '@/services/auth/api-session';

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const user = await findUserById(session.sub);
  if (!user) {
    // Token valid but user was deleted — treat as unauthenticated.
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  return NextResponse.json({ user: toUserResource(user) }, { status: 200 });
}
```

- [ ] **Step 2: Smoke test**

Using the token saved from Task 3:

```bash
# No token → 401
curl -i http://localhost:3000/api/auth/me

# Garbage token → 401
curl -i -H "Authorization: Bearer not-a-real-token" http://localhost:3000/api/auth/me

# Valid token → 200
curl -i -H "Authorization: Bearer <token from task 3>" http://localhost:3000/api/auth/me
```

Expected: 401, 401, 200 with `{ user: { ... } }` matching the user from Task 3's login response.

- [ ] **Step 3: Commit**

```bash
git add qna-web/src/app/api/auth/me/route.ts
git commit -m "feat(auth): add GET /api/auth/me REST endpoint"
```

---

### Task 5: End-to-end flow verification

This task asserts the full register → me → login → me path works without manual JWT shuffling. Catches contract regressions before mobile starts depending on it.

- [ ] **Step 1: Run the full flow**

With `npm run dev -w qna-web` still running, in PowerShell:

```powershell
$ts = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$email = "e2e+$ts@example.com"
$username = "e2e$ts"
$password = "correct-horse-battery"

# 1. Register
$reg = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/register `
  -ContentType 'application/json' `
  -Body (@{ email = $email; username = $username; password = $password } | ConvertTo-Json)
$reg.user.email
$regToken = $reg.token

# 2. /me with the register token
$me1 = Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Headers @{ Authorization = "Bearer $regToken" }
$me1.user.email

# 3. Login
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login `
  -ContentType 'application/json' `
  -Body (@{ email = $email; password = $password } | ConvertTo-Json)
$loginToken = $login.token

# 4. /me with the login token
$me2 = Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Headers @{ Authorization = "Bearer $loginToken" }
$me2.user.email

# 5. Same user across both tokens
if ($me1.user.id -eq $me2.user.id) { "OK same user" } else { "FAIL different users" }
```

Expected: every line prints the expected value; final output is `OK same user`. Both tokens are valid (login mints a fresh one but the original register token also still works — same JWT secret, same user).

- [ ] **Step 2: Verify the existing protected API accepts the bearer token**

This proves the slice unblocks mobile end-to-end (mobile can hit the rest of the API once it has a token).

```powershell
# Existing protected endpoint — POST /api/communities requires auth.
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/communities `
  -ContentType 'application/json' `
  -Headers @{ Authorization = "Bearer $loginToken" } `
  -Body (@{ name = "E2E test $ts"; emoji = "🧪"; cadence = "weekly" } | ConvertTo-Json)
```

Expected: 201 response with the created community. (If this 401s, `getApiSession` is broken — investigate; do not paper over.)

- [ ] **Step 3: Run lint and full test suite**

```bash
npm run lint -w qna-web
npm test -w qna-web
```

Expected: both green. The lint pass catches any unused imports; the test pass confirms `toUserResource` tests pass and nothing else regressed.

- [ ] **Step 4: Commit (only if anything changed)**

If steps 1–3 surfaced any fixes, commit them. Otherwise skip — this is a verification task, not a change task.

---

### Task 6: Update mobile docs with the auth contract

So the next person picking up mobile work (probably the next session) doesn't have to reverse-engineer the contract.

**Files:**
- Modify: `qna-mobile/AGENTS.md`

- [ ] **Step 1: Read the current file**

Read `qna-mobile/AGENTS.md` to find the right insertion point — there's already a section discussing JWT in `expo-secure-store` and Bearer headers. Add the endpoint contract immediately after it.

- [ ] **Step 2: Append the auth endpoint contract**

Add a new `## Auth REST contract` section with this content:

````markdown
## Auth REST contract

Implemented in `qna-web/src/app/api/auth/`. Bearer token in JSON body — store in `expo-secure-store`, send as `Authorization: Bearer <token>` on every subsequent request.

- `POST /api/auth/register` — body `{ email, username, password }`. Returns `201 { token, user }`. Errors: `400` bad JSON, `409` email/username taken (with `fieldErrors`), `422` validation (with `fieldErrors`).
- `POST /api/auth/login` — body `{ email, password }`. Returns `200 { token, user }`. Errors: `400` bad JSON, `401` wrong credentials (generic message — do not leak which field is wrong), `422` validation.
- `GET /api/auth/me` — header `Authorization: Bearer <token>`. Returns `200 { user }`. Errors: `401` missing/invalid token or user deleted.

The `user` resource shape: `{ id, email, username, role: "member" | "admin", status: "active" | "suspended", createdAt: ISO8601 }`. Never contains `passwordHash`.

Logout is client-side only: delete the token from `expo-secure-store`. No `/api/auth/logout` endpoint — stateless JWT, no revocation list.

Validation rules (mirror these in mobile form validation):
- Email: standard email regex, lowercased.
- Username: `^[a-z0-9_]{3,24}$`.
- Password: 8–128 characters.

On `401` from any endpoint, the client should clear the stored token and route to login.
````

- [ ] **Step 3: Commit**

```bash
git add qna-mobile/AGENTS.md
git commit -m "docs(mobile): document auth REST contract"
```

---

## Out of scope

These were considered and explicitly deferred:

- **`POST /api/auth/logout`** — YAGNI. Logout is client-side until we add a revocation list.
- **Rate limiting** — Add when we ship to real users. Tracked in roadmap memory.
- **Password reset / recovery** — Separate slice.
- **Email verification** — Separate slice.
- **Username login** (in addition to email) — Not requested.
- **Account-suspended login block** — Matches existing web behavior; suspension is enforced at action time. Mobile can render a banner using `user.status`.
- **Refresh tokens** — 30-day JWTs are good enough for the MVP. Reconsider if we tighten expiry.
- **Route-handler integration tests** — Project convention is service-level testing. Smoke tests (Task 5) cover contract regressions.
