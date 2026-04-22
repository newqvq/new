import { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { env } from "./env";
import { getActionCopy } from "./action-copy";
import { getCurrentLocale } from "./i18n-server";
import { prisma } from "./prisma";
import { resolveSessionUser } from "./session-resolver";
import { withQueryMessage } from "./utils";

const SESSION_COOKIE_NAME = "xinglian_session";
const secret = new TextEncoder().encode(env.AUTH_SECRET);
const sessionIssuer = new URL(env.SITE_URL).origin;
const sessionAudience = "xinglian-session";

const sessionSchema = z.object({
  sub: z.string(),
});

export type SessionUser = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};

async function signSession(user: SessionUser) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuer(sessionIssuer)
    .setAudience(sessionAudience)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function setSession(user: SessionUser) {
  const token = await signSession(user);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    priority: "high",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: sessionIssuer,
      audience: sessionAudience,
    });
    const parsed = sessionSchema.safeParse({
      sub: payload.sub,
    });

    if (!parsed.success) {
      return null;
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: parsed.data.sub,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });

    return resolveSessionUser({ userId: parsed.data.sub }, currentUser);
  } catch {
    return null;
  }
});

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    const locale = await getCurrentLocale();
    const copy = getActionCopy(locale);
    redirect(withQueryMessage("/sign-in", "error", copy.common.loginRequired));
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();

  if (session.role !== Role.ADMIN) {
    const locale = await getCurrentLocale();
    const copy = getActionCopy(locale);
    redirect(withQueryMessage("/dashboard", "error", copy.common.noAdminAccess));
  }

  return session;
}
