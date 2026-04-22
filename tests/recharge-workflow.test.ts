import assert from "node:assert/strict";
import test from "node:test";

import { RechargeStatus } from "@prisma/client";

import {
  canRecheckRecharge,
  canReviewRecharge,
  canSubmitRechargeProof,
  isRechargeExpired,
  isRechargeNetworkEnabled,
} from "../src/lib/recharge-workflow";

test("awaiting-payment recharge expires after deadline", () => {
  const now = new Date("2026-04-03T10:00:00.000Z");
  const recharge = {
    status: RechargeStatus.AWAITING_PAYMENT,
    expiresAt: new Date("2026-04-03T09:59:59.000Z"),
  };

  assert.equal(isRechargeExpired(recharge, now), true);
  assert.equal(canSubmitRechargeProof(recharge, now), false);
  assert.equal(canRecheckRecharge(recharge, now), false);
  assert.equal(canReviewRecharge(recharge, now), false);
});

test("under-review recharge remains reviewable even after original payment deadline", () => {
  const now = new Date("2026-04-03T10:00:00.000Z");
  const recharge = {
    status: RechargeStatus.UNDER_REVIEW,
    expiresAt: new Date("2026-04-03T09:00:00.000Z"),
  };

  assert.equal(isRechargeExpired(recharge, now), false);
  assert.equal(canSubmitRechargeProof(recharge, now), true);
  assert.equal(canRecheckRecharge(recharge, now), true);
  assert.equal(canReviewRecharge(recharge, now), true);
});

test("ended recharge statuses cannot be rechecked or reviewed again", () => {
  for (const status of [
    RechargeStatus.APPROVED,
    RechargeStatus.REJECTED,
    RechargeStatus.EXPIRED,
  ]) {
    assert.equal(canRecheckRecharge({ status, expiresAt: null }), false);
    assert.equal(canReviewRecharge({ status, expiresAt: null }), false);
  }
});

test("only auto-verified networks can be used to create recharge orders", () => {
  assert.equal(isRechargeNetworkEnabled({ autoVerifyReady: true }), true);
  assert.equal(isRechargeNetworkEnabled({ autoVerifyReady: false }), false);
});
