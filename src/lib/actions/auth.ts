"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { clearSession, setSession } from "@/lib/auth";
import { getActionCopy } from "@/lib/action-copy";
import { getCurrentLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getRequestContext } from "@/lib/request-context";
import {
  assertRateLimitsOpen,
  clearRateLimits,
  isSecurityThrottleError,
  recordRateLimitFailures,
  throttlePolicies,
} from "@/lib/rate-limit";
import { getSecurityCopy } from "@/lib/security-copy";
import { generateInviteCode, withQueryMessage } from "@/lib/utils";

const DUMMY_PASSWORD_HASH =
  "$2b$12$9.ft4Yy8vNA0dDn1t3ZKhe/eB0V4nfB8hd1ZwivpddXV/e5tPCRR6";

function createRegisterSchema(copy: ReturnType<typeof getActionCopy>["auth"]["validation"]) {
  return z
    .object({
      displayName: z.string().trim().min(2, copy.displayNameMin).max(24),
      email: z.string().trim().email(copy.invalidEmail),
      password: z.string().min(8, copy.passwordMin).max(64),
      confirmPassword: z.string().min(8),
      inviteCode: z.string().trim().max(32).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: copy.confirmPasswordMismatch,
      path: ["confirmPassword"],
    });
}

function createSignInSchema(copy: ReturnType<typeof getActionCopy>["auth"]["validation"]) {
  return z.object({
    email: z.string().trim().email(copy.invalidEmail),
    password: z.string().min(8, copy.passwordMin),
  });
}

async function createUniqueInviteCode(seed: string, failedMessage: string) {
  for (let index = 0; index < 8; index += 1) {
    const code = generateInviteCode(seed);
    const existed = await prisma.user.findUnique({
      where: {
        inviteCode: code,
      },
      select: {
        id: true,
      },
    });

    if (!existed) {
      return code;
    }
  }

  throw new Error(failedMessage);
}

function buildIpThrottleKey(scope: string, ip: string) {
  if (!ip || ip === "unknown") {
    return null;
  }

  return {
    scope,
    subject: `ip:${ip}`,
  };
}

function buildIdentityThrottleKey(scope: string, identity?: string) {
  const normalized = identity?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return {
    scope,
    subject: `id:${normalized}`,
  };
}

function redirectOnSecurityError(error: unknown, path: string) {
  if (isSecurityThrottleError(error)) {
    redirect(withQueryMessage(path, "error", error.message));
  }

  throw error;
}

function isRegistrationInfrastructureError(error: unknown) {
  if (isSecurityThrottleError(error)) {
    return false;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1000", "P1001", "P1002", "P1017", "P2021", "P2022"].includes(
      error.code,
    );
  }

  return error instanceof Prisma.PrismaClientValidationError;
}

async function runRegistrationStep<T>(
  step: () => Promise<T>,
  failedMessage: string,
) {
  try {
    return await step();
  } catch (error) {
    if (isRegistrationInfrastructureError(error)) {
      console.error("Registration infrastructure error", error);
      redirect(withQueryMessage("/sign-up", "error", failedMessage));
    }

    throw error;
  }
}

