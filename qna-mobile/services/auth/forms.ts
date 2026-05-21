export type AuthFieldErrors = Partial<Record<'email' | 'password' | 'username', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function validateLoginForm(input: { email: string; password: string }) {
  const errors: AuthFieldErrors = {};

  if (!EMAIL_PATTERN.test(input.email.trim().toLowerCase())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!input.password) {
    errors.password = 'Enter your password.';
  }

  return errors;
}

export function validateRegisterForm(input: { email: string; username: string; password: string }) {
  const errors: AuthFieldErrors = {};
  const username = input.username.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(input.email.trim().toLowerCase())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!USERNAME_PATTERN.test(username)) {
    errors.username = 'Use 3-24 lowercase letters, numbers, or underscores.';
  }

  if (input.password.length < 8 || input.password.length > 128) {
    errors.password = 'Use 8-128 characters.';
  }

  return errors;
}

export function hasFieldErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).some(Boolean);
}
