import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'qna_session';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) return NextResponse.next();
  return NextResponse.redirect(buildLoginRedirectUrl(request.nextUrl));
}

export function buildLoginRedirectUrl(url: URL): URL {
  const loginUrl = new URL('/login', url.origin);
  loginUrl.searchParams.set('next', `${url.pathname}${url.search}`);
  return loginUrl;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
};
