'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
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
      <Link href="/dashboard" className="q-btn q-btn-ghost q-btn-sm">
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
          className="q-btn q-btn-soft q-btn-sm"
        >
          @{username}
          <ChevronDown
            size={12}
            strokeWidth={2}
            aria-hidden
            className={`transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
          />
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
              className="q-menuitem"
            >
              Profile
            </Link>
            <form action={logoutAction}>
              <button type="submit" role="menuitem" className="q-menuitem">
                Log out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
