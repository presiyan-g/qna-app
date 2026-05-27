'use client';

import Link from 'next/link';
import { ChevronRight, Menu, X } from 'lucide-react';
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

  const isSignedIn = username !== null;

  function handleToggle() {
    setOpen((value) => !value);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={handleToggle}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-primary hover:text-primary"
      >
        <span className="sr-only">Toggle menu</span>
        {open ? (
          <X size={18} strokeWidth={1.8} aria-hidden />
        ) : (
          <Menu size={18} strokeWidth={1.8} aria-hidden />
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

            {isSignedIn ? (
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
                  <ChevronRight
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden
                    className="text-muted"
                  />
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
                    className="q-btn q-btn-primary q-btn-md w-full"
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
                  className="q-btn q-btn-ghost q-btn-md w-full"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="q-btn q-btn-primary q-btn-md w-full"
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
