import {
  generateStructured,
  type GenerateStructuredArgs,
  type GenerateStructuredResult,
} from '../provider';

export type BroadcastTheme =
  | 'welcome'
  | 'weekly_recap'
  | 'resource'
  | 'winner'
  | 'milestone';

export class BroadcastValidationError extends Error {
  constructor(reason: string) {
    super(`Broadcast validation failed: ${reason}`);
    this.name = 'BroadcastValidationError';
  }
}

const BODY_MIN = 60;
const BODY_MAX = 2000;

export const broadcastJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['body'],
  properties: {
    body: { type: 'string', minLength: BODY_MIN, maxLength: BODY_MAX },
  },
} as const;

export function parseBroadcastBody(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'body' in raw) {
    return parseBroadcastBody((raw as { body: unknown }).body);
  }
  if (typeof raw !== 'string') {
    throw new BroadcastValidationError('body must be a string');
  }
  const trimmed = raw.trim();
  if (trimmed.length < BODY_MIN) {
    throw new BroadcastValidationError(`body too short (${trimmed.length} < ${BODY_MIN})`);
  }
  if (trimmed.length > BODY_MAX) {
    throw new BroadcastValidationError(`body too long (${trimmed.length} > ${BODY_MAX})`);
  }
  return trimmed;
}

const THEME_GUIDANCE: Record<BroadcastTheme, string> = {
  welcome:
    'A welcome post for new members. Set expectations: how often questions drop, how scoring works, where to discuss. Friendly, not corporate.',
  weekly_recap:
    'A short recap of last week — call out the trickiest question and what made it hard. No specific names needed.',
  resource:
    'Share a single useful resource (article, video, book, channel) that fits the community. One paragraph on why it is worth their time.',
  winner:
    'Shout out the top scorer of the past week. Use the placeholder "@top_scorer" instead of a real name.',
  milestone:
    'Celebrate a community milestone (200 members, 100 questions answered, first year). Pick whichever fits the community.',
};

export function buildBroadcastSystemPrompt(args: {
  communityName: string;
  communityDescription: string;
  theme: BroadcastTheme;
}): string {
  return `You write a single short broadcast post for a niche learning community.

Community: ${args.communityName}
Description: ${args.communityDescription}

Theme: ${args.theme}
Guidance: ${THEME_GUIDANCE[args.theme]}

Rules:
- Return JSON: { "body": "..." }
- The body must be between ${BODY_MIN} and ${BODY_MAX} characters.
- 1 to 3 short paragraphs of plain text. No markdown headings. Inline links allowed.
- Match the tone of the community description. No emojis unless natural.
- Do not invent specific member usernames except "@top_scorer" in the winner theme.`;
}

export async function generateBroadcastBody(
  deps: {
    generate?: (
      args: GenerateStructuredArgs<string>,
    ) => Promise<GenerateStructuredResult<string>>;
  },
  args: {
    community: { name: string; description: string };
    theme: BroadcastTheme;
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
  },
): Promise<string> {
  const generate = deps.generate ?? generateStructured;
  const systemPrompt = buildBroadcastSystemPrompt({
    communityName: args.community.name,
    communityDescription: args.community.description,
    theme: args.theme,
  });
  const result = await generate({
    model: args.model,
    systemPrompt,
    userPrompt: `Write the ${args.theme} broadcast.`,
    jsonSchema: broadcastJsonSchema as unknown as object,
    parse: parseBroadcastBody,
    maxOutputTokens: args.maxOutputTokens,
    timeoutMs: args.timeoutMs,
  });
  return result.data;
}
