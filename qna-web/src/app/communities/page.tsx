import Link from 'next/link';
import { Search } from 'lucide-react';
import { EmptyState } from '@/app/_components/EmptyState';
import { Footer } from '@/app/_components/landing/Footer';
import { Nav } from '@/app/_components/landing/Nav';
import { Pagination } from '@/app/_components/Pagination';
import { parsePageParam } from '@/lib/pagination';
import { getSession } from '@/services/auth';
import {
  listCommunityCategories,
  searchCommunities,
} from '@/services/communities';
import { CommunityListCard } from './_components/CommunityListCard';

export const metadata = {
  title: 'Browse communities - Quorum',
};

const PAGE_SIZE = 24;

type CommunitiesPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    category?: string | string[];
    page?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

export default async function CommunitiesPage({
  searchParams,
}: CommunitiesPageProps) {
  const params = await searchParams;
  const query = firstParam(params?.q);
  const categorySlug = firstParam(params?.category);
  const page = parsePageParam(params?.page);
  const session = await getSession();
  const [categories, { items: communities, totalCount }] = await Promise.all([
    listCommunityCategories(),
    searchCommunities({
      q: query,
      categorySlug: categorySlug || null,
      userId: session?.sub ?? null,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);
  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug) ?? null
    : null;
  const hasFilter = Boolean(query || categorySlug);

  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <Nav />
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Communities
              </p>
              <h1 className="text-[34px] font-bold leading-tight md:text-[46px]">
                Find a recurring challenge worth showing up for.
              </h1>
            </div>
          </div>

          <form action="/communities" className="mb-6">
            <label htmlFor="community-search" className="sr-only">
              Search communities
            </label>
            <label htmlFor="community-category" className="sr-only">
              Filter by category
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Wrapper carries the q-search :focus-within rule so
                  the icon shifts to primary when the input takes
                  focus. The sr-only <label> above provides the
                  accessible name; this div is purely structural. */}
              <div className="q-search">
                <Search size={16} strokeWidth={2} aria-hidden className="q-search-icon" />
                <input
                  id="community-search"
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search by community name"
                  className="min-h-12 w-full rounded-lg border border-line bg-card pl-10 pr-4 text-sm text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-200 ease-out focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20"
                />
              </div>
              <select
                id="community-category"
                name="category"
                defaultValue={categorySlug}
                className="min-h-12 rounded-lg border border-line bg-card px-3 text-sm text-ink transition-[border-color,box-shadow] duration-200 ease-out hover:border-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 sm:w-56"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="q-btn q-btn-primary">
                Search
              </button>
              {hasFilter ? (
                <Link href="/communities" className="q-btn q-btn-ghost">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          {communities.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {communities.map((community) => (
                  <CommunityListCard
                    key={community.id}
                    community={community}
                    signedIn={Boolean(session)}
                  />
                ))}
              </div>
              <Pagination
                totalCount={totalCount}
                currentPage={page}
                pageSize={PAGE_SIZE}
                baseHref="/communities"
                queryParams={{
                  q: query,
                  category: categorySlug,
                }}
                itemLabel="communities"
              />
            </>
          ) : (
            <EmptyState
              title={hasFilter ? 'Nothing matched.' : 'No communities'}
              titleAccent={hasFilter ? 'Try a wider net.' : 'yet.'}
              description={
                hasFilter
                  ? activeCategory
                    ? `Nothing in ${activeCategory.name} matches that search. Try clearing filters.`
                    : 'Try another search or browse the full community list.'
                  : 'Be the first to start a recurring challenge community.'
              }
              action={
                hasFilter ? (
                  <Link href="/communities" className="q-btn q-btn-ghost q-btn-md">
                    Clear filters
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
