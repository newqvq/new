import Link from "next/link";
import {
  ProductFulfillmentMode,
  ProductStatus,
  UpstreamProvider,
  UpstreamServiceType,
} from "@prisma/client";

import { AlertBanner } from "@/components/alert-banner";
import { PaginationNav } from "@/components/pagination-nav";
import { SubmitButton } from "@/components/submit-button";
import {
  upsertProductAction,
  upsertProductCategoryAction,
} from "@/lib/actions/admin";
import {
  getAdminProductCategoriesData,
  getAdminProductsData,
} from "@/lib/data";
import { getFulfillmentCopy } from "@/lib/fulfillment-copy";
import { getMarketingCopy, type Locale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { firstValue, getFlashMessage } from "@/lib/utils";

type AdminProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ADMIN_PRODUCTS_PER_PAGE = 8;
const DEFAULT_LISTING_MIN = 1;
const DEFAULT_LISTING_AVERAGE_TIME = "5-10分钟";

const productStatuses = [
  ProductStatus.ACTIVE,
  ProductStatus.DRAFT,
  ProductStatus.ARCHIVED,
] as const;

const pageCopy: Record<
  Locale,
  {
    listTitle: string;
    listHint: string;
    edit: string;
    createClosed: string;
    createOpened: string;
    rows: string;
    internalId: string;
    previous: string;
    next: string;
    page: string;
    allStatuses: string;
    categoryTitle: string;
    categoryHint: string;
    categoryName: string;
    categorySort: string;
    categoryCreate: string;
    categoryCreatePending: string;
    categoryEmpty: string;
    categoryManaged: string;
    categoryDerived: string;
    categoryPlaceholder: string;
    quickHint: string;
    advancedTitle: string;
    advancedHint: string;
    stockLabel: string;
  }
> = {
  zh: {
    listTitle: "商品列表",
    listHint: "后台统一用紧凑表格管理商品，需要编辑时再展开当前这一行。",
    edit: "编辑",
    createClosed: "展开新增",
    createOpened: "收起新增",
    rows: "条记录",
    internalId: "内部 ID",
    previous: "上一页",
    next: "下一页",
    page: "第",
    allStatuses: "全部状态",
    categoryTitle: "分类管理",
    categoryHint: "一个商品只归属一个分类。先新增分类，再在商品表单里下拉选择。",
    categoryName: "分类名称",
    categorySort: "分类排序",
    categoryCreate: "新增分类",
    categoryCreatePending: "保存中...",
    categoryEmpty: "当前还没有可选分类。",
    categoryManaged: "已托管",
    categoryDerived: "历史分类",
    categoryPlaceholder: "请选择分类",
    quickHint: "现在只填商品名、分类、价格、库存和时间也能创建，其他字段会自动补默认值。",
    advancedTitle: "高级配置（可选）",
    advancedHint: "副标题、标签、交付说明、上游参数这些都可以后面再补。",
    stockLabel: "库存 / 前台最大值",
  },
  en: {
    listTitle: "Product List",
    listHint: "Use one compact table for all products and expand a row only when you need to edit details.",
    edit: "Edit",
    createClosed: "Open create form",
    createOpened: "Collapse form",
    rows: "rows",
    internalId: "Internal ID",
    previous: "Previous",
    next: "Next",
    page: "Page",
    allStatuses: "All statuses",
    categoryTitle: "Category Management",
    categoryHint: "Each product belongs to one category. Add the category here, then select it from the product form.",
    categoryName: "Category name",
    categorySort: "Sort order",
    categoryCreate: "Add category",
    categoryCreatePending: "Saving...",
    categoryEmpty: "No categories yet.",
    categoryManaged: "Managed",
    categoryDerived: "Legacy",
    categoryPlaceholder: "Select a category",
    quickHint: "You can create a product with only title, category, price, stock, and time. The rest is auto-filled.",
    advancedTitle: "Advanced options",
    advancedHint: "Subtitle, tags, delivery note, and upstream settings can be filled later.",
    stockLabel: "Stock / Listing max",
  },
  ko: {
    listTitle: "상품 목록",
    listHint: "관리자는 한 개의 표에서 상품을 보고, 수정이 필요할 때만 해당 행을 펼쳐 편집합니다.",
    edit: "편집",
    createClosed: "신규 열기",
    createOpened: "신규 닫기",
    rows: "개",
    internalId: "내부 ID",
    previous: "이전",
    next: "다음",
    page: "페이지",
    allStatuses: "전체 상태",
    categoryTitle: "카테고리 관리",
    categoryHint: "상품은 하나의 카테고리에만 속합니다. 먼저 카테고리를 추가한 뒤 상품 폼에서 선택하세요.",
    categoryName: "카테고리명",
    categorySort: "정렬 순서",
    categoryCreate: "카테고리 추가",
    categoryCreatePending: "저장 중...",
    categoryEmpty: "선택 가능한 카테고리가 아직 없습니다.",
    categoryManaged: "관리됨",
    categoryDerived: "기존 분류",
    categoryPlaceholder: "카테고리 선택",
    quickHint: "상품명, 카테고리, 가격, 재고, 시간만 입력해도 등록되며 나머지는 기본값으로 채워집니다.",
    advancedTitle: "고급 설정 (선택)",
    advancedHint: "부제목, 태그, 전달 안내, 상위 연동 정보는 나중에 채워도 됩니다.",
    stockLabel: "재고 / 목록 최대값",
  },
};

function getStatusFromQuery(value?: string) {
  return productStatuses.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : "ALL";
}

function getPageFromQuery(value?: string) {
  const parsed = Number.parseInt(value || "1", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function formatListingNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function getShortProductId(value: string) {
  return value.slice(-6).toUpperCase();
}

function ProductEditor({
  locale,
  copy,
  fulfillmentCopy,
  productStatusLabel,
  categories,
  defaults,
  submitLabel,
  submitPending,
}: {
  locale: Locale;
  copy: ReturnType<typeof getMarketingCopy>;
  fulfillmentCopy: ReturnType<typeof getFulfillmentCopy>;
  productStatusLabel: Record<ProductStatus, string>;
  categories: Awaited<ReturnType<typeof getAdminProductCategoriesData>>;
  defaults?: Awaited<ReturnType<typeof getAdminProductsData>>[number];
  submitLabel: string;
  submitPending: string;
}) {
  const uiCopy = pageCopy[locale];
  const managedCategories = categories.filter((category) => category.managed);
  const fallbackCategory =
    defaults?.category &&
    !managedCategories.some((category) => category.name === defaults.category)
      ? defaults.category
      : null;
  const inputClassName =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
  const labelClassName =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

  return (
    <form action={upsertProductAction} className="space-y-4">
      {defaults ? <input type="hidden" name="productId" value={defaults.id} /> : null}

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className={labelClassName}>{copy.admin.products.fields.name}</label>
          <input
            name="name"
            required
            defaultValue={defaults?.name}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>{copy.admin.products.fields.slug}</label>
          <input
            name="slug"
            defaultValue={defaults?.slug}
            placeholder={copy.admin.products.fields.slugPlaceholder}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>{copy.admin.products.fields.category}</label>
          <select
            name="category"
            required
            defaultValue={defaults?.category ?? ""}
            className={inputClassName}
          >
            <option value="">{uiCopy.categoryPlaceholder}</option>
            {managedCategories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
            {fallbackCategory ? (
              <option value={fallbackCategory}>{fallbackCategory}</option>
            ) : null}
          </select>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div>
          <label className={labelClassName}>{copy.admin.products.fields.price}</label>
          <input
            name="price"
            required
            defaultValue={defaults ? formatUsdt(defaults.priceMicros) : ""}
            placeholder={copy.admin.products.fields.pricePlaceholder}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>{uiCopy.stockLabel}</label>
          <input
            name="listingMax"
            defaultValue={defaults?.listingMax ?? ""}
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>{fulfillmentCopy.admin.listingAverageTimeLabel}</label>
          <input
            name="listingAverageTime"
            defaultValue={defaults?.listingAverageTime ?? DEFAULT_LISTING_AVERAGE_TIME}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-[12px] leading-6 text-sky-700">
        {uiCopy.quickHint}
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-[13px] font-semibold text-slate-950">{uiCopy.advancedTitle}</div>
            <div className="mt-1 text-[11px] leading-6 text-slate-500">{uiCopy.advancedHint}</div>
          </div>
          {defaults ? (
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-500">
              {uiCopy.internalId}: {getShortProductId(defaults.id)}
            </div>
          ) : null}
        </summary>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <div>
              <label className={labelClassName}>{copy.admin.products.fields.cover}</label>
              <input
                name="cover"
                defaultValue={defaults?.cover}
                placeholder={copy.admin.products.fields.coverPlaceholder}
                className={inputClassName}
              />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClassName}>{copy.admin.products.fields.subtitle}</label>
              <input
                name="subtitle"
                defaultValue={defaults?.subtitle}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <div>
              <label className={labelClassName}>{fulfillmentCopy.admin.fulfillmentModeLabel}</label>
              <select
                name="fulfillmentMode"
                defaultValue={defaults?.fulfillmentMode ?? ProductFulfillmentMode.MANUAL}
                className={inputClassName}
              >
                {Object.values(ProductFulfillmentMode).map((value) => (
                  <option key={value} value={value}>
                    {fulfillmentCopy.modes[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>{copy.admin.products.fields.status}</label>
              <select
                name="status"
                defaultValue={defaults?.status ?? ProductStatus.ACTIVE}
                className={inputClassName}
              >
                {Object.values(ProductStatus).map((status) => (
                  <option key={status} value={status}>
                    {productStatusLabel[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>{copy.admin.products.fields.sortOrder}</label>
              <input
                name="sortOrder"
                required
                defaultValue={defaults?.sortOrder ?? "100"}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>{fulfillmentCopy.admin.listingMinLabel}</label>
              <input
                name="listingMin"
                defaultValue={defaults?.listingMin ?? DEFAULT_LISTING_MIN}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <label className={labelClassName}>{copy.admin.products.fields.tags}</label>
              <input
                name="tags"
                defaultValue={defaults?.tags}
                placeholder={copy.admin.products.fields.tagsPlaceholder}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>{copy.admin.products.fields.deliveryNote}</label>
              <input
                name="deliveryNote"
                defaultValue={defaults?.deliveryNote}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <label className={labelClassName}>{copy.admin.products.fields.summary}</label>
              <textarea
                name="summary"
                rows={3}
                defaultValue={defaults?.summary}
                className={`${inputClassName} min-h-28 resize-y`}
              />
            </div>
            <div>
              <label className={labelClassName}>{copy.admin.products.fields.description}</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={defaults?.description}
                className={`${inputClassName} min-h-28 resize-y`}
              />
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-slate-950">
                  {fulfillmentCopy.admin.sectionTitle}
                </div>
                <div className="mt-1 text-[11px] leading-6 text-slate-500">
                  {defaults?.fulfillmentMode === ProductFulfillmentMode.CRAZYSMM
                    ? fulfillmentCopy.admin.automatedHelp
                    : fulfillmentCopy.admin.sectionHint}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div>
                <label className={labelClassName}>{fulfillmentCopy.admin.providerLabel}</label>
                <select
                  name="upstreamProvider"
                  defaultValue={defaults?.upstreamProvider ?? UpstreamProvider.CRAZYSMM}
                  className={inputClassName}
                >
                  <option value={UpstreamProvider.CRAZYSMM}>{UpstreamProvider.CRAZYSMM}</option>
                </select>
              </div>
              <div>
                <label className={labelClassName}>{fulfillmentCopy.admin.serviceIdLabel}</label>
                <input
                  name="upstreamServiceId"
                  defaultValue={defaults?.upstreamServiceId ?? ""}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>{fulfillmentCopy.admin.serviceTypeLabel}</label>
                <select
                  name="upstreamServiceType"
                  defaultValue={defaults?.upstreamServiceType ?? ""}
                  className={inputClassName}
                >
                  <option value=""></option>
                  {Object.values(UpstreamServiceType).map((value) => (
                    <option key={value} value={value}>
                      {fulfillmentCopy.serviceTypes[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-5 text-[13px] text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="upstreamSupportsCancel"
                  defaultChecked={defaults?.upstreamSupportsCancel ?? false}
                />
                {fulfillmentCopy.admin.supportsCancelLabel}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="upstreamSupportsRefill"
                  defaultChecked={defaults?.upstreamSupportsRefill ?? false}
                />
                {fulfillmentCopy.admin.supportsRefillLabel}
              </label>
            </div>
          </div>
        </div>
      </details>

      <div className="flex justify-end">
        <SubmitButton pendingText={submitPending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;
  const flash = getFlashMessage(params);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const uiCopy = pageCopy[locale];
  const products = await getAdminProductsData();
  const categories = await getAdminProductCategoriesData();
  const activeFilter = getStatusFromQuery(firstValue(params.status));
  const productStatusLabel: Record<ProductStatus, string> = {
    ACTIVE: copy.admin.products.statuses.active,
    DRAFT: copy.admin.products.statuses.draft,
    ARCHIVED: copy.admin.products.statuses.archived,
  };

  const filteredProducts =
    activeFilter === "ALL"
      ? products
      : products.filter((product) => product.status === activeFilter);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ADMIN_PRODUCTS_PER_PAGE));
  const currentPage = Math.min(getPageFromQuery(firstValue(params.page)), totalPages);
  const rowOffset = (currentPage - 1) * ADMIN_PRODUCTS_PER_PAGE;
  const pagedProducts = filteredProducts.slice(
    rowOffset,
    rowOffset + ADMIN_PRODUCTS_PER_PAGE,
  );

  const filterLinks = [
    {
      href: "/admin/products",
      label: uiCopy.allStatuses,
      active: activeFilter === "ALL",
      count: products.length,
    },
    ...productStatuses.map((status) => ({
      href: `/admin/products?status=${status}`,
      label: productStatusLabel[status],
      active: activeFilter === status,
      count: products.filter((product) => product.status === status).length,
    })),
  ];

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}

      <section className="panel overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {copy.admin.products.title}
              </div>
              <h1 className="mt-2 text-[28px] font-black leading-tight text-slate-950">
                {uiCopy.listTitle}
              </h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500">
                {uiCopy.listHint}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {filterLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    item.active
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
                  }`}
                >
                  {item.label} ({item.count})
                </Link>
              ))}
            </div>
          </div>
        </div>

        <details className="group border-b border-slate-200 bg-slate-50/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {copy.admin.products.quickCreate}
              </div>
              <div className="mt-1 text-[22px] font-black leading-tight text-slate-950">
                {copy.admin.products.newProduct}
              </div>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition group-open:hidden">
              {uiCopy.createClosed}
            </div>
            <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 group-open:block">
              {uiCopy.createOpened}
            </div>
          </summary>

          <div className="border-t border-slate-200 bg-white px-5 py-5 sm:px-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <ProductEditor
                locale={locale}
                copy={copy}
                fulfillmentCopy={fulfillmentCopy}
                productStatusLabel={productStatusLabel}
                categories={categories}
                submitLabel={copy.admin.products.create}
                submitPending={copy.admin.products.createPending}
              />

              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[13px] font-semibold text-slate-950">{uiCopy.categoryTitle}</div>
                <div className="mt-1 text-[11px] leading-6 text-slate-500">{uiCopy.categoryHint}</div>

                <form action={upsertProductCategoryAction} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {uiCopy.categoryName}
                    </label>
                    <input
                      name="name"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {uiCopy.categorySort}
                    </label>
                    <input
                      name="sortOrder"
                      defaultValue="100"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <SubmitButton
                    pendingText={uiCopy.categoryCreatePending}
                    className="w-full justify-center"
                  >
                    {uiCopy.categoryCreate}
                  </SubmitButton>
                </form>

                <div className="mt-4 space-y-2">
                  {categories.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-[12px] text-slate-500">
                      {uiCopy.categoryEmpty}
                    </div>
                  ) : (
                    categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-slate-800">
                            {category.name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            {category.managed ? uiCopy.categoryManaged : uiCopy.categoryDerived}
                          </div>
                        </div>
                        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                          {category.productCount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </div>
        </details>

        <div className="hidden grid-cols-[76px_minmax(0,2.6fr)_112px_74px_74px_132px_minmax(0,1.15fr)_86px] gap-4 bg-[#dbeafe] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700 lg:grid">
          <div>{copy.home.table.id}</div>
          <div>{copy.home.table.service}</div>
          <div>{copy.home.table.price}</div>
          <div>{copy.home.table.minimum}</div>
          <div>{copy.home.table.maximum}</div>
          <div>{copy.home.table.averageTime}</div>
          <div>{copy.admin.products.fields.description}</div>
          <div>{copy.home.table.action}</div>
        </div>

        {pagedProducts.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500 sm:px-6">
            {copy.admin.products.noItems}
          </div>
        ) : (
          pagedProducts.map((product, index) => (
            <details
              key={product.id}
              className="group border-t border-slate-200 first:border-t-0"
            >
              <summary className="cursor-pointer list-none">
                <div className="hidden grid-cols-[76px_minmax(0,2.6fr)_112px_74px_74px_132px_minmax(0,1.15fr)_86px] items-center gap-4 px-5 py-3 lg:grid">
                  <div className="text-[12px] font-semibold text-slate-500">
                    {String(rowOffset + index + 1).padStart(2, "0")}
                    <div className="mt-1 text-[10px] font-medium text-slate-400">
                      {getShortProductId(product.id)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        {product.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          product.status === ProductStatus.ACTIVE
                            ? "bg-emerald-50 text-emerald-700"
                            : product.status === ProductStatus.DRAFT
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {productStatusLabel[product.status]}
                      </span>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                        {fulfillmentCopy.modes[product.fulfillmentMode]}
                      </span>
                    </div>
                    <div className="mt-1 text-[15px] font-bold leading-5 text-slate-950">
                      {product.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">
                      {product.subtitle}
                    </div>
                  </div>

                  <div className="text-[12px] font-semibold text-slate-800">
                    {formatUsdt(product.priceMicros)} USDT
                  </div>
                  <div className="text-[12px] font-semibold text-slate-700">
                    {formatListingNumber(product.listingMin ?? DEFAULT_LISTING_MIN)}
                  </div>
                  <div className="text-[12px] font-semibold text-slate-700">
                    {formatListingNumber(product.listingMax)}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700">
                    {product.listingAverageTime || DEFAULT_LISTING_AVERAGE_TIME}
                  </div>
                  <div className="line-clamp-2 text-[11px] leading-5 text-slate-600">
                    {product.summary}
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-semibold text-white transition group-hover:bg-sky-500">
                      {uiCopy.edit}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 px-5 py-4 lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        <span>{String(rowOffset + index + 1).padStart(2, "0")}</span>
                        <span>{product.category}</span>
                        <span>{getShortProductId(product.id)}</span>
                      </div>
                      <div className="mt-1 text-[17px] font-bold leading-6 text-slate-950">
                        {product.name}
                      </div>
                      <div className="mt-1 text-[13px] leading-6 text-slate-600">
                        {product.subtitle}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                      {uiCopy.edit}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-2 text-[12px] text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {formatUsdt(product.priceMicros)} USDT
                    </span>
                    <span>
                      {copy.home.table.minimum} {formatListingNumber(product.listingMin ?? DEFAULT_LISTING_MIN)}
                    </span>
                    <span>
                      {copy.home.table.maximum} {formatListingNumber(product.listingMax)}
                    </span>
                    <span>{product.listingAverageTime || DEFAULT_LISTING_AVERAGE_TIME}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        product.status === ProductStatus.ACTIVE
                          ? "bg-emerald-50 text-emerald-700"
                          : product.status === ProductStatus.DRAFT
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {productStatusLabel[product.status]}
                    </span>
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">
                      {fulfillmentCopy.modes[product.fulfillmentMode]}
                    </span>
                  </div>
                </div>
              </summary>

              <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6">
                <ProductEditor
                  locale={locale}
                  copy={copy}
                  fulfillmentCopy={fulfillmentCopy}
                  productStatusLabel={productStatusLabel}
                  categories={categories}
                  defaults={product}
                  submitLabel={copy.admin.products.save}
                  submitPending={copy.admin.products.savePending}
                />
              </div>
            </details>
          ))
        )}

        <PaginationNav
          pathname="/admin/products"
          searchParams={params}
          page={currentPage}
          pageCount={totalPages}
          labels={{
            previous: uiCopy.previous,
            next: uiCopy.next,
            page: uiCopy.page,
            total: `${filteredProducts.length} ${uiCopy.rows}`,
          }}
        />
      </section>
    </>
  );
}
