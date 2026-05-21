export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: 'member' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

type AuthClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type ErrorBody = {
  error?: unknown;
  fieldErrors?: unknown;
};

export class AuthApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function getConfiguredApiUrl(apiUrl?: string) {
  const configured = apiUrl ?? 'http://localhost:3000/api';

  return configured.replace(/\/+$/, '');
}

export function createAuthClient(options: AuthClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    login(input: LoginInput) {
      return requestAuthResult(fetchImpl, `${apiUrl}/auth/login`, {
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
    },
    register(input: RegisterInput) {
      return requestAuthResult(fetchImpl, `${apiUrl}/auth/register`, {
        email: input.email.trim().toLowerCase(),
        username: input.username.trim().toLowerCase(),
        password: input.password,
      });
    },
    async me(token: string) {
      const response = await requestJson<{ user: AuthUser }>(fetchImpl, `${apiUrl}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.user;
    },
  };
}

async function requestAuthResult(
  fetchImpl: typeof fetch,
  url: string,
  body: LoginInput | RegisterInput,
) {
  return requestJson<AuthResult>(fetchImpl, url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function requestJson<T>(fetchImpl: typeof fetch, url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new AuthApiError('Unable to reach Quorum API. Check your connection and API URL.', 0);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
    throw new AuthApiError(
      typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.',
      response.status,
      normalizeFieldErrors(errorBody.fieldErrors),
    );
  }

  return body as T;
}

function normalizeFieldErrors(input: unknown) {
  if (!input || typeof input !== 'object') return {};

  return Object.fromEntries(
    Object.entries(input)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, value]) => [key, value]),
  );
}
