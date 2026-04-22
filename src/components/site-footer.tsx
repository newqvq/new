import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export async function SiteFooter() {
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr] lg:px-8">
        <div>
          <div className="max-w-md leading-7">{copy.siteDescription}</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{copy.footer.fundsTitle}</div>
          <div className="mt-2 leading-7">{copy.footer.fundsBody}</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{copy.footer.deliveryTitle}</div>
          <div className="mt-2 leading-7">{copy.footer.deliveryBody}</div>
        </div>
      </div>
    </footer>
  );
}
