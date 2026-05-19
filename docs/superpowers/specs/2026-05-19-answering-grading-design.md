# Answering And Instant Grading Design

## Goal

Members can open a dedicated question detail page, submit one multiple-choice answer, receive instant grading with the correct answer, explanation, and points awarded, and revisit that result later. The same behavior is available through mobile-ready REST endpoints.

## Scope

This slice covers answering, grading, and result retrieval for published multiple-choice questions. It does not include comments, leaderboard ranking movement, streaks, notifications, or creator analytics.

## Architecture

Answers are persisted in a new `answers` table created through Drizzle schema and migration files. The table stores the selected choice, correctness, late status, awarded points, and answer timestamp. A unique `(question_id, user_id)` index enforces one answer per member per question.

Business logic lives in a new answers service. Web Server Actions and REST route handlers call the same service so web and mobile behavior stay aligned. React client components only handle form state and presentation.

## Data Rules

- Only authenticated community members and creators can view the dedicated question detail page.
- Only authenticated community members and creators can submit answers.
- A submitted choice must belong to the target question.
- Users can answer each question once.
- Duplicate submissions return the existing stored result and do not change the selected choice.
- Correct answers submitted on or before `closes_at` receive `question.points`.
- Wrong answers receive `0`.
- Late answers are saved with `is_late = true` and receive `0`, even if correct.
- Result payloads include the selected choice, correct choice, explanation, correctness, late status, points awarded, and answered timestamp.

## Web UX

The community question list links each question to `/communities/[slug]/questions/[id]`. The detail page shows the prompt, schedule status, answer choices, and membership-aware calls to action.

Before answering, an eligible signed-in member sees a multiple-choice form. After submitting, or when revisiting a previously answered question, they see:

- correct or wrong state
- selected answer
- correct answer
- explanation
- points awarded
- late indicator when applicable

Creators see correctness metadata but use the same detail shell.

## REST API

`GET /api/communities/[slug]/questions/[id]` returns a mobile-friendly question resource. If the current bearer token or session cookie belongs to a user with an answer, the response includes that result. Otherwise, the response hides correct-choice data and explanation while the question is open.

`POST /api/communities/[slug]/questions/[id]/answers` accepts `{ "choiceId": "..." }`, grades through the service, and returns the persisted result. Authentication failures return `401`, permission failures return `403`, invalid choices return `422`, and missing questions return `404`.

## Error Handling

The service exposes typed errors for not found, permission, validation, and duplicate-safe result retrieval cases. Route handlers translate those errors into stable JSON responses. Server Actions translate them into form state for the web form.

## Testing

Tests focus on the service/validation boundary because that is the shared behavior for web and mobile:

- correct in-window answer awards points
- wrong answer awards zero and returns correct choice
- late correct answer saves result but awards zero
- second submission returns the original result
- choice from another question is rejected

Route handlers and Server Actions remain thin wrappers over tested service logic.
