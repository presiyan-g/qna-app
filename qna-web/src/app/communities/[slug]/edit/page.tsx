import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import {
  getCommunityBySlug,
  listCommunityCategories,
} from '@/services/communities';
import { ArchiveCommunityButton } from '../../_components/ArchiveCommunityButton';
import { CommunityForm } from '../../_components/CommunityForm';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata = {
  title: 'Edit community - Quorum',
};

export default async function EditCommunityPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=/communities/${slug}/edit`);

  const community = await getCommunityBySlug(slug, session.sub);
  if (!community) notFound();
  const canManage =
    community.currentUserRole === 'creator' || session.role === 'admin';
  if (!canManage) {
    redirect(`/communities/${slug}`);
  }

  const categories = await listCommunityCategories();
  const categoryOptions = categories.map(({ id, name }) => ({ id, name }));

  return (
    <div className="grid max-w-[720px] gap-8">
      <div>
        <h2 className="text-2xl font-bold">Community settings</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Update the public details for{' '}
          <span className="font-semibold text-ink">{community.name}</span>. The
          URL ({community.slug}) stays the same.
        </p>
      </div>

      <section className="rounded-lg border border-line bg-card p-6">
        <CommunityForm
          mode="edit"
          slug={community.slug}
          categories={categoryOptions}
          initialValue={{
            name: community.name,
            description: community.description,
            emoji: community.emoji,
            coverImageUrl: community.coverImageUrl,
            categoryId: community.categoryId,
            cadence: community.cadence,
            communityId: community.id,
          }}
        />
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50/40 p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-700">
          Danger zone
        </p>
        <h3 className="mt-2 text-lg font-bold text-ink">Archive community</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Archiving hides the community from everyone — Discover, My
          communities, and direct links. Members, questions, broadcasts, and
          answers are preserved in storage.
        </p>
        <div className="mt-4">
          <ArchiveCommunityButton
            slug={community.slug}
            communityName={community.name}
          />
        </div>
      </section>
    </div>
  );
}
