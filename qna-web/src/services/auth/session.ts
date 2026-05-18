import { cache } from 'react';
import { cookies } from 'next/headers';
import { signSessionToken, verifySessionToken, type SessionPayload } from './jwt';

const COOKIE_NAME = 'qna_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
});

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
