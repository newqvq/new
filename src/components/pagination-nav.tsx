import Link from "next/link";

import { firstValue } from "@/lib/utils";

type QueryValue = string | string[] | undefined;

type PaginationNavProps = {
  pathname: string;
  searchParams: Record<string, QueryValue>;
  page: number;
  pageCount: number;
  labels: {
    previous: string;
    next: string;
    page: string;
    total: string;
  };
};

function buildPageHref(
  pathname: string,
  searchParams: Record<string, QueryValue>,
  nextPage: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const normalized = firstValue(value);

    if (!normalized || key === "page") {
      continue;
    }

    params.set(key, normalized);
  }

  if (nextPage > 1) {
    params.set("page", String(nextPage));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function getVisiblePages(page: number, pageCount: number) {
  const maxVisible = 5;
  const half = Math.floor(maxVisible / 2);

  let start = Math.max(1, page - half);
  const end = Math.min(pageCount, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function PaginationNav({
  pathname,
  searchParams,
  page,
  pageCount,
  labels,
}: PaginationNavProps) {
  if (pageCount <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(page, pageCount);

  return (
    <nav className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="text-xs text-slate-500">
        {labels.page} {page} / {pageCount} · {labels.total}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildPageHref(pathname, searchParams, Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            page <= 1
              ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
          }`}
        >
          {labels.previous}
        </Link>

        {visiblePages.map((pageNumber) => (
          <Link
            key={pageNumber}
            href={buildPageHref(pathname, searchParams, pageNumber)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              pageNumber === page
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
            }`}
          >
            {pageNumber}
          </Link>
        ))}

        <Link
          href={buildPageHref(pathname, searchParams, Math.min(pageCount, page + 1))}
          aria-disabled={page >= pageCount}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            page >= pageCount
              ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </nav>
  );
}
