import { describeErrorChain } from './error-chain';

export function detectUniqueConflict(
  err: unknown,
): 'email' | 'username' | null {
  const msg = describeErrorChain(err);
  const isUnique = /unique/i.test(msg) || /duplicate key/i.test(msg);
  if (!isUnique) return null;
  if (/users_email_unique|key \(email\)/i.test(msg)) return 'email';
  if (/users_username_unique|key \(username\)/i.test(msg)) return 'username';
  return null;
}
