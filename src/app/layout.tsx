import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentLocale } from "@/lib/i18n-server";

import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-sans-latin",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "@vc5444",
  description: "@vc5444 digital services with USDT recharge, balance payment, and manual fulfillment.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoSansSc.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
