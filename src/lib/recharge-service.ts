import {
  Prisma,
  PrismaClient,
  RechargeOrder,
  RechargeStatus,
  RechargeVerificationStatus,
} from "@prisma/client";

import { Locale } from "./i18n";
import { verifyRechargeOnChain } from "./recharge-verifier";
import {
  canRecheckRecharge,
  isRechargeExpired,
  isRechargeOpenStatus,
} from "./recharge-workflow";

type RechargeLike = Pick<
  RechargeOrder,
  | "id"
  | "network"
  | "walletAddress"
  | "amountMicros"
  | "txHash"
  | "status"
  | "verificationStatus"
>;

type TxClient = PrismaClient | Prisma.TransactionClient;

export async function syncRechargeVerification(
  tx: TxClient,
  recharge: RechargeLike,
  locale: Locale = "zh",
) {
  const currentRecharge = await tx.rechargeOrder.findUnique({
    where: {
      id: recharge.id,
    },
    select: {
      id: true,
      network: true,
      walletAddress: true,
      amountMicros: true,
      txHash: true,
      status: true,
      verificationStatus: true,
    },
  });

  if (!currentRecharge || !isRechargeOpenStatus(currentRecharge.status)) {
    throw new Error("当前充值单状态已锁定，不能再覆盖核验结果。");
  }

  const verification = await verifyRechargeOnChain(currentRecharge, locale);

  const updateResult = await tx.rechargeOrder.updateMany({
    where: {
      id: currentRecharge.id,
      status: {
        in: [RechargeStatus.AWAITING_PAYMENT, RechargeStatus.UNDER_REVIEW],
      },
    },
    data: {
      verificationStatus: verification.status,
      verificationMessage: verification.message,
      verificationCheckedAt: new Date(),
      verificationConfirmations: verification.confirmations,
      verificationBlockNumber: verification.blockNumber,
      verificationDetectedAmountMicros: verification.detectedAmountMicros,
      verificationDetectedToAddress: verification.detectedToAddress,
      ...(currentRecharge.status === RechargeStatus.AWAITING_PAYMENT &&
      currentRecharge.txHash
        ? { status: RechargeStatus.UNDER_REVIEW }
        : {}),
    },
  });

  if (updateResult.count !== 1) {
    throw new Error("当前充值单状态已锁定，不能再覆盖核验结果。");
  }

  const updatedRecharge = await tx.rechargeOrder.findUnique({
    where: {
      id: currentRecharge.id,
    },
  });

  if (!updatedRecharge) {
    throw new Error("充值单不存在。");
  }

  return updatedRecharge;
}

export async function expireStaleRechargeOrders(
  tx: TxClient,
  now: Date = new Date(),
) {
  const result = await tx.rechargeOrder.updateMany({
    where: {
      status: RechargeStatus.AWAITING_PAYMENT,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: RechargeStatus.EXPIRED,
    },
  });

  return result.count;
}

export async function expireRechargeIfNeeded(
  tx: TxClient,
  recharge: Pick<RechargeOrder, "id" | "status" | "expiresAt">,
  now: Date = new Date(),
) {
  if (!isRechargeExpired(recharge, now)) {
    return false;
  }

  await tx.rechargeOrder.update({
    where: {
      id: recharge.id,
    },
    data: {
      status: RechargeStatus.EXPIRED,
    },
  });

  return true;
}

export function rechargeIsReadyForApproval(
  recharge: Pick<RechargeOrder, "txHash" | "verificationStatus">,
) {
  return (
    Boolean(recharge.txHash) &&
    recharge.verificationStatus === RechargeVerificationStatus.VERIFIED
  );
}

export function rechargeCanBeRechecked(
  recharge: Pick<RechargeOrder, "status" | "expiresAt">,
) {
  return canRecheckRecharge(recharge);
}
