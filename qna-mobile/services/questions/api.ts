import type { Community, CommunityRole } from '../communities/api';

export type QuestionChoice = {
  id: string;
  label: string;
  imageUrl: string | null;
  position: number;
  isCorrect: boolean | null;
};

export type QuestionResult = {
  id: string;
  questionId: string;
  selectedChoiceId: string;
  correctChoiceId: string;
  isCorrect: boolean;
  isLate: boolean;
  pointsAwarded: number;
  answeredAt: string;
  selectedChoice: QuestionChoice;
  correctChoice: QuestionChoice;
};

export type ViewerAnswerSummary = {
  selectedChoiceId: string;
  isCorrect: boolean;
};

export type QuestionSummary = {
  id: string;
  communityId: string;
  creatorUserId: string;
  prompt: string;
  explanation: string | null;
  imageUrl: string | null;
  scheduledFor: string;
  publishedAt: string | null;
  closesAt: string;
  timeZone: string;
  points: number;
  choiceCount: number;
  choices: QuestionChoice[];
  viewerAnswer: ViewerAnswerSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionDetail = {
  id: string;
  communityId: string;
  creatorUserId: string;
  prompt: string;
  explanation: string | null;
  imageUrl: string | null;
  scheduledFor: string;
  publishedAt: string | null;
  closesAt: string;
  timeZone: string;
  points: number;
  currentUserRole: CommunityRole;
  canAnswer: boolean;
  canSeeSolution: boolean;
  isClosed: boolean;
  isScheduled: boolean;
  choices: QuestionChoice[];
  result: QuestionResult | null;
  createdAt: string;
  updatedAt: string;
};

export type AnswerSubmissionResult = {
  questionId: string;
  canAnswer: boolean;
  isClosed: boolean;
  isScheduled: boolean;
  result: QuestionResult | null;
  explanation: string | null;
  choices: QuestionChoice[];
};

export type ListQuestionsResult = {
  items: QuestionSummary[];
  pagination: {
    limit: number;
    offset: number;
  };
};

export type LiveQuestionItem = {
  community: Community;
  question: QuestionSummary;
};

export type ListLiveQuestionsResult = {
  items: LiveQuestionItem[];
  pagination: {
    limit: number;
  };
};

type QuestionsClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type ListOptions = {
  limit?: number;
  offset?: number;
  token?: string | null;
};

type ErrorBody = {
  error?: unknown;
  fieldErrors?: unknown;
};

export class QuestionsApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'QuestionsApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function createQuestionsClient(options: QuestionsClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    list(slug: string, { limit = 20, offset = 0, token = null }: ListOptions = {}) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      return requestJson<ListQuestionsResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/questions?${params.toString()}`,
        { method: 'GET', headers: authHeaders(token) },
      );
    },
    listLive({ limit = 20, token = null }: Omit<ListOptions, 'offset'> = {}) {
      const params = new URLSearchParams({ limit: String(limit) });
      return requestJson<ListLiveQuestionsResult>(
        fetchImpl,
        `${apiUrl}/questions/live?${params.toString()}`,
        { method: 'GET', headers: authHeaders(token) },
      );
    },
    get(slug: string, id: string, token: string) {
      return requestJson<QuestionDetail>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(id)}`,
        { method: 'GET', headers: authHeaders(token) },
      );
    },
    submitAnswer(slug: string, id: string, choiceId: string, token: string) {
      return requestJson<AnswerSubmissionResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(id)}/answers`,
        {
          method: 'POST',
          headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ choiceId }),
        },
      );
    },
  };
}

function getConfiguredApiUrl(apiUrl?: string) {
  const configured = apiUrl ?? 'http://localhost:3000/api';
  return configured.replace(/\/+$/, '');
}

function authHeaders(token?: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson<T>(fetchImpl: typeof fetch, url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new QuestionsApiError('Unable to reach Quorum API. Check your connection and API URL.', 0);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
    throw new QuestionsApiError(
      typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.',
      response.status,
      normalizeFieldErrors(errorBody.fieldErrors),
    );
  }

  return body as T;
}

function normalizeFieldErrors(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};

  return Object.fromEntries(
    Object.entries(input)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, value]) => [key, value]),
  );
}
