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
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-primary hover:text-primary"
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
        <div className="absolute inset-x-0 top-full z-10 border-b border-line bg-paper shadow-sm">
          <nav className="flex flex-col">
            {/* Primary navigation */}
            <ul className="flex flex-col py-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="block px-6 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-primary-soft hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            {username ? (
              <>
                {/* Identity card */}
                <Link
                  href={`/users/${username}`}
                  onClick={close}
                  className="flex items-center gap-3 border-t border-line px-6 py-4 transition-colors hover:bg-primary-soft"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink">
                      @{username}
                    </p>
                    <p className="text-[12px] font-medium text-muted">
                      View profile
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="text-muted"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>

                {/* Account actions */}
                <ul className="flex flex-col border-t border-line py-2">
                  <li>
                    <Link
                      href="/dashboard"
                      onClick={close}
                      className="block px-6 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      Creator dashboard
                    </Link>
                  </li>
                  <li>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        onClick={close}
                        className="block w-full cursor-pointer px-6 py-3 text-left text-[14px] font-semibold text-red-700 transition-colors hover:bg-red-50"
                      >
                        Log out
                      </button>
                    </form>
                  </li>
                </ul>

                {/* Primary CTA */}
                <div className="border-t border-line p-4">
                  <Link
                    href="/communities/new"
                    onClick={close}
                    className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper transition hover:brightness-110"
                  >
                    + Create community
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 border-t border-line p-4">
                <Link
                  href="/login"
                  onClick={close}
                  className="rounded-full border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-paper transition hover:brightness-110"
                >
                  Join free
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
