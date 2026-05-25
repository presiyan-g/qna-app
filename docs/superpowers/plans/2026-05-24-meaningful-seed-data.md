# Meaningful Seed Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the current single-file seed into a `seed/` module dir, add 6 more communities (~20 total), three named test accounts, a one-off OpenRouter generator that produces curated JSON fixtures (questions, broadcasts, comments), and a synthetic answer fan-out across the demo user pool that produces ~40k rows in `answers` so the scalability rubric is satisfied.

**Architecture:** One-off `generate-seed-data.mjs` (uses OpenRouter, hand-reviewed output) writes JSON files committed under `qna-web/scripts/seed-data/`. The seed itself (`seed/index.mjs`) reads only from those JSON files and the DB; it makes no network calls beyond Postgres. Each entity gets its own focused module with one responsibility. All seeded rows use deterministic UUID v5 IDs so re-runs are idempotent.

**Tech Stack:** Node ESM scripts (no TS compilation), Drizzle ORM, Neon serverless Postgres, `bcryptjs` (already in deps), `uuid` (new), `seedrandom` (new). For the generator: existing `qna-web/src/lib/ai/provider.ts` + `question-drafts.ts` (reused) + new `seed-prompts/` modules (broadcasts + comments). Tests use `tsx --test` (Node native runner) following the project pattern.

**Spec:** [2026-05-24-meaningful-seed-data-design.md](../specs/2026-05-24-meaningful-seed-data-design.md)

**Repo conventions:**
- Run `npm` commands from the **repo root** (`D:\Projects\qna-app`), e.g. `npm run test -w qna-web`.
- Tests use `node:test` + `node:assert/strict`. Mock externals via dependency injection on function args.
- Server-only TS files import `'server-only'` at the top. Pure helpers do not.
- Per user memory: **do not run `git commit` or `git push` autonomously**. Each task ends with a *suggested* commit message; pause and let the user commit when they're ready.

---

## File map

**Create:**

- `qna-web/scripts/seed/db.mjs` — Drizzle client factory + shared constants
- `qna-web/scripts/seed/schema.mjs` — single point of table re-declaration for the seed scripts
- `qna-web/scripts/seed/ids.mjs` — deterministic UUID v5 helpers
- `qna-web/scripts/seed/fixtures.mjs` — typed loaders for JSON files in `seed-data/`
- `qna-web/scripts/seed/rng.mjs` — seeded RNG factory (wraps `seedrandom`)
- `qna-web/scripts/seed/categories.mjs` — replaces top-level `seed-categories.mjs`
- `qna-web/scripts/seed/users.mjs` — seed owner + test accounts + demo pool
- `qna-web/scripts/seed/communities.mjs` — communities + memberships with cross-pollination
- `qna-web/scripts/seed/questions.mjs` — questions + choices, timeline math
- `qna-web/scripts/seed/broadcasts.mjs` — broadcasts spread across last 30 days
- `qna-web/scripts/seed/answers.mjs` — synthetic answer fan-out
- `qna-web/scripts/seed/comments.mjs` — comment threads (depends on answers existing)
- `qna-web/scripts/seed/timeline.mjs` — pure helper for question timeline math
- `qna-web/scripts/seed/index.mjs` — orchestrator
- `qna-web/scripts/generate-seed-data.mjs` — one-off OpenRouter generator
- `qna-web/scripts/seed-data/communities.json` — community list (replaces hardcoded array)
- `qna-web/scripts/seed-data/questions/<slug>.json` — per-community questions
- `qna-web/scripts/seed-data/broadcasts/<slug>.json` — per-community broadcasts
- `qna-web/scripts/seed-data/comments/<slug>.json` — per-community comment threads
- `qna-web/src/lib/ai/seed-prompts/broadcasts.ts` — broadcast prompt + parser
- `qna-web/src/lib/ai/seed-prompts/broadcasts.test.ts`
- `qna-web/src/lib/ai/seed-prompts/comments.ts` — comment prompt + parser
- `qna-web/src/lib/ai/seed-prompts/comments.test.ts`
- `qna-web/src/lib/seed-helpers.ts` — pure helpers (timeline, activity tier, correctness, lateness) exported for tests
- `qna-web/src/lib/seed-helpers.test.ts`

**Modify:**

- `qna-web/package.json` — add `uuid` + `seedrandom` deps; replace seed scripts; add `seed:generate` script.
- `package.json` (root) — add `seed` and `seed:generate` proxies.
- `qna-web/.env.example` — note `ALLOW_SEED=1` requirement.
- `qna-web/README.md` — short "Seed the database" section pointing at the new command.

**Delete (after the new ones work):**

- `qna-web/scripts/seed-categories.mjs`
- `qna-web/scripts/seed-communities.mjs`

---

## Task 1: Foundation — modules, deterministic IDs, ALLOW_SEED guard, no behavior change

The goal of this task is to land the new module structure with **exactly the same output** as today's `seed-communities.mjs`. No new entities, no new content. Once the user reruns this and the DB is unchanged, we know the refactor is safe and we can build on it.

**Files:**

- Create: `qna-web/scripts/seed/db.mjs`, `seed/schema.mjs`, `seed/ids.mjs`, `seed/rng.mjs`, `seed/categories.mjs`, `seed/users.mjs`, `seed/communities.mjs`, `seed/index.mjs`
- Modify: `qna-web/package.json` (add deps, replace scripts)
- Modify: `package.json` (root)
- Modify: `qna-web/.env.example`

### Step 1.1: Add new dependencies

- [ ] Run from repo root:

```bash
npm install --workspace qna-web uuid seedrandom
npm install --workspace qna-web --save-dev @types/uuid @types/seedrandom
```

Expected: `qna-web/package.json` now lists `uuid` and `seedrandom` under `dependencies`, types under `devDependencies`.

### Step 1.2: Create `seed/db.mjs`

`qna-web/scripts/seed/db.mjs`:

```js
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';

config({ path: '.env.local' });
config();

// Shared bcrypt hash for the bulk demo_member_NNN pool.
// Hash of literal string "password" (cost 10). Reused so the seed is fast — we don't
// need each demo user to have a unique secret; graders won't be logging in as them.
export const DEMO_POOL_PASSWORD_HASH =
  '$2b$10$H0qbDEKzV5l7j7JMrNlxLOiFKZLeHtYRqH61pUQ3DP9Ls15lBpF8K';

export function makeDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }
  return drizzle(neon(process.env.DATABASE_URL));
}
```

### Step 1.3: Create `seed/schema.mjs`

The seed scripts can't import from `qna-web/src/db/schema/*.ts` because those files import `'server-only'` and assume the Next.js runtime. Re-declare just the tables the seed touches, in ONE place.

`qna-web/scripts/seed/schema.mjs`:

```js
// Mirror of qna-web/src/db/schema/* for use by the plain-Node seed scripts.
// Keep in sync when migrations change column shape. The seed only writes
// columns it explicitly sets; missing columns (defaults, generated) are fine.

import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['member', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);
export const communityCadenceEnum = pgEnum('community_cadence', ['daily', 'weekly', 'custom']);
export const communityStatusEnum = pgEnum('community_status', ['active', 'archived']);
export const communityMemberRoleEnum = pgEnum('community_member_role', ['member', 'creator']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const communityCategories = pgTable(
  'community_categories',
  {
    id: uuid('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('community_categories_slug_unique').on(table.slug)],
);

export const communities = pgTable(
  'communities',
  {
    id: uuid('id').primaryKey(),
    creatorUserId: uuid('creator_user_id').notNull(),
    categoryId: uuid('category_id'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    emoji: text('emoji').notNull(),
    coverImageUrl: text('cover_image_url'),
    cadence: communityCadenceEnum('cadence').notNull(),
    status: communityStatusEnum('status').notNull(),
    isFeatured: boolean('is_featured').notNull(),
    featuredRank: integer('featured_rank'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('communities_slug_unique').on(table.slug)],
);

export const communityMembers = pgTable(
  'community_members',
  {
    id: uuid('id').primaryKey(),
    communityId: uuid('community_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: communityMemberRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('community_members_community_user_unique').on(
      table.communityId,
      table.userId,
    ),
  ],
);

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey(),
  communityId: uuid('community_id').notNull(),
  creatorUserId: uuid('creator_user_id').notNull(),
  prompt: text('prompt').notNull(),
  explanation: text('explanation').notNull(),
  imageUrl: text('image_url'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  closesAt: timestamp('closes_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  timeZone: text('time_zone').notNull(),
  points: integer('points').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const questionChoices = pgTable(
  'question_choices',
  {
    id: uuid('id').primaryKey(),
    questionId: uuid('question_id').notNull(),
    label: text('label').notNull(),
    imageUrl: text('image_url'),
    isCorrect: boolean('is_correct').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('question_choices_question_position_unique').on(
      table.questionId,
      table.position,
    ),
  ],
);

export const answers = pgTable(
  'answers',
  {
    id: uuid('id').primaryKey(),
    questionId: uuid('question_id').notNull(),
    userId: uuid('user_id').notNull(),
    selectedChoiceId: uuid('selected_choice_id').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    isLate: boolean('is_late').notNull(),
    pointsAwarded: integer('points_awarded').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('answers_question_user_unique').on(
      table.questionId,
      table.userId,
    ),
  ],
);

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey(),
  questionId: uuid('question_id').notNull(),
  authorUserId: uuid('author_user_id').notNull(),
  parentCommentId: uuid('parent_comment_id'),
  body: text('body').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const broadcastPosts = pgTable('broadcast_posts', {
  id: uuid('id').primaryKey(),
  communityId: uuid('community_id').notNull(),
  authorUserId: uuid('author_user_id').notNull(),
  body: text('body').notNull(),
  imageUrl: text('image_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
```

### Step 1.4: Create `seed/ids.mjs`

`qna-web/scripts/seed/ids.mjs`:

```js
import { v5 as uuidv5 } from 'uuid';

// Generated once via `node -e "console.log(require('uuid').v4())"` on 2026-05-24.
// Do NOT change — all deterministic seed IDs derive from this namespace.
// Changing it would orphan every previously-seeded row.
const SEED_NAMESPACE = 'b3e91d2a-7c84-4f51-9d02-1a6f4e8c5b73';

const id = (key) => uuidv5(key, SEED_NAMESPACE);

export const userIdByUsername = (username) => id(`user:${username}`);
export const categoryIdBySlug = (slug) => id(`category:${slug}`);
export const communityIdBySlug = (slug) => id(`community:${slug}`);
export const membershipId = (communitySlug, username) =>
  id(`membership:${communitySlug}:${username}`);
export const questionId = (communitySlug, index) =>
  id(`question:${communitySlug}:${index}`);
export const choiceId = (communitySlug, questionIndex, position) =>
  id(`choice:${communitySlug}:${questionIndex}:${position}`);
export const answerId = (communitySlug, questionIndex, username) =>
  id(`answer:${communitySlug}:${questionIndex}:${username}`);
export const broadcastId = (communitySlug, index) =>
  id(`broadcast:${communitySlug}:${index}`);
export const commentId = (communitySlug, questionIndex, threadIndex, kind) =>
  id(`comment:${communitySlug}:${questionIndex}:${threadIndex}:${kind}`);
```

### Step 1.5: Create `seed/rng.mjs`

`qna-web/scripts/seed/rng.mjs`:

```js
import seedrandom from 'seedrandom';

const SEED_PREFIX = 'quorum-seed-v1';

// Returns a deterministic RNG keyed by a stable string.
// Same key → identical sequence across runs.
export function makeRng(...keyParts) {
  return seedrandom(`${SEED_PREFIX}:${keyParts.join(':')}`);
}

// Helpers built on top of an RNG.
export function pickRandom(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle(rng, items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sampleSubset(rng, items, count) {
  return shuffle(rng, items).slice(0, count);
}
```

### Step 1.6: Create `seed/categories.mjs`

