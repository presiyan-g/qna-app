import type { User } from '@/db/schema/users';

export type UserResource = {
  id: string;
  email: string;
  username: string;
  role: User['role'];
  status: User['status'];
  createdAt: string;
};

export function toUserResource(user: User): UserResource {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
