const ALLOWED_LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const ALLOWED_VERCEL_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

export function buildCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function withCors<T extends Response>(response: T, origin: string | null) {
  const headers = buildCorsHeaders(origin);

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export function corsOptionsResponse(origin: string | null) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

function isAllowedOrigin(origin: string) {
  return ALLOWED_LOCAL_ORIGIN.test(origin) || ALLOWED_VERCEL_ORIGIN.test(origin);
}