Moves the existing seed-categories logic into the new dir. Same behavior, same data.

`qna-web/scripts/seed/categories.mjs`:

```js
import { inArray } from 'drizzle-orm';
import { communityCategories } from './schema.mjs';
import { categoryIdBySlug } from './ids.mjs';

// Same 18 categories as the old top-level seed-categories.mjs.
export const categories = [
  {
    slug: 'ai-and-tools',
    name: 'AI & Tools',
    description: 'Applied AI, agents, workflows, and builders shipping useful systems.',
  },
  {
    slug: 'programming-and-software',
    name: 'Programming & Software',
    description: 'Software engineering, languages, systems design, and craft questions.',
  },
  {
    slug: 'web-and-design',
    name: 'Web & Design',
    description: 'Modern front-end craft, interface design, CSS, and product polish.',
  },
  {
    slug: 'security-and-ops',
    name: 'Security & Ops',
    description: 'Security review, incident response, infrastructure, and reliability.',
  },
  {
    slug: 'gaming',
    name: 'Gaming',
    description: 'Video games, board games, chess, mechanics, and player culture.',
  },
  {
    slug: 'fun-facts',
    name: 'Fun Facts',
    description: 'Bite-sized trivia, curious phenomena, and "did you know" surprises.',
  },
  {
    slug: 'geography',
    name: 'Geography',
    description: 'Places, maps, borders, cities, landscapes, and how the world is laid out.',
  },
  {
    slug: 'history',
    name: 'History',
    description: 'Events, eras, people, and turning points across world and regional history.',
  },
  {
    slug: 'science-and-health',
    name: 'Science & Health',
    description: 'Biotech, neuroscience, research literacy, and clinical reasoning.',
  },
  {
    slug: 'math-and-logic',
    name: 'Math & Logic',
    description: 'Puzzles, proofs, probability, and clean reasoning under uncertainty.',
  },
  {
    slug: 'markets-and-policy',
    name: 'Markets & Policy',
    description: 'Macro signals, business cycles, finance, and public policy questions.',
  },
  {
    slug: 'product-and-startups',
    name: 'Product & Startups',
    description: 'Founder habits, product sense, growth, and community building.',
  },
  {
    slug: 'writing-and-culture',
    name: 'Writing & Culture',
    description: 'Writing practice, film, philosophy, and cultural critique.',
  },
  {
    slug: 'languages',
    name: 'Languages',
    description: 'Grammar, vocabulary, usage, and learning across world languages.',
  },
  {
    slug: 'food-and-cooking',
    name: 'Food & Cooking',
    description: 'Technique, ingredients, cuisines, and the science behind good cooking.',
  },
  {
    slug: 'music',
    name: 'Music',
    description: 'Theory, production, instruments, genres, and listening practice.',
  },
  {
    slug: 'sports-and-fitness',
    name: 'Sports & Fitness',
    description: 'Training, performance, tactics, and the sports worth following.',
  },
  {
    slug: 'law-and-civics',
    name: 'Law & Civics',
    description: 'Contracts, governance, civic systems, and practical legal concepts.',
  },
];

export const deprecatedCategorySlugs = ['strategy-games'];

export async function seedCategories(db) {
  const rows = await Promise.all(
    categories.map((category) =>
      db
        .insert(communityCategories)
        .values({
          id: categoryIdBySlug(category.slug),
          slug: category.slug,
          name: category.name,
          description: category.description,
        })
        .onConflictDoUpdate({
          target: communityCategories.slug,
          set: { name: category.name, description: category.description },
        })
        .returning(),
    ),
  );

  if (deprecatedCategorySlugs.length > 0) {
    await db
      .delete(communityCategories)
      .where(inArray(communityCategories.slug, deprecatedCategorySlugs));
  }

  const categoryBySlug = new Map(rows.map(([cat]) => [cat.slug, cat]));
  console.log(`Seeded ${categoryBySlug.size} categories.`);
  return { categoryBySlug };
}
```

### Step 1.7: Create `seed/users.mjs`

`qna-web/scripts/seed/users.mjs`:

```js
import { eq, like } from 'drizzle-orm';
import { users } from './schema.mjs';
import { userIdByUsername } from './ids.mjs';
import { DEMO_POOL_PASSWORD_HASH } from './db.mjs';

export const SEED_OWNER_USERNAME = 'quorum_seed';
export const SEED_OWNER_EMAIL = 'quorum-seed@local.test';

// Test accounts surfaced to graders via the cover page. Password for all three: demo1234
// Regenerate the hash with:
//   node -e "console.log(require('bcryptjs').hashSync('demo1234', 10))"
// (The bcryptjs lib is already a qna-web dep.)
export const TEST_ACCOUNT_PASSWORD_HASH =
  '$2b$10$qtkv3IKpa.zKZ4ZIQzNVeOJBzZcj.B2sQqyqfMVuJG/L1qbTr3qy.'; // bcrypt of "demo1234"

export const TEST_ACCOUNTS = [
  {
    email: 'admin@demo.local',
    username: 'demo_admin',
    role: 'admin',
  },
  {
    email: 'creator@demo.local',
    username: 'demo_creator',
    role: 'member',
  },
  {
    email: 'member@demo.local',
    username: 'demo_member',
    role: 'member',
  },
];

const DEMO_POOL_SIZE = 500;

function demoPoolUser(index) {
  const num = String(index + 1).padStart(3, '0');
  return {
    email: `demo-member-${num}@local.test`,
    username: `demo_member_${num}`,
    role: 'member',
  };
}

async function upsertUser(db, user, passwordHash) {
  await db
    .insert(users)
    .values({
      id: userIdByUsername(user.username),
      email: user.email,
      username: user.username,
      passwordHash,
      role: user.role,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        username: user.username,
        role: user.role,
        passwordHash,
      },
    });
}

export async function seedUsers(db) {
  // Seed owner (admin) — single creator of fallback content.
  const seedOwner = {
    email: SEED_OWNER_EMAIL,
    username: SEED_OWNER_USERNAME,
    role: 'admin',
  };
  await upsertUser(db, seedOwner, DEMO_POOL_PASSWORD_HASH);

  // Three named test accounts.
  for (const account of TEST_ACCOUNTS) {
    await upsertUser(db, account, TEST_ACCOUNT_PASSWORD_HASH);
  }

  // Demo member pool — 500 users.
  const demoUsers = Array.from({ length: DEMO_POOL_SIZE }, (_, i) => demoPoolUser(i));
  for (const chunk of chunkArray(demoUsers, 100)) {
    await db
      .insert(users)
      .values(
        chunk.map((u) => ({
          id: userIdByUsername(u.username),
          email: u.email,
          username: u.username,
          passwordHash: DEMO_POOL_PASSWORD_HASH,
          role: u.role,
        })),
      )
      .onConflictDoNothing();
  }

  // Read back IDs the orchestrator will need downstream.
  const seedOwnerRow = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, SEED_OWNER_USERNAME))
    .limit(1);

  const testAccountRows = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(like(users.email, '%@demo.local'));

  const demoUserRows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(like(users.username, 'demo_member_%'));
  demoUserRows.sort((a, b) => a.username.localeCompare(b.username));

  console.log(
    `Seeded users: 1 owner + ${testAccountRows.length} test accounts + ${demoUserRows.length} demo pool.`,
  );

  return {
    seedOwner: seedOwnerRow[0],
    testAccountsByUsername: new Map(testAccountRows.map((u) => [u.username, u])),
    demoUsers: demoUserRows,
  };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
```

> **Note on the bcrypt hash:** the value above is a placeholder. The implementing engineer MUST regenerate it once and paste the result in. Until then, `demo1234` will not log in.

### Step 1.8: Create `seed/communities.mjs` (refactor with no behavior change yet)

For this task the community list stays hardcoded (matches today's seed). Task 2 will move it into the JSON fixture and add 6 more.

`qna-web/scripts/seed/communities.mjs`:

```js
import { communities, communityMembers } from './schema.mjs';
import { communityIdBySlug, membershipId, userIdByUsername } from './ids.mjs';
import { makeRng, sampleSubset } from './rng.mjs';

// Same 14 entries as the old hardcoded array in seed-communities.mjs.
// Task 2 replaces this with a JSON fixture.
export const SEEDED_COMMUNITIES = [
  {
    slug: 'daily-ai-builders',
    name: 'Daily AI Builders',
    emoji: '🤖',
    categorySlug: 'ai-and-tools',
    description: 'One applied AI architecture question a day for people building useful agents, automations, and tools.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 1,
    targetMembers: 420,
    creatorUsername: null,
  },
  // ... copy ALL 14 entries verbatim from qna-web/scripts/seed-communities.mjs lines 77-298.
  // For each entry add `creatorUsername: null`. (Task 2 sets some to specific demo_member_NNN values.)
];

const MIN_PER_USER = 2;
const MAX_PER_USER = 5;

export async function seedCommunities(db, ctx) {
  const { seedOwner, testAccountsByUsername, demoUsers } = ctx;
  const { categoryBySlug } = ctx;

  const upserted = [];
  for (const community of SEEDED_COMMUNITIES) {
    const category = categoryBySlug.get(community.categorySlug);
    if (!category) {
      throw new Error(`Unknown categorySlug: ${community.categorySlug}`);
    }

    const creatorUserId = resolveCreatorUserId(community, ctx);

    await db
      .insert(communities)
      .values({
        id: communityIdBySlug(community.slug),
        creatorUserId,
        categoryId: category.id,
        slug: community.slug,
        name: community.name,
        description: community.description,
        emoji: community.emoji,
        cadence: community.cadence,
        status: 'active',
        isFeatured: community.isFeatured,
        featuredRank: community.featuredRank,
      })
      .onConflictDoUpdate({
        target: communities.slug,
        set: {
          creatorUserId,
          categoryId: category.id,
          name: community.name,
          description: community.description,
          emoji: community.emoji,
          cadence: community.cadence,
          status: 'active',
          isFeatured: community.isFeatured,
          featuredRank: community.featuredRank,
        },
      });

    upserted.push({ ...community, id: communityIdBySlug(community.slug), creatorUserId });
  }

  // Membership cross-pollination — each demo user joins 2–5 communities (deterministic).
  const memberships = []; // { communityId, userId, role }

  // Owners are always members of their own community as creator.
  for (const community of upserted) {
    memberships.push({
      communityId: community.id,
      userId: community.creatorUserId,
      role: 'creator',
    });
  }

  // Each demo user picks 2–5 communities deterministically.
  const allSlugs = upserted.map((c) => c.slug);
  for (const user of demoUsers) {
    const rng = makeRng('membership', user.username);
    const pickCount = MIN_PER_USER + Math.floor(rng() * (MAX_PER_USER - MIN_PER_USER + 1));
    const chosenSlugs = sampleSubset(rng, allSlugs, pickCount);
    for (const slug of chosenSlugs) {
      memberships.push({
        communityId: communityIdBySlug(slug),
        userId: user.id,
        role: 'member',
      });
    }
  }

  // The named test accounts get a richer set of memberships so their profiles look populated.
  const demoMember = testAccountsByUsername.get('demo_member');
  if (demoMember) {
    const rng = makeRng('membership', 'demo_member');
    const chosenSlugs = sampleSubset(rng, allSlugs, 6);
    for (const slug of chosenSlugs) {
      memberships.push({ communityId: communityIdBySlug(slug), userId: demoMember.id, role: 'member' });
    }
  }
  const demoCreator = testAccountsByUsername.get('demo_creator');
  if (demoCreator) {
    // demo_creator joins as a regular member of 3 random communities; their creator-role memberships
    // are inserted by the loop above for whichever communities they own (Task 2 wires that up).
    const rng = makeRng('membership', 'demo_creator');
    const chosenSlugs = sampleSubset(rng, allSlugs, 3);
    for (const slug of chosenSlugs) {
      memberships.push({ communityId: communityIdBySlug(slug), userId: demoCreator.id, role: 'member' });
    }
  }

  // Resolve username for membership ID. We need the username for the key, but memberships use userId.
  // The deterministic key uses (communitySlug, username), so build a reverse map.
  const usernameByUserId = new Map();
  for (const u of demoUsers) usernameByUserId.set(u.id, u.username);
  if (seedOwner) usernameByUserId.set(seedOwner.id, seedOwner.username);
  for (const [username, u] of testAccountsByUsername.entries()) usernameByUserId.set(u.id, username);

  // Dedupe by (communityId, userId) — sampleSubset can't produce dupes within one user but
  // the test-account block above could create one if a test account is also in the pool's pick.
  const seen = new Set();
  const deduped = [];
  for (const m of memberships) {
    const key = `${m.communityId}:${m.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(m);
  }

  for (const chunk of chunkArray(deduped, 500)) {
    await db
      .insert(communityMembers)
      .values(
        chunk.map((m) => {
          const username = usernameByUserId.get(m.userId);
          const slug = upserted.find((c) => c.id === m.communityId)?.slug ?? 'unknown';
          return {
            id: membershipId(slug, username ?? m.userId),
            communityId: m.communityId,
            userId: m.userId,
            role: m.role,
          };
        }),
      )
      .onConflictDoUpdate({
        target: [communityMembers.communityId, communityMembers.userId],
        set: { role: undefined }, // keep existing role on conflict; only fill missing rows
      });
  }

  // Build the membership-by-community map for downstream modules (answers, comments).
  const membershipsByCommunitySlug = new Map();
  for (const community of upserted) {
    membershipsByCommunitySlug.set(community.slug, []);
  }
  for (const m of deduped) {
    const community = upserted.find((c) => c.id === m.communityId);
    if (!community) continue;
    membershipsByCommunitySlug.get(community.slug).push({
      userId: m.userId,
      role: m.role,
    });
  }

  console.log(`Seeded ${upserted.length} communities, ${deduped.length} memberships.`);
  return {
    communitiesBySlug: new Map(upserted.map((c) => [c.slug, c])),
    membershipsByCommunitySlug,
  };
}

