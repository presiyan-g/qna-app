'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { markNotificationsSeenAction } from '@/app/actions/notifications';
import type { QuestionNotification } from '@/services/notifications';
import { formatRelativeTime } from './formatRelativeTime';

export function NotificationsBellMenu({
  items,
  unreadCount,
}: {
  items: QuestionNotification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unreadCount);
  // Track the last server-provided count so we can reset local optimistic
  // state when it changes (e.g. after navigation). Render-time reset is the
  // React 19 idiom; doing this in useEffect triggers an extra render.
  const [prevServerUnread, setPrevServerUnread] = useState(unreadCount);
  const containerRef = useRef<HTMLDivElement>(null);

  if (unreadCount !== prevServerUnread) {
    setPrevServerUnread(unreadCount);
    setLocalUnread(unreadCount);
  }

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

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    // Only stamp when there's something to clear. Once localUnread is 0,
    // re-opens are no-ops until the next navigation refreshes server data.
    if (next && localUnread > 0) {
      setLocalUnread(0);
      // Fire-and-forget: the user's intent ("mark seen") completed visually
      // the moment the badge cleared; the server stamp is best-effort.
      void markNotificationsSeenAction();
    }
  }

  const badgeLabel = localUnread > 9 ? '9+' : String(localUnread);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          localUnread > 0
            ? `Notifications, ${localUnread} unread`
            : 'Notifications'
        }
        onClick={toggleOpen}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-paper text-ink transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
      >
        <Bell size={18} strokeWidth={1.8} aria-hidden />
        {localUnread > 0 ? (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-paper"
          >
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="fixed inset-x-4 top-[72px] z-20 overflow-hidden rounded-xl border border-line bg-paper shadow-[0_18px_40px_-22px_rgba(31,64,50,0.28)] md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-[360px]"
        >
          <header className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <p className="text-xs text-muted">
              Updates from communities you’ve joined.
            </p>
          </header>

          {items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted">No notifications yet.</p>
              <Link
                href="/communities"
                onClick={() => setOpen(false)}
                className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
              >
                Discover communities →
              </Link>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {items.map((item) => (
                <NotificationRow
                  key={item.questionId}
                  item={item}
                  onClick={() => setOpen(false)}
                />
              ))}
            </ul>
          )}

          <footer className="border-t border-line px-4 py-2.5 text-center">
            <Link
              href="/my-communities"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Manage your communities
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  item,
  onClick,
}: {
  item: QuestionNotification;
  onClick: () => void;
}) {
  const isMuted = item.hasAnswered || item.isClosed;
  return (
    <li>
      <Link
        href={`/communities/${item.communitySlug}/questions/${item.questionId}`}
        onClick={onClick}
        className={`flex items-start gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-primary-soft ${
          item.isUnread ? 'bg-primary-soft/40' : ''
        }`}
      >
        <span className="text-lg leading-none" aria-hidden>
          {item.communityEmoji || '•'}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[13px] font-semibold ${
              isMuted ? 'text-muted' : 'text-ink'
            }`}
          >
            {item.communityName}
          </p>
          <p
            className={`line-clamp-2 text-[13px] ${
              isMuted ? 'text-muted' : 'text-ink'
            }`}
          >
            {item.prompt}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
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
  );
}

