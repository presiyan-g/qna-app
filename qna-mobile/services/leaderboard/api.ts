export type LeaderboardWindow = '7d' | '30d' | 'all';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  points: number;
  lastScoringAnswerAt: string;
};

export type LeaderboardResult = {
  community: { id: string; slug: string; name: string };
  window: LeaderboardWindow;
  entries: LeaderboardEntry[];
  viewerEntry: LeaderboardEntry | null;
};

type LeaderboardClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type GetOptions = {
  window?: LeaderboardWindow;
  token?: string | null;
};

type ErrorBody = {
  error?: unknown;
};

export type LeaderboardApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'unknown';

export class LeaderboardApiError extends Error {
  status: number;
  code: LeaderboardApiErrorCode;

  constructor(message: string, status: number, code: LeaderboardApiErrorCode) {
    super(message);
    this.name = 'LeaderboardApiError';
    this.status = status;
    this.code = code;
  }
}

export function createLeaderboardClient(options: LeaderboardClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    get(slug: string, { window = '7d', token = null }: GetOptions = {}) {
      const params = new URLSearchParams({ window });
      return requestJson<LeaderboardResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/leaderboard?${params.toString()}`,
        { method: 'GET', headers: authHeaders(token) },
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

async function requestJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new LeaderboardApiError(
      'Unable to reach Quorum API. Check your connection and API URL.',
      0,
      'network',
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
    const message =
      typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.';
    throw new LeaderboardApiError(
      message,
      response.status,
      codeForStatus(response.status),
    );
  }

  return body as T;
}

function codeForStatus(status: number): LeaderboardApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return 'unknown';
}