function resolveCreatorUserId(community, ctx) {
  if (!community.creatorUsername) return ctx.seedOwner.id;
  // Check test accounts first (demo_creator, etc.).
  const testAcc = ctx.testAccountsByUsername.get(community.creatorUsername);
  if (testAcc) return testAcc.id;
  // Fall back to demo pool.
  const pooled = ctx.demoUsers.find((u) => u.username === community.creatorUsername);
  if (pooled) return pooled.id;
  throw new Error(
    `creatorUsername "${community.creatorUsername}" for community "${community.slug}" not found in any seeded user pool.`,
  );
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
```

> **Engineer note for this step:** copy the **full 14 community entries** from the existing `qna-web/scripts/seed-communities.mjs` (lines 77–298 of that file) into `SEEDED_COMMUNITIES` above, appending `creatorUsername: null` to each. Do not skip any. The membership cross-pollination is intentionally different from the old "everyone joins everything" — that's the only behavior change in this task and it's needed so leaderboards differentiate later.

### Step 1.9: Create `seed/index.mjs`

`qna-web/scripts/seed/index.mjs`:

```js
// Quorum seed orchestrator.
// Replaces the previous single-file seed-communities.mjs (see git history before 2026-05-24).

import { makeDb } from './db.mjs';
import { seedCategories } from './categories.mjs';
import { seedUsers } from './users.mjs';
import { seedCommunities } from './communities.mjs';

async function main() {
  if (process.env.ALLOW_SEED !== '1') {
    throw new Error(
      'Refusing to seed without ALLOW_SEED=1. Set it in qna-web/.env.local or prefix the command (PowerShell: $env:ALLOW_SEED="1"; npm run seed).',
    );
  }

  const db = makeDb();

  const ctx = {};
  Object.assign(ctx, await seedCategories(db));
  Object.assign(ctx, await seedUsers(db));
  Object.assign(ctx, await seedCommunities(db, ctx));

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

### Step 1.10: Update package.json scripts

Modify `qna-web/package.json` — replace these script lines:

```json
"db:seed": "node scripts/seed-communities.mjs",
"db:seed:categories": "node scripts/seed-categories.mjs"
```

with:

```json
"seed": "node scripts/seed/index.mjs",
"seed:generate": "node scripts/generate-seed-data.mjs"
```

Modify root `package.json` — add proxies under `scripts`:

```json
"seed": "npm run seed -w qna-web",
"seed:generate": "npm run seed:generate -w qna-web"
```

### Step 1.11: Update `.env.example`

Add a section near the top of `qna-web/.env.example`:

```
# Seeding the database
# Required to run `npm run seed`. Single explicit opt-in so the command can't run by accident.
ALLOW_SEED=
```

### Step 1.12: Verify the refactor produces the same result as the old seed

- [ ] **Run the new seed against a Neon dev branch:**

```bash
# PowerShell, from repo root, with DATABASE_URL pointed at a Neon dev branch:
$env:ALLOW_SEED="1"; npm run seed
```

Expected output:
```
Seeded 18 categories.
Seeded users: 1 owner + 3 test accounts + 500 demo pool.
Seeded 14 communities, NNN memberships.
Seed complete.
```

NNN = 14 (creators) + 500 × avg(3.5) + 6 (demo_member) + 3 (demo_creator) ≈ 1773.

- [ ] **Sanity check the DB:**

```sql
-- via psql or Drizzle Studio (`npm run db:studio -w qna-web`)
SELECT count(*) FROM users WHERE email = 'admin@demo.local';
-- expect: 1
SELECT count(*) FROM communities;
-- expect: 14
SELECT count(*) FROM community_members WHERE role = 'creator';
-- expect: 14 (one per community, all owned by quorum_seed in this task)
```

- [ ] **Run the seed a second time:** counts must be identical. This proves idempotency.

### Step 1.13: Delete the old top-level scripts

```bash
rm qna-web/scripts/seed-communities.mjs
rm qna-web/scripts/seed-categories.mjs
```

- [ ] **Suggested commit:**

```
refactor(seed): split into seed/ modules with deterministic IDs

- Replaces single-file seed-communities.mjs with a focused module dir.
- Switches all seeded rows to deterministic UUID v5 IDs (seed namespace
  hardcoded in seed/ids.mjs) so re-runs are no-ops on unchanged data.
- Replaces NODE_ENV check with single ALLOW_SEED=1 env guard.
- Adds three named test accounts (demo_admin/demo_creator/demo_member,
  password "demo1234") for graders.
- Memberships now cross-pollinate (each demo user in 2-5 communities)
  instead of every-user-in-every-community, so per-community leaderboards
  will differentiate once questions and answers land.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 2: Move communities into a JSON fixture; add 6 more; promote demo_creator

This task externalizes the community list and brings the total to 20.

**Files:**

- Create: `qna-web/scripts/seed-data/communities.json`
- Modify: `qna-web/scripts/seed/communities.mjs` (read from JSON instead of hardcoded array)
- Create: `qna-web/scripts/seed/fixtures.mjs` (loader)

### Step 2.1: Create `seed/fixtures.mjs`

`qna-web/scripts/seed/fixtures.mjs`:

```js
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED_DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'seed-data',
);

function readJson(relative) {
  const p = join(SEED_DATA_DIR, relative);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function loadCommunitiesFixture() {
  const data = readJson('communities.json');
  if (!data || !Array.isArray(data)) {
    throw new Error('seed-data/communities.json missing or invalid.');
  }
  return data;
}

export function loadQuestionsFixture(communitySlug) {
  return readJson(join('questions', `${communitySlug}.json`));
}

export function loadBroadcastsFixture(communitySlug) {
  return readJson(join('broadcasts', `${communitySlug}.json`));
}

export function loadCommentsFixture(communitySlug) {
  return readJson(join('comments', `${communitySlug}.json`));
}

export function listCommunitiesWithQuestions() {
  const dir = join(SEED_DATA_DIR, 'questions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}
```

### Step 2.2: Create `seed-data/communities.json`

Port the 14 existing entries from `seed/communities.mjs` into `qna-web/scripts/seed-data/communities.json`, and **add 6 new ones** spanning categories that don't have a community yet. The full file (20 entries):

```json
[
  {
    "slug": "daily-ai-builders",
    "name": "Daily AI Builders",
    "emoji": "🤖",
    "categorySlug": "ai-and-tools",
    "description": "One applied AI architecture question a day for people building useful agents, automations, and tools.",
    "cadence": "daily",
    "isFeatured": true,
    "featuredRank": 1,
    "targetMembers": 420,
    "creatorUsername": null
  },
  {
    "slug": "chess-tactics-daily",
    "name": "Chess Tactics Daily",
    "emoji": "♟",
    "categorySlug": "gaming",
    "description": "A tactical chess position every day, with discussion unlocked after you choose your line.",
    "cadence": "daily",
    "isFeatured": true,
    "featuredRank": 2,
    "targetMembers": 360,
    "creatorUsername": "demo_creator"
  }
  /* ... carry over the remaining 12 from the original SEEDED_COMMUNITIES array ... */
  /* ... then append the 6 new ones below ... */
]
```

The 6 new community entries to append:

```json
{
  "slug": "kitchen-fundamentals",
  "name": "Kitchen Fundamentals",
  "emoji": "🍳",
  "categorySlug": "food-and-cooking",
  "description": "Technique-first cooking questions — emulsions, sears, doughs, seasoning, and the why behind each.",
  "cadence": "daily",
  "isFeatured": false,
  "featuredRank": null,
  "targetMembers": 220,
  "creatorUsername": "demo_member_017"
},
{
  "slug": "music-theory-weekly",
  "name": "Music Theory Weekly",
  "emoji": "🎼",
  "categorySlug": "music",
  "description": "One ear-training or theory puzzle a week — intervals, chord function, modes, voice leading.",
  "cadence": "weekly",
  "isFeatured": false,
  "featuredRank": null,
  "targetMembers": 140,
  "creatorUsername": "demo_member_088"
},
{
  "slug": "sports-tactics-daily",
  "name": "Sports Tactics Daily",
  "emoji": "⚽",
  "categorySlug": "sports-and-fitness",
  "description": "Tactical positions and decisions across football, basketball, and tennis — read the play, pick the option.",
  "cadence": "daily",
  "isFeatured": false,
  "featuredRank": null,
  "targetMembers": 280,
  "creatorUsername": null
},
{
  "slug": "civics-quick-takes",
  "name": "Civics Quick Takes",
  "emoji": "🏛",
  "categorySlug": "law-and-civics",
  "description": "Short questions on contracts, governance, and how legal systems actually work in practice.",
  "cadence": "weekly",
  "isFeatured": false,
  "featuredRank": null,
  "targetMembers": 95,
  "creatorUsername": "demo_member_134"
},
{
  "slug": "languages-of-the-week",
  "name": "Language of the Week",
  "emoji": "🗣",
  "categorySlug": "languages",
  "description": "A grammar or usage puzzle from a different world language every week — patterns that surprise English speakers.",
  "cadence": "weekly",
  "isFeatured": false,
  "featuredRank": null,
  "targetMembers": 170,
  "creatorUsername": null
},
{
  "slug": "writing-craft-weekly",
  "name": "Writing Craft Weekly",
  "emoji": "✍",
  "categorySlug": "writing-and-culture",
  "description": "Voice, structure, and edit decisions — pick the stronger sentence, the cleaner cut, the truer line.",
  "cadence": "weekly",
  "isFeatured": false,
  "featuredRank": null,
  "targetMembers": 110,
  "creatorUsername": "demo_member_201"
}
```

For `daily-ai-builders`, also change its `creatorUsername` from `null` to `"demo_creator"` (the second flagship community owned by the test creator account, per the spec).

### Step 2.3: Modify `seed/communities.mjs` to read from the fixture

Replace the hardcoded `SEEDED_COMMUNITIES` constant with a call to the fixture loader at top of `seedCommunities`:

```js
import { loadCommunitiesFixture } from './fixtures.mjs';
// ... rest of imports unchanged ...

// REMOVE the SEEDED_COMMUNITIES constant from this file.

export async function seedCommunities(db, ctx) {
  const fixture = loadCommunitiesFixture();
  // ... use `fixture` everywhere SEEDED_COMMUNITIES used to be ...
}
```

### Step 2.4: Verify

- [ ] Run seed:
  ```bash
  $env:ALLOW_SEED="1"; npm run seed
  ```
  Expected: `Seeded 20 communities, NNN memberships.`

- [ ] Sanity check: `daily-ai-builders` and `chess-tactics-daily` should now have `demo_creator` as their `creatorUserId`:
  ```sql
  SELECT c.slug, u.username FROM communities c
   JOIN users u ON u.id = c.creator_user_id
   WHERE c.slug IN ('daily-ai-builders', 'chess-tactics-daily');
  -- expect both rows to show u.username = 'demo_creator'
  ```

- [ ] **Suggested commit:**
  ```
  feat(seed): move communities to JSON fixture and add 6 more

  Total now 20 communities spanning all 18 categories (food/music/sports/
  civics/languages/writing previously had none). demo_creator owns
  daily-ai-builders and chess-tactics-daily for grader-facing creator-side
  demo. Six other communities are owned by random demo_member_NNN users
  to make the browse page look organic.
  ```

---

## Task 3: AI seed-prompt modules for broadcasts and comments

The generator script reuses the existing `qna-web/src/lib/ai/question-drafts.ts` for questions verbatim. Broadcasts and comments need new prompt modules co-located with the AI code.

**Files:**

- Create: `qna-web/src/lib/ai/seed-prompts/broadcasts.ts`
- Create: `qna-web/src/lib/ai/seed-prompts/broadcasts.test.ts`
- Create: `qna-web/src/lib/ai/seed-prompts/comments.ts`
- Create: `qna-web/src/lib/ai/seed-prompts/comments.test.ts`

### Step 3.1: Write the failing test for broadcasts parser

`qna-web/src/lib/ai/seed-prompts/broadcasts.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBroadcastBody, BroadcastValidationError } from './broadcasts';

test('parseBroadcastBody returns trimmed string within length bounds', () => {
  const body = parseBroadcastBody('  Welcome aboard, builders! This community runs daily.  ');
  assert.equal(body, 'Welcome aboard, builders! This community runs daily.');
});

test('parseBroadcastBody throws on too-short body', () => {
  assert.throws(() => parseBroadcastBody('Hi.'), BroadcastValidationError);
});

test('parseBroadcastBody throws on too-long body', () => {
  assert.throws(() => parseBroadcastBody('x'.repeat(3000)), BroadcastValidationError);
});

test('parseBroadcastBody throws on non-string input', () => {
  assert.throws(() => parseBroadcastBody(null as unknown as string), BroadcastValidationError);
  assert.throws(() => parseBroadcastBody({} as unknown as string), BroadcastValidationError);
});
```

### Step 3.2: Run the test, watch it fail

```bash
npm run test -w qna-web -- --grep "parseBroadcastBody"
```

Expected: `FAIL — Cannot find module './broadcasts'`.

### Step 3.3: Implement `broadcasts.ts`

`qna-web/src/lib/ai/seed-prompts/broadcasts.ts`:

```ts
import {
  generateStructured,
  type GenerateStructuredArgs,
} from '../provider';

export type BroadcastTheme =
  | 'welcome'
  | 'weekly_recap'
  | 'resource'
  | 'winner'
  | 'milestone';

export class BroadcastValidationError extends Error {
  constructor(reason: string) {
    super(`Broadcast validation failed: ${reason}`);
    this.name = 'BroadcastValidationError';
  }
}

const BODY_MIN = 60;
const BODY_MAX = 2000;

export const broadcastJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['body'],
  properties: {
    body: { type: 'string', minLength: BODY_MIN, maxLength: BODY_MAX },
  },
} as const;

export function parseBroadcastBody(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'body' in raw) {
    return parseBroadcastBody((raw as { body: unknown }).body);
  }
  if (typeof raw !== 'string') {
    throw new BroadcastValidationError('body must be a string');
  }
  const trimmed = raw.trim();
  if (trimmed.length < BODY_MIN) {
    throw new BroadcastValidationError(`body too short (${trimmed.length} < ${BODY_MIN})`);
  }
  if (trimmed.length > BODY_MAX) {
    throw new BroadcastValidationError(`body too long (${trimmed.length} > ${BODY_MAX})`);
  }
  return trimmed;
}

const THEME_GUIDANCE: Record<BroadcastTheme, string> = {
  welcome:
    'A welcome post for new members. Set expectations: how often questions drop, how scoring works, where to discuss. Friendly, not corporate.',
  weekly_recap:
    'A short recap of last week — call out the trickiest question and what made it hard. No specific names needed.',
  resource:
    'Share a single useful resource (article, video, book, channel) that fits the community. One paragraph on why it is worth their time.',
  winner:
    'Shout out the top scorer of the past week. Use the placeholder "@top_scorer" instead of a real name.',
  milestone:
    'Celebrate a community milestone (200 members, 100 questions answered, first year). Pick whichever fits the community.',
};

export function buildBroadcastSystemPrompt(args: {
  communityName: string;
  communityDescription: string;
  theme: BroadcastTheme;
}): string {
  return `You write a single short broadcast post for a niche learning community.

Community: ${args.communityName}
Description: ${args.communityDescription}

Theme: ${args.theme}
Guidance: ${THEME_GUIDANCE[args.theme]}

Rules:
- Return JSON: { "body": "..." }
- The body must be between ${BODY_MIN} and ${BODY_MAX} characters.
- 1 to 3 short paragraphs of plain text. No markdown headings. Inline links allowed.
- Match the tone of the community description. No emojis unless natural.
- Do not invent specific member usernames except "@top_scorer" in the winner theme.`;
}

export async function generateBroadcastBody(
  deps: {
    generate?: (args: GenerateStructuredArgs<string>) => Promise<{ value: string }>;
  },
  args: {
    community: { name: string; description: string };
    theme: BroadcastTheme;
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
  },
): Promise<string> {
  const generate = deps.generate ?? (generateStructured as never);
  const systemPrompt = buildBroadcastSystemPrompt({
    communityName: args.community.name,
    communityDescription: args.community.description,
    theme: args.theme,
  });
  const result = await generate({
    model: args.model,
    systemPrompt,
    userPrompt: `Write the ${args.theme} broadcast.`,
    jsonSchema: broadcastJsonSchema as unknown as object,
    parse: parseBroadcastBody,
    maxOutputTokens: args.maxOutputTokens,
    timeoutMs: args.timeoutMs,
  });
  return result.value;
}
```

### Step 3.4: Run broadcast tests, expect pass

```bash
npm run test -w qna-web -- --grep "parseBroadcastBody"
```

Expected: 4 pass.

### Step 3.5: Write failing test for comments parser

`qna-web/src/lib/ai/seed-prompts/comments.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCommentThread, CommentValidationError } from './comments';

