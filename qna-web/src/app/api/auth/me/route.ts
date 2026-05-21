import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../_utils/cors';
import { findUserById, toUserResource } from '@/services/auth';
import { getApiSession } from '@/services/auth/api-session';

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const session = await getApiSession(request);
  if (!session) {
    return withCors(
      NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
      origin,
    );
  }

  const user = await findUserById(session.sub);
  if (!user) {
    return withCors(
      NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
      origin,
    );
  }

  return withCors(
    NextResponse.json({ user: toUserResource(user) }, { status: 200 }),
    origin,
  );
}
