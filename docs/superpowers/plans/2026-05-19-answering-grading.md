# Answering And Instant Grading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build dedicated question answering with instant grading on web and mobile-ready REST.

**Architecture:** Add an `answers` schema/migration, then put grading and persistence in `src/services/answers`. Web Server Actions and REST route handlers call the shared service. The question detail page remains server-rendered except for the answer form.

**Tech Stack:** Next.js App Router, Server Actions, Route Handlers, React, TypeScript, Drizzle ORM, PostgreSQL.

---

### Task 1: Grading Domain And Schema

**Files:**
- Create: `qna-web/src/services/answers/grading.ts`
- Create: `qna-web/src/services/answers/grading.test.ts`
- Create: `qna-web/src/db/schema/answers.ts`
- Modify: `qna-web/src/db/schema/index.ts`
- Create: `qna-web/drizzle/0005_add_answers.sql`

- [ ] **Step 1: Write failing tests for grading rules**

Test correct, wrong, and late scoring with `gradeAnswer`.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test -w qna-web -- src/services/answers/grading.test.ts`

- [ ] **Step 3: Implement minimal grading helper and answer schema**

Create `gradeAnswer({ isCorrect, closesAt, answeredAt, points })` returning `{ isLate, pointsAwarded }`. Add `answers` with one row per `(question_id, user_id)`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm run test -w qna-web -- src/services/answers/grading.test.ts`

### Task 2: Shared Answers Service

**Files:**
- Create: `qna-web/src/services/answers/errors.ts`
- Create: `qna-web/src/services/answers/answers.ts`
- Create: `qna-web/src/services/answers/index.ts`
- Modify: `qna-web/src/services/questions/questions.ts`
- Modify: `qna-web/src/services/questions/index.ts`

- [ ] **Step 1: Write failing service-facing tests where feasible**

Cover non-DB behavior in the domain helper and keep DB service logic small and deterministic.

- [ ] **Step 2: Implement service functions**

Add `getQuestionDetail({ slug, questionId, userId })` and `submitQuestionAnswer({ slug, questionId, userId, choiceId })`. Enforce membership, question existence, selected-choice ownership, duplicate answer stability, late scoring, and result shaping.

- [ ] **Step 3: Export service API**

Expose answer types, service functions, and errors from `src/services/answers`.

### Task 3: REST And Server Actions

**Files:**
- Create: `qna-web/src/app/api/communities/[slug]/questions/[id]/route.ts`
- Create: `qna-web/src/app/api/communities/[slug]/questions/[id]/answers/route.ts`
- Create: `qna-web/src/app/actions/answers.ts`

- [ ] **Step 1: Add REST GET route**

Return a stable question resource with choices, result when available, and visibility-aware explanation/correct choice data.

- [ ] **Step 2: Add REST POST route**

Accept `{ choiceId }`, submit through the answers service, and map auth, permission, not found, and validation errors to JSON status codes.

- [ ] **Step 3: Add web Server Action**

Accept form submission, call the answers service, revalidate the question detail page, and return form state.

### Task 4: Web Detail Page

**Files:**
- Create: `qna-web/src/app/communities/[slug]/questions/[id]/page.tsx`
- Create: `qna-web/src/app/communities/[slug]/questions/[id]/_components/AnswerForm.tsx`
- Modify: `qna-web/src/app/communities/[slug]/_components/QuestionList.tsx`

- [ ] **Step 1: Add detail page**

Render question prompt, schedule metadata, answer status, result details, correct answer, explanation, and navigation back to the community.

- [ ] **Step 2: Add answer form client component**

Use radio choices, pending state, validation messages, and disabled result state after answer.

- [ ] **Step 3: Link community list cards**

Add “Open question” navigation from each question card.

### Task 5: Verification

**Files:**
- All modified files

- [ ] **Step 1: Run focused tests**

Run: `npm run test -w qna-web`

- [ ] **Step 2: Run lint**

Run: `npm run lint -w qna-web`

- [ ] **Step 3: Run build**

Run: `npm run build -w qna-web`

- [ ] **Step 4: Inspect git diff**

Run: `git diff --stat` and review changed files for scope.
