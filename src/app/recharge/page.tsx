import Link from "next/link";
import { redirect } from "next/navigation";

import { AlertBanner } from "@/components/alert-banner";
import { CopyButton } from "@/components/copy-button";
import { RechargeComposer } from "@/components/recharge-composer";
import { SubmitButton } from "@/components/submit-button";
import {
  recheckRechargeVerificationAction,
  submitRechargeProofAction,
} from "@/lib/actions/shop";
import { requireSession } from "@/lib/auth";
import { getRechargePageData } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import {
  getRechargeExplorerLinks,
  getLocalizedRechargeNetworks,
  getRechargeNetworkMeta,
  getRechargeStatusMeta,
  getRechargeVerificationMeta,
  getRechargeVerificationSummary,
} from "@/lib/site";
import { formatDate, getFlashMessage } from "@/lib/utils";

type RechargePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RechargePage({ searchParams }: RechargePageProps) {
  const session = await requireSession();

  if (session.role === "ADMIN") {
    redirect("/admin/recharges");
  }

  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const data = await getRechargePageData(session.userId);

  if (!data) {
    return null;
  }

  const latestActiveRecharge = data.rechargeOrders.find(
    (order) => order.status === "AWAITING_PAYMENT" || order.status === "UNDER_REVIEW",
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {flash ? <AlertBanner {...flash} className="mb-6" /> : null}

      <RechargeComposer
        balanceLabel={`${formatUsdt(data.wallet?.balanceMicros ?? 0n)} USDT`}
        networks={getLocalizedRechargeNetworks(locale).map((network) => ({ ...network }))}
        copy={{
          ...copy.recharge,
          copyAddress: copy.common.copyAddress,
          copied: copy.common.copied,
          processing: copy.common.processing,
        }}
      />

      {latestActiveRecharge ? (
        <section className="panel mt-6 overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="border-b border-slate-200 bg-sky-50 p-6 lg:border-b-0 lg:border-r">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
                {copy.recharge.activeDeposit}
              </div>
              <h2 className="mt-3 text-3xl font-black text-slate-950">{latestActiveRecharge.serialNo}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {getRechargeStatusMeta(latestActiveRecharge.status, locale).label}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {getRechargeVerificationMeta(latestActiveRecharge.verificationStatus, locale).label}
                </span>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div>{copy.recharge.activeAmount}: {formatUsdt(latestActiveRecharge.amountMicros)} USDT</div>
                <div>{copy.recharge.activeNetwork}: {latestActiveRecharge.network}</div>
                <div>{copy.recharge.activeCreatedAt}: {formatDate(latestActiveRecharge.createdAt, locale)}</div>
                <div>
                  {copy.recharge.activeExpiresAt}:{" "}
                  {latestActiveRecharge.expiresAt
                    ? formatDate(latestActiveRecharge.expiresAt, locale)
                    : copy.recharge.activeNotSet}
                </div>
                <div>
                  {copy.recharge.activeVerification}:{" "}
                  {getRechargeVerificationSummary(latestActiveRecharge, locale)}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                <div>
                  <div className="text-sm font-semibold text-slate-500">{copy.recharge.receivingAddress}</div>
                  <div className="mt-2 break-all text-base font-black text-slate-950">
                    {latestActiveRecharge.walletAddress}
                  </div>
                </div>
                <CopyButton
                  text={latestActiveRecharge.walletAddress}
                  idleLabel={copy.common.copyAddress}
                  copiedLabel={copy.common.copied}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-500">{copy.recharge.transferAmount}</div>
                  <div className="mt-2 text-xl font-black text-slate-950">
                    {formatUsdt(latestActiveRecharge.amountMicros)} USDT
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-500">{copy.recharge.confirmations}</div>
                  <div className="mt-2 text-xl font-black text-slate-950">
                    {latestActiveRecharge.verificationConfirmations ?? 0} /{" "}
                    {getRechargeNetworkMeta(latestActiveRecharge.network).minConfirmations}
                  </div>
                </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-500">{copy.recharge.onchainStatus}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {getRechargeVerificationSummary(latestActiveRecharge, locale)}
                    </div>
                  </div>
              </div>

              <form
                action={submitRechargeProofAction}
                className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_auto]"
              >
                <input
                  type="hidden"
                  name="rechargeOrderId"
                  value={latestActiveRecharge.id}
                />
                <input
                  type="text"
                  name="txHash"
                  placeholder={copy.recharge.txHashPlaceholder}
                  defaultValue={latestActiveRecharge.txHash ?? ""}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <input
                  type="text"
                  name="proofNote"
                  placeholder={copy.recharge.proofNotePlaceholder}
                  defaultValue={latestActiveRecharge.proofNote ?? ""}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <SubmitButton pendingText={copy.recharge.submitPending} className="h-[50px]">
                  {copy.recharge.submitAndVerify}
                </SubmitButton>
              </form>

              <div className="mt-4 flex flex-wrap gap-3">
                <form action={recheckRechargeVerificationAction}>
                  <input
                    type="hidden"
                    name="rechargeOrderId"
                    value={latestActiveRecharge.id}
                  />
                  <input type="hidden" name="returnTo" value="/recharge" />
                  <SubmitButton
                    pendingText={copy.recharge.refetchPending}
                    className="border border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
                  >
                    {copy.recharge.refetchStatus}
                  </SubmitButton>
                </form>
                {latestActiveRecharge.txHash ? (
                  <Link
                    href={
                      getRechargeExplorerLinks(
                        latestActiveRecharge.network,
                        latestActiveRecharge.txHash,
                        latestActiveRecharge.walletAddress,
                      ).txUrl
                    }
                    target="_blank"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    {copy.recharge.openExplorer}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel mt-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{copy.recharge.listTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {copy.recharge.listDescription}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {data.rechargeOrders.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {copy.recharge.noRecharges}
            </div>
          ) : (
            data.rechargeOrders.map((order) => {
              const statusMeta = getRechargeStatusMeta(order.status, locale);
              const verificationMeta = getRechargeVerificationMeta(
                order.verificationStatus,
                locale,
              );
              const links = getRechargeExplorerLinks(
                order.network,
                order.txHash,
                order.walletAddress,
              );

              return (
                <div
                  key={order.id}
                  id={order.id}
                  className="rounded-[28px] border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-lg font-black text-slate-950">
                          {order.serialNo}
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${verificationMeta.className}`}
                        >
                          {verificationMeta.label}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-slate-500">
                        {order.network} · {formatUsdt(order.amountMicros)} USDT ·{" "}
                        {formatDate(order.createdAt, locale)}
                      </div>
                      <div className="mt-2 break-all text-xs text-slate-500">
                        {copy.recharge.addressLabel}: {order.walletAddress}
                      </div>
                      <div className="mt-2 break-all text-xs text-slate-500">
                        {copy.recharge.txHashLabel}: {order.txHash ?? copy.recharge.unsubmitted}
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600">
                      <div>{copy.recharge.confirmations}: {order.verificationConfirmations ?? 0}</div>
                      <div>
                        {copy.recharge.checkedAt}:{" "}
                        {order.verificationCheckedAt
                          ? formatDate(order.verificationCheckedAt, locale)
                          : copy.recharge.unchecked}
                      </div>
                      {links.txUrl ? (
                        <Link
                          href={links.txUrl}
                          target="_blank"
                          className="font-semibold text-slate-950"
                        >
                          {copy.recharge.viewOnchain}
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      {copy.recharge.verificationLabel}: {getRechargeVerificationSummary(order, locale)}
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      {copy.recharge.detectedAmount}:{" "}
                      {order.verificationDetectedAmountMicros !== null
                        ? `${formatUsdt(order.verificationDetectedAmountMicros)} USDT`
                        : copy.recharge.unrecognized}
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      {copy.recharge.detectedAddress}: {order.verificationDetectedToAddress || copy.recharge.unrecognized}
                    </div>
                  </div>

                  {order.status === "AWAITING_PAYMENT" || order.status === "UNDER_REVIEW" ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action={recheckRechargeVerificationAction}>
                        <input type="hidden" name="rechargeOrderId" value={order.id} />
                        <input type="hidden" name="returnTo" value="/recharge" />
                        <SubmitButton
                          pendingText={copy.recharge.refetchPending}
                          className="border border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
                        >
                          {copy.recharge.redetect}
                        </SubmitButton>
                      </form>
                      <CopyButton
                        text={order.walletAddress}
                        idleLabel={copy.common.copyAddress}
                        copiedLabel={copy.common.copied}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
