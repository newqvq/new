import Link from "next/link";

import { AlertBanner } from "@/components/alert-banner";
import { PaginationNav } from "@/components/pagination-nav";
import { SubmitButton } from "@/components/submit-button";
import { reviewWithdrawalAction } from "@/lib/actions/admin";
import { getAdminWithdrawalsPage } from "@/lib/data";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { getRechargeExplorerLinks } from "@/lib/site";
import { firstValue, formatDate, getFlashMessage } from "@/lib/utils";
import {
  canReviewWithdrawal,
  getWithdrawalStatusMeta,
} from "@/lib/withdrawal";
import { getWithdrawalCopy } from "@/lib/withdrawal-copy";

type AdminWithdrawalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WITHDRAWALS_PER_PAGE = 10;

function getPageFromQuery(value?: string) {
  const parsed = Number.parseInt(value || "1", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function AdminWithdrawalsPage({
  searchParams,
}: AdminWithdrawalsPageProps) {
  const resolvedSearchParams = await searchParams;
  const flash = getFlashMessage(resolvedSearchParams);
  const locale = await getCurrentLocale();
  const copy = getWithdrawalCopy(locale);
  const requestedPage = getPageFromQuery(firstValue(resolvedSearchParams.page));
  const {
    totalCount,
    currentPage,
    pageCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    items: withdrawals,
  } = await getAdminWithdrawalsPage(
    requestedPage,
    WITHDRAWALS_PER_PAGE,
  );

  const stats = {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
  };

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}

      <section className="panel p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950">
              {copy.admin.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              {copy.admin.description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-amber-50 px-3 py-3">
              <div className="text-xs text-amber-700">{copy.admin.statsPending}</div>
              <div className="mt-1 text-2xl font-black text-amber-700">{stats.pending}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-3 py-3">
              <div className="text-xs text-emerald-700">{copy.admin.statsApproved}</div>
              <div className="mt-1 text-2xl font-black text-emerald-700">
                {stats.approved}
              </div>
            </div>
            <div className="rounded-2xl bg-rose-50 px-3 py-3">
              <div className="text-xs text-rose-700">{copy.admin.statsRejected}</div>
              <div className="mt-1 text-2xl font-black text-rose-700">
                {stats.rejected}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {withdrawals.length === 0 ? (
          <div className="panel p-6">
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {copy.admin.noRequests}
            </div>
          </div>
        ) : (
          withdrawals.map((withdrawal) => {
            const statusMeta = getWithdrawalStatusMeta(withdrawal.status, locale);
            const canReview = canReviewWithdrawal(withdrawal.status);
            const explorerLinks = getRechargeExplorerLinks(
              withdrawal.network,
              withdrawal.txHash,
              withdrawal.walletAddress,
            );

            return (
              <div key={withdrawal.id} className="panel p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-2xl font-black text-slate-950">
                        {withdrawal.serialNo}
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-slate-500">
                      {copy.admin.userLabel}: {withdrawal.user.displayName} /{" "}
                      {withdrawal.user.email}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {copy.admin.amountLabel}: {formatUsdt(withdrawal.amountMicros)} USDT
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {copy.admin.networkLabel}: {withdrawal.network}
                    </div>
                    <div className="mt-2 break-all text-xs text-slate-500">
                      {copy.admin.addressLabel}: {withdrawal.walletAddress}
                    </div>
                    {withdrawal.userNote ? (
                      <div className="mt-2 text-sm text-slate-600">
                        {copy.admin.userNoteLabel}: {withdrawal.userNote}
                      </div>
                    ) : null}
                    {withdrawal.reviewNote ? (
                      <div className="mt-2 text-sm text-slate-600">
                        {copy.admin.reviewNoteLabel}: {withdrawal.reviewNote}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600">
                    <div>
                      {copy.admin.requestedAtLabel}:{" "}
                      {formatDate(withdrawal.createdAt, locale)}
                    </div>
                    <div>
                      {copy.admin.reviewerLabel}:{" "}
                      {withdrawal.reviewer?.displayName ?? copy.admin.pendingReviewer}
                    </div>
                    <div>
                      {copy.admin.reviewedAtLabel}:{" "}
                      {withdrawal.reviewedAt
                        ? formatDate(withdrawal.reviewedAt, locale)
                        : copy.admin.pendingReviewer}
                    </div>
                    <div className="break-all">
                      {copy.admin.txHashLabel}: {withdrawal.txHash ?? "-"}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link
                        href={explorerLinks.addressUrl}
                        target="_blank"
                        className="font-semibold text-slate-950"
                      >
                        {copy.admin.addressLabel}
                      </Link>
                      {explorerLinks.txUrl ? (
                        <Link
                          href={explorerLinks.txUrl}
                          target="_blank"
                          className="font-semibold text-slate-950"
                        >
                          {copy.admin.txHashLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                {canReview ? (
                  <form
                    action={reviewWithdrawalAction}
                    className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px_auto_auto]"
                  >
                    <input
                      type="hidden"
                      name="withdrawalRequestId"
                      value={withdrawal.id}
                    />
                    <input
                      type="text"
                      name="reviewNote"
                      defaultValue={withdrawal.reviewNote ?? ""}
                      placeholder={copy.admin.reviewNotePlaceholder}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    />
                    <input
                      type="text"
                      name="txHash"
                      defaultValue={withdrawal.txHash ?? ""}
                      placeholder={copy.admin.txHashPlaceholder}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    />
                    <button
                      type="submit"
                      name="decision"
                      value="REJECT"
                      className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-500 transition hover:bg-rose-50"
                    >
                      {copy.admin.rejectAction}
                    </button>
                    <SubmitButton
                      name="decision"
                      value="APPROVE"
                      pendingText={copy.admin.approvePending}
                      className="h-[50px]"
                    >
                      {copy.admin.approveAction}
                    </SubmitButton>
                  </form>
                ) : (
                  <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    {copy.admin.finishedHint}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <section className="panel overflow-hidden p-0">
        <PaginationNav
          pathname="/admin/withdrawals"
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
