import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { AuthShell } from '../_components/AuthShell';
import { LoginForm } from '../_components/LoginForm';

export const metadata = {
  title: 'Sign in — Quorum',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/');

  return (
    <AuthShell eyebrow="Sign in" titlePlain="Welcome" titleAccent="back.">
      <LoginForm />
    </AuthShell>
  );
}