export async function registerAction(formData: FormData) {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const registerSchema = createRegisterSchema(actionCopy.auth.validation);
  const rawEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const registerIpKey = buildIpThrottleKey("auth.register.ip", requestContext.ip);
  const registerIdentityKey = buildIdentityThrottleKey("auth.register.identity", rawEmail);

  try {
    await runRegistrationStep(
      () =>
        assertRateLimitsOpen(
          [
            ...(registerIpKey ? [registerIpKey] : []),
            ...(registerIdentityKey ? [registerIdentityKey] : []),
          ],
          securityCopy.registerTooManyAttempts,
        ),
      actionCopy.auth.messages.registerRetry,
    );
  } catch (error) {
    redirectOnSecurityError(error, "/sign-up");
  }

  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    inviteCode: formData.get("inviteCode") || undefined,
  });

  if (!parsed.success) {
    try {
      await recordRateLimitFailures(
        registerIpKey ? [registerIpKey] : [],
        throttlePolicies.signUpIp,
        securityCopy.registerTooManyAttempts,
      );
      if (registerIdentityKey) {
        await recordRateLimitFailures(
          [registerIdentityKey],
          throttlePolicies.signUpIdentity,
          securityCopy.registerTooManyAttempts,
        );
      }
    } catch (error) {
      redirectOnSecurityError(error, "/sign-up");
    }

    redirect(
      withQueryMessage(
        "/sign-up",
        "error",
        parsed.error.issues[0]?.message ?? actionCopy.auth.messages.registerIncomplete,
      ),
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await runRegistrationStep(
    () =>
      prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
    actionCopy.auth.messages.registerRetry,
  );

  if (existingUser) {
    try {
      await recordRateLimitFailures(
        registerIpKey ? [registerIpKey] : [],
        throttlePolicies.signUpIp,
        securityCopy.registerTooManyAttempts,
      );
      if (registerIdentityKey) {
        await recordRateLimitFailures(
          [registerIdentityKey],
          throttlePolicies.signUpIdentity,
          securityCopy.registerTooManyAttempts,
        );
      }
    } catch (error) {
      redirectOnSecurityError(error, "/sign-up");
    }

    redirect(
      withQueryMessage("/sign-up", "error", actionCopy.auth.messages.registerRetry),
    );
  }

  let referrerId: string | null = null;
  if (parsed.data.inviteCode) {
    const normalizedInviteCode = parsed.data.inviteCode.toUpperCase();
    const referrer = await runRegistrationStep(
      () =>
        prisma.user.findUnique({
          where: {
            inviteCode: normalizedInviteCode,
          },
          select: {
            id: true,
          },
        }),
      actionCopy.auth.messages.registerRetry,
    );

    if (!referrer) {
      try {
        await recordRateLimitFailures(
          registerIpKey ? [registerIpKey] : [],
          throttlePolicies.signUpIp,
          securityCopy.registerTooManyAttempts,
        );
      } catch (error) {
        redirectOnSecurityError(error, "/sign-up");
      }

      redirect(
        withQueryMessage("/sign-up", "error", actionCopy.auth.messages.inviteCodeMissing),
      );
    }

    referrerId = referrer.id;
  }

  const inviteCode = await runRegistrationStep(
    () =>
      createUniqueInviteCode(
        parsed.data.displayName,
        actionCopy.auth.messages.inviteCodeFailed,
      ),
    actionCopy.auth.messages.registerRetry,
  );
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const user = await runRegistrationStep(
      () =>
        prisma.user.create({
          data: {
            email,
            displayName: parsed.data.displayName,
            passwordHash,
            inviteCode,
            referrerId,
            wallet: {
              create: {},
            },
          },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        }),
      actionCopy.auth.messages.registerRetry,
    );

    await setSession({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });

    await runRegistrationStep(
      () =>
        clearRateLimits([
          ...(registerIpKey ? [registerIpKey] : []),
          ...(registerIdentityKey ? [registerIdentityKey] : []),
        ]),
      actionCopy.auth.messages.registerRetry,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
        await recordRateLimitFailures(
          registerIpKey ? [registerIpKey] : [],
          throttlePolicies.signUpIp,
          securityCopy.registerTooManyAttempts,
        );
        if (registerIdentityKey) {
          await recordRateLimitFailures(
            [registerIdentityKey],
            throttlePolicies.signUpIdentity,
            securityCopy.registerTooManyAttempts,
          );
        }
      } catch (rateLimitError) {
        redirectOnSecurityError(rateLimitError, "/sign-up");
      }

      redirect(
        withQueryMessage("/sign-up", "error", actionCopy.auth.messages.registerRetry),
      );
    }

    if (isRegistrationInfrastructureError(error)) {
      console.error("Registration infrastructure error", error);
      redirect(
        withQueryMessage("/sign-up", "error", actionCopy.auth.messages.registerRetry),
      );
    }

    throw error;
  }

  redirect(
    withQueryMessage("/dashboard", "success", actionCopy.auth.messages.registerSuccess),
  );
}

export async function signInAction(formData: FormData) {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const signInSchema = createSignInSchema(actionCopy.auth.validation);
  const rawEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const signInIpKey = buildIpThrottleKey("auth.sign-in.ip", requestContext.ip);
  const signInIdentityKey = buildIdentityThrottleKey("auth.sign-in.account", rawEmail);

  try {
    await assertRateLimitsOpen(
      [
        ...(signInIpKey ? [signInIpKey] : []),
        ...(signInIdentityKey ? [signInIdentityKey] : []),
      ],
      securityCopy.authTooManyAttempts,
    );
  } catch (error) {
    redirectOnSecurityError(error, "/sign-in");
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    try {
      await recordRateLimitFailures(
        signInIpKey ? [signInIpKey] : [],
        throttlePolicies.signInIp,
        securityCopy.authTooManyAttempts,
      );
      if (signInIdentityKey) {
        await recordRateLimitFailures(
          [signInIdentityKey],
          throttlePolicies.signInAccount,
          securityCopy.authTooManyAttempts,
        );
      }
    } catch (error) {
      redirectOnSecurityError(error, "/sign-in");
    }

    redirect(
      withQueryMessage(
        "/sign-in",
        "error",
        parsed.error.issues[0]?.message ?? actionCopy.auth.messages.signInIncomplete,
      ),
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      passwordHash: true,
      role: true,
    },
  });

  const passwordMatched = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatched) {
    try {
      await recordRateLimitFailures(
        signInIpKey ? [signInIpKey] : [],
        throttlePolicies.signInIp,
        securityCopy.authTooManyAttempts,
      );
      if (signInIdentityKey) {
        await recordRateLimitFailures(
          [signInIdentityKey],
          throttlePolicies.signInAccount,
          securityCopy.authTooManyAttempts,
        );
      }
    } catch (error) {
      redirectOnSecurityError(error, "/sign-in");
    }

    redirect(
      withQueryMessage("/sign-in", "error", actionCopy.auth.messages.invalidCredentials),
    );
  }

  await setSession({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });

  await clearRateLimits([
    ...(signInIpKey ? [signInIpKey] : []),
    ...(signInIdentityKey ? [signInIdentityKey] : []),
  ]);

  redirect(
    user.role === "ADMIN"
      ? withQueryMessage("/admin", "success", actionCopy.auth.messages.adminEntered)
      : withQueryMessage(
          "/dashboard",
          "success",
          actionCopy.auth.messages.signInSuccess,
        ),
  );
}

export async function signOutAction() {
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  await clearSession();
  redirect(withQueryMessage("/", "success", actionCopy.auth.messages.signedOut));
}
