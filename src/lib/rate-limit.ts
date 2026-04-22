import { Prisma } from "@prisma/client";
import crypto from "node:crypto";

import { env } from "./env";
import { prisma } from "./prisma";
import {
  evaluateThrottleDecision,
  ThrottlePolicy,
  ThrottleSnapshot,
} from "./rate-limit-core";

type SecurityThrottleRow = {
  id: string;
  hits: number;
  lockouts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

type SecurityThrottleCreateInput = {
  scope: string;
  subjectHash: string;
  hits: number;
  lockouts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
  lastSeenAt: Date;
};

const securityThrottleDelegate = (
  prisma as typeof prisma & {
    securityThrottle: {
      findUnique: (args: {
        where: {
          scope_subjectHash: {
            scope: string;
            subjectHash: string;
          };
        };
      }) => Promise<SecurityThrottleRow | null>;
      create: (args: {
        data: SecurityThrottleCreateInput;
      }) => Promise<SecurityThrottleRow>;
      update: (args: {
        where: {
          id: string;
        };
        data: Partial<SecurityThrottleCreateInput>;
      }) => Promise<SecurityThrottleRow>;
      deleteMany: (args: {
        where: {
          scope: string;
          subjectHash: string;
        };
      }) => Promise<{ count: number }>;
    };
  }
).securityThrottle;

type ThrottleKey = {
  scope: string;
  subject: string;
};

export class SecurityThrottleError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "SecurityThrottleError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const throttlePolicies = {
  signInIp: {
    maxAttempts: 12,
    windowMs: 10 * 60 * 1000,
    baseBlockMs: 15 * 60 * 1000,
    maxBlockMs: 12 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  signInAccount: {
    maxAttempts: 8,
    windowMs: 15 * 60 * 1000,
    baseBlockMs: 15 * 60 * 1000,
    maxBlockMs: 12 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  signUpIp: {
    maxAttempts: 6,
    windowMs: 30 * 60 * 1000,
    baseBlockMs: 60 * 60 * 1000,
    maxBlockMs: 24 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  signUpIdentity: {
    maxAttempts: 4,
    windowMs: 30 * 60 * 1000,
    baseBlockMs: 60 * 60 * 1000,
    maxBlockMs: 12 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  rechargeCreate: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,
    baseBlockMs: 30 * 60 * 1000,
    maxBlockMs: 6 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  rechargeProof: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000,
    baseBlockMs: 30 * 60 * 1000,
    maxBlockMs: 6 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  rechargeRecheck: {
    maxAttempts: 15,
    windowMs: 30 * 60 * 1000,
    baseBlockMs: 30 * 60 * 1000,
    maxBlockMs: 6 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  placeOrder: {
    maxAttempts: 20,
    windowMs: 10 * 60 * 1000,
    baseBlockMs: 15 * 60 * 1000,
    maxBlockMs: 6 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  orderSync: {
    maxAttempts: 30,
    windowMs: 30 * 60 * 1000,
    baseBlockMs: 15 * 60 * 1000,
    maxBlockMs: 6 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
  adminMutation: {
    maxAttempts: 60,
    windowMs: 10 * 60 * 1000,
    baseBlockMs: 15 * 60 * 1000,
    maxBlockMs: 4 * 60 * 60 * 1000,
    exponentialBackoff: true,
  },
} satisfies Record<string, ThrottlePolicy>;

function normalizeSubject(subject: string) {
  return subject.trim().toLowerCase().slice(0, 256);
}

function toSubjectHash(scope: string, subject: string) {
  return crypto
    .createHmac("sha256", env.RATE_LIMIT_SECRET)
    .update(`${scope}:${normalizeSubject(subject)}`)
    .digest("hex");
}

function uniqueKeys(keys: ThrottleKey[]) {
  const seen = new Set<string>();
  const result: ThrottleKey[] = [];

  for (const key of keys) {
    const scope = key.scope.trim();
    const subject = normalizeSubject(key.subject);

    if (!scope || !subject) {
      continue;
    }

    const dedupeKey = `${scope}:${subject}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push({ scope, subject });
  }

  return result;
}

function retrySeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

async function loadSnapshot(key: ThrottleKey) {
  const row = await securityThrottleDelegate.findUnique({
    where: {
      scope_subjectHash: {
        scope: key.scope,
        subjectHash: toSubjectHash(key.scope, key.subject),
      },
    },
  });

  if (!row) {
    return null;
  }

  return {
    row,
    snapshot: {
      hits: row.hits,
      lockouts: row.lockouts,
      windowStartedAt: row.windowStartedAt,
      blockedUntil: row.blockedUntil,
    } satisfies ThrottleSnapshot,
  };
}

async function upsertDecision(
  key: ThrottleKey,
  policy: ThrottlePolicy,
  now: Date,
) {
  const subjectHash = toSubjectHash(key.scope, key.subject);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const loaded = await loadSnapshot(key);
    const decision = evaluateThrottleDecision(loaded?.snapshot ?? null, policy, now);

    if (decision.kind === "blocked") {
      return decision;
    }

    try {
      if (!loaded) {
        await securityThrottleDelegate.create({
          data: {
            scope: key.scope,
            subjectHash,
            hits: decision.hits,
            lockouts: decision.lockouts,
            windowStartedAt: decision.windowStartedAt,
            blockedUntil: decision.blockedUntil,
            lastSeenAt: now,
          },
        });
      } else {
        await securityThrottleDelegate.update({
          where: {
            id: loaded.row.id,
          },
          data: {
            hits: decision.hits,
            lockouts: decision.lockouts,
            windowStartedAt: decision.windowStartedAt,
            blockedUntil: decision.blockedUntil,
            lastSeenAt: now,
          },
        });
      }

      return decision;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt === 0
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to update security throttle state.");
}

export function isSecurityThrottleError(error: unknown): error is SecurityThrottleError {
  return error instanceof SecurityThrottleError;
}

export async function assertRateLimitsOpen(keys: ThrottleKey[], message: string) {
  for (const key of uniqueKeys(keys)) {
    const loaded = await loadSnapshot(key);
    const blockedUntil = loaded?.snapshot.blockedUntil;

    if (blockedUntil && blockedUntil.getTime() > Date.now()) {
      throw new SecurityThrottleError(
        message,
        retrySeconds(blockedUntil.getTime() - Date.now()),
      );
    }
  }
}

export async function recordRateLimitFailures(
  keys: ThrottleKey[],
  policy: ThrottlePolicy,
  message: string,
) {
  const now = new Date();

  for (const key of uniqueKeys(keys)) {
    const decision = await upsertDecision(key, policy, now);

    if (decision.kind === "blocked" || decision.justBlocked) {
      throw new SecurityThrottleError(
        message,
        retrySeconds(
          decision.kind === "blocked" ? decision.retryAfterMs : decision.retryAfterMs,
        ),
      );
    }
  }
}

export async function consumeRateLimits(
  keys: ThrottleKey[],
  policy: ThrottlePolicy,
  message: string,
) {
  const now = new Date();

  for (const key of uniqueKeys(keys)) {
    const decision = await upsertDecision(key, policy, now);

    if (decision.kind === "blocked" || decision.justBlocked) {
      throw new SecurityThrottleError(
        message,
        retrySeconds(
          decision.kind === "blocked" ? decision.retryAfterMs : decision.retryAfterMs,
        ),
      );
    }
  }
}

export async function clearRateLimits(keys: ThrottleKey[]) {
  const normalized = uniqueKeys(keys);

  if (!normalized.length) {
    return;
  }

  await Promise.all(
    normalized.map((key) =>
      securityThrottleDelegate.deleteMany({
        where: {
          scope: key.scope,
          subjectHash: toSubjectHash(key.scope, key.subject),
        },
      }),
    ),
  );
}
