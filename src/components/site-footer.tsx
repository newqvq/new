import Link from "next/link";

import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getPublicPageCopy, supportConfig } from "@/lib/support";

export async function SiteFooter() {
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const publicCopy = getPublicPageCopy(locale);
  const policyLinks = [
    { href: "/contact", label: publicCopy.footer.contact },
    { href: "/terms", label: publicCopy.footer.terms },
    { href: "/privacy", label: publicCopy.footer.privacy },
    { href: "/refund", label: publicCopy.footer.refund },
  ];

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] lg:px-8">
        <div>
          <div className="max-w-md leading-7">{copy.siteDescription}</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{publicCopy.footer.support}</div>
          <div className="mt-2 space-y-1 leading-7">
            <a className="block text-slate-600 hover:text-slate-950" href={`mailto:${supportConfig.email}`}>
              {supportConfig.email}
            </a>
            <div>{supportConfig.telegram}</div>
            <div>{supportConfig.hours}</div>
          </div>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{copy.footer.fundsTitle}</div>
          <div className="mt-2 leading-7">{copy.footer.fundsBody}</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{publicCopy.footer.policies}</div>
          <div className="mt-2 grid gap-1 leading-7">
            {policyLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-slate-600 hover:text-slate-950">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
