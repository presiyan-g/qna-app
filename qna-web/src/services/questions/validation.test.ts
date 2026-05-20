import assert from 'node:assert/strict';
import test from 'node:test';
import {
  QuestionsValidationError,
  validateCreateQuestionInput,
  validateDraftQuestionInput,
  validateScheduleQuestionInput,
} from './validation';

test('validates a scheduled GMT multiple-choice question', () => {
  const input = validateCreateQuestionInput(
    {
      prompt: 'Which field controls when a question becomes available?',
      explanation: 'scheduled_for is the source of truth for availability.',
      scheduledFor: '2026-05-20T09:30',
      choices: [
        { label: 'published_at', isCorrect: false },
        { label: 'scheduled_for', isCorrect: true },
        { label: 'created_at', isCorrect: false },
      ],
    },
    { now: new Date('2026-05-19T08:00:00.000Z') },
  );

  assert.equal(input.prompt, 'Which field controls when a question becomes available?');
  assert.equal(input.explanation, 'scheduled_for is the source of truth for availability.');
  assert.equal(input.scheduledFor.toISOString(), '2026-05-20T09:30:00.000Z');
  assert.equal(input.closesAt.toISOString(), '2026-05-21T09:30:00.000Z');
  assert.equal(input.timeZone, 'GMT');
  assert.equal(input.points, 10);
  assert.deepEqual(
    input.choices.map((choice) => ({ label: choice.label, isCorrect: choice.isCorrect })),
    [
      { label: 'published_at', isCorrect: false },
      { label: 'scheduled_for', isCorrect: true },
      { label: 'created_at', isCorrect: false },
    ],
  );
});

test('rejects questions without exactly one correct choice', () => {
  assert.throws(
    () =>
      validateCreateQuestionInput(
        {
          prompt: 'Pick the correct answers.',
          explanation: 'Only one choice can be correct in v1.',
          scheduledFor: '2026-05-20T09:30',
          choices: [
            { label: 'A', isCorrect: true },
            { label: 'B', isCorrect: true },
          ],
        },
        { now: new Date('2026-05-19T08:00:00.000Z') },
      ),
    (err) =>
      err instanceof QuestionsValidationError &&
      err.fieldErrors.choices === 'Choose exactly one correct answer.',
  );
});

test('rejects schedules more than five minutes in the past', () => {
  assert.throws(
    () =>
      validateCreateQuestionInput(
        {
          prompt: 'When should this publish?',
          explanation: 'Past schedules are rejected.',
          scheduledFor: '2026-05-19T07:50',
          choices: [
            { label: 'Now', isCorrect: true },
            { label: 'Later', isCorrect: false },
          ],
        },
        { now: new Date('2026-05-19T08:00:00.000Z') },
      ),
    (err) =>
      err instanceof QuestionsValidationError &&
      err.fieldErrors.scheduledFor === 'Choose a GMT time in the future.',
  );
});

test('validates a complete draft without a schedule', () => {
  const draft = validateDraftQuestionInput({
    prompt: 'Which tool should own database migrations?',
    explanation: 'Drizzle migrations keep schema history reviewable.',
    choices: [
      { label: 'Drizzle', isCorrect: true },
      { label: 'Ad hoc SQL', isCorrect: false },
    ],
  });

  assert.equal(draft.scheduledFor, null);
  assert.equal(draft.closesAt, null);
  assert.equal(draft.points, 10);
  assert.equal(draft.choices.length, 2);
});

test('validates a future GMT schedule', () => {
  const schedule = validateScheduleQuestionInput(
    { scheduledFor: '2026-05-21T12:00' },
    { now: new Date('2026-05-20T12:00:00.000Z') },
  );

  assert.equal(schedule.scheduledFor.toISOString(), '2026-05-21T12:00:00.000Z');
  assert.equal(schedule.closesAt.toISOString(), '2026-05-22T12:00:00.000Z');
  assert.equal(schedule.publishedAt.toISOString(), '2026-05-21T12:00:00.000Z');
});
