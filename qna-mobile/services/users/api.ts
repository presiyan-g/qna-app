export type PublicUserProfile = {
  user: {
    id: string;
    username: string;
    joinedAt: string;
  };
  stats: {
    totalPoints: number;
    communityCount: number;
  };
  communities: Array<{
    id: string;
    slug: string;
    name: string;
    role: 'member' | 'creator';
    joinedAt: string;
  }>;
};

type UsersClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type ErrorBody = {
  error?: unknown;
};

export class UsersApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UsersApiError';
    this.status = status;
  }
}

export function createUsersClient(options: UsersClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    getProfile(username: string) {
      return requestJson<PublicUserProfile>(
        fetchImpl,
        `${apiUrl}/users/${encodeURIComponent(username)}`,
        { method: 'GET' },
      );
    },
  };
}

function getConfiguredApiUrl(apiUrl?: string) {
  const configured = apiUrl ?? 'http://localhost:3000/api';

  return configured.replace(/\/+$/, '');
}

async function requestJson<T>(fetchImpl: typeof fetch, url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new UsersApiError('Unable to reach Quorum API. Check your connection and API URL.', 0);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
    throw new UsersApiError(
      typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.',
      response.status,
    );
  }

  return body as T;
}
