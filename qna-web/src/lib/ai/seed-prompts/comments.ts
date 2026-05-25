import {
  generateStructured,
  type GenerateStructuredArgs,
  type GenerateStructuredResult,
} from '../provider';

export class CommentValidationError extends Error {
  constructor(reason: string) {
    super(`Comment validation failed: ${reason}`);
    this.name = 'CommentValidationError';
  }
}

export type CommentThread = {
  topLevel: { body: string };
  reply?: { body: string };
};

const BODY_MIN = 30;
const BODY_MAX = 600;

export const commentThreadJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['topLevel'],
  properties: {
    topLevel: {
      type: 'object',
      additionalProperties: false,
      required: ['body'],
      properties: { body: { type: 'string', minLength: BODY_MIN, maxLength: BODY_MAX } },
    },
    reply: {
      type: 'object',
      additionalProperties: false,
      required: ['body'],
      properties: { body: { type: 'string', minLength: BODY_MIN, maxLength: BODY_MAX } },
    },
  },
} as const;

function parseBody(label: string, raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new CommentValidationError(`${label} body must be a string`);
  }
  const trimmed = raw.trim();
  if (trimmed.length < BODY_MIN) {
    throw new CommentValidationError(`${label} body too short (${trimmed.length} < ${BODY_MIN})`);
  }
  if (trimmed.length > BODY_MAX) {
    throw new CommentValidationError(`${label} body too long (${trimmed.length} > ${BODY_MAX})`);
  }
  return trimmed;
}

export function parseCommentThread(raw: unknown): CommentThread {
  if (!raw || typeof raw !== 'object') {
    throw new CommentValidationError('thread must be an object');
  }
  const obj = raw as Record<string, unknown>;
  const topLevelRaw = obj.topLevel;
  if (!topLevelRaw || typeof topLevelRaw !== 'object') {
    throw new CommentValidationError('topLevel missing');
  }
  const topLevelBody = parseBody('topLevel', (topLevelRaw as { body: unknown }).body);

  let reply: { body: string } | undefined;
  if (obj.reply) {
    if (typeof obj.reply !== 'object') {
      throw new CommentValidationError('reply must be an object');
    }
    const replyBody = parseBody('reply', (obj.reply as { body: unknown }).body);
    reply = { body: replyBody };
  }

  return { topLevel: { body: topLevelBody }, reply };
}

export function buildCommentSystemPrompt(args: {
  communityName: string;
  communityDescription: string;
  questionPrompt: string;
  explanation: string;
}): string {
  return `You write one realistic comment thread under a multiple-choice question post in a niche learning community.

Community: ${args.communityName}
Description: ${args.communityDescription}

The question that was just answered:
${args.questionPrompt}

The official explanation (do not just paraphrase it):
${args.explanation}

Rules:
- Return JSON: { "topLevel": { "body": "..." }, "reply"?: { "body": "..." } }
- topLevel body: 30-600 chars. A first-person reaction — what they chose, what tripped them up, a related observation. Conversational, not a teaching answer.
- reply (50% of the time include it, otherwise omit the field): 30-600 chars. Replies to topLevel — agrees, disagrees, adds nuance. Different voice.
- No @-mentions. No markdown. No links unless the question explicitly references one.
- Avoid restating the official explanation; the reader has just seen it.`;
}

export async function generateCommentThread(
  deps: {
    generate?: (
      args: GenerateStructuredArgs<CommentThread>,
    ) => Promise<GenerateStructuredResult<CommentThread>>;
  },
  args: {
    community: { name: string; description: string };
    question: { prompt: string; explanation: string };
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
  },
): Promise<CommentThread> {
  const generate = deps.generate ?? generateStructured;
  const systemPrompt = buildCommentSystemPrompt({
    communityName: args.community.name,
    communityDescription: args.community.description,
    questionPrompt: args.question.prompt,
    explanation: args.question.explanation,
  });
  const result = await generate({
    model: args.model,
    systemPrompt,
    userPrompt: 'Write the comment thread.',
    jsonSchema: commentThreadJsonSchema as unknown as object,
    parse: parseCommentThread,
    maxOutputTokens: args.maxOutputTokens,
    timeoutMs: args.timeoutMs,
  });
  return result.data;
}
