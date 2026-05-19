# Scheduled Questions Design

## Goal

Add the first scheduled multiple-choice question slice for community creators on the web app and expose the same data through a REST endpoint for mobile.

## Scope

- Creators can compose a multiple-choice question from the community home page.
- Members and visitors can see the community question schedule on the community home page.
- v1 stores optional image URL columns for questions and choices, but does not implement upload, signed URLs, or R2 integration yet.
- v1 does not implement answer submission, grading, comments, or leaderboard updates.

## Data Model

- `questions` belongs to `communities` and `users`.
- `question_choices` belongs to `questions`.
- `scheduled_for` is the authoritative availability timestamp.
- `published_at` stores the scheduled publish timestamp for this v1 slice; no cron job mutates state.
- `closes_at` defaults to 24 hours after `scheduled_for`.
- `time_zone` is stored as `GMT` only for now.
- `points` defaults to 10.
- There is no `questions.status` column. Display and future queries derive state from timestamps:
  - scheduled: `scheduled_for > now`
  - published/open: `scheduled_for <= now < closes_at`
  - closed: `closes_at <= now`

## Composer Rules

- Prompt is required, 10 to 1000 characters.
- Explanation is required, up to 2000 characters.
- Publish time is entered as GMT.
- The service accepts 2 to 6 choices and requires exactly one correct choice.
- The current web composer renders 4 fixed choice inputs as the MVP UI.

## Access Rules

- Only a community member with role `creator` can create questions.
- Creator views and create responses include `isCorrect` and `explanation`.
- Public/member list responses hide `isCorrect` and `explanation` until the answer flow exists.

## API/UI

- Web uses a Server Action for question creation.
- Mobile-facing REST route:
  - `GET /api/communities/[slug]/questions`
  - `POST /api/communities/[slug]/questions`
- The community page replaces the previous "coming next" block with a schedule list.

## Follow-Ups

- Add answer submission and grading.
- Add comments unlocked after answering.
- Add image upload via R2 signed URLs.
- Add creator dashboard management.
- Revisit timezone support after GMT-only behavior has real usage.
