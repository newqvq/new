import Link from "next/link";

import { AlertBanner } from "@/components/alert-banner";
import { PaginationNav } from "@/components/pagination-nav";
import { SubmitButton } from "@/components/submit-button";
import { reviewRechargeAction } from "@/lib/actions/admin";
import { recheckRechargeVerificationAction } from "@/lib/actions/shop";
import { getAdminRechargesPage } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { canRecheckRecharge, canReviewRecharge } from "@/lib/recharge-workflow";
import {
  getRechargeExplorerLinks,
  getRechargeStatusMeta,
  getRechargeVerificationSummary,
  getRechargeVerificationMeta,
} from "@/lib/site";
import { firstValue, formatDate, getFlashMessage } from "@/lib/utils";

type AdminRechargesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RECHARGES_PER_PAGE = 10;

function getPageFromQuery(value?: string) {
  const parsed = Number.parseInt(value || "1", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function AdminRechargesPage({
  searchParams,
}: AdminRechargesPageProps) {
  const resolvedSearchParams = await searchParams;
  const flash = getFlashMessage(resolvedSearchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const requestedPage = getPageFromQuery(firstValue(resolvedSearchParams.page));
  const {
    totalCount,
    currentPage,
    pageCount,
    pendingCount,
    verifiedCount,
    failedCount,
    items: recharges,
  } = await getAdminRechargesPage(
    requestedPage,
    RECHARGES_PER_PAGE,
  );

  const stats = {
    pending: pendingCount,
    verified: verifiedCount,
    failed: failedCount,
  };

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}

      <section className="panel p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950">
              {copy.admin.recharges.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              {copy.admin.recharges.description}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-sm text-slate-500">
                {copy.admin.recharges.stats.pending}
              </div>
              <div className="mt-2 text-2xl font-black text-slate-950">
                {stats.pending}
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-4">
              <div className="text-sm text-emerald-700">
                {copy.admin.recharges.stats.verified}
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-700">
                {stats.verified}
              </div>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-4">
              <div className="text-sm text-rose-700">
                {copy.admin.recharges.stats.failed}
              </div>
              <div className="mt-2 text-2xl font-black text-rose-700">
                {stats.failed}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {recharges.map((recharge) => {
          const statusMeta = getRechargeStatusMeta(recharge.status, locale);
          const verificationMeta = getRechargeVerificationMeta(
            recharge.verificationStatus,
            locale,
          );
          const canRecheck = canRecheckRecharge(recharge);
          const canReview = canReviewRecharge(recharge);
          const links = getRechargeExplorerLinks(
            recharge.network,
            recharge.txHash,
            recharge.walletAddress,
          );

          return (
            <div key={recharge.id} className="panel p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-2xl font-black text-slate-950">
                      {recharge.serialNo}
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
                    {recharge.user.displayName} / {recharge.user.email} /{" "}
                    {formatDate(recharge.createdAt, locale)}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {recharge.network} / {formatUsdt(recharge.amountMicros)} USDT
                  </div>
                  <div className="mt-2 break-all text-xs text-slate-500">
                    {copy.admin.recharges.address}: {recharge.walletAddress}
                  </div>
                  <div className="mt-2 break-all text-xs text-slate-500">
                    {copy.admin.recharges.txHash}:{" "}
                    {recharge.txHash ?? copy.admin.recharges.unsubmitted}
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-slate-600">
                  <div>
                    {copy.admin.recharges.reviewer}:{" "}
                    {recharge.reviewer?.displayName ??
                      copy.admin.recharges.pendingReviewer}
                  </div>
                  <div>
                    {copy.admin.recharges.confirmations}:{" "}
                    {recharge.verificationConfirmations ?? 0}
                  </div>
                  <div>
                    {copy.admin.recharges.lastCheck}:{" "}
                    {recharge.verificationCheckedAt
                      ? formatDate(recharge.verificationCheckedAt, locale)
                      : copy.admin.recharges.unchecked}
                  </div>
                  {links.txUrl ? (
                    <Link
                      href={links.txUrl}
                      target="_blank"
                      className="font-semibold text-slate-950"
                    >
                      {copy.admin.recharges.openExplorer}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  {copy.admin.recharges.verification}:{" "}
                  {getRechargeVerificationSummary(recharge, locale)}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  {copy.admin.recharges.detectedAmount}:{" "}
                  {recharge.verificationDetectedAmountMicros !== null
                    ? `${formatUsdt(recharge.verificationDetectedAmountMicros)} USDT`
                    : copy.admin.recharges.unrecognized}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  {copy.admin.recharges.detectedAddress}:{" "}
                  {recharge.verificationDetectedToAddress ??
                    copy.admin.recharges.unrecognized}
                </div>
              </div>

              {canRecheck ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <form action={recheckRechargeVerificationAction}>
                    <input type="hidden" name="rechargeOrderId" value={recharge.id} />
                    <input type="hidden" name="returnTo" value="/admin/recharges" />
                    <SubmitButton
                      pendingText={copy.admin.recharges.rechecking}
                      className="border border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
                    >
                      {copy.admin.recharges.recheck}
                    </SubmitButton>
                  </form>
                </div>
              ) : null}

              {canReview ? (
                <form
                  action={reviewRechargeAction}
                  className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto_auto]"
                >
                  <input type="hidden" name="rechargeOrderId" value={recharge.id} />
                  <input
                    type="text"
                    name="adminNote"
                    defaultValue={recharge.adminNote ?? ""}
                    placeholder={copy.admin.recharges.adminNotePlaceholder}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  <button
                    type="submit"
                    name="decision"
                    value="REJECT"
                    className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-500 transition hover:bg-rose-50"
                  >
                    {copy.admin.recharges.reject}
                  </button>
                  <SubmitButton
                    name="decision"
                    value="APPROVE"
                    pendingText={copy.admin.recharges.approving}
                    className="h-[50px]"
                  >
                    {copy.admin.recharges.approve}
                  </SubmitButton>
                </form>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  {copy.admin.recharges.finished}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel overflow-hidden p-0">
        <PaginationNav
          pathname="/admin/recharges"
          searchParams={resolvedSearchParams}
          page={currentPage}
          pageCount={pageCount}
          labels={{
            previous: locale === "zh" ? "上一页" : locale === "ko" ? "이전" : "Previous",
            next: locale === "zh" ? "下一页" : locale === "ko" ? "다음" : "Next",
            page: locale === "zh" ? "第" : locale === "ko" ? "페이지" : "Page",
            total:
              locale === "zh"
                ? `${totalCount} 笔`
                : locale === "ko"
                  ? `총 ${totalCount}건`
                  : `${totalCount} records`,
          }}
        />
      </section>
    </>
  );
}
