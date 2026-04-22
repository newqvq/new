import { ChevronDown } from "lucide-react";
import { redirect } from "next/navigation";

import { AlertBanner } from "@/components/alert-banner";
import { SubmitButton } from "@/components/submit-button";
import { OrderProgress, getOrderStatusMeta } from "@/components/order-progress";
import { syncOrderUpstreamAction } from "@/lib/actions/shop";
import { requireSession } from "@/lib/auth";
import { getOrdersPageData } from "@/lib/data";
import { getFulfillmentCopy } from "@/lib/fulfillment-copy";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { formatDate, getFlashMessage } from "@/lib/utils";

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await requireSession();

  if (session.role === "ADMIN") {
    redirect("/admin/orders");
  }

  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const data = await getOrdersPageData(session.userId);

  if (!data) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {flash ? <AlertBanner {...flash} className="mb-6" /> : null}

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-slate-500">{copy.orders.eyebrow}</div>
            <h1 className="mt-2 text-3xl font-black text-slate-950">{copy.orders.title}</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">{copy.orders.balanceLabel}</div>
            <div className="text-2xl font-black text-slate-950">
              {formatUsdt(data.wallet?.balanceMicros ?? 0n)} USDT
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          {copy.orders.description}
        </div>

        <div className="mt-6 space-y-4">
          {data.orders.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {copy.orders.noOrders}
            </div>
          ) : (
            data.orders.map((order, index) => {
              const statusMeta = getOrderStatusMeta(
                order.status,
                locale,
                order.deliveryType,
                order.upstreamSubmissionStatus,
              );

              return (
                <details
                  key={order.id}
                  className="group rounded-[28px] border border-slate-100 bg-slate-50 p-5"
                  open={index === 0}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-lg font-black text-slate-950">
                          {order.productSnapshotName}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {copy.orders.serialPrefix} {order.serialNo} · {formatDate(order.createdAt, locale)}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {copy.orders.expandHint}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 lg:justify-end">
                        <div className="text-right">
                          <div
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </div>
                          <div className="mt-2 text-sm text-slate-500">{statusMeta.summary}</div>
                          <div className="mt-2 text-2xl font-black text-rose-500">
                            {formatUsdt(order.productSnapshotPriceMicros)} USDT
                          </div>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition group-open:rotate-180">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                    <OrderProgress
                      status={order.status}
                      locale={locale}
                      deliveryType={order.deliveryType}
                      submissionStatus={order.upstreamSubmissionStatus}
                    />

                    {order.deliveryType === "CRAZYSMM" ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-600">
                          <div className="font-semibold text-slate-950">
                            {fulfillmentCopy.order.upstreamStatusLabel}
                          </div>
                          <div className="mt-1">
                            {order.upstreamStatus || fulfillmentCopy.order.upstreamNotSubmitted}
                          </div>
                          {order.upstreamLastSyncAt ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {fulfillmentCopy.order.lastSyncLabel}:{" "}
                              {formatDate(order.upstreamLastSyncAt, locale)}
                            </div>
                          ) : null}
                        </div>
                        <form action={syncOrderUpstreamAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="returnTo" value="/orders" />
                          <SubmitButton pendingText={fulfillmentCopy.order.syncPending}>
                            {fulfillmentCopy.order.syncAction}
                          </SubmitButton>
                        </form>
                      </div>
                    ) : null}

                    {order.userNote ? (
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                        {copy.orders.userNoteLabel}: {order.userNote}
                      </div>
                    ) : null}

                    {order.fulfillmentNote ? (
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {copy.orders.fulfillmentNoteLabel}: {order.fulfillmentNote}
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
