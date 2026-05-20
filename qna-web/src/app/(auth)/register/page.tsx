import { redirect } from 'next/navigation';
import { getSession, resolvePostAuthRedirectPath } from '@/services/auth';
import { AuthShell } from '../_components/AuthShell';
import { RegisterForm } from '../_components/RegisterForm';

export const metadata = {
  title: 'Create your account — Quorum',
};

type RegisterPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const nextPath = resolvePostAuthRedirectPath(rawNext);
  const session = await getSession();
  if (session) redirect(nextPath);

  return (
    <AuthShell
      eyebrow="Create your account"
      titlePlain="Join the"
      titleAccent="conversation."
    >
      <RegisterForm nextPath={nextPath} />
    </AuthShell>
  );
}