test('parseCommentThread accepts top-level only', () => {
  const thread = parseCommentThread({
    topLevel: { body: 'I went with the second option but only because the rook lift seemed forced.' },
  });
  assert.equal(thread.topLevel.body.length > 0, true);
  assert.equal(thread.reply, undefined);
});

test('parseCommentThread accepts top-level + reply', () => {
  const thread = parseCommentThread({
    topLevel: { body: 'I thought the same thing, but missed the back-rank threat entirely.' },
    reply: { body: 'Same. The back rank is the kind of thing you only see after you fall for it twice.' },
  });
  assert.equal(thread.reply?.body.length! > 0, true);
});

test('parseCommentThread throws on missing topLevel', () => {
  assert.throws(() => parseCommentThread({}), CommentValidationError);
});

test('parseCommentThread throws on too-short body', () => {
  assert.throws(
    () => parseCommentThread({ topLevel: { body: 'k' } }),
    CommentValidationError,
  );
});
```

### Step 3.6: Run the test, watch it fail

```bash
npm run test -w qna-web -- --grep "parseCommentThread"
```

Expected: `FAIL — Cannot find module './comments'`.

### Step 3.7: Implement `comments.ts`

`qna-web/src/lib/ai/seed-prompts/comments.ts`:

```ts
import {
  generateStructured,
  type GenerateStructuredArgs,
} from '../provider';

export class CommentValidationError extends Error {
  constructor(reason: string) {
    super(`Comment validation failed: ${reason}`);
    this.name = 'CommentValidationError';
  }
}

export type CommentThread = {
  topLevel: { body: string };
  reply?: { body: string };
};

const BODY_MIN = 30;
const BODY_MAX = 600;

export const commentThreadJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['topLevel'],
  properties: {
    topLevel: {
      type: 'object',
      additionalProperties: false,
      required: ['body'],
      properties: { body: { type: 'string', minLength: BODY_MIN, maxLength: BODY_MAX } },
    },
    reply: {
      type: 'object',
      additionalProperties: false,
      required: ['body'],
      properties: { body: { type: 'string', minLength: BODY_MIN, maxLength: BODY_MAX } },
    },
  },
} as const;

function parseBody(label: string, raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new CommentValidationError(`${label} body must be a string`);
  }
  const trimmed = raw.trim();
  if (trimmed.length < BODY_MIN) {
    throw new CommentValidationError(`${label} body too short (${trimmed.length} < ${BODY_MIN})`);
  }
  if (trimmed.length > BODY_MAX) {
    throw new CommentValidationError(`${label} body too long (${trimmed.length} > ${BODY_MAX})`);
  }
  return trimmed;
}

export function parseCommentThread(raw: unknown): CommentThread {
  if (!raw || typeof raw !== 'object') {
    throw new CommentValidationError('thread must be an object');
  }
  const obj = raw as Record<string, unknown>;
  const topLevelRaw = obj.topLevel;
  if (!topLevelRaw || typeof topLevelRaw !== 'object') {
    throw new CommentValidationError('topLevel missing');
  }
  const topLevelBody = parseBody('topLevel', (topLevelRaw as { body: unknown }).body);

  let reply: { body: string } | undefined;
  if (obj.reply) {
    if (typeof obj.reply !== 'object') {
      throw new CommentValidationError('reply must be an object');
    }
    const replyBody = parseBody('reply', (obj.reply as { body: unknown }).body);
    reply = { body: replyBody };
  }

  return { topLevel: { body: topLevelBody }, reply };
}

export function buildCommentSystemPrompt(args: {
  communityName: string;
  communityDescription: string;
  questionPrompt: string;
  explanation: string;
}): string {
  return `You write one realistic comment thread under a multiple-choice question post in a niche learning community.

Community: ${args.communityName}
Description: ${args.communityDescription}

The question that was just answered:
${args.questionPrompt}

The official explanation (do not just paraphrase it):
${args.explanation}

Rules:
- Return JSON: { "topLevel": { "body": "..." }, "reply"?: { "body": "..." } }
- topLevel body: 30-600 chars. A first-person reaction — what they chose, what tripped them up, a related observation. Conversational, not a teaching answer.
- reply (50% of the time include it, otherwise omit the field): 30-600 chars. Replies to topLevel — agrees, disagrees, adds nuance. Different voice.
- No @-mentions. No markdown. No links unless the question explicitly references one.
- Avoid restating the official explanation; the reader has just seen it.`;
}

