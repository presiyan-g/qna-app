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
    <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = tab.isActive(pathname, slug);
        return (
          <Link
            key={tab.key}
            href={tab.href(slug)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  active ? 'bg-primary text-paper' : 'bg-primary-soft text-primary'
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
