import { NextResponse, type NextRequest } from 'next/server';
import { corsOptionsResponse, withCors } from '../../_utils/cors';
import {
  AuthConflictError,
  AuthValidationError,
  createUser,
  signSessionToken,
  toUserResource,
  validateRegisterInput,
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
    const input = validateRegisterInput({
      email: raw.email,
      username: raw.username,
      password: raw.password,
    });
    const user = await createUser(input);
    const token = await signSessionToken({ sub: user.id, role: user.role });
    return withCors(
      NextResponse.json(
        { token, user: toUserResource(user) },
        { status: 201 },
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
    if (err instanceof AuthConflictError) {
      return withCors(
        NextResponse.json(
          { error: err.message, fieldErrors: { [err.field]: err.message } },
          { status: 409 },
        ),
        origin,
      );
    }
    throw err;
  }
}
