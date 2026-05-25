// Returns the page numbers to render in a pagination control, with 'ellipsis'
// gaps inserted between non-contiguous ranges.
//
// Strategy: always show first and last; show current +/- 1; insert 'ellipsis'
// when there's a gap. For small total page counts (<= 7), show every page.
//
// Examples:
//   getPageWindow(1, 1)   => [1]
//   getPageWindow(1, 5)   => [1, 2, 3, 4, 5]
//   getPageWindow(1, 10)  => [1, 2, 'ellipsis', 10]
//   getPageWindow(5, 10)  => [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
//   getPageWindow(10, 10) => [1, 'ellipsis', 9, 10]

export type PageWindowEntry = number | 'ellipsis';

export function getPageWindow(
  currentPage: number,
  totalPages: number,
): PageWindowEntry[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const result: PageWindowEntry[] = [];
  const window = new Set<number>();
  window.add(1);
  window.add(totalPages);
  for (const p of [currentPage - 1, currentPage, currentPage + 1]) {
    if (p >= 1 && p <= totalPages) window.add(p);
  }

  const sorted = Array.from(window).sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }
  return result;
}

export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}
