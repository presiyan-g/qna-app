import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
  generateStructured,
  InvalidJsonError,
  RateLimitError,
  SafetyBlockedError,
  TimeoutError,
  UpstreamError,
} from './provider';

const ENV = {
  OPENROUTER_API_KEY: 'test-key',
  OPENROUTER_BASE_URL: 'https://openrouter.test/api/v1',
};

const baseArgs = {
  model: 'google/gemini-2.5-flash-lite',
  systemPrompt: 'system',
  userPrompt: 'user',
  jsonSchema: { type: 'object' as const },
  parse: (raw: unknown) => raw as { ok: boolean },
  maxOutputTokens: 800,
  timeoutMs: 1000,
};

function okResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let originalApiKey: string | undefined;
let originalBaseUrl: string | undefined;

beforeEach(() => {
  originalApiKey = process.env.OPENROUTER_API_KEY;
  originalBaseUrl = process.env.OPENROUTER_BASE_URL;
  process.env.OPENROUTER_API_KEY = ENV.OPENROUTER_API_KEY;
  process.env.OPENROUTER_BASE_URL = ENV.OPENROUTER_BASE_URL;
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalApiKey;
  if (originalBaseUrl === undefined) delete process.env.OPENROUTER_BASE_URL;
  else process.env.OPENROUTER_BASE_URL = originalBaseUrl;
  mock.restoreAll();
});

describe('generateStructured', () => {
  it('posts to OpenRouter with the expected body and headers', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      okResponse({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    );

    const result = await generateStructured(baseArgs);

    assert.equal(result.inputTokens, 10);
    assert.equal(result.outputTokens, 5);
    assert.deepEqual(result.data, { ok: true });

    assert.equal(fetchMock.mock.calls.length, 1);
    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.equal(url, `${ENV.OPENROUTER_BASE_URL}/chat/completions`);
    const headers = init.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Bearer ${ENV.OPENROUTER_API_KEY}`);
    assert.equal(headers['Content-Type'], 'application/json');

    const body = JSON.parse(init.body as string);
    assert.equal(body.model, baseArgs.model);
    assert.equal(body.max_tokens, baseArgs.maxOutputTokens);
    assert.deepEqual(body.messages, [
      { role: 'system', content: baseArgs.systemPrompt },
      { role: 'user', content: baseArgs.userPrompt },
    ]);
    assert.equal(body.response_format.type, 'json_schema');
    assert.deepEqual(body.response_format.json_schema.schema, baseArgs.jsonSchema);
    assert.equal(body.response_format.json_schema.name, 'question_draft');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal('plugins' in body, false);
  });

  it('includes plugins when provided', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      okResponse({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );

    await generateStructured({
      ...baseArgs,
      plugins: [{ id: 'web', max_results: 5 }],
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0].arguments[1] as RequestInit).body as string,
    );
    assert.deepEqual(body.plugins, [{ id: 'web', max_results: 5 }]);
  });

  it('throws TimeoutError when fetch aborts', async () => {
    mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
      return new Promise((_, reject) => {
        const signal = init.signal!;
        signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    });

    await assert.rejects(
      generateStructured({ ...baseArgs, timeoutMs: 20 }),
      TimeoutError,
    );
  });

  it('maps 429 to RateLimitError', async () => {
    mock.method(globalThis, 'fetch', async () => okResponse({}, 429));
    await assert.rejects(generateStructured(baseArgs), RateLimitError);
  });

  it('throws a clear Error when OPENROUTER_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await assert.rejects(
      generateStructured(baseArgs),
      (err: unknown) =>
        err instanceof Error &&
        /OPENROUTER_API_KEY/.test(err.message),
    );
  });

  it('maps 5xx to UpstreamError with the status code preserved', async () => {
    mock.method(globalThis, 'fetch', async () => okResponse({}, 503));
    await assert.rejects(
      generateStructured(baseArgs),
      (err: unknown) => err instanceof UpstreamError && err.status === 503,
    );
  });

  it('maps content-filter finish reason to SafetyBlockedError', async () => {
    mock.method(globalThis, 'fetch', async () =>
      okResponse({
        choices: [
          { message: { content: '' }, finish_reason: 'content_filter' },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 0 },
      }),
    );
    await assert.rejects(generateStructured(baseArgs), SafetyBlockedError);
  });

  it('throws InvalidJsonError when the message content is not JSON', async () => {
    mock.method(globalThis, 'fetch', async () =>
      okResponse({
        choices: [{ message: { content: 'not json' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    await assert.rejects(generateStructured(baseArgs), InvalidJsonError);
  });

  it('throws InvalidJsonError when parse() throws', async () => {
    mock.method(globalThis, 'fetch', async () =>
      okResponse({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    await assert.rejects(
      generateStructured({
        ...baseArgs,
        parse: () => {
          throw new Error('parse failed');
        },
      }),
      InvalidJsonError,
    );
  });

  it('InvalidJsonError from a parse failure carries token counts from the completed call', async () => {
    mock.method(globalThis, 'fetch', async () =>
      okResponse({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 7, completion_tokens: 3 },
      }),
    );
    let caught: unknown;
    try {
      await generateStructured({
        ...baseArgs,
        parse: () => {
          throw new Error('parse failed');
        },
      });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof InvalidJsonError);
    assert.equal(caught.inputTokens, 7);
    assert.equal(caught.outputTokens, 3);
  });
});
