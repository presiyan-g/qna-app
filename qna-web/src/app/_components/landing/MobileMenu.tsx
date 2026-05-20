'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logoutAction } from '@/app/actions/auth';

type NavLink = { href: string; label: string };

export function MobileMenu({
  links,
  username,
}: {
  links: NavLink[];
  username: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink"
      >
        <span className="sr-only">Toggle menu</span>
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-10 border-b border-line bg-paper px-6 py-4 shadow-sm">
          <ul className="flex flex-col gap-3 text-sm font-medium text-ink">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-1.5">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            {username ? (
              <>
                <span className="rounded-full bg-primary-soft px-4 py-2.5 text-center text-sm font-semibold text-primary">
                  @{username}
                </span>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink"
                >
                  Dashboard
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-full border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 text-center text-sm font-semibold text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper"
                >
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
