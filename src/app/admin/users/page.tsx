import { AlertBanner } from "@/components/alert-banner";
import { PaginationNav } from "@/components/pagination-nav";
import { getAdminUsersPage } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { firstValue, formatDate, getFlashMessage } from "@/lib/utils";
import { getWithdrawalCopy } from "@/lib/withdrawal-copy";

type AdminUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const USERS_PER_PAGE = 8;

function getPageFromQuery(value?: string) {
  const parsed = Number.parseInt(value || "1", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const resolvedSearchParams = await searchParams;
  const flash = getFlashMessage(resolvedSearchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const withdrawalCopy = getWithdrawalCopy(locale);
  const requestedPage = getPageFromQuery(firstValue(resolvedSearchParams.page));
  const { totalCount, currentPage, pageCount, items: users } = await getAdminUsersPage(
    requestedPage,
    USERS_PER_PAGE,
  );

  const roleLabel = {
    USER: copy.admin.users.roles.user,
    ADMIN: copy.admin.users.roles.admin,
  } as const;

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}
      <section className="panel p-6">
        <h1 className="text-3xl font-black text-slate-950">
          {copy.admin.users.title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {copy.admin.users.description}
        </p>
      </section>

      <section className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="panel p-6">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
              <div>
                <div className="text-xl font-black text-slate-950">
                  {user.displayName}
                </div>
                <div className="mt-2 text-sm text-slate-500">{user.email}</div>
                <div className="mt-2 text-sm text-slate-500">
                  {copy.admin.users.registeredAt} {formatDate(user.createdAt, locale)}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {copy.admin.users.referrer}:{" "}
                  {user.referrer?.displayName ?? copy.admin.users.none}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-sm text-slate-500">
                  {copy.admin.users.walletBalance}
                </div>
                <div className="mt-2 text-2xl font-black text-slate-950">
                  {formatUsdt(user.wallet?.balanceMicros ?? 0n)} USDT
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-sm text-slate-500">
                  {copy.admin.users.metrics}
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {copy.admin.users.orders} {user._count.orders}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {copy.admin.users.recharges} {user._count.rechargeOrders}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {withdrawalCopy.admin.navLabel} {user._count.withdrawalRequests}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {copy.admin.users.referrals} {user._count.referrals}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-sm text-slate-500">
                  {copy.admin.users.inviteCode}
                </div>
                <div className="mt-2 text-lg font-black text-slate-950">
                  {user.inviteCode}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {roleLabel[user.role]}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="panel overflow-hidden p-0">
        <PaginationNav
          pathname="/admin/users"
          searchParams={resolvedSearchParams}
          page={currentPage}
          pageCount={pageCount}
          labels={{
            previous: locale === "zh" ? "上一页" : locale === "ko" ? "이전" : "Previous",
            next: locale === "zh" ? "下一页" : locale === "ko" ? "다음" : "Next",
            page: locale === "zh" ? "第" : locale === "ko" ? "페이지" : "Page",
            total:
              locale === "zh"
                ? `${totalCount} 位用户`
                : locale === "ko"
                  ? `총 ${totalCount}명`
                  : `${totalCount} users`,
          }}
        />
      </section>
    </>
  );
}
