import Link from "next/link";

import { OrderStatus } from "@prisma/client";

import { AlertBanner } from "@/components/alert-banner";
import { getAdminDashboardData } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { getRechargeStatusMeta } from "@/lib/site";
import { formatDate, getFlashMessage } from "@/lib/utils";
import { getWithdrawalStatusMeta } from "@/lib/withdrawal";
import { getWithdrawalCopy } from "@/lib/withdrawal-copy";

type AdminHomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminHomePage({
  searchParams,
}: AdminHomePageProps) {
  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const withdrawalCopy = getWithdrawalCopy(locale);
  const data = await getAdminDashboardData();

  const orderStatusLabel: Record<OrderStatus, string> = {
    PENDING: copy.admin.overview.orderStatuses.pending,
    PROCESSING: copy.admin.overview.orderStatuses.processing,
    FULFILLED: copy.admin.overview.orderStatuses.fulfilled,
    REFUNDED: copy.admin.overview.orderStatuses.refunded,
    CANCELLED: copy.admin.overview.orderStatuses.cancelled,
  };

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}

      <section className="panel p-6">
        <h1 className="text-3xl font-black text-slate-950">
          {copy.admin.overview.title}
        </h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.users}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.userCount}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.products}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.productCount}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.pendingRecharges}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.pendingRecharges}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.pendingOrders}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.pendingOrders}
            </div>
          </div>
          <div className="rounded-3xl bg-amber-50 p-5">
            <div className="text-sm text-amber-700">
              {withdrawalCopy.admin.statsPending}
            </div>
            <div className="mt-2 text-3xl font-black text-amber-700">
              {data.pendingWithdrawals}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.admin.overview.latestRecharges}
            </h2>
            <Link
              href="/admin/recharges"
              className="text-sm font-semibold text-slate-500"
            >
              {copy.admin.overview.reviewLink}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.latestRecharges.map((recharge) => (
              <div
                key={recharge.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div className="font-semibold text-slate-950">
                  {recharge.serialNo}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {recharge.user.displayName} /{" "}
                  {formatDate(recharge.createdAt, locale)}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {formatUsdt(recharge.amountMicros)} USDT /{" "}
                  {getRechargeStatusMeta(recharge.status, locale).label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.admin.overview.latestOrders}
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm font-semibold text-slate-500"
            >
              {copy.admin.overview.handleLink}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.latestOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div className="font-semibold text-slate-950">
                  {order.product.name}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {order.user.displayName} / {formatDate(order.createdAt, locale)}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {formatUsdt(order.productSnapshotPriceMicros)} USDT /{" "}
                  {orderStatusLabel[order.status]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950">
              {withdrawalCopy.admin.title}
            </h2>
            <Link
              href="/admin/withdrawals"
              className="text-sm font-semibold text-slate-500"
            >
              {copy.admin.overview.reviewLink}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.latestWithdrawals.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                {withdrawalCopy.admin.noRequests}
              </div>
            ) : (
              data.latestWithdrawals.map((withdrawal) => {
                const statusMeta = getWithdrawalStatusMeta(
                  withdrawal.status,
                  locale,
                );

                return (
                  <div
                    key={withdrawal.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="font-semibold text-slate-950">
                      {withdrawal.serialNo}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {withdrawal.user.displayName} /{" "}
                      {formatDate(withdrawal.createdAt, locale)}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-700">
                      {formatUsdt(withdrawal.amountMicros)} USDT /{" "}
                      {withdrawal.network}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}
