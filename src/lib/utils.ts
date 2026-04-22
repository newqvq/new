import { type ClassValue, clsx } from "clsx";

import { Locale } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getFlashMessage(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const error = firstValue(searchParams.error);
  const success = firstValue(searchParams.success);

  if (error) {
    return {
      kind: "error" as const,
      message: error,
    };
  }

  if (success) {
    return {
      kind: "success" as const,
      message: success,
    };
  }

  return null;
}

export function withQueryMessage(
  path: string,
  key: "error" | "success",
  message: string,
) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, message);

  return `${url.pathname}${url.search}${url.hash}`;
}

export function formatDate(date: Date, locale: Locale = "zh") {
  const localeTag = {
    zh: "zh-CN",
    en: "en-US",
    ko: "ko-KR",
  }[locale];

  return new Intl.DateTimeFormat(localeTag, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSerial(prefix: string) {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(
    2,
    "0",
  )}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;

  return `${prefix}${datePart}${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function generateInviteCode(seed: string) {
  const head = seed
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");

  return `${head}${crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}
