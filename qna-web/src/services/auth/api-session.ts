import 'server-only';
import type { NextRequest } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from '@/services/auth';

export async function getApiSession(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = getBearerToken(request) ?? request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