export async function generateCommentThread(
  deps: {
    generate?: (args: GenerateStructuredArgs<CommentThread>) => Promise<{ value: CommentThread }>;
  },
  args: {
    community: { name: string; description: string };
    question: { prompt: string; explanation: string };
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
  },
): Promise<CommentThread> {
  const generate = deps.generate ?? (generateStructured as never);
  const systemPrompt = buildCommentSystemPrompt({
    communityName: args.community.name,
    communityDescription: args.community.description,
    questionPrompt: args.question.prompt,
    explanation: args.question.explanation,
  });
  const result = await generate({
    model: args.model,
    systemPrompt,
    userPrompt: 'Write the comment thread.',
    jsonSchema: commentThreadJsonSchema as unknown as object,
    parse: parseCommentThread,
    maxOutputTokens: args.maxOutputTokens,
    timeoutMs: args.timeoutMs,
  });
  return result.value;
}
```

### Step 3.8: Run all new tests

```bash
npm run test -w qna-web -- --grep "Comment|Broadcast"
```

Expected: 8 pass.

- [ ] **Suggested commit:**
  ```
  feat(seed): add AI prompts for seed broadcasts and comments

  Co-located with the existing question-drafts module under
  src/lib/ai/seed-prompts/. Pure validators (parseBroadcastBody,
  parseCommentThread) covered by unit tests. The generators delegate
  to provider.generateStructured exactly like question-drafts does.
  ```

---

## Task 4: One-off generator script (`generate-seed-data.mjs`)

This is the script the project owner runs locally with `OPENROUTER_API_KEY` set. It writes JSON files into `qna-web/scripts/seed-data/` for hand-review and commit.

**Files:**

- Create: `qna-web/scripts/generate-seed-data.mjs`

### Step 4.1: Implement the generator

`qna-web/scripts/generate-seed-data.mjs`:

```js
// One-off generator. NOT run by `npm run seed`. Run manually after you've
// authored or edited communities.json, when you want to regenerate question /
// broadcast / comment fixtures via OpenRouter.
//
// Usage (PowerShell):
//   $env:OPENROUTER_API_KEY="..."; npm run seed:generate
//
// Flags:
//   --only questions          regenerate only questions (skip broadcasts/comments)
//   --only broadcasts
//   --only comments
//   --community <slug>        only generate for one community
//
// Output: JSON files under qna-web/scripts/seed-data/.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

// Dynamic-import the TS sources via tsx-equivalent. We use child_process to call
// tsx as a runner for the AI library, since the seed dir is plain ESM and the
// lib is TS. Simpler: shell out to a tsx-launched helper per call. To keep
// things self-contained, we DO NOT import the TS lib here — instead this script
// is itself launched via tsx by the seed:generate script. See package.json.
//
// Update seed:generate to: "tsx scripts/generate-seed-data.mjs"
// (renaming the file extension is unnecessary; tsx runs .mjs.)
//
// With that setup, dynamic-import the TS files directly:
const { generateDraft } = await import('../src/lib/ai/question-drafts.ts');
const { generateBroadcastBody } = await import('../src/lib/ai/seed-prompts/broadcasts.ts');
const { generateCommentThread } = await import('../src/lib/ai/seed-prompts/comments.ts');

const SEED_DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'seed-data',
);

const args = parseArgs(process.argv.slice(2));

const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite';
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 800);
const TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 20000);
const INTER_REQUEST_DELAY_MS = 250;

const QUESTIONS_PER_COMMUNITY = 20;
const BROADCAST_THEMES = ['welcome', 'weekly_recap', 'resource', 'winner', 'milestone'];
const COMMENT_THREADS_PER_COMMUNITY = 25;

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }
  const communities = JSON.parse(
    readFileSync(join(SEED_DATA_DIR, 'communities.json'), 'utf8'),
  );

  const filtered = args.community
    ? communities.filter((c) => c.slug === args.community)
    : communities;
  if (filtered.length === 0) {
    throw new Error(`No communities matched --community="${args.community}"`);
  }

  for (const community of filtered) {
    console.log(`\n=== ${community.slug} (${community.name}) ===`);
    if (shouldRun('questions')) await generateQuestionsFor(community);
    if (shouldRun('broadcasts')) await generateBroadcastsFor(community);
    if (shouldRun('comments')) await generateCommentsFor(community);
  }
  console.log('\nDone.');
}

function shouldRun(kind) {
  return !args.only || args.only === kind;
}

async function generateQuestionsFor(community) {
  const outPath = join(SEED_DATA_DIR, 'questions', `${community.slug}.json`);
  ensureDirFor(outPath);
  if (args.skipIfExists && existsSync(outPath)) {
    console.log(`questions/${community.slug}.json exists — skipping (remove --skip-if-exists to overwrite).`);
    return;
  }

  const drafts = [];
  const recentPrompts = [];
  for (let i = 0; i < QUESTIONS_PER_COMMUNITY; i++) {
    process.stdout.write(`  question ${i + 1}/${QUESTIONS_PER_COMMUNITY}... `);
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const { draft } = await generateDraft(
          {},
          {
            community: { name: community.name, description: community.description },
            topic: community.description,
            recentPrompts,
            useWebSearch: false,
            model: MODEL,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            timeoutMs: TIMEOUT_MS,
          },
        );
        const difficulty = assignDifficulty(i);
        drafts.push({
          prompt: draft.prompt,
          explanation: draft.explanation,
          difficulty,
          choices: draft.choices,
        });
        recentPrompts.push(draft.prompt);
        if (recentPrompts.length > 12) recentPrompts.shift();
        console.log('ok');
        break;
      } catch (err) {
        console.log(`fail (attempt ${attempt}): ${err.message}`);
        if (attempt >= 3) throw err;
      }
    }
    await sleep(INTER_REQUEST_DELAY_MS);
  }
  writeFileSync(outPath, JSON.stringify(drafts, null, 2));
  console.log(`  wrote ${outPath}`);
}

// Indexes 0-6 = easy, 7-13 = medium, 14-19 = hard.
function assignDifficulty(index) {
  if (index < 7) return 'easy';
  if (index < 14) return 'medium';
  return 'hard';
}

async function generateBroadcastsFor(community) {
  const outPath = join(SEED_DATA_DIR, 'broadcasts', `${community.slug}.json`);
  ensureDirFor(outPath);
  const broadcasts = [];
  for (const theme of BROADCAST_THEMES) {
    process.stdout.write(`  broadcast ${theme}... `);
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const body = await generateBroadcastBody(
          {},
          {
            community: { name: community.name, description: community.description },
            theme,
            model: MODEL,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            timeoutMs: TIMEOUT_MS,
          },
        );
        broadcasts.push({ theme, body });
        console.log('ok');
        break;
      } catch (err) {
        console.log(`fail (attempt ${attempt}): ${err.message}`);
        if (attempt >= 3) throw err;
      }
    }
    await sleep(INTER_REQUEST_DELAY_MS);
  }
  writeFileSync(outPath, JSON.stringify(broadcasts, null, 2));
  console.log(`  wrote ${outPath}`);
}

async function generateCommentsFor(community) {
  const questionsPath = join(SEED_DATA_DIR, 'questions', `${community.slug}.json`);
  if (!existsSync(questionsPath)) {
    console.log('  no questions file — skipping comments. Run --only questions first.');
    return;
  }
  const questions = JSON.parse(readFileSync(questionsPath, 'utf8'));
  const outPath = join(SEED_DATA_DIR, 'comments', `${community.slug}.json`);
  ensureDirFor(outPath);

  // Threads only attach to closed questions (indexes 0..17).
  // Distribute the 25 threads across them (some questions get 2 threads, some get 1, a couple get 0).
  const threads = [];
  const targetTotal = COMMENT_THREADS_PER_COMMUNITY;
  let remaining = targetTotal;
  const eligibleIndexes = [];
  for (let i = 0; i < 18 && i < questions.length; i++) eligibleIndexes.push(i);
  let cursor = 0;
  while (remaining > 0 && eligibleIndexes.length > 0) {
    const questionIndex = eligibleIndexes[cursor % eligibleIndexes.length];
    const q = questions[questionIndex];
    process.stdout.write(`  comment thread ${threads.length + 1}/${targetTotal} (q${questionIndex})... `);
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const thread = await generateCommentThread(
          {},
          {
            community: { name: community.name, description: community.description },
            question: { prompt: q.prompt, explanation: q.explanation },
            model: MODEL,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            timeoutMs: TIMEOUT_MS,
          },
        );
        threads.push({ questionIndex, ...thread });
        console.log('ok');
        break;
      } catch (err) {
        console.log(`fail (attempt ${attempt}): ${err.message}`);
        if (attempt >= 3) throw err;
      }
    }
    remaining--;
    cursor++;
    await sleep(INTER_REQUEST_DELAY_MS);
  }
  writeFileSync(outPath, JSON.stringify(threads, null, 2));
  console.log(`  wrote ${outPath}`);
}

