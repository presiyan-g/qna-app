'use server';

import { redirect } from 'next/navigation';
import {
  AuthConflictError,
  AuthValidationError,
  clearSessionCookie,
  createUser,
  findUserByEmail,
  setSessionCookie,
  validateLoginInput,
  validateRegisterInput,
  verifyPassword,
} from '@/services/auth';

export type AuthFormState = {
  ok: false;
  formError?: string;
  fieldErrors?: Partial<Record<'email' | 'username' | 'password', string>>;
};

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const input = validateRegisterInput({
      email: formData.get('email'),
      username: formData.get('username'),
      password: formData.get('password'),
    });
    const user = await createUser(input);
    await setSessionCookie({ sub: user.id, role: user.role });
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    if (err instanceof AuthConflictError) {
      return { ok: false, fieldErrors: { [err.field]: err.message } };
    }
    throw err;
  }
  redirect('/');
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const input = validateLoginInput({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    const user = await findUserByEmail(input.email);
    if (!user) {
      return { ok: false, formError: 'Invalid email or password.' };
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return { ok: false, formError: 'Invalid email or password.' };
    }
    await setSessionCookie({ sub: user.id, role: user.role });
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return { ok: false, fieldErrors: err.fieldErrors };
    }
    throw err;
  }
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/');
}
