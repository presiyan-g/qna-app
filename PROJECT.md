# PROJECT.md

---

## 1. Product summary

We are building a platform for **scheduled Q&A communities**.

A community creator can create a niche community, schedule recurring questions, let members answer, show instant grading with explanations, unlock discussion after answering, and maintain leaderboards.

The seed community for launch is **Daily AI Builders** — a community about Claude Code, Codex, MCP, vibe coding, AI agents, and full-stack AI development. The platform should still support any niche community from day one.

---

## 2. Core product pillars

### 2.1 Scheduled Q&A

- Community creators create and schedule questions.
- Questions publish on a configurable cadence: daily, weekly, or custom.
- v1 focuses on **multiple-choice questions**.
- Questions and answer choices may include optional images.
- Members answer once per question.
- After answering, members instantly see:
  - whether they were correct
  - the correct answer
  - explanation
  - points awarded
  - leaderboard movement

### 2.2 Comments after answer

- Each Q&A has its own comment thread.
- Comments unlock only after the member submits an answer.
- v1 supports top-level comments and one level of replies.
- Comments are soft-deleted, not hard-deleted.
- Deleted comment rows are preserved so replies stay attached to a coherent tombstone.
- Closed questions show the comment thread to all community members, even members who missed the question.
- Posting comments still requires the member to have submitted an answer.
- Comment authors and the community creator can delete comments; nobody else can delete in v1.
- v1 does not support comment edits, reactions, mentions, notifications, or deeper nesting.

### 2.3 Broadcast channel

- Each community has a creator-only broadcast feed.
- Creators can post updates, announcements, resources, or winner messages.
- v1 supports text posts with optional image.
- Interactive buttons are planned for later, not required for MVP.

---

## 3. The app uses two permission layers:

1. Platform-level role on the user:
   
   - member
   - admin

2. Community-level role per community membership:
   
   - member
   - creator

A user can be a normal platform member globally, but a creator inside one community and a regular member inside another.

---

## 4. MVP feature scope

### Must-have for v1

- Register / login / logout
- Public landing page
- Browse communities
- Create community
- Join community
- Community home page
- Scheduled multiple-choice questions
- Image support for questions and choices
- Answer submission
- Instant grading
- Explanation after answer
- Comments unlocked after answer
- Public leaderboard
- Creator dashboard
- Basic broadcast posts
- Platform admin panel
- Mobile app for answering questions, viewing communities, leaderboard, and profile

### Nice-to-have for v1

- AI question draft generation
- Anonymous leaderboard mode
- Streak display
- Question difficulty tags
- Basic question stats

### Out of scope for v1

- Payments
- Prizes automation
- AI-driven communities
- Free-form AI grading
- Deeply nested comments
- Complex notification system
- Public social network features
- Multi-language support

---

## 5. AI features

### v1 AI feature: question draft generation

A community creator can click **Draft with AI** in the question composer.

Inputs:

- topic prompt
- optional difficulty
- optional question type

AI returns draft questions with:

- question text
- choices
- correct answer
- explanation

The creator must review, edit, and approve before publishing. AI should never auto-publish questions in v1.

---

## 6. Screens

### Web app

1. Landing page
2. Register / login
3. Browse communities
4. Create community
5. Community home
6. Question detail
7. Comments thread
8. Leaderboard
9. Creator dashboard
10. Question composer
11. Broadcast composer
12. Profile
13. Platform admin

### Mobile app

1. My communities
2. Today's question
3. Question result + explanation
4. Community detail — tabs for questions, broadcasts, leaderboard, and about
5. Leaderboard
6. Profile

---

## 7. Database model

Core tables:

- `users`
- `communities`
- `community_members`
- `questions`
- `question_choices`
- `answers`
- `comments`
- `broadcast_posts`
- `scores`
- `media_files`
- `ai_question_drafts`

The schema should support users, roles, communities, scheduled questions, answers, scoring, comments, broadcasts, images, and AI-generated drafts.

---

## 8. Scoring rules

v1 scoring should stay simple:

- Correct answer: `+10 points`
- Wrong answer: `+0 points`
- Late answer after `closes_at`: saved, but `+0 points`
- One answer per user per question

Streaks and multipliers can be added later.

---

## 9. Time rules

- Each question has `scheduled_for`, `published_at`, and `closes_at`.
- Default answer window: 24 hours after publishing.
- Community creators choose cadence and publish time.
- v1 should support timezone-aware scheduling, but avoid overcomplicated recurrence rules.



-------

## Q&A history and broadcast history

Each community should keep a permanent history of published Q&A and broadcast posts.

### Past Q&A

Members can review past questions from a community archive.

For each past question, members can see:

- question text and image
- their submitted answer, if they answered
- correct answer
- explanation
- comments thread
- basic result status: correct, wrong, missed, or late

Rules:

- If a question is still open, members must answer before seeing the explanation and comments.
- If a question is closed, members can review the explanation even if they missed it.
- Late answers may be saved for learning purposes, but they do not award leaderboard points.

### Broadcast history

Each community has a broadcast feed that stores all past creator posts.

Members can browse previous announcements, resources, winner posts, and community updates.

Broadcast posts are not deleted by default. If removal is needed, use soft-delete or hidden status.

---

## 10. Product positioning

The product is not a generic quiz app.

It is:

> **A platform for recurring knowledge challenges in niche communities.**

The key loop is:

> scheduled question → answer → instant grading → explanation → comments → leaderboard → repeat

The app should feel educational, competitive, and community-driven.

---

## 11. Success criteria for MVP

The MVP is successful if a creator can:

1. create a community
2. schedule a multiple-choice question
3. let members answer it
4. show instant grading and explanation
5. unlock comments after answering
6. update leaderboard points
7. post community broadcasts
8. manage everything from a web dashboard
9. let members participate from the mobile app
