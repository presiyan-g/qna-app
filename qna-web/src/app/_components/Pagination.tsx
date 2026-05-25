import Link from 'next/link';
import { getPageWindow } from '@/lib/pagination';

export type PaginationProps = {
  // Total items across all pages (for the count line).
  totalCount: number;
  // Current 1-based page.
  currentPage: number;
  // Items per page.
  pageSize: number;
  // Path that the page link should use, e.g. "/communities".
  baseHref: string;
  // Existing query params to preserve on each link (e.g. {q: 'chess'}).
  // The component will add ?page=N on top of these.
  queryParams?: Record<string, string>;
  // Label for "items" in the count line. Default: "items".
  itemLabel?: string;
};

function buildHref(
  baseHref: string,
  page: number,
  queryParams: Record<string, string> | undefined,
): string {
  const params = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}

export function Pagination({
  totalCount,
  currentPage,
  pageSize,
  baseHref,
  queryParams,
  itemLabel = 'items',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const firstOnPage = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastOnPage = Math.min(safePage * pageSize, totalCount);

  const showNav = totalPages > 1;
  const window = showNav ? getPageWindow(safePage, totalPages) : [];

  const prevHref =
    safePage > 1 ? buildHref(baseHref, safePage - 1, queryParams) : null;
  const nextHref =
    safePage < totalPages
      ? buildHref(baseHref, safePage + 1, queryParams)
      : null;

  return (
    <nav
      className="mt-8 flex flex-col items-center gap-3 border-t border-line pt-6"
      aria-label="Pagination"
    >
      <p className="text-xs text-muted">
        {totalCount === 0 ? (
          <>No {itemLabel} found.</>
        ) : (
          <>
            Showing <span className="font-semibold text-ink">{firstOnPage}</span>
            –<span className="font-semibold text-ink">{lastOnPage}</span> of{' '}
            <span className="font-semibold text-ink">{totalCount}</span>{' '}
            {itemLabel}.
          </>
        )}
      </p>
      {showNav ? (
        <ul className="flex items-center gap-1">
          <li>
            {prevHref ? (
              <Link
                href={prevHref}
                className="inline-flex items-center justify-center rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper focus:outline-none focus:ring-2 focus:ring-primary"
                rel="prev"
              >
                Prev
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center justify-center rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted opacity-50"
              >
                Prev
              </span>
            )}
          </li>
          {window.map((entry, idx) =>
            entry === 'ellipsis' ? (
              <li key={`ellipsis-${idx}`} aria-hidden="true" className="px-1 text-xs text-muted">
                …
              </li>
            ) : entry === safePage ? (
              <li key={entry}>
                <span
                  aria-current="page"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-paper"
                >
                  {entry}
                </span>
              </li>
            ) : (
              <li key={entry}>
                <Link
                  href={buildHref(baseHref, entry, queryParams)}
                  className="inline-flex items-center justify-center rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {entry}
                </Link>
              </li>
            ),
          )}
          <li>
            {nextHref ? (
              <Link
                href={nextHref}
                className="inline-flex items-center justify-center rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper focus:outline-none focus:ring-2 focus:ring-primary"
                rel="next"
              >
                Next
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center justify-center rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted opacity-50"
              >
                Next
              </span>
            )}
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
