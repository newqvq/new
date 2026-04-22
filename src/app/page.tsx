import Link from "next/link";

import { AlertBanner } from "@/components/alert-banner";
import { ServiceList } from "@/components/service-list";
import { getHomepageData, getViewer } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { getListingMetaFromProduct } from "@/lib/order-fulfillment";
import { getLocalizedProduct } from "@/lib/product-content";
import { firstValue, getFlashMessage, slugify } from "@/lib/utils";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const HOME_PRODUCTS_PER_PAGE = 12;

const homePaginationCopy = {
  zh: {
    previous: "上一页",
    next: "下一页",
    page: "第",
    totalSuffix: "个商品",
  },
  en: {
    previous: "Previous",
    next: "Next",
    page: "Page",
    totalSuffix: "services",
  },
  ko: {
    previous: "이전",
    next: "다음",
    page: "페이지",
    totalSuffix: "개 상품",
  },
} as const;

const homeTableCopy = {
  zh: {
    id: "ID",
    service: "商品服务",
    price: "价格",
    stock: "库存",
    averageTime: "参考处理时间",
    action: "操作",
  },
  en: {
    id: "ID",
    service: "Service",
    price: "Price",
    stock: "Stock",
    averageTime: "Avg. Time",
    action: "Action",
  },
  ko: {
    id: "ID",
    service: "상품 서비스",
    price: "가격",
    stock: "재고",
    averageTime: "처리 시간",
    action: "작업",
  },
} as const;

function getPageFromQuery(value?: string) {
  const parsed = Number.parseInt(value || "1", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const flash = getFlashMessage(resolvedSearchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const viewer = await getViewer();
  const { products } = await getHomepageData();

  const localizedProducts = products.map((product) =>
    getLocalizedProduct(product, locale),
  );
  const categories = Array.from(
    new Set(localizedProducts.map((product) => product.category)),
  );
  const groups = categories.map((category) => ({
    id: slugify(category),
    label: category,
    items: localizedProducts
      .filter((product) => product.category === category)
      .map((product) => {
        const listingMeta = getListingMetaFromProduct(product, locale);

        return {
          id: product.id,
          slug: product.slug,
          cover: product.cover,
          category: product.category,
          name: product.name,
          subtitle: product.subtitle,
          summary: product.summary,
          deliveryNote: product.deliveryNote,
          priceLabel: `${formatUsdt(product.priceMicros)} USDT`,
          stock: listingMeta.maximum,
          averageTime: listingMeta.averageTime,
          tags: product.tags,
        };
      }),
  }));

  const requestedCategory = Array.isArray(resolvedSearchParams.category)
    ? resolvedSearchParams.category[0]
    : resolvedSearchParams.category;
  const validGroupIds = new Set(groups.map((group) => group.id));
  const activeGroupId =
    requestedCategory && validGroupIds.has(requestedCategory)
      ? requestedCategory
      : "all";
  const allVisibleItems =
    activeGroupId === "all"
      ? groups.flatMap((group) => group.items)
      : groups.find((group) => group.id === activeGroupId)?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(allVisibleItems.length / HOME_PRODUCTS_PER_PAGE));
  const currentPage = Math.min(
    getPageFromQuery(firstValue(resolvedSearchParams.page)),
    totalPages,
  );
  const pageOffset = (currentPage - 1) * HOME_PRODUCTS_PER_PAGE;
  const pagedItems = allVisibleItems.slice(
    pageOffset,
    pageOffset + HOME_PRODUCTS_PER_PAGE,
  );
  const homeCopy = {
    ...copy.home,
    table: homeTableCopy[locale],
    pagination: homePaginationCopy[locale],
  };

  return (
    <div id="top" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {flash ? <AlertBanner {...flash} className="mb-6" /> : null}

      <ServiceList
        groups={groups}
        copy={homeCopy}
        activeGroupId={activeGroupId}
        visibleItems={pagedItems}
        totalItems={allVisibleItems.length}
        rowOffset={pageOffset}
        page={currentPage}
        pageCount={totalPages}
        searchParams={resolvedSearchParams}
      />

      <section className="mb-8 rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
              {copy.home.eyebrow}
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">
              {copy.home.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {copy.home.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={viewer ? "/recharge" : "/sign-up"}
              className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
            >
              {viewer ? copy.home.accountAction : copy.home.authAction}
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="text-xl font-bold text-slate-950">
              {localizedProducts.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">{copy.home.stats.services}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="text-xl font-bold text-slate-950">{categories.length}</div>
            <div className="mt-1 text-xs text-slate-500">{copy.home.stats.categories}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="text-xl font-bold text-slate-950">{copy.home.paymentValue}</div>
            <div className="mt-1 text-xs text-slate-500">{copy.home.stats.payment}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="text-xl font-bold text-slate-950">
              {copy.home.fulfillmentValue}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {copy.home.stats.fulfillment}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
