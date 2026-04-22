import { RechargeStatus } from "@prisma/client";

type RechargeLifecycleLike = {
  status: RechargeStatus;
  expiresAt?: Date | null;
};

type RechargeNetworkOptionLike = {
  autoVerifyReady: boolean;
};

export function isRechargeOpenStatus(status: RechargeStatus) {
  return (
    status === RechargeStatus.AWAITING_PAYMENT ||
    status === RechargeStatus.UNDER_REVIEW
  );
}

export function isRechargeAwaitingPayment(status: RechargeStatus) {
  return status === RechargeStatus.AWAITING_PAYMENT;
}

export function isRechargeExpired(
  recharge: RechargeLifecycleLike,
  now: Date = new Date(),
) {
  return (
    recharge.status === RechargeStatus.AWAITING_PAYMENT &&
    Boolean(recharge.expiresAt) &&
    recharge.expiresAt!.getTime() <= now.getTime()
  );
}

export function canSubmitRechargeProof(
  recharge: RechargeLifecycleLike,
  now: Date = new Date(),
) {
  return isRechargeOpenStatus(recharge.status) && !isRechargeExpired(recharge, now);
}

export function canRecheckRecharge(
  recharge: RechargeLifecycleLike,
  now: Date = new Date(),
) {
  return isRechargeOpenStatus(recharge.status) && !isRechargeExpired(recharge, now);
}

export function canReviewRecharge(
  recharge: RechargeLifecycleLike,
  now: Date = new Date(),
) {
  return isRechargeOpenStatus(recharge.status) && !isRechargeExpired(recharge, now);
}

export function isRechargeNetworkEnabled(network: RechargeNetworkOptionLike) {
  return network.autoVerifyReady;
}
