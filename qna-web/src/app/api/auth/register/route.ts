import { NextResponse, type NextRequest } from 'next/server';
import {
  AuthConflictError,
  AuthValidationError,
  createUser,
  signSessionToken,
  toUserResource,
  validateRegisterInput,
} from '@/services/auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
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
    return NextResponse.json(
      { token, user: toUserResource(user) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: 'Validation failed.', fieldErrors: err.fieldErrors },
        { status: 422 },
      );
    }
    if (err instanceof AuthConflictError) {
      return NextResponse.json(
        { error: err.message, fieldErrors: { [err.field]: err.message } },
        { status: 409 },
      );
    }
    throw err;
  }
}
