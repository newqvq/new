import assert from "node:assert/strict";
import test from "node:test";

import { RechargeNetwork, WithdrawalStatus } from "@prisma/client";

import {
  canReviewWithdrawal,
  getWithdrawalStatusMeta,
  validateWithdrawalAddress,
  validateWithdrawalTxHash,
} from "../src/lib/withdrawal";
import { getRechargeAddress } from "../src/lib/site";

test("accepts a valid TRC20 withdrawal address", () => {
  const address = validateWithdrawalAddress(
    RechargeNetwork.TRC20,
    "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7",
    "en",
  );

  assert.equal(address, "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7");
});

test("rejects using the platform deposit address as withdrawal destination", () => {
  assert.throws(
    () =>
      validateWithdrawalAddress(
        RechargeNetwork.TRC20,
        getRechargeAddress(RechargeNetwork.TRC20),
        "en",
      ),
    /cannot match the platform deposit address/i,
  );
});

test("accepts a valid EVM payout hash", () => {
  const txHash = validateWithdrawalTxHash(`0x${"a".repeat(64)}`, "en");

  assert.equal(txHash, `0x${"a".repeat(64)}`);
});

test("pending withdrawals remain reviewable until finalized", () => {
  assert.equal(canReviewWithdrawal(WithdrawalStatus.PENDING), true);
  assert.equal(canReviewWithdrawal(WithdrawalStatus.APPROVED), false);
  assert.equal(canReviewWithdrawal(WithdrawalStatus.REJECTED), false);
});

test("status meta returns approved label with success styling", () => {
  const meta = getWithdrawalStatusMeta(WithdrawalStatus.APPROVED, "en");

  assert.equal(meta.label, "Approved");
  assert.match(meta.className, /emerald/);
});
