"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { Locale, localeLabels, locales } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const redirect = `${pathname}${search ? `?${search}` : ""}`;

  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-500 shadow-sm">
      {locales.map((item) => (
        <a
          key={item}
          href={`/api/lang?locale=${item}&redirect=${encodeURIComponent(redirect)}`}
          className={cn(
            "rounded-full px-3 py-1.5 transition",
            item === locale
              ? "bg-sky-100 text-sky-700"
              : "hover:bg-slate-100 hover:text-slate-950",
          )}
          title={localeLabels[item]}
        >
          {item.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
