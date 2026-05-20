import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

export function UserMenu({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/dashboard"
        className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink hover:text-primary"
      >
        Dashboard
      </Link>
      <span className="rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary">
        @{username}
      </span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-ink hover:bg-primary-soft"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
