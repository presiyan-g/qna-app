export type Broadcast = {
  id: string;
  communityId: string;
  author: { id: string; username: string };
  body: string;
  imageUrl: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
};

export type BroadcastListPagination = {
  limit: number;
  nextCursor: string | null;
};

export type BroadcastListResult = {
  items: Broadcast[];
  pagination: BroadcastListPagination;
};

type BroadcastsClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type ListOptions = {
  limit?: number;
  cursor?: string | null;
  token?: string | null;
};

type ErrorBody = {
  error?: unknown;
};

export type BroadcastsApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'unknown';

export class BroadcastsApiError extends Error {
  status: number;
  code: BroadcastsApiErrorCode;

  constructor(message: string, status: number, code: BroadcastsApiErrorCode) {
    super(message);
    this.name = 'BroadcastsApiError';
    this.status = status;
    this.code = code;
  }
}

export function createBroadcastsClient(options: BroadcastsClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    list(slug: string, { limit = 20, cursor = null, token = null }: ListOptions = {}) {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return requestJson<BroadcastListResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/broadcasts?${params.toString()}`,
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
    throw new BroadcastsApiError(
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
    const message = typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.';
    throw new BroadcastsApiError(message, response.status, codeForStatus(response.status));
  }

  return body as T;
}

function codeForStatus(status: number): BroadcastsApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return 'unknown';
}
