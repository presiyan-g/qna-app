import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { AuthShell } from '../_components/AuthShell';
import { RegisterForm } from '../_components/RegisterForm';

export const metadata = {
  title: 'Create your account — Quorum',
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect('/');

  return (
    <AuthShell
      eyebrow="Create your account"
      titlePlain="Join the"
      titleAccent="conversation."
    >
      <RegisterForm />
    </AuthShell>
  );
}
