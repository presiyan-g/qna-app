# Scheduled Questions Implementation Plan

## Steps

1. Add Drizzle schema support for `questions` and `question_choices`.
2. Generate Drizzle migrations for the new tables and for removing the non-authoritative `questions.status` column.
3. Add question validation for prompt, explanation, GMT publish time, 2 to 6 choices, exactly one correct choice, 10-point default, and 24-hour answer window.
4. Add question service functions for creator-only creation and paged community question listing.
5. Ensure public/member question list responses hide correct answers and explanations until answer submission exists.
6. Add a web Server Action for creator question creation.
7. Add REST endpoints at `GET` and `POST /api/communities/[slug]/questions`.
8. Replace the community page "coming next" panel with a question schedule and creator composer.
9. Add a runnable `qna-web` test script using `tsx --test`.
10. Verify with migration, tests, lint, build, browser smoke, and REST smoke.

## Verification

- `npm run db:migrate -w qna-web`
- `npm run test -w qna-web`
- `npm run lint -w qna-web`
- `npm run build -w qna-web`
- Browser smoke for creating and displaying a scheduled question.
- REST smoke for public question listing hiding `explanation` and `isCorrect`.
