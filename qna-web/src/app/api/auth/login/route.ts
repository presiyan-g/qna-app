import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../_utils/cors';
import {
  AuthValidationError,
  findUserByEmail,
  signSessionToken,
  toUserResource,
  validateLoginInput,
  verifyPassword,
} from '@/services/auth';

export function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request.headers.get('origin'));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }),
      origin,
    );
  }

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  try {
    const input = validateLoginInput({
      email: raw.email,
      password: raw.password,
    });
    const user = await findUserByEmail(input.email);
    if (!user) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid email or password.' },
          { status: 401 },
        ),
        origin,
      );
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid email or password.' },
          { status: 401 },
        ),
        origin,
      );
    }
    const token = await signSessionToken({ sub: user.id, role: user.role });
    return withCors(
      NextResponse.json(
        { token, user: toUserResource(user) },
        { status: 200 },
      ),
      origin,
    );
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return withCors(
        NextResponse.json(
          { error: 'Validation failed.', fieldErrors: err.fieldErrors },
          { status: 422 },
        ),
        origin,
      );
    }
    throw err;
  }
}
