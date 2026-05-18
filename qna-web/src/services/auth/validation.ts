import { AuthValidationError } from './errors';

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function validateRegisterInput(raw: {
  email: unknown;
  username: unknown;
  password: unknown;
}): RegisterInput {
  const fieldErrors: Record<string, string> = {};

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const username = typeof raw.username === 'string' ? raw.username.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';

  if (!email) fieldErrors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.';

  if (!username) fieldErrors.username = 'Username is required.';
  else if (!USERNAME_RE.test(username))
    fieldErrors.username = '3–24 characters, lowercase letters, numbers, and underscores only.';

  if (!password) fieldErrors.password = 'Password is required.';
  else if (password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
  else if (password.length > 128) fieldErrors.password = 'Password is too long.';

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthValidationError(fieldErrors);
  }
  return { email, username, password };
}

export function validateLoginInput(raw: {
  email: unknown;
  password: unknown;
}): LoginInput {
  const fieldErrors: Record<string, string> = {};

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';

  if (!email) fieldErrors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.';

  if (!password) fieldErrors.password = 'Password is required.';

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthValidationError(fieldErrors);
  }
  return { email, password };
}
