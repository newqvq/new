import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { signOutAction } from "@/lib/actions/auth";
import { getViewer } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { getWithdrawalCopy } from "@/lib/withdrawal-copy";

function getDisplayHandle(
  viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>,
  fallbackLabel: string,
) {
  const rawName = viewer.displayName?.trim();

  if (rawName && !/^[?？]+$/.test(rawName)) {
    return rawName;
  }

  return viewer.email.split("@")[0] || fallbackLabel;
}

export async function SiteHeader() {
  const viewer = await getViewer();
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const withdrawalCopy = getWithdrawalCopy(locale);
  const isAdmin = viewer?.role === "ADMIN";
  const navItems = isAdmin
    ? [
        { href: "/admin", label: copy.admin.shell.nav.overview },
        { href: "/admin/products", label: copy.admin.shell.nav.products },
        { href: "/admin/recharges", label: copy.admin.shell.nav.recharges },
        { href: "/admin/orders", label: copy.admin.shell.nav.orders },
        { href: "/admin/withdrawals", label: withdrawalCopy.admin.navLabel },
        { href: "/admin/users", label: copy.admin.shell.nav.users },
      ]
    : [
        { href: "/", label: copy.nav.home },
        { href: "/recharge", label: copy.nav.recharge },
        { href: "/orders", label: copy.nav.orders },
        { href: "/dashboard", label: copy.nav.account },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-8">
            <div className="-mx-1 overflow-x-auto">
              <nav className="flex min-w-max items-center gap-1 text-xs font-medium text-slate-600 sm:text-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full px-3 py-1.5 transition hover:bg-slate-100 hover:text-slate-950 sm:px-4 sm:py-2"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 xl:justify-end">
            <LanguageSwitcher locale={locale} />
            {viewer ? (
              <>
                {!isAdmin ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm sm:rounded-full sm:px-4">
                    <div className="text-[11px] text-slate-500">{copy.nav.balance}</div>
                    <div className="text-xs font-semibold text-slate-950 sm:text-sm">
                      {formatUsdt(viewer.wallet?.balanceMicros ?? 0n)} USDT
                    </div>
                  </div>
                ) : null}
                <Link
                  href={isAdmin ? "/admin" : "/dashboard"}
                  className="min-w-0 truncate rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-950 shadow-sm transition hover:border-slate-950 sm:max-w-[10rem] sm:rounded-full sm:px-4 sm:text-sm"
                  title={getDisplayHandle(viewer, copy.nav.account)}
                >
                  {getDisplayHandle(viewer, copy.nav.account)}
                </Link>
                <form action={signOutAction} className="contents sm:block">
                  <button
                    type="submit"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-950 hover:text-slate-950 sm:w-auto sm:rounded-full sm:px-4 sm:text-sm"
                  >
                    {copy.nav.signOut}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 sm:rounded-full sm:px-4 sm:text-sm"
                >
                  {copy.nav.signIn}
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-2xl bg-sky-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-sky-500 sm:rounded-full sm:px-4 sm:text-sm"
                >
                  {copy.nav.signUp}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
