import {
  CommissionStatus,
  LedgerDirection,
  LedgerType,
  Prisma,
  PrismaClient,
  RechargeOrder,
  RechargeStatus,
  RechargeVerificationStatus,
} from "@prisma/client";

import { env } from "./env";
import { Locale } from "./i18n";
import { calculateByBasisPoints } from "./money";
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

export async function creditRechargeToWallet(
  tx: TxClient,
  rechargeOrderId: string,
  options: {
    createdById?: string | null;
    adminNote?: string;
    providerStatus?: string;
    providerPayload?: string;
  } = {},
) {
  const currentRecharge = await tx.rechargeOrder.findUnique({
    where: {
      id: rechargeOrderId,
    },
    include: {
      user: {
        include: {
          wallet: true,
          referrer: {
            include: {
              wallet: true,
            },
          },
        },
      },
    },
  });

  if (!currentRecharge) {
    throw new Error("Recharge order does not exist.");
  }

  if (!currentRecharge.user.wallet) {
    throw new Error("User wallet does not exist.");
  }

  const alreadyCredited = await tx.walletLedger.findUnique({
    where: {
      entryKey: `recharge:${currentRecharge.id}`,
    },
    select: {
      id: true,
    },
  });

  if (alreadyCredited || currentRecharge.status === RechargeStatus.APPROVED) {
    return { credited: false, recharge: currentRecharge };
  }

  if (
    currentRecharge.status !== RechargeStatus.AWAITING_PAYMENT &&
    currentRecharge.status !== RechargeStatus.UNDER_REVIEW
  ) {
    throw new Error("Recharge order is already closed.");
  }

  await tx.rechargeOrder.update({
    where: {
      id: currentRecharge.id,
    },
    data: {
      status: RechargeStatus.APPROVED,
      creditedMicros: currentRecharge.amountMicros,
      verificationStatus: RechargeVerificationStatus.VERIFIED,
      verificationMessage: "Payment confirmed by Cryptomus.",
      verificationCheckedAt: new Date(),
      adminNote: options.adminNote,
      reviewerId: options.createdById ?? null,
      reviewedAt: new Date(),
      providerStatus: options.providerStatus,
      providerPayload: options.providerPayload,
    },
  });

  const userWalletBefore = currentRecharge.user.wallet.balanceMicros;

  await tx.wallet.update({
    where: {
      id: currentRecharge.user.wallet.id,
    },
    data: {
      balanceMicros: {
        increment: currentRecharge.amountMicros,
      },
      version: {
        increment: 1,
      },
    },
  });

  await tx.walletLedger.create({
    data: {
      entryKey: `recharge:${currentRecharge.id}`,
      walletId: currentRecharge.user.wallet.id,
      userId: currentRecharge.userId,
      rechargeOrderId: currentRecharge.id,
      createdById: options.createdById ?? null,
      type: LedgerType.RECHARGE,
      direction: LedgerDirection.CREDIT,
      amountMicros: currentRecharge.amountMicros,
      balanceBeforeMicros: userWalletBefore,
      balanceAfterMicros: userWalletBefore + currentRecharge.amountMicros,
      note: `Recharge credited: ${currentRecharge.serialNo}`,
    },
  });

  if (currentRecharge.user.referrerId && currentRecharge.user.referrer?.wallet) {
    const commissionAmount = calculateByBasisPoints(
      currentRecharge.amountMicros,
      env.COMMISSION_RATE_BPS,
    );

    if (commissionAmount > 0n) {
      const commission = await tx.commissionRecord.create({
        data: {
          rechargeOrderId: currentRecharge.id,
          fromUserId: currentRecharge.userId,
          toUserId: currentRecharge.user.referrerId,
          rateBasisPoints: env.COMMISSION_RATE_BPS,
          amountMicros: commissionAmount,
          status: CommissionStatus.SETTLED,
          note: `Recharge commission from ${currentRecharge.serialNo}`,
        },
      });

      const referrerWalletBefore = currentRecharge.user.referrer.wallet.balanceMicros;

      await tx.wallet.update({
        where: {
          id: currentRecharge.user.referrer.wallet.id,
        },
        data: {
          balanceMicros: {
            increment: commissionAmount,
          },
          version: {
            increment: 1,
          },
        },
      });

      await tx.walletLedger.create({
        data: {
          entryKey: `commission:${commission.id}`,
          walletId: currentRecharge.user.referrer.wallet.id,
          userId: currentRecharge.user.referrerId,
          rechargeOrderId: currentRecharge.id,
          commissionRecordId: commission.id,
          createdById: options.createdById ?? null,
          type: LedgerType.COMMISSION,
          direction: LedgerDirection.CREDIT,
          amountMicros: commissionAmount,
          balanceBeforeMicros: referrerWalletBefore,
          balanceAfterMicros: referrerWalletBefore + commissionAmount,
          note: `Commission from referred user ${currentRecharge.user.displayName}`,
        },
      });
    }
  }

  return { credited: true, recharge: currentRecharge };
}
