'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  key: 'overview' | 'users' | 'communities';
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    key: 'overview',
    label: 'Overview',
    href: '/admin',
    isActive: (p) => p === '/admin',
  },
  {
    key: 'users',
    label: 'Users',
    href: '/admin/users',
    isActive: (p) => p.startsWith('/admin/users'),
  },
  {
    key: 'communities',
    label: 'Communities',
    href: '/admin/communities',
    isActive: (p) => p.startsWith('/admin/communities'),
  },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        const active = tab.isActive(pathname);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
