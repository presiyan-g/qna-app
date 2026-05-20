import { redirect } from 'next/navigation';
import { getSession, resolvePostAuthRedirectPath } from '@/services/auth';
import { AuthShell } from '../_components/AuthShell';
import { LoginForm } from '../_components/LoginForm';

export const metadata = {
  title: 'Sign in — Quorum',
};

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const nextPath = resolvePostAuthRedirectPath(rawNext);
  const session = await getSession();
  if (session) redirect(nextPath);

  return (
    <AuthShell eyebrow="Sign in" titlePlain="Welcome" titleAccent="back.">
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
