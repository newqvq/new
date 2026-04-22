import Link from "next/link";
import {
  LayoutDashboard,
  Package2,
  ReceiptText,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";

import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getWithdrawalCopy } from "@/lib/withdrawal-copy";

type AdminShellProps = {
  children: React.ReactNode;
};

export async function AdminShell({ children }: AdminShellProps) {
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const withdrawalCopy = getWithdrawalCopy(locale);
  const items = [
    {
      href: "/admin",
      label: copy.admin.shell.nav.overview,
      icon: LayoutDashboard,
    },
    {
      href: "/admin/products",
      label: copy.admin.shell.nav.products,
      icon: Package2,
    },
    {
      href: "/admin/recharges",
      label: copy.admin.shell.nav.recharges,
      icon: ReceiptText,
    },
    {
      href: "/admin/orders",
      label: copy.admin.shell.nav.orders,
      icon: ShoppingBag,
    },
    {
      href: "/admin/withdrawals",
      label: withdrawalCopy.admin.navLabel,
      icon: Wallet,
    },
    {
      href: "/admin/users",
      label: copy.admin.shell.nav.users,
      icon: Users,
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
      <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
        <div className="mb-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_58%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{copy.admin.shell.title}</div>
          <div className="mt-2 text-sm leading-7 text-slate-600">
            {copy.admin.shell.description}
          </div>
        </div>
        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
