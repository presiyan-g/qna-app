import Link from 'next/link';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';

export function AdminShell({
  title,
  eyebrow = 'Admin',
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[34px] font-bold leading-tight md:text-[48px]">
            {title}
          </h1>
          <nav className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <Link
              className="rounded-lg border border-line bg-card px-3 py-2"
              href="/admin"
            >
              Overview
            </Link>
            <Link
              className="rounded-lg border border-line bg-card px-3 py-2"
              href="/admin/users"
            >
              Users
            </Link>
            <Link
              className="rounded-lg border border-line bg-card px-3 py-2"
              href="/admin/communities"
            >
              Communities
            </Link>
          </nav>
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
