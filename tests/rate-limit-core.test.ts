import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateThrottleDecision,
  ThrottlePolicy,
} from "../src/lib/rate-limit-core";

const policy: ThrottlePolicy = {
  maxAttempts: 2,
  windowMs: 60_000,
  baseBlockMs: 30_000,
  maxBlockMs: 120_000,
  exponentialBackoff: true,
};

test("fresh throttle state starts a new window and allows the request", () => {
  const decision = evaluateThrottleDecision(null, policy, new Date("2026-04-06T10:00:00Z"));

  assert.equal(decision.kind, "allow");
  assert.equal(decision.hits, 1);
  assert.equal(decision.justBlocked, false);
});

test("requests over the limit are blocked and schedule a cooldown", () => {
  const decision = evaluateThrottleDecision(
    {
      hits: 2,
      lockouts: 0,
      windowStartedAt: new Date("2026-04-06T10:00:00Z"),
      blockedUntil: null,
    },
    policy,
    new Date("2026-04-06T10:00:30Z"),
  );

  assert.equal(decision.kind, "allow");
  assert.equal(decision.justBlocked, true);
  assert.equal(decision.lockouts, 1);
  assert.equal(decision.retryAfterMs, 30_000);
});

test("active cooldowns stay blocked until blockedUntil", () => {
  const decision = evaluateThrottleDecision(
    {
      hits: 0,
      lockouts: 1,
      windowStartedAt: new Date("2026-04-06T10:00:30Z"),
      blockedUntil: new Date("2026-04-06T10:01:00Z"),
    },
    policy,
    new Date("2026-04-06T10:00:45Z"),
  );

  assert.equal(decision.kind, "blocked");
  assert.equal(decision.retryAfterMs, 15_000);
});

test("repeated lockouts use exponential backoff up to the configured cap", () => {
  const decision = evaluateThrottleDecision(
    {
      hits: 2,
      lockouts: 2,
      windowStartedAt: new Date("2026-04-06T10:02:00Z"),
      blockedUntil: null,
    },
    policy,
    new Date("2026-04-06T10:02:10Z"),
  );

  assert.equal(decision.kind, "allow");
  assert.equal(decision.justBlocked, true);
  assert.equal(decision.retryAfterMs, 120_000);
  assert.equal(decision.lockouts, 3);
});

test("expired windows reset hit counters before counting a new attempt", () => {
  const decision = evaluateThrottleDecision(
    {
      hits: 2,
      lockouts: 1,
      windowStartedAt: new Date("2026-04-06T09:58:00Z"),
      blockedUntil: null,
    },
    policy,
    new Date("2026-04-06T10:00:01Z"),
  );

  assert.equal(decision.kind, "allow");
  assert.equal(decision.hits, 1);
  assert.equal(decision.justBlocked, false);
});
