import Link from "next/link";
import { Product } from "@prisma/client";

import { formatUsdt } from "@/lib/money";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const tags = product.tags.split("|").filter(Boolean).slice(0, 4);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,23,42,0.14)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-lg font-black tracking-[0.14em] text-sky-700">
            {product.cover}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            {product.category}
          </div>
          <h3 className="mt-2 text-2xl font-black text-slate-950">{product.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{product.subtitle}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          人工交付
        </div>
      </div>

      <p className="mt-5 min-h-16 text-sm leading-7 text-slate-600">{product.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        {product.deliveryNote}
      </div>

      <div className="mt-auto flex items-end justify-between pt-6">
        <div>
          <div className="text-xs text-slate-400">平台余额下单</div>
          <div className="text-3xl font-black text-rose-500">
            {formatUsdt(product.priceMicros)}
          </div>
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-400"
        >
          查看详情
        </Link>
      </div>
    </article>
  );
}
