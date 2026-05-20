import Link from 'next/link';
import {
  AUTHENTICATED_HOME_PATH,
  findUserById,
  getSession,
} from '@/services/auth';
import { MobileMenu } from './MobileMenu';
import { UserMenu } from './UserMenu';

const LANDING_NAV_LINKS = [
  { href: '/communities', label: 'Discover' },
  { href: '/#for-creators', label: 'For creators' },
];

const APP_NAV_LINKS = [
  { href: '/communities', label: 'Communities' },
  { href: '/communities/new', label: 'Create' },
];

export async function Nav() {
  const session = await getSession();
  const user = session ? await findUserById(session.sub) : null;
  const links = user
    ? user.role === 'admin'
      ? [...APP_NAV_LINKS, { href: '/admin', label: 'Admin' }]
      : APP_NAV_LINKS
    : LANDING_NAV_LINKS;

  return (
    <header className="relative border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 md:px-12">
        <Link
          href={user ? AUTHENTICATED_HOME_PATH : '/'}
          className="text-[19px] font-extrabold tracking-tight text-primary"
        >
          Quorum
        </Link>

        <nav className="hidden md:flex md:gap-7 text-sm font-medium text-muted">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2.5 text-sm">
          {user ? (
            <>
              <Link
                href="/communities/new"
                className="rounded-full bg-primary px-4 py-2.5 font-semibold text-paper"
              >
                Create
              </Link>
              <UserMenu username={user.username} />
            </>
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

        <MobileMenu links={links} username={user?.username ?? null} />
      </div>
    </header>
  );
}
