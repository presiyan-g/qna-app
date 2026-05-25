// Note: `server-only` is intentionally omitted here because this module is
// pure transport (fetch + JSON) with no framework-specific side-effects.
// The caller (`question-drafts.ts`, Task 4) is the server boundary and carries
// the `server-only` directive instead.

export class TimeoutError extends Error {
  constructor() {
    super('AI provider request timed out');
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('AI provider rate-limited the request');
    this.name = 'RateLimitError';
  }
}

export class UpstreamError extends Error {
  constructor(public readonly status: number) {
    super(`AI provider upstream error: ${status}`);
    this.name = 'UpstreamError';
  }
}

export class SafetyBlockedError extends Error {
  constructor() {
    super('AI provider blocked the request for content safety');
    this.name = 'SafetyBlockedError';
  }
}

export class InvalidJsonError extends Error {
  constructor(
    public readonly reason: string,
    public readonly inputTokens: number = 0,
    public readonly outputTokens: number = 0,
  ) {
    super(`AI provider returned invalid JSON: ${reason}`);
    this.name = 'InvalidJsonError';
  }
}

type Plugin = { id: string; max_results?: number };

export type GenerateStructuredArgs<T> = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: object;
  parse: (raw: unknown) => T;
  maxOutputTokens: number;
  timeoutMs: number;
  plugins?: Plugin[];
};

export type GenerateStructuredResult<T> = {
  data: T;
  inputTokens: number;
  outputTokens: number;
};

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

// Some models (notably Gemini routed via OpenRouter) ignore response_format:json_schema
// and wrap the JSON object in ```json ... ``` fences, or in a bare ``` block. Strip
// those before parsing so the structured-output contract still holds. If the content
// has no fence, return it unchanged.
export function stripCodeFences(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('```')) return content;
  // Remove the opening fence + optional language tag (```json, ```)
  let stripped = trimmed.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '');
  // Remove the trailing fence
  stripped = stripped.replace(/\n?```\s*$/, '');
  return stripped;
}

export async function generateStructured<T>(
  args: GenerateStructuredArgs<T>,
): Promise<GenerateStructuredResult<T>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL;

  const body: Record<string, unknown> = {
    model: args.model,
    messages: [
      { role: 'system', content: args.systemPrompt },
      { role: 'user', content: args.userPrompt },
    ],
    max_tokens: args.maxOutputTokens,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'question_draft',
        strict: true,
        schema: args.jsonSchema,
      },
    },
  };
  if (args.plugins && args.plugins.length > 0) {
    body.plugins = args.plugins;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new UpstreamError(0);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) throw new RateLimitError();
  if (response.status >= 500) throw new UpstreamError(response.status);
  if (!response.ok) throw new UpstreamError(response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new InvalidJsonError('response not JSON');
  }

  const choices = (payload as { choices?: unknown[] })?.choices;
  const choice = (Array.isArray(choices) ? choices[0] : undefined) as
    | { message?: { content?: unknown }; finish_reason?: string }
    | undefined;

  if (choice?.finish_reason === 'content_filter') {
    throw new SafetyBlockedError();
  }

  const content = choice?.message?.content;
  if (typeof content !== 'string') {
    throw new InvalidJsonError('missing message content');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFences(content));
  } catch {
    throw new InvalidJsonError('content is not JSON');
  }

  const usage = (payload as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } })?.usage ?? {};
  const inputTokens = Number(usage.prompt_tokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? 0);

  let data: T;
  try {
    data = args.parse(raw);
  } catch (err) {
    throw new InvalidJsonError(
      err instanceof Error ? err.message : 'parse failed',
      inputTokens,
      outputTokens,
    );
  }
  return {
    data,
    inputTokens,
    outputTokens,
  };
}
