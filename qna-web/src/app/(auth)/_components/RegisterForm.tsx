'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registerAction, type AuthFormState } from '@/app/actions/auth';

const INITIAL: AuthFormState = { ok: false };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </div>
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.fieldErrors?.email}
      />
      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        hint="3–24 lowercase letters, numbers, or underscores."
        error={state.fieldErrors?.username}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="mt-1 text-center text-[13px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-ink hover:underline">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  name: string;
  type: 'email' | 'password' | 'text';
  autoComplete?: string;
  error?: string;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error ? (
        <p id={`${id}-error`} className="text-[12px] text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
