import { normalizeStoredImageUrl } from '@/services/uploads/url';

export type CreateQuestionChoiceInput = {
  label: string;
  isCorrect: boolean;
  imageUrl: string | null;
  position: number;
};

export type CreateQuestionInput = {
  prompt: string;
  explanation: string;
  imageUrl: string | null;
  scheduledFor: Date;
  /**
   * Caller-supplied close time. Only meaningful for `custom`-cadence
   * communities; ignored when the community cadence is `daily` or `weekly`.
   * The service derives the authoritative `closesAt` via `computeQuestionClosesAt`.
   */
  requestedClosesAt: Date | null;
  timeZone: 'GMT';
  points: number;
  choices: CreateQuestionChoiceInput[];
};

export type DraftQuestionInput = Omit<
  CreateQuestionInput,
  'scheduledFor' | 'requestedClosesAt'
> & {
  scheduledFor: null;
  requestedClosesAt: null;
};

export type ScheduleQuestionInput = {
  scheduledFor: Date;
  publishedAt: Date;
  requestedClosesAt: Date | null;
  timeZone: 'GMT';
};

export class QuestionsValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Invalid question input');
    this.name = 'QuestionsValidationError';
  }
}

type RawChoice = {
  label?: unknown;
  isCorrect?: unknown;
  imageUrl?: unknown;
};

const DEFAULT_POINTS = 10;
const PAST_SCHEDULE_GRACE_MS = 5 * 60 * 1000;
const MAX_CHOICES = 6;

export function validateCreateQuestionInput(
  raw: {
    prompt?: unknown;
    explanation?: unknown;
    imageUrl?: unknown;
    scheduledFor?: unknown;
    closesAt?: unknown;
    choices?: unknown;
  },
  options: { now?: Date } = {},
): CreateQuestionInput {
  const now = options.now ?? new Date();
  const fieldErrors: Record<string, string> = {};
  const core = validateQuestionCore(raw, fieldErrors);
  const scheduledFor = parseGmtDateTime(raw.scheduledFor);
  const requestedClosesAt = parseGmtDateTime(raw.closesAt);

  if (!scheduledFor) {
    fieldErrors.scheduledFor = 'Choose a GMT publish time.';
  } else if (scheduledFor.getTime() < now.getTime() - PAST_SCHEDULE_GRACE_MS) {
    fieldErrors.scheduledFor = 'Choose a GMT time in the future.';
  }

  if (Object.keys(fieldErrors).length > 0 || !scheduledFor) {
    throw new QuestionsValidationError(fieldErrors);
  }

  return {
    ...core,
    scheduledFor,
    requestedClosesAt,
    timeZone: 'GMT',
  };
}

export function validateDraftQuestionInput(raw: {
  prompt?: unknown;
  explanation?: unknown;
  imageUrl?: unknown;
  choices?: unknown;
}): DraftQuestionInput {
  const fieldErrors: Record<string, string> = {};
  const core = validateQuestionCore(raw, fieldErrors);

  if (Object.keys(fieldErrors).length > 0) {
    throw new QuestionsValidationError(fieldErrors);
  }

  return {
    ...core,
    scheduledFor: null,
    requestedClosesAt: null,
    timeZone: 'GMT',
    points: DEFAULT_POINTS,
  };
}

export function validateScheduleQuestionInput(
  raw: { scheduledFor?: unknown; closesAt?: unknown },
  options: { now?: Date } = {},
): ScheduleQuestionInput {
  const now = options.now ?? new Date();
  const fieldErrors: Record<string, string> = {};
  const scheduledFor = parseGmtDateTime(raw.scheduledFor);
  const requestedClosesAt = parseGmtDateTime(raw.closesAt);

  if (!scheduledFor) {
    fieldErrors.scheduledFor = 'Choose a GMT publish time.';
  } else if (scheduledFor.getTime() < now.getTime() - PAST_SCHEDULE_GRACE_MS) {
    fieldErrors.scheduledFor = 'Choose a GMT time in the future.';
  }

  if (Object.keys(fieldErrors).length > 0 || !scheduledFor) {
    throw new QuestionsValidationError(fieldErrors);
  }

  return {
    scheduledFor,
    publishedAt: scheduledFor,
    requestedClosesAt,
    timeZone: 'GMT',
  };
}

function validateQuestionCore(
  raw: {
    prompt?: unknown;
    explanation?: unknown;
    imageUrl?: unknown;
    choices?: unknown;
  },
  fieldErrors: Record<string, string>,
): Omit<CreateQuestionInput, 'scheduledFor' | 'requestedClosesAt' | 'timeZone'> {
  const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : '';
  const explanation =
    typeof raw.explanation === 'string' ? raw.explanation.trim() : '';
  const imageUrl = normalizeImageUrlOrFail(raw.imageUrl, fieldErrors, 'imageUrl');
  const rawChoices = Array.isArray(raw.choices) ? raw.choices : [];
  const choices = normalizeChoices(rawChoices, fieldErrors);

  if (!prompt) fieldErrors.prompt = 'Question prompt is required.';
  else if (prompt.length < 10) {
    fieldErrors.prompt = 'Use at least 10 characters.';
  } else if (prompt.length > 1000) {
    fieldErrors.prompt = 'Use 1000 characters or fewer.';
  }

  if (!explanation) fieldErrors.explanation = 'Explanation is required.';
  else if (explanation.length > 2000) {
    fieldErrors.explanation = 'Use 2000 characters or fewer.';
  }

  if (choices.length < 2) {
    fieldErrors.choices = 'Add at least two answer choices.';
  } else if (choices.length > MAX_CHOICES) {
    fieldErrors.choices = 'Use six answer choices or fewer.';
  } else if (choices.some((choice) => choice.label.length === 0)) {
    fieldErrors.choices = 'Every answer choice needs text.';
  } else if (choices.filter((choice) => choice.isCorrect).length !== 1) {
    fieldErrors.choices = 'Choose exactly one correct answer.';
  }

  return {
    prompt,
    explanation,
    imageUrl,
    points: DEFAULT_POINTS,
    choices,
  };
}

function normalizeChoices(
  rawChoices: unknown[],
  fieldErrors: Record<string, string>,
): CreateQuestionChoiceInput[] {
  const publicUrl = process.env.R2_PUBLIC_URL ?? '';
  return rawChoices.map((rawChoice, index) => {
    const choice =
      rawChoice && typeof rawChoice === 'object' ? (rawChoice as RawChoice) : {};

    let imageUrl: string | null = null;
    try {
      imageUrl = normalizeStoredImageUrl(choice.imageUrl, publicUrl);
    } catch {
      fieldErrors.choices = 'Re-upload one of the choice images.';
    }

    return {
      label: typeof choice.label === 'string' ? choice.label.trim() : '',
      isCorrect: choice.isCorrect === true || choice.isCorrect === 'true',
      imageUrl,
      position: index + 1,
    };
  });
}

function normalizeImageUrlOrFail(
  value: unknown,
  fieldErrors: Record<string, string>,
  fieldKey: string,
): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL ?? '';
  try {
    return normalizeStoredImageUrl(value, publicUrl);
  } catch {
    fieldErrors[fieldKey] = 'Re-upload the image.';
    return null;
  }
}

function parseGmtDateTime(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(trimmed)
    ? trimmed
    : `${trimmed}:00.000Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
