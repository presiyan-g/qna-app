'use client';

import Link from 'next/link';
import { ChevronRight, Menu, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { logoutAction } from '@/app/actions/auth';
import { markNotificationsSeenAction } from '@/app/actions/notifications';
import type {
  ListQuestionNotificationsResult,
  QuestionNotification,
} from '@/services/notifications';
import { formatRelativeTime } from './formatRelativeTime';

type NavLink = { href: string; label: string };

export function MobileMenu({
  links,
  username,
  notifications,
}: {
  links: NavLink[];
  username: string | null;
  notifications: ListQuestionNotificationsResult;
}) {
  const [open, setOpen] = useState(false);
  const seenStampedRef = useRef(false);
  const close = () => setOpen(false);

  const isSignedIn = username !== null;
  const hasUnread = isSignedIn && notifications.unreadCount > 0;

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && isSignedIn && hasUnread && !seenStampedRef.current) {
      seenStampedRef.current = true;
      void markNotificationsSeenAction();
    }
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
        {hasUnread && !open ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary"
            aria-hidden
          />
        ) : null}
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
                {/* Notifications */}
                <MobileNotifications
                  items={notifications.items}
                  onItemClick={close}
                />

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

function MobileNotifications({
  items,
  onItemClick,
}: {
  items: QuestionNotification[];
  onItemClick: () => void;
}) {
  return (
    <section className="border-t border-line">
      <header className="px-6 pb-1 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Notifications
        </p>
      </header>
      {items.length === 0 ? (
        <p className="px-6 pb-3 text-[13px] text-muted">
          No notifications yet.
        </p>
      ) : (
        <ul className="flex flex-col pb-2">
          {items.slice(0, 6).map((item) => (
            <li key={item.questionId}>
              <Link
                href={`/communities/${item.communitySlug}/questions/${item.questionId}`}
                onClick={onItemClick}
                className={`flex items-start gap-3 px-6 py-2.5 transition-colors hover:bg-primary-soft ${
                  item.isUnread ? 'bg-primary-soft/40' : ''
                }`}
              >
                <span className="text-base leading-none" aria-hidden>
                  {item.communityEmoji || '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[13px] font-semibold ${
                      item.hasAnswered || item.isClosed
                        ? 'text-muted'
                        : 'text-ink'
                    }`}
                  >
                    {item.communityName}
                  </p>
                  <p
                    className={`line-clamp-2 text-[13px] ${
                      item.hasAnswered || item.isClosed
                        ? 'text-muted'
                        : 'text-ink'
                    }`}
                  >
                    {item.prompt}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                    <span>{formatRelativeTime(item.publishedAt)}</span>
                    {item.hasAnswered ? (
                      <span className="font-semibold">· Answered</span>
                    ) : item.isClosed ? (
                      <span className="font-semibold">· Closed</span>
                    ) : null}
                  </div>
                </div>
                {item.isUnread ? (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
