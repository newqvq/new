import Link from "next/link";
import { notFound } from "next/navigation";

import { AlertBanner } from "@/components/alert-banner";
import { SubmitButton } from "@/components/submit-button";
import { placeOrderAction } from "@/lib/actions/shop";
import { getProductBySlug, getViewer } from "@/lib/data";
import { getFulfillmentCopy } from "@/lib/fulfillment-copy";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { getOrderFormConfig, isAutomatedProduct } from "@/lib/order-fulfillment";
import { getLocalizedProduct } from "@/lib/product-content";
import { getFlashMessage } from "@/lib/utils";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const rawProduct = await getProductBySlug(slug);
  const viewer = await getViewer();

  if (!rawProduct) {
    notFound();
  }

  const product = getLocalizedProduct(rawProduct, locale);
  const orderForm = getOrderFormConfig(rawProduct);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {flash ? <AlertBanner {...flash} className="mb-6" /> : null}

      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-950 hover:text-slate-950"
        >
          {copy.product.back}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel p-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-100 bg-sky-50 text-xl font-black tracking-[0.18em] text-sky-700">
            {product.cover}
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {product.category}
          </div>
          <h1 className="mt-3 text-4xl font-black text-slate-950">{product.name}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{product.subtitle}</p>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
            {product.description}
          </div>

          <div className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {copy.product.includedTags}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="panel p-8">
          <div className="text-sm text-slate-500">{copy.product.price}</div>
          <div className="mt-2 text-4xl font-black text-slate-950">
            {formatUsdt(product.priceMicros)} USDT
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
            <div className="font-semibold text-slate-950">{copy.product.deliveryLabel}</div>
            <div className="mt-2">{product.deliveryNote}</div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
            <div className="font-semibold text-slate-950">{copy.product.notes}</div>
            <div className="mt-2">{copy.product.note1}</div>
            <div className="mt-2">{copy.product.note2}</div>
            <div className="mt-2">
              {isAutomatedProduct(rawProduct)
                ? fulfillmentCopy.product.automatedHint
                : fulfillmentCopy.product.manualHint}
            </div>
          </div>

          {viewer ? (
            <form action={placeOrderAction} className="mt-6 space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              {orderForm.automated ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-950">
                    {fulfillmentCopy.product.serviceConfigTitle}
                  </div>
                  <div className="text-sm text-slate-500">
                    {fulfillmentCopy.product.serviceConfigHint}
                  </div>

                  {orderForm.needsLink ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        {fulfillmentCopy.product.targetLinkLabel}
                      </label>
                      <input
                        name="targetLink"
                        required
                        placeholder={fulfillmentCopy.product.targetLinkPlaceholder}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </div>
                  ) : null}

                  {orderForm.needsQuantity ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {fulfillmentCopy.product.quantityLabel}
                        </label>
                        <input
                          name="quantity"
                          required
                          inputMode="numeric"
                          placeholder={fulfillmentCopy.product.quantityPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </div>
                      {orderForm.supportsRuns ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            {fulfillmentCopy.product.runsLabel}
                          </label>
                          <input
                            name="runs"
                            inputMode="numeric"
                            placeholder={fulfillmentCopy.product.runsPlaceholder}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </div>
                      ) : null}
                      {orderForm.supportsInterval ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            {fulfillmentCopy.product.intervalLabel}
                          </label>
                          <input
                            name="intervalMinutes"
                            inputMode="numeric"
                            placeholder={fulfillmentCopy.product.intervalPlaceholder}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {orderForm.needsComments ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        {fulfillmentCopy.product.commentsLabel}
                      </label>
                      <textarea
                        name="commentsText"
                        required
                        rows={5}
                        placeholder={fulfillmentCopy.product.commentsPlaceholder}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </div>
                  ) : null}

                  {orderForm.needsUsername ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {fulfillmentCopy.product.usernameLabel}
                        </label>
                        <input
                          name="subscriptionUsername"
                          required
                          placeholder={fulfillmentCopy.product.usernamePlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {fulfillmentCopy.product.delayLabel}
                        </label>
                        <input
                          name="subscriptionDelayMinutes"
                          required
                          inputMode="numeric"
                          placeholder={fulfillmentCopy.product.delayPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </div>
                    </div>
                  ) : null}

                  {orderForm.needsSubscriptionRange ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {fulfillmentCopy.product.minLabel}
                        </label>
                        <input
                          name="subscriptionMin"
                          required
                          inputMode="numeric"
                          placeholder={fulfillmentCopy.product.minPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {fulfillmentCopy.product.maxLabel}
                        </label>
                        <input
                          name="subscriptionMax"
                          required
                          inputMode="numeric"
                          placeholder={fulfillmentCopy.product.maxPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </div>
                    </div>
                  ) : null}

                  {orderForm.supportsPosts || orderForm.supportsOldPosts || orderForm.supportsExpiry ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      {orderForm.supportsPosts ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            {fulfillmentCopy.product.postsLabel}
                          </label>
                          <input
                            name="subscriptionPosts"
                            inputMode="numeric"
                            placeholder={fulfillmentCopy.product.postsPlaceholder}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </div>
                      ) : null}
                      {orderForm.supportsOldPosts ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            {fulfillmentCopy.product.oldPostsLabel}
                          </label>
                          <input
                            name="subscriptionOldPosts"
                            inputMode="numeric"
                            placeholder={fulfillmentCopy.product.oldPostsPlaceholder}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </div>
                      ) : null}
                      {orderForm.supportsExpiry ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            {fulfillmentCopy.product.expiryLabel}
                          </label>
                          <input
                            type="datetime-local"
                            name="subscriptionExpiry"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {orderForm.automated
                    ? fulfillmentCopy.product.noteOptional
                    : copy.product.orderNoteLabel}
                </label>
                <textarea
                  name="note"
                  rows={orderForm.automated ? 3 : 5}
                  placeholder={copy.product.orderNotePlaceholder}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
              </div>
              <SubmitButton pendingText={copy.common.processing} className="w-full justify-center">
                {copy.product.submitOrder}
              </SubmitButton>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              {copy.product.signInHint}
              <Link href="/sign-in" className="ml-1 font-semibold text-slate-950">
                {copy.product.signInLink}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
