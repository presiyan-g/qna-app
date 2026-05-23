import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { CommunityHeader } from './_components/CommunityHeader';
import { CommunityTabs } from './_components/CommunityTabs';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function CommunityLayout({ children, params }: LayoutProps) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const community = await getCommunityBySlug(slug, session?.sub ?? null);
  if (!community) notFound();

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-10 md:px-12 md:py-12">
        <div className="mx-auto max-w-[1000px]">
          <Link
            href="/communities"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Back to communities
          </Link>

          <div className="mt-4">
            <CommunityHeader community={community} signedIn={!!session} />
          </div>

          <CommunityTabs community={community} />

          <div className="mt-8">{children}</div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
