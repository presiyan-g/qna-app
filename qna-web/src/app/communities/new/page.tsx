import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { getSession } from '@/services/auth';
import { CreateCommunityForm } from '../_components/CreateCommunityForm';

export const metadata = {
  title: 'Create community - Quorum',
};

export default async function NewCommunityPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto grid max-w-[980px] gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <Link
              href="/communities"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Back to communities
            </Link>
            <p className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Creator setup
            </p>
            <h1 className="text-[34px] font-bold leading-tight md:text-[44px]">
              Start a community around one sharp question at a time.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted">
              You will become the creator of this community automatically. You
              can add scheduled questions after the community home is in place.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-card p-6">
            <CreateCommunityForm />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
