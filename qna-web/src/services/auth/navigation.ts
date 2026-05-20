export const AUTHENTICATED_HOME_PATH = '/communities';

const AUTH_ROUTE_PATHS = new Set(['/login', '/register']);

export function resolvePostAuthRedirectPath(nextPath: unknown): string {
  if (typeof nextPath !== 'string') return AUTHENTICATED_HOME_PATH;
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return AUTHENTICATED_HOME_PATH;
  }

  let pathname: string;
  try {
    pathname = new URL(nextPath, 'https://qna.local').pathname;
  } catch {
    return AUTHENTICATED_HOME_PATH;
  }

  if (AUTH_ROUTE_PATHS.has(pathname)) return AUTHENTICATED_HOME_PATH;
  return nextPath;
}
