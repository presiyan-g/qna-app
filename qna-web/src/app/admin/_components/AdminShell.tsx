import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { AdminTabs } from './AdminTabs';

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
          <AdminTabs />
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
