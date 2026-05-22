export type CommunityRole = 'member' | 'creator';

export type CommunityCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  cadence: string;
  status: 'active' | 'archived';
  creatorUserId: string;
  category?: CommunityCategory | null;
  isFeatured?: boolean;
  featuredRank?: number | null;
  memberCount: number;
  liveQuestionCount?: number;
  currentUserRole: CommunityRole | null;
  createdAt: string;
  updatedAt: string;
};

export type ListCommunitiesResult = {
  items: Community[];
  pagination: {
    limit: number;
    offset: number;
  };
};

type CommunitiesClientOptions = {
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
};

export class CommunitiesApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CommunitiesApiError';
    this.status = status;
  }
}

export function createCommunitiesClient(options: CommunitiesClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    list({ limit = 24, offset = 0, token = null }: ListOptions = {}) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      return requestJson<ListCommunitiesResult>(
        fetchImpl,
        `${apiUrl}/communities?${params.toString()}`,
        {
          method: 'GET',
          headers: authHeaders(token),
        },
      );
    },
    get(slug: string, token?: string | null) {
      return requestJson<Community>(fetchImpl, `${apiUrl}/communities/${encodeURIComponent(slug)}`, {
        method: 'GET',
        headers: authHeaders(token),
      });
    },
    join(slug: string, token: string) {
      return requestJson<Community>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/join`,
        {
          method: 'POST',
          headers: authHeaders(token),
        },
      );
    },
    leave(slug: string, token: string) {
      return requestJson<Community>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/join`,
        {
          method: 'DELETE',
          headers: authHeaders(token),
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
    throw new CommunitiesApiError('Unable to reach Quorum API. Check your connection and API URL.', 0);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
    throw new CommunitiesApiError(
      typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.',
      response.status,
    );
  }

  return body as T;
}
