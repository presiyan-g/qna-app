import { NextResponse, type NextRequest } from 'next/server';
import { findUserById, toUserResource } from '@/services/auth';
import { getApiSession } from '@/services/auth/api-session';

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  return NextResponse.json({ user: toUserResource(user) }, { status: 200 });
}
