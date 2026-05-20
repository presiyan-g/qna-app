import { NextResponse, type NextRequest } from 'next/server';
import {
  AuthValidationError,
  findUserByEmail,
  signSessionToken,
  toUserResource,
  validateLoginInput,
  verifyPassword,
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
    const input = validateLoginInput({
      email: raw.email,
      password: raw.password,
    });
    const user = await findUserByEmail(input.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }
    const token = await signSessionToken({ sub: user.id, role: user.role });
    return NextResponse.json(
      { token, user: toUserResource(user) },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: 'Validation failed.', fieldErrors: err.fieldErrors },
        { status: 422 },
      );
    }
    throw err;
  }
}
