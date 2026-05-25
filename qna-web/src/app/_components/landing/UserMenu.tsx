'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { logoutAction } from '@/app/actions/auth';
import type { ListQuestionNotificationsResult } from '@/services/notifications';
import { NotificationsBellMenu } from './NotificationsBellMenu';

export function UserMenu({
  username,
  notifications,
}: {
  username: string;
  notifications: ListQuestionNotificationsResult;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/dashboard"
        className="rounded-full border border-primary/25 bg-paper px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
      >
        Dashboard
      </Link>
      <NotificationsBellMenu
        items={notifications.items}
        unreadCount={notifications.unreadCount}
      />
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary hover:brightness-95"
        >
          @{username}
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-paper py-1 text-sm shadow-[0_18px_40px_-22px_rgba(31,64,50,0.28)]"
          >
            <Link
              role="menuitem"
              href={`/users/${username}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 font-medium text-ink hover:bg-primary-soft"
            >
              Profile
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-4 py-2 text-left font-medium text-ink hover:bg-primary-soft"
              >
                Log out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
