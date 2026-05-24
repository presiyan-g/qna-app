'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const AUTO_DISMISS_MS = 10_000;

export function SavedBanner({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      router.replace(pathname, { scroll: false });
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
    >
      <span className="font-semibold">✓ {message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          router.replace(pathname, { scroll: false });
        }}
        className="text-xs font-semibold uppercase tracking-wider text-green-700 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
