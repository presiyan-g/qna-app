# PROJECT.md

---

## 0. Status (2026-05-26)

The product is branded **Quorum** and v1 has shipped.

- Web app live: <https://qna-app-quorum-web.vercel.app>
- Mobile web export live: <https://qna-app-quorum-mobile.vercel.app>
- GitHub: <https://github.com/presiyan-g/qna-app>

Everything under "Must-have for v1" in section 4 is implemented. The "Nice-to-have for v1" items that landed are called out inline. v2 items remain out of scope. Anything later than v1 is tracked here as a forward-looking note, not a current commitment.

---

## 1. Product summary

Quorum is a platform for **scheduled Q&A communities**.

A community creator can create a niche community, schedule recurring questions, let members answer, show instant grading with explanations, unlock discussion after answering, and maintain leaderboards.

The seed community for launch is **Daily AI Builders** — a community about Claude Code, Codex, MCP, vibe coding, AI agents, and full-stack AI development. The platform still supports any niche community from day one (seed ships with ~20 example communities spanning chess, CSS, markets, biotech, law, product design, security, data visualization, and more).

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
- Broadcasts v1 use a public community feed at `/communities/[slug]/broadcasts`.
- Reads are public, including anonymous traffic.
- Creating, editing, and deleting require a creator membership in that community.
- Authors can edit their own posts; same-community creators can soft-delete posts for moderation.
- v1 stores optional external `http` or `https` image URLs; the upload pipeline is deferred.
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

### Must-have for v1 — all shipped

- [x] Register / login / logout
- [x] Public landing page
- [x] Browse communities (paginated directory)
- [x] Create community
- [x] Join / leave community
- [x] Community home page (multi-tab: questions, broadcasts, leaderboard, about)
- [x] Scheduled multiple-choice questions
- [x] Image support for questions and choices (uploaded to Cloudflare R2)
- [x] Answer submission
- [x] Instant grading
- [x] Explanation after answer
- [x] Comments unlocked after answer (cursor-paginated, one level of replies, soft delete)
- [x] Public leaderboard (7-day, 30-day, all-time windows)
- [x] Creator dashboard (cross-community hub + per-community management)
- [x] Basic broadcast posts (cursor-paginated feed)
- [x] Platform admin panel (users, communities, audit log)
- [x] Mobile app for answering questions, viewing communities, leaderboard, and profile

Creator dashboard v1 — shipped:

- `/dashboard` is the cross-community creator hub.
- `/dashboard/communities/[slug]` is the per-community question management route.
- Creators can save draft questions, schedule drafts, edit unpublished questions, and soft-delete unpublished questions.
- Published questions are view-only in the dashboard.
- Member management, community settings, analytics, dashboard broadcast management, mobile dashboard UI, and platform admin are separate slices (most landed in the v1 timeframe — see "Beyond the original v1 list" below).

### Nice-to-have for v1

- [x] AI question draft generation (creator-only, via OpenRouter — see section 5)
- [x] Streak display (per-community streak ribbon on profile, 30-day heatmap)
- [x] Cover image upload for communities and question images (via Cloudflare R2)
- [ ] Anonymous leaderboard mode — not shipped
- [ ] Question difficulty tags — used in AI seed generation but not stored on the question row
- [ ] Basic question stats — vote distribution per choice is shown after answering; aggregate dashboards are deferred

### Beyond the original v1 list (also shipped)

These weren't in the original v1 must-have list but landed during the v1 cycle:

- Community archiving (soft-archive flag, creator-only).
- Community cover images and emojis, plus a featured/directory ranking signal used by the landing page and the browse route.
- Community categories (seeded taxonomy) and category filtering in the directory.
- Vote distribution per choice, shown after a member submits.
- Notifications surface (bell menu) and per-user "last seen" markers for broadcasts and notifications.
- Admin audit logs (`admin_audit_logs` table) for every admin action.
- AI usage tracking and per-user quota (`ai_usage` table).
- Cursor pagination on comments and broadcasts; offset pagination on the rest of the list endpoints.
- Public REST mirror of the web data model for the Expo client (`/api/auth`, `/api/communities`, `/api/users/[username]`, etc.).

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

Profile v1:

- Public web route: `/users/[username]`.
- Public REST route for mobile: `GET /api/users/[username]`.
- Profiles are visible to anonymous visitors.
- v1 shows username, joined date, total points from `answers.points_awarded`, and active community memberships with role.
- Profile totals derive from `answers.points_awarded`; there is no denormalized profile score.
- Profile editing, display names, bios, avatars, activity feeds, and streaks are separate slices.

---

## 7. Database model

Tables actually in `qna-web/src/db/schema/` as of v1 (11 tables, 16 Drizzle migrations):

- `users` — id, email, username, password_hash, role (`member` | `admin`), status (`active` | `suspended`), timestamps.
- `communities` — id, creator_user_id, category_id, slug, name, description, emoji, cover_image_url, cadence (`daily` | `weekly` | `custom`), status (`active` | `archived`), is_featured, featured_rank, directory_rank, timestamps.
- `community_categories` — id, slug, name, description, timestamps.
- `community_members` — id, community_id, user_id, role (`member` | `creator`), joined_at, last_seen_broadcasts_at, timestamps.
- `questions` — id, community_id, creator_user_id, prompt, explanation, image_url, scheduled_for, published_at, closes_at, deleted_at (soft delete), time_zone, points, timestamps.
- `question_choices` — id, question_id, label, image_url, is_correct, position, timestamps.
- `answers` — id, question_id, user_id, selected_choice_id, is_correct, is_late, points_awarded, answered_at, timestamps.
- `comments` — id, question_id, author_user_id, parent_comment_id (one level of nesting), body, deleted_at (soft delete), timestamps.
- `broadcast_posts` — id, community_id, author_user_id, body, image_url, published_at, deleted_at (soft delete), timestamps.
- `admin_audit_logs` — id, actor_user_id, action, target_user_id, target_community_id, reason, created_at.
- `ai_usage` — id, user_id, model, web_search, input_tokens, output_tokens, success, error_code, created_at.

Indexes cover slug lookups, member uniqueness, the scheduling window, the (community, published_at desc) feed, the (question, created_at) comment thread, and the audit/usage trails.

Notes vs. the original v1 list:

- The originally proposed `scores` table was dropped — leaderboards derive directly from `answers.points_awarded`, which keeps a single source of truth.
- The originally proposed `media_files` table was dropped — image URLs live on the rows that need them (`communities.cover_image_url`, `questions.image_url`, `question_choices.image_url`, `broadcast_posts.image_url`). R2 holds the bytes.
- `ai_question_drafts` was not materialized as a table — drafts return inline from the OpenRouter call and are committed by the creator into the normal `questions` / `question_choices` rows.

---

## 8. Scoring rules

v1 scoring should stay simple:

- Correct answer: `+10 points`
- Wrong answer: `+0 points`
- Late answer after `closes_at`: saved, but `+0 points`
- One answer per user per question

Leaderboard v1:

- Scores are per community only; there is no global cross-community leaderboard.
- Public leaderboard reads derive from `answers.points_awarded`.
- Windows: 7 days, 30 days, all-time.
- Show the top 10 users by username.
- Tie-break equal point totals by the earliest `MAX(answered_at)` among point-awarding answers.

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

Broadcast history is cursor-paginated. Broadcast posts are not deleted by default. If removal is needed, use soft-delete; soft-deleted posts are hidden from public reads but preserved in the database.

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
