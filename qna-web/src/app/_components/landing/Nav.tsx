import Link from 'next/link';
import { findUserById, getSession } from '@/services/auth';
import { MobileMenu } from './MobileMenu';
import { UserMenu } from './UserMenu';

const NAV_LINKS = [
  { href: '#discover', label: 'Discover' },
  { href: '#for-creators', label: 'For creators' },
];

export async function Nav() {
  const session = await getSession();
  const user = session ? await findUserById(session.sub) : null;

  return (
    <header className="relative border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/"
          className="text-[19px] font-extrabold tracking-tight text-primary"
        >
          Quorum
        </Link>

        <nav className="hidden md:flex md:gap-7 text-sm font-medium text-muted">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2.5 text-sm">
          {user ? (
            <UserMenu username={user.username} />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2.5 font-semibold text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-primary px-4 py-2.5 font-semibold text-paper"
              >
                Join free
              </Link>
            </>
          )}
        </div>

        <MobileMenu links={NAV_LINKS} username={user?.username ?? null} />
      </div>
    </header>
  );
}
