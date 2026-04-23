import { Prisma, RechargeProvider, RechargeStatus, RechargeVerificationStatus } from "@prisma/client";

import {
  CryptomusWebhookPayload,
  getCryptomusNetwork,
  isCryptomusFailedFinal,
  isCryptomusPaidFinal,
  verifyCryptomusWebhookSignature,
} from "./cryptomus";
import { parseUsdt } from "./money";
import { prisma } from "./prisma";
import { creditRechargeToWallet } from "./recharge-service";

function compactPayload(payload: CryptomusWebhookPayload) {
  return JSON.stringify(payload).slice(0, 60_000);
}

function parseCryptomusAmountMicros(payload: CryptomusWebhookPayload) {
  const source = payload.payment_amount ?? payload.amount ?? payload.payer_amount;

  if (!source) {
    return null;
  }

  const [whole, fraction = ""] = String(source).split(".");
  const normalized = `${whole}.${fraction.slice(0, 6)}`;

  try {
    return parseUsdt(normalized);
  } catch {
    return null;
  }
}

export async function processCryptomusWebhook(payload: CryptomusWebhookPayload) {
  if (!verifyCryptomusWebhookSignature(payload)) {
    return { ok: false, status: 401, message: "Invalid signature." };
  }

  if (!payload.order_id && !payload.uuid) {
    return { ok: false, status: 400, message: "Missing order id." };
  }

  const recharge = await prisma.rechargeOrder.findFirst({
    where: {
      OR: [
        ...(payload.order_id ? [{ serialNo: payload.order_id }] : []),
        ...(payload.uuid ? [{ providerPaymentUuid: payload.uuid }] : []),
      ],
    },
  });

  if (!recharge || recharge.provider !== RechargeProvider.CRYPTOMUS) {
    return { ok: false, status: 404, message: "Recharge order not found." };
  }

  if (payload.uuid && recharge.providerPaymentUuid && payload.uuid !== recharge.providerPaymentUuid) {
    return { ok: false, status: 409, message: "Payment uuid mismatch." };
  }

  if (payload.network && payload.network !== getCryptomusNetwork(recharge.network)) {
    return { ok: false, status: 409, message: "Payment network mismatch." };
  }

  if (payload.currency && payload.currency !== "USDT") {
    return { ok: false, status: 409, message: "Payment currency mismatch." };
  }

  const providerPayload = compactPayload(payload);
  const detectedAmountMicros = parseCryptomusAmountMicros(payload);
  const txHash = payload.txid ? String(payload.txid).trim() : undefined;
  const providerStatus = payload.status ?? "unknown";

  if (isCryptomusPaidFinal(payload)) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.rechargeOrder.update({
          where: {
            id: recharge.id,
          },
          data: {
            txHash: txHash || recharge.txHash,
            providerPaymentUuid: payload.uuid ?? recharge.providerPaymentUuid,
            providerStatus,
            providerPayload,
            verificationStatus: RechargeVerificationStatus.VERIFIED,
            verificationMessage: "Payment confirmed by Cryptomus webhook.",
            verificationCheckedAt: new Date(),
            verificationDetectedAmountMicros: detectedAmountMicros,
            verificationDetectedToAddress: recharge.walletAddress,
            submittedAt: recharge.submittedAt ?? new Date(),
          },
        });

        await creditRechargeToWallet(tx, recharge.id, {
          providerStatus,
          providerPayload,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false, status: 409, message: "Duplicate transaction hash." };
      }

      throw error;
    }

    return { ok: true, status: 200, message: "credited" };
  }

  if (isCryptomusFailedFinal(payload)) {
    if (recharge.status === RechargeStatus.APPROVED) {
      await prisma.rechargeOrder.update({
        where: {
          id: recharge.id,
        },
        data: {
          providerStatus,
          providerPayload,
        },
      });

      return { ok: true, status: 200, message: "already credited" };
    }

    await prisma.rechargeOrder.update({
      where: {
        id: recharge.id,
      },
      data: {
        status: RechargeStatus.REJECTED,
        providerPaymentUuid: payload.uuid ?? recharge.providerPaymentUuid,
        providerStatus,
        providerPayload,
        verificationStatus: RechargeVerificationStatus.FAILED,
        verificationMessage: `Cryptomus payment ended with status: ${providerStatus}`,
        verificationCheckedAt: new Date(),
        verificationDetectedAmountMicros: detectedAmountMicros,
        txHash: txHash || recharge.txHash,
      },
    });

    return { ok: true, status: 200, message: "closed" };
  }

  await prisma.rechargeOrder.update({
    where: {
      id: recharge.id,
    },
    data: {
      providerPaymentUuid: payload.uuid ?? recharge.providerPaymentUuid,
      providerStatus,
      providerPayload,
      verificationStatus: RechargeVerificationStatus.PENDING,
      verificationMessage: `Cryptomus payment status: ${providerStatus}`,
      verificationCheckedAt: new Date(),
      verificationDetectedAmountMicros: detectedAmountMicros,
      txHash: txHash || recharge.txHash,
      status: txHash ? RechargeStatus.UNDER_REVIEW : recharge.status,
    },
  });

  return { ok: true, status: 200, message: "updated" };
}
