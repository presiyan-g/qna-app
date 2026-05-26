'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CommunityWithMembership } from '@/services/communities';

type Tab = {
  key: 'questions' | 'broadcasts' | 'leaderboard' | 'about' | 'edit';
  label: string;
  href: (slug: string) => string;
  count?: number;
  isActive: (pathname: string, slug: string) => boolean;
};

export function CommunityTabs({
  community,
  canManage = false,
}: {
  community: CommunityWithMembership;
  canManage?: boolean;
}) {
  const pathname = usePathname();
  const slug = community.slug;

  const tabs: Tab[] = [
    {
      key: 'questions',
      label: 'Questions',
      href: (s) => `/communities/${s}`,
      count: community.liveQuestionCount > 0 ? community.liveQuestionCount : undefined,
      isActive: (p, s) =>
        p === `/communities/${s}` ||
        p.startsWith(`/communities/${s}/questions`),
    },
    {
      key: 'broadcasts',
      label: 'Broadcasts',
      href: (s) => `/communities/${s}/broadcasts`,
      count:
        community.currentUserRole !== null && community.newBroadcastCount > 0
          ? community.newBroadcastCount
          : undefined,
      isActive: (p, s) => p.startsWith(`/communities/${s}/broadcasts`),
    },
    {
      key: 'leaderboard',
      label: 'Leaderboard',
      href: (s) => `/communities/${s}/leaderboard`,
      isActive: (p, s) => p.startsWith(`/communities/${s}/leaderboard`),
    },
    {
      key: 'about',
      label: 'About',
      href: (s) => `/communities/${s}/about`,
      isActive: (p, s) => p.startsWith(`/communities/${s}/about`),
    },
  ];

  if (canManage) {
    tabs.push({
      key: 'edit',
      label: 'Edit',
      href: (s) => `/communities/${s}/edit`,
      isActive: (p, s) => p.startsWith(`/communities/${s}/edit`),
    });
  }

  return (
    <nav className="mt-8">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1 sm:border-b sm:border-line">
      {tabs.map((tab) => {
        const active = tab.isActive(pathname, slug);
        // The Edit tab is moderator-only and not a content view —
        // tint it lake so it reads as an auxiliary action rather than
        // sitting in the row of primary content tabs.
        const isEditTab = tab.key === 'edit';
        const baseClass = active
          ? isEditTab
            ? 'border-action-lake bg-action-lake text-paper sm:border-b-2 sm:bg-transparent sm:text-action-lake'
            : 'border-primary bg-primary text-paper sm:border-b-2 sm:bg-transparent sm:text-primary'
          : isEditTab
            ? 'border-line bg-card text-action-lake hover:border-action-lake/40 hover:text-action-lake-hover sm:border-b-2 sm:border-transparent'
            : 'border-line bg-card text-muted hover:border-primary/40 hover:text-ink sm:border-b-2 sm:border-transparent';
        return (
          <Link
            key={tab.key}
            href={tab.href(slug)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors sm:min-h-0 sm:shrink-0 sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-4 sm:py-3 sm:text-left ${baseClass}`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                  active
                    ? 'bg-paper text-primary sm:bg-primary sm:text-paper'
                    : 'bg-primary-soft text-primary'
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
