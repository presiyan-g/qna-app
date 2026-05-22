export type CommentAuthor = {
  id: string;
  username: string;
};

export type Comment = {
  id: string;
  questionId: string;
  parentCommentId: string | null;
  author: CommentAuthor | null;
  body: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
  replies: Comment[];
};

export type CommentListResult = {
  comments: Comment[];
};

export type CommentPostResult = {
  comment: Comment;
};

type CommentsClientOptions = {
  apiUrl?: string;
  fetch?: typeof fetch;
};

type PostInput = {
  body: string;
  parentCommentId?: string;
};

type ErrorBody = {
  error?: unknown;
  fieldErrors?: unknown;
};

export type CommentsApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'unknown';

export class CommentsApiError extends Error {
  status: number;
  code: CommentsApiErrorCode;
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code: CommentsApiErrorCode,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'CommentsApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function createCommentsClient(options: CommentsClientOptions = {}) {
  const apiUrl = getConfiguredApiUrl(options.apiUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    list(slug: string, questionId: string, token: string): Promise<CommentListResult> {
      return requestJson<CommentListResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(questionId)}/comments`,
        { method: 'GET', headers: authHeaders(token) },
      );
    },
    post(
      slug: string,
      questionId: string,
      input: PostInput,
      token: string,
    ): Promise<CommentPostResult> {
      const body: Record<string, unknown> = { body: input.body };
      if (input.parentCommentId) {
        body.parentCommentId = input.parentCommentId;
      }
      return requestJson<CommentPostResult>(
        fetchImpl,
        `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(questionId)}/comments`,
        {
          method: 'POST',
          headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
    },
    async delete(
      slug: string,
      questionId: string,
      commentId: string,
      token: string,
    ): Promise<void> {
      const url = `${apiUrl}/communities/${encodeURIComponent(slug)}/questions/${encodeURIComponent(questionId)}/comments/${encodeURIComponent(commentId)}`;
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'DELETE',
          headers: authHeaders(token),
        });
      } catch {
        throw new CommentsApiError(
          'Unable to reach Quorum API. Check your connection and API URL.',
          0,
          'network',
        );
      }
      if (response.status === 204) return;

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok) {
        throwApiError(body, response.status);
      }
    },
  };
}

function getConfiguredApiUrl(apiUrl?: string) {
  const configured = apiUrl ?? 'http://localhost:3000/api';
  return configured.replace(/\/+$/, '');
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
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
    throw new CommentsApiError(
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
    throwApiError(body, response.status);
  }

  return body as T;
}

function throwApiError(body: unknown, status: number): never {
  const errorBody = body && typeof body === 'object' ? (body as ErrorBody) : {};
  const message =
    typeof errorBody.error === 'string' ? errorBody.error : 'Something went wrong.';
  const fieldErrors = normalizeFieldErrors(errorBody.fieldErrors);
  throw new CommentsApiError(message, status, codeForStatus(status), fieldErrors);
}

function codeForStatus(status: number): CommentsApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return 'unknown';
}

function normalizeFieldErrors(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, value]) => [key, value]),
  );
}
