import { headers } from "next/headers";
import { isIP } from "node:net";

function stripPort(value: string) {
  if (value.startsWith("[") && value.includes("]")) {
    return value.slice(1, value.indexOf("]"));
  }

  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(value)) {
    return value.slice(0, value.lastIndexOf(":"));
  }

  return value;
}

function normalizeIpToken(value: string) {
  const trimmed = stripPort(value.trim());
  const withoutMappedPrefix = trimmed.startsWith("::ffff:")
    ? trimmed.slice(7)
    : trimmed;

  return isIP(withoutMappedPrefix) ? withoutMappedPrefix : null;
}

function extractClientIp(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  for (const candidate of headerValue.split(",")) {
    const normalized = normalizeIpToken(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function sanitizeUserAgent(value: string | null) {
  return (value ?? "unknown").trim().slice(0, 160) || "unknown";
}

export async function getRequestContext() {
  const headerStore = await headers();
  const ip =
    extractClientIp(headerStore.get("cf-connecting-ip")) ||
    extractClientIp(headerStore.get("x-real-ip")) ||
    extractClientIp(headerStore.get("x-forwarded-for")) ||
    extractClientIp(headerStore.get("x-vercel-forwarded-for")) ||
    "unknown";

  return {
    ip,
    userAgent: sanitizeUserAgent(headerStore.get("user-agent")),
  };
}
