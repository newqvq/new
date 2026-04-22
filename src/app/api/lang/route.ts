import { NextRequest, NextResponse } from "next/server";

import { localeCookieName, resolveLocale } from "@/lib/i18n";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function GET(request: NextRequest) {
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale"));
  const redirectPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("redirect"),
  );
  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  response.cookies.set(localeCookieName, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    priority: "low",
  });

  return response;
}
