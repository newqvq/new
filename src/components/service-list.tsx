import Link from "next/link";

import { CategorySelect } from "@/components/category-select";
import type { HomeServiceGroup, HomeServiceItem } from "@/lib/home-products";

type ServiceListCopy = {
  categoryLabel: string;
  allCategories: string;
  table: {
    id: string;
    service: string;
    price: string;
    stock: string;
    averageTime: string;
    action: string;
  };
  viewDetails: string;
  noProducts: string;
  sectionSuffix: string;
  pagination: {
    previous: string;
    next: string;
    page: string;
    totalSuffix: string;
  };
};

export function ServiceList({
  groups,
  copy,
  activeGroupId,
  visibleItems,
}: {
  groups: HomeServiceGroup[];
  copy: ServiceListCopy;
  activeGroupId: string;
  visibleItems: HomeServiceItem[];
}) {
  if (groups.length === 0) {
    return (
      <section className="rounded-[24px] border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500 shadow-sm">
        {copy.noProducts}
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile: dropdown select */}
      <section className="lg:hidden">
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 shrink-0">
            {copy.categoryLabel}
          </div>
          <CategorySelect
            groups={groups}
            activeGroupId={activeGroupId}
            allLabel={copy.allCategories}
          />
        </div>
      </section>

      {/* Desktop: tag buttons */}
      <section className="hidden lg:flex lg:flex-col lg:gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
          {copy.categoryLabel}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition ${
              activeGroupId === "all"
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
            }`}
          >
            {copy.allCategories}
          </Link>
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/?category=${encodeURIComponent(group.id)}`}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition ${
                activeGroupId === group.id
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
              }`}
            >
              {group.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[56px_minmax(0,1fr)_126px_112px_138px_92px] items-center gap-3 bg-[#dbeafe] px-4 py-2.5 text-[11px] font-bold text-slate-700 lg:grid">
          <div>{copy.table.id}</div>
          <div>{copy.table.service}</div>
          <div>{copy.table.price}</div>
          <div>{copy.table.stock}</div>
          <div>{copy.table.averageTime}</div>
          <div>{copy.table.action}</div>
        </div>

        {visibleItems.map((item, index) => (
          <article
            key={item.id}
            className="border-b border-slate-200 last:border-b-0"
          >
            <div className="hidden grid-cols-[56px_minmax(0,1fr)_126px_112px_138px_92px] items-center gap-3 px-4 py-3 lg:grid">
              <div className="text-[13px] font-semibold text-slate-500">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {item.category}
                </div>
                <div className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                  {item.name}
                </div>
                <div className="mt-0.5 text-[12px] leading-5 text-slate-600">{item.subtitle}</div>
              </div>

              <div>
                <div className="text-[13px] font-semibold text-slate-700">{item.priceLabel}</div>
              </div>

              <div className="text-[13px] font-semibold text-slate-700">{item.stock}</div>

              <div className="text-[12px] font-semibold text-slate-700">
                {item.averageTime}
              </div>

              <div>
                <Link
                  href={`/products/${item.slug}`}
                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-sky-500"
                >
                  {copy.viewDetails}
                </Link>
              </div>
            </div>

            <div className="space-y-2 border-l-2 border-slate-100 px-4 py-3 lg:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{item.category}</span>
                  </div>
                  <div className="mt-1 text-[15px] font-semibold leading-5 text-slate-950">
                    {item.name}
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-slate-600">
                    {item.subtitle}
                  </div>
                </div>

                <Link
                  href={`/products/${item.slug}`}
                  className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-sky-500"
                >
                  {copy.viewDetails}
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">{item.priceLabel}</span>
                <span>
                  {copy.table.stock} {item.stock}
                </span>
                <span>{item.averageTime}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
