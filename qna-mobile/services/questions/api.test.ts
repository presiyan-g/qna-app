import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createQuestionsClient,
  QuestionsApiError,
  type QuestionDetail,
  type QuestionSummary,
} from './api';

const summary: QuestionSummary = {
  id: 'question_1',
  communityId: 'community_1',
  creatorUserId: 'user_1',
  prompt: 'Which prompt strategy wins?',
  explanation: 'Step-by-step beats one-shot.',
  imageUrl: null,
  scheduledFor: '2026-05-21T09:00:00.000Z',
  publishedAt: '2026-05-21T09:00:00.000Z',
  closesAt: '2026-05-22T09:00:00.000Z',
  timeZone: 'GMT',
  points: 10,
  choiceCount: 4,
  choices: [],
  createdAt: '2026-05-20T09:00:00.000Z',
  updatedAt: '2026-05-20T09:00:00.000Z',
};

const detail: QuestionDetail = {
  ...summary,
  currentUserRole: 'member',
  canAnswer: true,
  canSeeSolution: false,
  isClosed: false,
  isScheduled: false,
  choices: [
    { id: 'choice_1', label: 'Chain-of-thought', imageUrl: null, position: 0, isCorrect: null },
    { id: 'choice_2', label: 'ReAct', imageUrl: null, position: 1, isCorrect: null },
  ],
  result: null,
};

describe('createQuestionsClient', () => {
  it('lists community questions with pagination and bearer auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createQuestionsClient({
      apiUrl: 'http://localhost:3000/api///',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return Response.json({ items: [summary], pagination: { limit: 20, offset: 0 } });
      },
    });

    const result = await client.list('ai-builders', { limit: 20, offset: 0, token: 'jwt' });

    assert.deepEqual(result.items, [summary]);
    assert.equal(
      calls[0].url,
      'http://localhost:3000/api/communities/ai-builders/questions?limit=20&offset=0',
    );
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt');
  });

  it('omits Authorization header when no token is supplied to list', async () => {
    let seenHeaders: Record<string, string> = {};
    const client = createQuestionsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (_url, init) => {
        seenHeaders = (init?.headers ?? {}) as Record<string, string>;
        return Response.json({ items: [], pagination: { limit: 20, offset: 0 } });
      },
    });

    await client.list('ai-builders');

    assert.equal(seenHeaders.Authorization, undefined);
  });

  it('loads a question detail with bearer auth', async () => {
    const client = createQuestionsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        assert.equal(
          String(url),
          'http://localhost:3000/api/communities/ai-builders/questions/question_1',
        );
        assert.equal(init?.method, 'GET');
        assert.equal(init?.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt');
        return Response.json(detail);
      },
    });

    assert.deepEqual(await client.get('ai-builders', 'question_1', 'jwt'), detail);
  });

  it('submits an answer with choiceId and bearer auth', async () => {
    const client = createQuestionsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        assert.equal(
          String(url),
          'http://localhost:3000/api/communities/ai-builders/questions/question_1/answers',
        );
        assert.equal(init?.method, 'POST');
        assert.equal(init?.headers?.['Authorization' as keyof HeadersInit], 'Bearer jwt');
        assert.equal(init?.headers?.['Content-Type' as keyof HeadersInit], 'application/json');
        assert.equal(init?.body, JSON.stringify({ choiceId: 'choice_1' }));
        return Response.json({
          questionId: 'question_1',
          canAnswer: false,
          isClosed: false,
          isScheduled: false,
          result: null,
          explanation: 'Step-by-step beats one-shot.',
          choices: [],
        });
      },
    });

    const result = await client.submitAnswer('ai-builders', 'question_1', 'choice_1', 'jwt');
    assert.equal(result.questionId, 'question_1');
    assert.equal(result.canAnswer, false);
  });

  it('raises QuestionsApiError with status and field errors on 422', async () => {
    const client = createQuestionsClient({
      apiUrl: 'http://localhost:3000/api',
      fetch: async () =>
        Response.json(
          { error: 'Invalid choice.', fieldErrors: { choiceId: 'Pick a choice.' } },
          { status: 422 },
        ),
    });

    await assert.rejects(
      () => client.submitAnswer('ai-builders', 'question_1', 'bad', 'jwt'),
      (err) =>
        err instanceof QuestionsApiError &&
        err.status === 422 &&
        err.fieldErrors.choiceId === 'Pick a choice.',
    );
  });
});
