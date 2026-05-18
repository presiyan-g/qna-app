import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, type User } from '@/db/schema/users';
import { hashPassword } from './passwords';
import { AuthConflictError } from './errors';
import type { RegisterInput } from './validation';

export async function createUser(input: RegisterInput): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  try {
    const [row] = await db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        passwordHash,
      })
      .returning();
    return row;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isUnique = /unique/i.test(msg) || /duplicate key/i.test(msg);
    if (isUnique && /email/i.test(msg)) {
      throw new AuthConflictError('email');
    }
    if (isUnique && /username/i.test(msg)) {
      throw new AuthConflictError('username');
    }
    throw err;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
}
