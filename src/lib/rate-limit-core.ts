export type ThrottlePolicy = {
  maxAttempts: number;
  windowMs: number;
  baseBlockMs: number;
  maxBlockMs: number;
  exponentialBackoff?: boolean;
};

export type ThrottleSnapshot = {
  hits: number;
  lockouts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

export type ThrottleDecision =
  | {
      kind: "blocked";
      retryAfterMs: number;
    }
  | {
      kind: "allow";
      hits: number;
      lockouts: number;
      windowStartedAt: Date;
      blockedUntil: Date | null;
      justBlocked: boolean;
      retryAfterMs: number;
    };

function hasWindowExpired(
  snapshot: ThrottleSnapshot | null,
  policy: ThrottlePolicy,
  now: Date,
) {
  if (!snapshot) {
    return true;
  }

  return now.getTime() - snapshot.windowStartedAt.getTime() >= policy.windowMs;
}

function getBlockMs(policy: ThrottlePolicy, lockouts: number) {
  if (!policy.exponentialBackoff) {
    return policy.baseBlockMs;
  }

  const multiplier = Math.max(lockouts - 1, 0);
  return Math.min(policy.baseBlockMs * 2 ** multiplier, policy.maxBlockMs);
}

export function evaluateThrottleDecision(
  snapshot: ThrottleSnapshot | null,
  policy: ThrottlePolicy,
  now: Date,
): ThrottleDecision {
  if (snapshot?.blockedUntil && snapshot.blockedUntil.getTime() > now.getTime()) {
    return {
      kind: "blocked",
      retryAfterMs: snapshot.blockedUntil.getTime() - now.getTime(),
    };
  }

  const expired = hasWindowExpired(snapshot, policy, now);
  const hits = expired ? 1 : (snapshot?.hits ?? 0) + 1;
  const windowStartedAt = expired ? now : snapshot?.windowStartedAt ?? now;
  const lockouts = snapshot?.lockouts ?? 0;

  if (hits > policy.maxAttempts) {
    const nextLockouts = lockouts + 1;
    const retryAfterMs = getBlockMs(policy, nextLockouts);

    return {
      kind: "allow",
      hits: 0,
      lockouts: nextLockouts,
      windowStartedAt: now,
      blockedUntil: new Date(now.getTime() + retryAfterMs),
      justBlocked: true,
      retryAfterMs,
    };
  }

  return {
    kind: "allow",
    hits,
    lockouts,
    windowStartedAt,
    blockedUntil: null,
    justBlocked: false,
    retryAfterMs: 0,
  };
}