function ensureDirFor(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function parseArgs(argv) {
  const out = { only: null, community: null, skipIfExists: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') out.only = argv[++i];
    else if (argv[i] === '--community') out.community = argv[++i];
    else if (argv[i] === '--skip-if-exists') out.skipIfExists = true;
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

### Step 4.2: Update the `seed:generate` script to use tsx as the runner

In `qna-web/package.json`, change:

```json
"seed:generate": "node scripts/generate-seed-data.mjs"
```

to:

```json
"seed:generate": "tsx scripts/generate-seed-data.mjs"
```

(tsx can run .mjs and lets the script dynamic-import the TS lib files directly.)

### Step 4.3: Run the generator for questions, hand-review, commit

- [ ] Run from repo root:
  ```bash
  $env:OPENROUTER_API_KEY="<your key>"; npm run seed:generate -- --only questions
  ```

  Expected: 20 question files written to `qna-web/scripts/seed-data/questions/<slug>.json`. Takes ~15–25 minutes (20 communities × 20 questions × ~3 sec/call).

- [ ] **Hand-review at least 5 random communities' question files.** Open each, skim 4–5 questions, check:
  - Question prompt is on-topic.
  - Exactly one choice has `"isCorrect": true`.
  - The correct choice is actually correct (this is the hand-review step you can't skip — the AI gets it wrong sometimes).
  - Explanation doesn't just say "because it is right."
  - No prompt-injection-looking content.

- [ ] Fix anything obviously wrong by editing the JSON directly. Do not regenerate the whole file unless it's ALL bad.

- [ ] **Suggested commit:**
  ```
  feat(seed): generator script + curated question fixtures

  scripts/generate-seed-data.mjs orchestrates OpenRouter calls via the
  existing lib/ai/question-drafts module. Output committed under
  scripts/seed-data/questions/ for grader-readable review. Hand-reviewed.
  ```

---

## Task 5: Question timeline math + `seed/questions.mjs`

**Files:**

- Create: `qna-web/src/lib/seed-helpers.ts` (pure helpers, exported so they can be unit-tested)
- Create: `qna-web/src/lib/seed-helpers.test.ts`
- Create: `qna-web/scripts/seed/timeline.mjs` (thin .mjs wrapper that re-exports from the JS-compiled equivalent)
- Create: `qna-web/scripts/seed/questions.mjs`

### Step 5.1: Write the failing tests for the timeline helper

`qna-web/src/lib/seed-helpers.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { computeQuestionTimeline, pickActivityTier, pickCorrectness } from './seed-helpers';

const NOW = new Date('2026-05-24T12:00:00.000Z');

test('closed question (index 0) is ~60 days in the past', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 0, cadence: 'daily' });
  assert.equal(t.kind, 'closed');
  const daysAgo = (NOW.getTime() - t.publishedAt!.getTime()) / 86400000;
  assert.ok(daysAgo > 58 && daysAgo < 62, `published ${daysAgo}d ago, expected ~60`);
  assert.ok(t.closesAt! < NOW);
});

test('closed question (index 17) is within the last few days', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 17, cadence: 'daily' });
  assert.equal(t.kind, 'closed');
  const daysAgo = (NOW.getTime() - t.publishedAt!.getTime()) / 86400000;
  assert.ok(daysAgo >= 0 && daysAgo < 15, `published ${daysAgo}d ago, expected recent`);
});

test('index 18 is currently open', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 18, cadence: 'daily' });
  assert.equal(t.kind, 'open');
  assert.ok(t.publishedAt! < NOW);
  assert.ok(t.closesAt! > NOW);
});

test('index 19 is scheduled for tomorrow', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 19, cadence: 'daily' });
  assert.equal(t.kind, 'scheduled');
  assert.equal(t.publishedAt, null);
  assert.equal(t.closesAt, null);
  assert.ok(t.scheduledFor! > NOW);
});

test('weekly cadence stretches answer window to 7 days', () => {
  const t = computeQuestionTimeline({ now: NOW, index: 5, cadence: 'weekly' });
  const windowMs = t.closesAt!.getTime() - t.publishedAt!.getTime();
  assert.equal(windowMs, 7 * 86400000);
});

test('pickActivityTier is deterministic for same username', () => {
  const a = pickActivityTier('demo_member_042');
  const b = pickActivityTier('demo_member_042');
  assert.equal(a, b);
});

test('pickActivityTier returns 0-3', () => {
  for (let i = 0; i < 50; i++) {
    const tier = pickActivityTier(`demo_member_${i.toString().padStart(3, '0')}`);
    assert.ok(tier >= 0 && tier <= 3);
  }
});

test('pickCorrectness honors difficulty bias deterministically', () => {
  // Same key → same boolean.
  const a = pickCorrectness('demo_member_001', 'community-x', 5, 'medium');
  const b = pickCorrectness('demo_member_001', 'community-x', 5, 'medium');
  assert.equal(a, b);
});

test('pickCorrectness aggregates near expected ratio for easy difficulty', () => {
  let correct = 0;
  const n = 1000;
  for (let i = 0; i < n; i++) {
    if (pickCorrectness(`u${i}`, 'c', 0, 'easy')) correct++;
  }
  const ratio = correct / n;
  // Easy targets ~75% correct. Wide tolerance for deterministic-but-unlucky distributions.
  assert.ok(ratio > 0.65 && ratio < 0.85, `easy correctness ratio = ${ratio}`);
});
```

### Step 5.2: Run the tests, watch them fail

```bash
npm run test -w qna-web -- --grep "computeQuestionTimeline|pickActivity|pickCorrectness"
```

Expected: 9 FAIL — `Cannot find module './seed-helpers'`.

### Step 5.3: Implement `seed-helpers.ts`

`qna-web/src/lib/seed-helpers.ts`:

```ts
import seedrandom from 'seedrandom';

export type Cadence = 'daily' | 'weekly' | 'custom';

export type QuestionTimeline =
  | { kind: 'closed'; scheduledFor: Date; publishedAt: Date; closesAt: Date }
  | { kind: 'open'; scheduledFor: Date; publishedAt: Date; closesAt: Date }
  | { kind: 'scheduled'; scheduledFor: Date; publishedAt: null; closesAt: null };

export function computeQuestionTimeline(args: {
  now: Date;
  index: number; // 0..19
  cadence: Cadence;
}): QuestionTimeline {
  const { now, index, cadence } = args;
  const windowMs =
    cadence === 'weekly' ? 7 * 86400000 : 24 * 3600000;

  if (index < 18) {
    // Closed. Spread across 60 days going back from ~3 days ago.
    // index 0 → ~60 days ago, index 17 → ~3 days ago.
    const daysAgo = 60 - index * (60 - 3) / 17;
    const scheduledFor = new Date(now.getTime() - daysAgo * 86400000);
    const publishedAt = new Date(scheduledFor.getTime());
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'closed', scheduledFor, publishedAt, closesAt };
  }
  if (index === 18) {
    // Currently open: published 1 hour ago, closes after the answer window.
    const publishedAt = new Date(now.getTime() - 3600000);
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'open', scheduledFor: publishedAt, publishedAt, closesAt };
  }
  // index 19: scheduled for tomorrow at 09:00 UTC
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);
  return { kind: 'scheduled', scheduledFor: tomorrow, publishedAt: null, closesAt: null };
}

const TIER_THRESHOLDS = [0.20, 0.50, 0.80]; // < 0.20 = tier0, < 0.50 = tier1, < 0.80 = tier2, else tier3

export function pickActivityTier(username: string): 0 | 1 | 2 | 3 {
  const r = seedrandom(`activity:${username}`)();
  if (r < TIER_THRESHOLDS[0]) return 0;
  if (r < TIER_THRESHOLDS[1]) return 1;
  if (r < TIER_THRESHOLDS[2]) return 2;
  return 3;
}

// Probability that a tier user actually answers a given question they were sampled for.
export const PARTICIPATION_BY_TIER = [1.0, 0.70, 0.40, 0.15] as const;

export function shouldAnswer(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
}): boolean {
  const tier = pickActivityTier(args.username);
  const r = seedrandom(`participate:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
  return r < PARTICIPATION_BY_TIER[tier];
}

const CORRECT_RATIO_BY_DIFFICULTY: Record<string, number> = {
  easy: 0.75,
  medium: 0.60,
  hard: 0.40,
};

export function pickCorrectness(
  username: string,
  communitySlug: string,
  questionIndex: number,
  difficulty: string,
): boolean {
  const target = CORRECT_RATIO_BY_DIFFICULTY[difficulty] ?? 0.60;
  const r = seedrandom(
    `correct:${communitySlug}:${questionIndex}:${username}`,
  )();
  return r < target;
}

const LATE_RATIO = 0.05;

export function pickIsLate(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
}): boolean {
  const r = seedrandom(
    `late:${args.communitySlug}:${args.questionIndex}:${args.username}`,
  )();
  return r < LATE_RATIO;
}

// Returns a deterministic answeredAt timestamp inside (publishedAt, closesAt],
// or just after closesAt if isLate.
export function pickAnsweredAt(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
  publishedAt: Date;
  closesAt: Date;
  isLate: boolean;
}): Date {
  if (args.isLate) {
    // 5 min .. 24 h after close.
    const r = seedrandom(`lateat:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
    return new Date(args.closesAt.getTime() + 300_000 + r * (86_400_000 - 300_000));
  }
  const r = seedrandom(`answeredat:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
  const span = args.closesAt.getTime() - args.publishedAt.getTime();
  return new Date(args.publishedAt.getTime() + r * span);
}

// Returns a deterministic wrong-choice position (0..3 excluding the correct one).
export function pickWrongChoicePosition(args: {
  username: string;
  communitySlug: string;
  questionIndex: number;
  correctPosition: number;
}): number {
  const r = seedrandom(`wrong:${args.communitySlug}:${args.questionIndex}:${args.username}`)();
  const wrongPositions = [0, 1, 2, 3].filter((p) => p !== args.correctPosition);
  return wrongPositions[Math.floor(r * wrongPositions.length)];
}
```

### Step 5.4: Run tests, expect pass

```bash
npm run test -w qna-web -- --grep "computeQuestionTimeline|pickActivity|pickCorrectness"
```

Expected: 9 pass.

### Step 5.5: Create `seed/timeline.mjs` (re-export for the .mjs seed scripts)

The .mjs seed scripts can't directly `import` from a `.ts` file at runtime under `node`. The seed orchestrator runs under plain `node`, not `tsx`. So we duplicate just the timeline math the seeder needs as plain JS:

`qna-web/scripts/seed/timeline.mjs`:

```js
import seedrandom from 'seedrandom';

export function computeQuestionTimeline({ now, index, cadence }) {
  const windowMs = cadence === 'weekly' ? 7 * 86400000 : 24 * 3600000;
  if (index < 18) {
    const daysAgo = 60 - (index * (60 - 3)) / 17;
    const scheduledFor = new Date(now.getTime() - daysAgo * 86400000);
    const publishedAt = new Date(scheduledFor.getTime());
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'closed', scheduledFor, publishedAt, closesAt };
  }
  if (index === 18) {
    const publishedAt = new Date(now.getTime() - 3600000);
    const closesAt = new Date(publishedAt.getTime() + windowMs);
    return { kind: 'open', scheduledFor: publishedAt, publishedAt, closesAt };
  }
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);
  return { kind: 'scheduled', scheduledFor: tomorrow, publishedAt: null, closesAt: null };
}

export function pickActivityTier(username) {
  const r = seedrandom(`activity:${username}`)();
  if (r < 0.20) return 0;
  if (r < 0.50) return 1;
  if (r < 0.80) return 2;
  return 3;
}

export const PARTICIPATION_BY_TIER = [1.0, 0.70, 0.40, 0.15];

export function shouldAnswer({ username, communitySlug, questionIndex }) {
  const tier = pickActivityTier(username);
  const r = seedrandom(`participate:${communitySlug}:${questionIndex}:${username}`)();
  return r < PARTICIPATION_BY_TIER[tier];
}

export function pickCorrectness(username, communitySlug, questionIndex, difficulty) {
  const targets = { easy: 0.75, medium: 0.60, hard: 0.40 };
  const target = targets[difficulty] ?? 0.60;
  const r = seedrandom(`correct:${communitySlug}:${questionIndex}:${username}`)();
  return r < target;
}

export function pickIsLate({ username, communitySlug, questionIndex }) {
  const r = seedrandom(`late:${communitySlug}:${questionIndex}:${username}`)();
  return r < 0.05;
}

export function pickAnsweredAt({ username, communitySlug, questionIndex, publishedAt, closesAt, isLate }) {
  if (isLate) {
    const r = seedrandom(`lateat:${communitySlug}:${questionIndex}:${username}`)();
    return new Date(closesAt.getTime() + 300_000 + r * (86_400_000 - 300_000));
  }
  const r = seedrandom(`answeredat:${communitySlug}:${questionIndex}:${username}`)();
  const span = closesAt.getTime() - publishedAt.getTime();
  return new Date(publishedAt.getTime() + r * span);
}

export function pickWrongChoicePosition({ username, communitySlug, questionIndex, correctPosition }) {
  const r = seedrandom(`wrong:${communitySlug}:${questionIndex}:${username}`)();
  const wrongPositions = [0, 1, 2, 3].filter((p) => p !== correctPosition);
  return wrongPositions[Math.floor(r * wrongPositions.length)];
}
```

> Yes, this duplicates `seed-helpers.ts`. The duplication is intentional and contained: `seed-helpers.ts` is the source of truth for the test suite (which proves the math); `timeline.mjs` is the runtime copy for the plain-node seeder. A header comment on `timeline.mjs` notes "Mirror of qna-web/src/lib/seed-helpers.ts — keep in sync."

### Step 5.6: Create `seed/questions.mjs`

`qna-web/scripts/seed/questions.mjs`:

```js
import { questions, questionChoices } from './schema.mjs';
import { questionId, choiceId } from './ids.mjs';
import { loadQuestionsFixture, listCommunitiesWithQuestions } from './fixtures.mjs';
import { computeQuestionTimeline } from './timeline.mjs';

export async function seedQuestions(db, ctx) {
  const { communitiesBySlug } = ctx;
  const now = new Date();

  const expectedSlugs = Array.from(communitiesBySlug.keys());
  const haveQuestionsFor = new Set(listCommunitiesWithQuestions());
  const missing = expectedSlugs.filter((s) => !haveQuestionsFor.has(s));
  if (missing.length > 0) {
    console.warn(
      `  ⚠ No questions fixture for: ${missing.join(', ')}. ` +
        `Run \`npm run seed:generate -- --only questions\` first.`,
    );
  }

  const questionsByCommunitySlug = new Map();
  let totalQuestions = 0;
  let totalChoices = 0;

  for (const [slug, community] of communitiesBySlug.entries()) {
    const fixture = loadQuestionsFixture(slug);
    if (!fixture) continue;

    const questionRows = [];
    const choiceRows = [];
    const fixtureWithIds = [];

    for (let i = 0; i < fixture.length; i++) {
      const q = fixture[i];
      const timeline = computeQuestionTimeline({ now, index: i, cadence: community.cadence });
      const qId = questionId(slug, i);

      questionRows.push({
        id: qId,
        communityId: community.id,
        creatorUserId: community.creatorUserId,
        prompt: q.prompt,
        explanation: q.explanation,
        scheduledFor: timeline.scheduledFor,
        publishedAt: timeline.publishedAt,
        closesAt: timeline.closesAt,
        timeZone: 'GMT',
        points: 10,
      });

      const trackedChoices = [];
      for (let p = 0; p < q.choices.length; p++) {
        const c = q.choices[p];
        const cId = choiceId(slug, i, p);
        choiceRows.push({
          id: cId,
          questionId: qId,
          label: c.label,
          isCorrect: c.isCorrect,
          position: p,
        });
        trackedChoices.push({ id: cId, position: p, isCorrect: c.isCorrect, label: c.label });
      }

      const correct = trackedChoices.find((c) => c.isCorrect);
      fixtureWithIds.push({
        index: i,
        id: qId,
        prompt: q.prompt,
        explanation: q.explanation,
        difficulty: q.difficulty,
        timeline,
        choices: trackedChoices,
        correctChoice: correct,
      });
    }

    // Per-row upsert for questions — drizzle's onConflictDoUpdate `set` applies the
    // same values to every conflicting row, so a chunked insert can't carry per-row
    // fixture edits through. ~400 round-trips total for a full seed; acceptable.
    for (const row of questionRows) {
      await db
        .insert(questions)
        .values(row)
        .onConflictDoUpdate({
          target: questions.id,
          set: {
            prompt: row.prompt,
            explanation: row.explanation,
            scheduledFor: row.scheduledFor,
            publishedAt: row.publishedAt,
            closesAt: row.closesAt,
            creatorUserId: row.creatorUserId,
          },
        });
    }

    // Choices are write-once (fixture edits to choice text are rare; if you make one,
    // delete the affected rows in SQL and reseed). onConflictDoNothing keeps re-runs cheap.
    for (const chunk of chunkArray(choiceRows, 500)) {
      await db
        .insert(questionChoices)
        .values(chunk)
        .onConflictDoNothing();
    }

    questionsByCommunitySlug.set(slug, fixtureWithIds);
    totalQuestions += questionRows.length;
    totalChoices += choiceRows.length;
  }

  console.log(`Seeded ${totalQuestions} questions, ${totalChoices} choices.`);
  return { questionsByCommunitySlug };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
```

### Step 5.7: Wire `seedQuestions` into the orchestrator

In `qna-web/scripts/seed/index.mjs`, add after `seedCommunities`:

```js
import { seedQuestions } from './questions.mjs';
// ...
Object.assign(ctx, await seedQuestions(db, ctx));
```

### Step 5.8: Verify

- [ ] `$env:ALLOW_SEED="1"; npm run seed`
- [ ] Expected new line in output: `Seeded 400 questions, 1600 choices.`
- [ ] SQL sanity:
  ```sql
  SELECT count(*) FROM questions;             -- 400 (20 communities × 20)
  SELECT count(*) FROM question_choices;      -- 1600
  SELECT count(*) FROM questions WHERE published_at IS NULL;  -- 20 (scheduled ones)
  SELECT count(*) FROM questions WHERE closes_at > now() AND published_at <= now(); -- 20 (open ones)
  ```

- [ ] **Suggested commit:**
  ```
  feat(seed): seed questions + choices from JSON fixtures

  Timeline math (in src/lib/seed-helpers.ts with tests, mirrored at runtime
  by scripts/seed/timeline.mjs) spreads 20 questions per community over
  60 days: 18 closed, 1 currently open, 1 scheduled for tomorrow.
  Deterministic IDs make re-runs idempotent and let downstream modules
  reference choice/question IDs without DB round-trips.
  ```

---

## Task 6: Broadcasts — generator extension + `seed/broadcasts.mjs`

**Files:**

- Modify: `qna-web/scripts/generate-seed-data.mjs` — (already handles broadcasts from Task 4)
- Create: `qna-web/scripts/seed/broadcasts.mjs`

### Step 6.1: Run the generator for broadcasts

- [ ] `$env:OPENROUTER_API_KEY="<key>"; npm run seed:generate -- --only broadcasts`

  Expected: 20 files written to `qna-web/scripts/seed-data/broadcasts/<slug>.json`. Takes ~5 minutes.

- [ ] **Hand-review a few.** Check tone, length, no weird AI artifacts.

### Step 6.2: Implement `seed/broadcasts.mjs`

`qna-web/scripts/seed/broadcasts.mjs`:

```js
import { broadcastPosts } from './schema.mjs';
import { broadcastId } from './ids.mjs';
import { loadBroadcastsFixture } from './fixtures.mjs';

// Offsets from "now" in days for each theme slot.
const THEME_DAYS_AGO = {
  welcome: 28,
  weekly_recap: 21,
  resource: 14,
  winner: 7,
  milestone: 2,
};

export async function seedBroadcasts(db, ctx) {
  const { communitiesBySlug } = ctx;
  const now = new Date();
  let total = 0;

  for (const [slug, community] of communitiesBySlug.entries()) {
    const fixture = loadBroadcastsFixture(slug);
    if (!fixture) continue;
    for (let i = 0; i < fixture.length; i++) {
      const entry = fixture[i];
      const daysAgo = THEME_DAYS_AGO[entry.theme] ?? 10;
      const publishedAt = new Date(now.getTime() - daysAgo * 86400000);
      await db
        .insert(broadcastPosts)
        .values({
          id: broadcastId(slug, i),
          communityId: community.id,
          authorUserId: community.creatorUserId,
          body: entry.body,
          publishedAt,
        })
        .onConflictDoUpdate({
          target: broadcastPosts.id,
          set: { body: entry.body, publishedAt },
        });
      total++;
    }
  }

  console.log(`Seeded ${total} broadcasts.`);
  return {};
}
```

### Step 6.3: Wire into orchestrator

`seed/index.mjs`:

```js
import { seedBroadcasts } from './broadcasts.mjs';
// ...
await seedBroadcasts(db, ctx);
```

### Step 6.4: Verify

- [ ] `$env:ALLOW_SEED="1"; npm run seed`
- [ ] Expected: `Seeded 100 broadcasts.`
- [ ] SQL: `SELECT count(*) FROM broadcast_posts;` → 100

- [ ] **Suggested commit:**
  ```
  feat(seed): seed broadcast posts from JSON fixtures

  Five themed broadcasts per community spread across the last 30 days.
  ```

---

## Task 7: Synthetic answer fan-out — `seed/answers.mjs`

This is the heaviest module. It produces ~40k rows and is what makes the scalability rubric pass.

**Files:**

- Create: `qna-web/scripts/seed/answers.mjs`

### Step 7.1: Implement `seed/answers.mjs`

`qna-web/scripts/seed/answers.mjs`:

```js
import { answers } from './schema.mjs';
import { answerId } from './ids.mjs';
import {
  shouldAnswer,
  pickCorrectness,
  pickIsLate,
  pickAnsweredAt,
  pickWrongChoicePosition,
} from './timeline.mjs';

const CHUNK_SIZE = 1000;

export async function seedAnswers(db, ctx) {
  const { communitiesBySlug, membershipsByCommunitySlug, questionsByCommunitySlug, testAccountsByUsername } = ctx;

  // Build a userId → username reverse lookup.
  // We have memberships keyed by community with userIds, but need usernames for
  // the deterministic RNG. Pull from ctx.demoUsers + ctx.testAccountsByUsername + seedOwner.
  const usernameByUserId = new Map();
  for (const u of ctx.demoUsers) usernameByUserId.set(u.id, u.username);
  for (const [username, u] of testAccountsByUsername.entries()) usernameByUserId.set(u.id, username);
  if (ctx.seedOwner) usernameByUserId.set(ctx.seedOwner.id, ctx.seedOwner.username);

  const allRows = [];
  let totalSkipped = 0;

  for (const [slug, community] of communitiesBySlug.entries()) {
    const fixture = questionsByCommunitySlug.get(slug);
    if (!fixture) continue;
    const members = membershipsByCommunitySlug.get(slug) ?? [];
    if (members.length === 0) continue;

    // demo_member force-included so their profile is populated.
    const demoMember = testAccountsByUsername.get('demo_member');
    const memberSet = new Set(members.map((m) => m.userId));
    if (demoMember && !memberSet.has(demoMember.id)) {
      members.push({ userId: demoMember.id, role: 'member' });
    }

    for (const q of fixture) {
      if (q.timeline.kind !== 'closed') continue; // open + scheduled have no answers
      const { publishedAt, closesAt } = q.timeline;
      const correct = q.correctChoice;
      if (!correct) {
        // Defensive: a fixture without a correct choice shouldn't seed answers.
        totalSkipped++;
        continue;
      }

      for (const m of members) {
        const username = usernameByUserId.get(m.userId);
        if (!username) continue; // skip if we can't key the RNG

        if (!shouldAnswer({ username, communitySlug: slug, questionIndex: q.index })) continue;

        const isCorrect = pickCorrectness(username, slug, q.index, q.difficulty);
        const isLate = pickIsLate({ username, communitySlug: slug, questionIndex: q.index });

        const selectedChoiceId = isCorrect
          ? correct.id
          : q.choices[
              pickWrongChoicePosition({
                username,
                communitySlug: slug,
                questionIndex: q.index,
                correctPosition: correct.position,
              })
            ].id;

        const answeredAt = pickAnsweredAt({
          username,
          communitySlug: slug,
          questionIndex: q.index,
          publishedAt,
          closesAt,
          isLate,
        });

        const pointsAwarded = !isLate && isCorrect ? 10 : 0;

        allRows.push({
          id: answerId(slug, q.index, username),
          questionId: q.id,
          userId: m.userId,
          selectedChoiceId,
          isCorrect,
          isLate,
          pointsAwarded,
          answeredAt,
        });
      }
    }
  }

  // Insert in chunks. The unique constraint is (question_id, user_id) which our
  // deterministic id() already encodes, so onConflictDoNothing is safe.
  let inserted = 0;
  for (const chunk of chunkArray(allRows, CHUNK_SIZE)) {
    await db.insert(answers).values(chunk).onConflictDoNothing();
    inserted += chunk.length;
    if (inserted % 10000 === 0 || inserted === allRows.length) {
      console.log(`  answers progress: ${inserted}/${allRows.length}`);
    }
  }

  console.log(`Seeded ${allRows.length} answers (skipped ${totalSkipped}).`);
  return { answerCount: allRows.length };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
```

### Step 7.2: Wire into orchestrator

`seed/index.mjs`:

```js
import { seedAnswers } from './answers.mjs';
// ...
Object.assign(ctx, await seedAnswers(db, ctx));
```

### Step 7.3: Verify

- [ ] `$env:ALLOW_SEED="1"; npm run seed`

  Expected last lines:
  ```
  Seeded 100 broadcasts.
    answers progress: 10000/NNNNN
    answers progress: 20000/NNNNN
    ...
  Seeded NNNNN answers (skipped 0).
  Seed complete.
  ```

  `NNNNN` should be between 30,000 and 60,000.

- [ ] SQL sanity:
  ```sql
  SELECT count(*) FROM answers;
  -- expect: > 10000 (rubric bar) and matches the script's reported count

  SELECT
    sum(case when points_awarded > 0 then 1 else 0 end) as correct_scoring,
    sum(case when is_late then 1 else 0 end) as late
  FROM answers;
  -- correct_scoring should be ~40-50% of total (correctness × non-late)
  -- late should be ~5% of total

  SELECT u.username, sum(a.points_awarded) AS total
    FROM answers a JOIN users u ON u.id = a.user_id
   WHERE u.username = 'demo_member'
   GROUP BY u.username;
  -- expect: total > 0 (demo_member has answered things)
  ```

- [ ] Open the deployed (or local) app, log in as `member@demo.local` / `demo1234`, visit `/users/demo_member` — points total should be visible and non-zero.

- [ ] **Suggested commit:**
  ```
  feat(seed): synthetic answer fan-out for scalability and leaderboards

  Generates ~40k answer rows across closed questions using deterministic
  activity-tier + correctness-by-difficulty + 5% late-answer logic.
  This is what makes the scalability rubric pass (answers table > 10k)
  and what makes per-community leaderboard windows show different top-10s.
  Logic mirrored in src/lib/seed-helpers.ts under unit test.
  ```

---

## Task 8: Comments — generator extension + `seed/comments.mjs`

Comments depend on answers existing, so this seeds after answers.

**Files:**

- Create: `qna-web/scripts/seed/comments.mjs`

### Step 8.1: Run the generator for comments

- [ ] `$env:OPENROUTER_API_KEY="<key>"; npm run seed:generate -- --only comments`

  Expected: 20 files written to `qna-web/scripts/seed-data/comments/<slug>.json`. Takes ~10–15 minutes.

- [ ] **Hand-review a few.** Threads should sound conversational; replies (when present) should respond to the top-level, not repeat the explanation.

### Step 8.2: Implement `seed/comments.mjs`

`qna-web/scripts/seed/comments.mjs`:

```js
import { eq, and, sql } from 'drizzle-orm';
import { answers, comments } from './schema.mjs';
import { commentId } from './ids.mjs';
import { loadCommentsFixture } from './fixtures.mjs';
import { makeRng, pickRandom } from './rng.mjs';

export async function seedComments(db, ctx) {
  const { communitiesBySlug, questionsByCommunitySlug } = ctx;
  let total = 0;

  for (const [slug, community] of communitiesBySlug.entries()) {
    const fixture = loadCommentsFixture(slug);
    if (!fixture) continue;
    const questionFixture = questionsByCommunitySlug.get(slug);
    if (!questionFixture) continue;

    // For each thread, find users in this community who actually answered the referenced question.
    // We need this to satisfy the product rule that posting requires having answered.
    for (let threadIndex = 0; threadIndex < fixture.length; threadIndex++) {
      const thread = fixture[threadIndex];
      const q = questionFixture[thread.questionIndex];
      if (!q || q.timeline.kind !== 'closed') continue;

      // Pull recent answerers for this question (deterministic order via user_id).
      const answerers = await db
        .select({ userId: answers.userId })
        .from(answers)
        .where(eq(answers.questionId, q.id))
        .orderBy(answers.userId)
        .limit(50);

      if (answerers.length === 0) continue;

      const rng = makeRng('comment', slug, thread.questionIndex, threadIndex);
      const topLevelAuthor = pickRandom(rng, answerers).userId;
      const topLevelId = commentId(slug, thread.questionIndex, threadIndex, 'top');

      // createdAt: uniformly inside (publishedAt, closesAt + 7d).
      const windowStart = q.timeline.publishedAt.getTime();
      const windowEnd = q.timeline.closesAt.getTime() + 7 * 86400000;
      const topCreatedAt = new Date(windowStart + rng() * (windowEnd - windowStart));

      await db
        .insert(comments)
        .values({
          id: topLevelId,
          questionId: q.id,
          authorUserId: topLevelAuthor,
          parentCommentId: null,
          body: thread.topLevel.body,
          createdAt: topCreatedAt,
        })
        .onConflictDoUpdate({
          target: comments.id,
          set: { body: thread.topLevel.body, createdAt: topCreatedAt },
        });
      total++;

      if (thread.reply) {
        // Pick a different user.
        const replyCandidates = answerers.filter((a) => a.userId !== topLevelAuthor);
        if (replyCandidates.length === 0) continue;
        const replyAuthor = pickRandom(rng, replyCandidates).userId;
        const replyId = commentId(slug, thread.questionIndex, threadIndex, 'reply');
        const replyCreatedAt = new Date(
          topCreatedAt.getTime() + Math.floor(rng() * 48 * 3600000),
        );

        await db
          .insert(comments)
          .values({
            id: replyId,
            questionId: q.id,
            authorUserId: replyAuthor,
            parentCommentId: topLevelId,
            body: thread.reply.body,
            createdAt: replyCreatedAt,
          })
          .onConflictDoUpdate({
            target: comments.id,
            set: { body: thread.reply.body, createdAt: replyCreatedAt },
          });
        total++;
      }
    }
  }

  console.log(`Seeded ${total} comments.`);
  return {};
}
```

### Step 8.3: Wire into orchestrator

`seed/index.mjs`:

```js
import { seedComments } from './comments.mjs';
// ...
await seedComments(db, ctx);
```

The full orchestrator order is now:

```js
const ctx = {};
Object.assign(ctx, await seedCategories(db));
Object.assign(ctx, await seedUsers(db));
Object.assign(ctx, await seedCommunities(db, ctx));
Object.assign(ctx, await seedQuestions(db, ctx));
await seedBroadcasts(db, ctx);
Object.assign(ctx, await seedAnswers(db, ctx));
await seedComments(db, ctx);
console.log('Seed complete.');
```

### Step 8.4: Verify

- [ ] `$env:ALLOW_SEED="1"; npm run seed`
- [ ] Expected last lines:
  ```
  Seeded NNNNN answers (skipped 0).
  Seeded ~800 comments.
  Seed complete.
  ```
- [ ] SQL sanity:
  ```sql
  SELECT count(*) FROM comments;                  -- ~600-800
  SELECT count(*) FROM comments WHERE parent_comment_id IS NOT NULL; -- ~half of total

  -- Comments must only exist on closed questions:
  SELECT count(*) FROM comments c
    JOIN questions q ON q.id = c.question_id
   WHERE q.closes_at IS NULL OR q.closes_at > now();
  -- expect: 0
  ```
- [ ] Open a community in the app, open a closed question, scroll to comments — should see real-looking discussion.

- [ ] **Suggested commit:**
  ```
  feat(seed): seed comment threads tied to real answerers

  Each comment thread is attached to a closed question and authored by
  users who actually answered that question (enforces the same product
  rule the runtime does). Top-level + optional reply, deterministically
  authored from the per-question answerer pool.
  ```

---

## Task 9: Update README and `.env.example`

**Files:**

- Modify: `qna-web/README.md`
- Modify: `qna-web/.env.example` (already touched in Task 1; double-check)

### Step 9.1: Replace the default README contents

`qna-web/README.md` — append after the existing content (or replace the boilerplate "Getting Started" with this):

```markdown
## Seed the database

The repo ships with a fully scripted demo seed: ~20 communities, ~500 demo users, ~400 questions, ~40,000 synthetic answers, ~800 comments, ~100 broadcasts. All data is deterministic and idempotent — re-running the seed against the same DB is a no-op.

```bash
# 1. Make sure DATABASE_URL is set in qna-web/.env.local (Neon connection string).
# 2. Run migrations:
npm run db:migrate -w qna-web

# 3. Seed:
$env:ALLOW_SEED="1"; npm run seed       # PowerShell
ALLOW_SEED=1 npm run seed                # bash
```

Test accounts created by the seed (password for all three: `demo1234`):

| Email | Role | Notes |
|---|---|---|
| `admin@demo.local` | platform admin | sees the admin panel at /admin |
| `creator@demo.local` | community creator | owns `daily-ai-builders` and `chess-tactics-daily`; sees creator dashboard |
| `member@demo.local` | member | joined to ~6 communities, has answered ~200 questions |

### Regenerating the AI-authored content

The questions, broadcasts, and comments are AI-generated once via OpenRouter and committed under `scripts/seed-data/`. To regenerate (requires `OPENROUTER_API_KEY`):

```bash
$env:OPENROUTER_API_KEY="..."; npm run seed:generate                       # all kinds
$env:OPENROUTER_API_KEY="..."; npm run seed:generate -- --only questions   # one kind
$env:OPENROUTER_API_KEY="..."; npm run seed:generate -- --community chess-tactics-daily
```

Hand-review the output before committing.
```

### Step 9.2: Verify

- [ ] Read through the README. Make sure the commands are runnable as written.

- [ ] **Suggested commit:**
  ```
  docs(seed): document the seed and grader test accounts
  ```

---

## Task 10: End-to-end verification

**No new files. This task is a checklist.**

### Step 10.1: Wipe the demo DB (optional, only if you want to prove idempotency from scratch)

If you have a throwaway Neon branch:

```sql
-- DANGER: only on a throwaway branch.
TRUNCATE answers, comments, broadcast_posts, question_choices, questions,
         community_members, communities, community_categories, ai_usage,
         admin_audit_logs CASCADE;
DELETE FROM users WHERE email LIKE '%@local.test' OR email LIKE '%@demo.local';
```

### Step 10.2: Full fresh seed run

- [ ] `$env:ALLOW_SEED="1"; npm run seed`

Expected output (rough):
```
Seeded 18 categories.
Seeded users: 1 owner + 3 test accounts + 500 demo pool.
Seeded 20 communities, ~1800 memberships.
Seeded 400 questions, 1600 choices.
Seeded 100 broadcasts.
  answers progress: 10000/NNNNN
  answers progress: 20000/NNNNN
  ...
Seeded NNNNN answers (skipped 0).
Seeded ~800 comments.
Seed complete.
```

### Step 10.3: Idempotency proof

- [ ] Run the seed a second time, immediately.
- [ ] Compare row counts before/after: every count must be identical.

```sql
SELECT 'users' AS t, count(*) FROM users
UNION ALL SELECT 'communities', count(*) FROM communities
UNION ALL SELECT 'community_members', count(*) FROM community_members
UNION ALL SELECT 'questions', count(*) FROM questions
UNION ALL SELECT 'question_choices', count(*) FROM question_choices
UNION ALL SELECT 'answers', count(*) FROM answers
UNION ALL SELECT 'comments', count(*) FROM comments
UNION ALL SELECT 'broadcast_posts', count(*) FROM broadcast_posts;
```

### Step 10.4: UI smoke checks

Run the dev server: `npm run dev -w qna-web`. In a browser:

- [ ] Visit `/communities`. See 20 communities with varying member counts.
- [ ] Visit `/communities/chess-tactics-daily`. See past questions, the open question, the leaderboard, broadcasts.
- [ ] Visit `/communities/chess-tactics-daily/leaderboard`. Compare 7-day / 30-day / all-time tabs — top-10 lists should differ.
- [ ] Open a closed question. See the explanation and a comment thread with real content.
- [ ] Log in as `admin@demo.local` / `demo1234`. Visit `/admin`. See the user / community lists populated.
- [ ] Log in as `creator@demo.local` / `demo1234`. Visit `/dashboard`. See `daily-ai-builders` and `chess-tactics-daily` listed.
- [ ] Log in as `member@demo.local` / `demo1234`. Visit `/users/demo_member`. See points total > 0 and ~6 community memberships.

### Step 10.5: Run the test suite

```bash
npm run test -w qna-web
```

Expected: all tests pass, including the new `seed-helpers`, `broadcasts`, `comments` parser tests.

### Step 10.6: Final commit

- [ ] If anything was tweaked during verification (commonly: a question with a wrong correct-answer flag), commit those JSON fixes.

  Suggested commit:
  ```
  fix(seed): hand-review corrections to fixture content
  ```

---

## Done

After Task 10:

- The DB has ~45k rows across the primary tables — past the 10k scalability bar.
- Three named test accounts are ready for the cover-page Credentials cell.
- The seed is re-runnable, deterministic, and bounded in cost (AI calls only at generation time, not seed time).
- `qna-web/README.md` documents the workflow for graders / future contributors.

Follow-ups (not in this plan):

- Add login-page quick-login buttons that POST as one of the three demo accounts.
- Add a GitHub Action that runs `npm run test -w qna-web` on push.
- Add a sentinel check in `seed/index.mjs` ("refuse if `users` table has > 1000 non-demo rows") after real launch.
