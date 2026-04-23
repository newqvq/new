"use server";

import {
  LedgerDirection,
  LedgerType,
  OrderDeliveryType,
  OrderStatus,
  ProductStatus,
  RechargeProvider,
  RechargeNetwork,
  RechargeStatus,
  WithdrawalStatus,
  UpstreamProvider,
  UpstreamServiceType,
  UpstreamSubmissionStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { getActionCopy } from "@/lib/action-copy";
import { CrazysmmApiError, submitCrazysmmOrder } from "@/lib/crazysmm";
import { createCryptomusInvoice } from "@/lib/cryptomus";
import { env } from "@/lib/env";
import { getFulfillmentCopy } from "@/lib/fulfillment-copy";
import { getCurrentLocale } from "@/lib/i18n-server";
import { parseUsdt } from "@/lib/money";
import {
  buildStoredUpstreamRequest,
  isAutomatedProduct,
  parseOrderRequest,
} from "@/lib/order-fulfillment";
import { prisma } from "@/lib/prisma";
import { getRequestContext } from "@/lib/request-context";
import { consumeRateLimits, throttlePolicies } from "@/lib/rate-limit";
import {
  expireRechargeIfNeeded,
  syncRechargeVerification,
} from "@/lib/recharge-service";
import {
  canRecheckRecharge,
  canSubmitRechargeProof,
  isRechargeNetworkEnabled,
} from "@/lib/recharge-workflow";
import { getSecurityCopy } from "@/lib/security-copy";
import { getRechargeAddress, getRechargeNetworkMeta } from "@/lib/site";
import {
  applyCrazysmmOrderSync,
  refundOrderBalance,
  serializeUpstreamResponse,
  syncCrazysmmOrderStatus,
} from "@/lib/upstream-order-service";
import { validateWithdrawalAddress } from "@/lib/withdrawal";
import { getWithdrawalCopy } from "@/lib/withdrawal-copy";
import { generateSerial, withQueryMessage } from "@/lib/utils";

const createRechargeSchema = z.object({
  amount: z.string().trim().min(1),
  network: z.nativeEnum(RechargeNetwork),
});

function createSubmitProofSchema(
  copy: ReturnType<typeof getActionCopy>["shop"]["validation"],
) {
  return z.object({
    rechargeOrderId: z.string().trim().min(1),
    txHash: z
      .string()
      .trim()
      .min(12, copy.txHashInvalid)
      .max(128, copy.txHashTooLong),
    proofNote: z.string().trim().max(200).optional(),
  });
}

const recheckSchema = z.object({
  rechargeOrderId: z.string().trim().min(1),
  returnTo: z.string().trim().optional(),
});

const placeOrderSchema = z.object({
  productId: z.string().trim().min(1),
});

const syncOrderSchema = z.object({
  orderId: z.string().trim().min(1),
  returnTo: z.string().trim().optional(),
});

const createWithdrawalSchema = z.object({
  amount: z.string().trim().min(1),
  network: z.nativeEnum(RechargeNetwork),
  walletAddress: z.string().trim().min(10).max(128),
  userNote: z.string().trim().max(200).optional(),
});

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function createWithdrawalRequestAction(formData: FormData) {
  const session = await requireSession();
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const withdrawalCopy = getWithdrawalCopy(locale);

  if (session.role === "ADMIN") {
    redirect(withQueryMessage("/admin/withdrawals", "error", withdrawalCopy.user.unavailableForAdmin));
  }

  try {
    await consumeRateLimits(
      [
        {
          scope: "shop.withdrawal.create.user",
          subject: `user:${session.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "shop.withdrawal.create.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.placeOrder,
      securityCopy.orderTooManyAttempts,
    );
  } catch (error) {
    redirect(
      withQueryMessage(
        "/dashboard",
        "error",
        resolveErrorMessage(error, securityCopy.orderTooManyAttempts),
      ),
    );
  }

  const parsed = createWithdrawalSchema.safeParse({
    amount: formData.get("amount"),
    network: formData.get("network"),
    walletAddress: formData.get("walletAddress"),
    userNote: formData.get("userNote") || undefined,
  });

  if (!parsed.success) {
    redirect(withQueryMessage("/dashboard", "error", actionCopy.common.invalidAmount));
  }

  let amountMicros: bigint;
  try {
    amountMicros = parseUsdt(parsed.data.amount);
  } catch {
    redirect(withQueryMessage("/dashboard", "error", actionCopy.common.invalidAmount));
  }

  if (amountMicros < 1_000_000n) {
    redirect(withQueryMessage("/dashboard", "error", withdrawalCopy.messages.amountTooSmall));
  }

  let walletAddress: string;
  try {
    walletAddress = validateWithdrawalAddress(
      parsed.data.network,
      parsed.data.walletAddress,
      locale,
    );
  } catch (error) {
    redirect(
      withQueryMessage(
        "/dashboard",
        "error",
        resolveErrorMessage(error, withdrawalCopy.messages.invalidAddress),
      ),
    );
  }

  const withdrawalSerial = generateSerial("WD");

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId: session.userId,
        },
      });

      if (!wallet) {
        throw new Error(actionCopy.shop.messages.walletMissing);
      }

      if (wallet.balanceMicros < amountMicros) {
        throw new Error(withdrawalCopy.messages.amountInsufficient);
      }

      const updated = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          version: wallet.version,
          balanceMicros: {
            gte: amountMicros,
          },
        },
        data: {
          balanceMicros: {
            decrement: amountMicros,
          },
          version: {
            increment: 1,
          },
        },
      });

      if (updated.count !== 1) {
        throw new Error(actionCopy.shop.messages.balanceChanged);
      }

      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          serialNo: withdrawalSerial,
          userId: session.userId,
          network: parsed.data.network,
          walletAddress,
          amountMicros,
          userNote: parsed.data.userNote,
          status: WithdrawalStatus.PENDING,
        },
      });

      await tx.walletLedger.create({
        data: {
          entryKey: `withdrawal-request:${withdrawalRequest.id}`,
          walletId: wallet.id,
          userId: session.userId,
          withdrawalRequestId: withdrawalRequest.id,
          type: LedgerType.WITHDRAWAL_REQUEST,
          direction: LedgerDirection.DEBIT,
          amountMicros,
          balanceBeforeMicros: wallet.balanceMicros,
          balanceAfterMicros: wallet.balanceMicros - amountMicros,
          note: `Withdrawal request: ${withdrawalRequest.serialNo}`,
        },
      });
    });
  } catch (error) {
    redirect(
      withQueryMessage(
        "/dashboard",
        "error",
        resolveErrorMessage(error, actionCopy.common.submitFailed),
      ),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin/users");
  redirect(
    withQueryMessage(
      "/dashboard",
      "success",
      withdrawalCopy.messages.requestCreated(withdrawalSerial),
    ),
  );
}

export async function createRechargeOrderAction(formData: FormData) {
  const session = await requireSession();
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);

  try {
    await consumeRateLimits(
      [
        {
          scope: "shop.recharge.create.user",
          subject: `user:${session.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "shop.recharge.create.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.rechargeCreate,
      securityCopy.rechargeTooManyAttempts,
    );
  } catch (error) {
    redirect(
      withQueryMessage(
        "/recharge",
        "error",
        resolveErrorMessage(error, securityCopy.rechargeTooManyAttempts),
      ),
    );
  }

  const parsed = createRechargeSchema.safeParse({
    amount: formData.get("amount"),
    network: formData.get("network"),
  });

  if (!parsed.success) {
    redirect(
      withQueryMessage("/recharge", "error", actionCopy.shop.messages.rechargeIncomplete),
    );
  }

  let amountMicros: bigint;
  try {
    amountMicros = parseUsdt(parsed.data.amount);
  } catch {
    redirect(withQueryMessage("/recharge", "error", actionCopy.common.invalidAmount));
  }

  const networkMeta = getRechargeNetworkMeta(parsed.data.network);

  if (!isRechargeNetworkEnabled(networkMeta)) {
    redirect(
      withQueryMessage(
        "/recharge",
        "error",
        actionCopy.shop.messages.networkDisabled(networkMeta.label),
      ),
    );
  }

  if (amountMicros < 10_000_000n) {
    redirect(
      withQueryMessage("/recharge", "error", actionCopy.shop.messages.rechargeTooSmall),
    );
  }

  let rechargeOrder;
  let paymentUrl = "";

  try {
    const serialNo = generateSerial("RC");
    const invoice = await createCryptomusInvoice({
      amountMicros,
      network: parsed.data.network,
      serialNo,
    });

    rechargeOrder = await prisma.rechargeOrder.create({
      data: {
        serialNo,
        userId: session.userId,
        network: parsed.data.network,
        walletAddress: invoice.address || getRechargeAddress(parsed.data.network),
        amountMicros,
        provider: RechargeProvider.CRYPTOMUS,
        providerPaymentUuid: invoice.uuid,
        providerPaymentUrl: invoice.paymentUrl || null,
        providerStatus: invoice.status,
        providerPayload: invoice.raw,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
      },
    });
    paymentUrl = invoice.paymentUrl;
  } catch (error) {
    redirect(
      withQueryMessage(
        "/recharge",
        "error",
        resolveErrorMessage(error, actionCopy.common.submitFailed),
      ),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/recharge");

  if (paymentUrl) {
    redirect(paymentUrl);
  }

  redirect(
    withQueryMessage(
      `/recharge#${rechargeOrder.id}`,
      "success",
      actionCopy.shop.messages.rechargeCreated(rechargeOrder.serialNo),
    ),
  );
}

export async function submitRechargeProofAction(formData: FormData) {
  const session = await requireSession();
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const submitProofSchema = createSubmitProofSchema(actionCopy.shop.validation);

  try {
    await consumeRateLimits(
      [
        {
          scope: "shop.recharge.proof.user",
          subject: `user:${session.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "shop.recharge.proof.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.rechargeProof,
      securityCopy.rechargeTooManyAttempts,
    );
  } catch (error) {
    redirect(
      withQueryMessage(
        "/recharge",
        "error",
        resolveErrorMessage(error, securityCopy.rechargeTooManyAttempts),
      ),
    );
  }

  const parsed = submitProofSchema.safeParse({
    rechargeOrderId: formData.get("rechargeOrderId"),
    txHash: formData.get("txHash"),
    proofNote: formData.get("proofNote") || undefined,
  });

  if (!parsed.success) {
    redirect(
      withQueryMessage(
        "/recharge",
        "error",
        parsed.error.issues[0]?.message ?? actionCopy.shop.messages.proofIncomplete,
      ),
    );
  }

  try {
    const recharge = await prisma.rechargeOrder.findFirst({
      where: {
        id: parsed.data.rechargeOrderId,
        userId: session.userId,
      },
    });

    if (!recharge) {
      redirect(withQueryMessage("/recharge", "error", actionCopy.shop.messages.rechargeMissing));
    }

    if (!canSubmitRechargeProof(recharge)) {
      if (await expireRechargeIfNeeded(prisma, recharge)) {
        redirect(
          withQueryMessage(
            "/recharge",
            "error",
            actionCopy.shop.messages.rechargeExpiredRecreate,
          ),
        );
      }

      redirect(
        withQueryMessage("/recharge", "error", actionCopy.shop.messages.rechargeProcessed),
      );
    }

    const updateResult = await prisma.rechargeOrder.updateMany({
      where: {
        id: parsed.data.rechargeOrderId,
        status: {
          in: [RechargeStatus.AWAITING_PAYMENT, RechargeStatus.UNDER_REVIEW],
        },
      },
      data: {
        txHash: parsed.data.txHash,
        proofNote: parsed.data.proofNote,
        submittedAt: new Date(),
        status: RechargeStatus.UNDER_REVIEW,
      },
    });

    if (updateResult.count !== 1) {
      throw new Error(actionCopy.shop.messages.rechargeProcessed);
    }

    const updated = await prisma.rechargeOrder.findUnique({
      where: {
        id: parsed.data.rechargeOrderId,
      },
    });

    if (!updated) {
      throw new Error(actionCopy.shop.messages.rechargeMissing);
    }

    await syncRechargeVerification(prisma, updated, locale);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(withQueryMessage("/recharge", "error", actionCopy.shop.messages.txHashUsed));
    }

    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/recharge");
  redirect(
    withQueryMessage("/recharge", "success", actionCopy.shop.messages.txHashSubmitted),
  );
}

export async function recheckRechargeVerificationAction(formData: FormData) {
  const session = await requireSession();
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const parsed = recheckSchema.safeParse({
    rechargeOrderId: formData.get("rechargeOrderId"),
    returnTo: formData.get("returnTo") || undefined,
  });

  const returnTo =
    parsed.success && parsed.data.returnTo ? parsed.data.returnTo : "/recharge";

  if (!parsed.success) {
    redirect(
      withQueryMessage(returnTo, "error", actionCopy.shop.messages.recheckParamsInvalid),
    );
  }

  try {
    await consumeRateLimits(
      [
        {
          scope: "shop.recharge.recheck.user",
          subject: `user:${session.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "shop.recharge.recheck.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.rechargeRecheck,
      securityCopy.rechargeTooManyAttempts,
    );
  } catch (error) {
    redirect(
      withQueryMessage(
        returnTo,
        "error",
        resolveErrorMessage(error, securityCopy.rechargeTooManyAttempts),
      ),
    );
  }

  const recharge = await prisma.rechargeOrder.findUnique({
    where: {
      id: parsed.data.rechargeOrderId,
    },
  });

  if (!recharge) {
    redirect(withQueryMessage(returnTo, "error", actionCopy.shop.messages.rechargeMissing));
  }

  const isOwner = recharge.userId === session.userId;
  const isAdmin = session.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect(
      withQueryMessage(returnTo, "error", actionCopy.shop.messages.rechargeUnauthorized),
    );
  }

  if (!canRecheckRecharge(recharge)) {
    if (await expireRechargeIfNeeded(prisma, recharge)) {
      redirect(
        withQueryMessage(returnTo, "error", actionCopy.shop.messages.rechargeExpiredNoNeed),
      );
    }

    redirect(withQueryMessage(returnTo, "error", actionCopy.shop.messages.rechargeLocked));
  }

  await syncRechargeVerification(prisma, recharge, locale);

  revalidatePath("/dashboard");
  revalidatePath("/recharge");
  revalidatePath("/admin/recharges");
  redirect(withQueryMessage(returnTo, "success", actionCopy.shop.messages.recheckSuccess));
}

export async function placeOrderAction(formData: FormData) {
  const session = await requireSession();
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const parsed = placeOrderSchema.safeParse({
    productId: formData.get("productId"),
  });

  if (!parsed.success) {
    redirect(withQueryMessage("/", "error", actionCopy.shop.messages.orderIncomplete));
  }

  let successMessage: string = actionCopy.shop.messages.orderSuccess;

  try {
    await consumeRateLimits(
      [
        {
          scope: "shop.order.place.user",
          subject: `user:${session.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "shop.order.place.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.placeOrder,
      securityCopy.orderTooManyAttempts,
    );

    const product = await prisma.product.findUnique({
      where: {
        id: parsed.data.productId,
      },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new Error(actionCopy.shop.messages.productUnavailable);
    }

    const orderRequest = parseOrderRequest(product, formData, locale);

    if (isAutomatedProduct(product) && !env.CRAZYSMM_API_KEY) {
      throw new Error(fulfillmentCopy.messages.upstreamCredentialsMissing);
    }

    const order = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId: session.userId,
        },
      });

      if (!wallet) {
        throw new Error(actionCopy.shop.messages.walletMissing);
      }

      if (wallet.balanceMicros < product.priceMicros) {
        throw new Error(actionCopy.shop.messages.balanceInsufficient);
      }

      const updated = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          version: wallet.version,
          balanceMicros: {
            gte: product.priceMicros,
          },
        },
        data: {
          balanceMicros: {
            decrement: product.priceMicros,
          },
          version: {
            increment: 1,
          },
        },
      });

      if (updated.count !== 1) {
        throw new Error(actionCopy.shop.messages.balanceChanged);
      }

      const order = await tx.order.create({
        data: {
          serialNo: generateSerial("OD"),
          userId: session.userId,
          productId: product.id,
          productSnapshotName: product.name,
          productSnapshotPriceMicros: product.priceMicros,
          userNote: orderRequest.userNote,
          deliveryType: orderRequest.deliveryType,
          targetLink: orderRequest.targetLink,
          quantity: orderRequest.quantity,
          runs: orderRequest.runs,
          intervalMinutes: orderRequest.intervalMinutes,
          commentsText: orderRequest.commentsText,
          subscriptionUsername: orderRequest.subscriptionUsername,
          subscriptionMin: orderRequest.subscriptionMin,
          subscriptionMax: orderRequest.subscriptionMax,
          subscriptionPosts: orderRequest.subscriptionPosts,
          subscriptionOldPosts: orderRequest.subscriptionOldPosts,
          subscriptionDelayMinutes: orderRequest.subscriptionDelayMinutes,
          subscriptionExpiry: orderRequest.subscriptionExpiry,
          upstreamProvider:
            orderRequest.deliveryType === OrderDeliveryType.CRAZYSMM
              ? UpstreamProvider.CRAZYSMM
              : null,
          upstreamServiceId: orderRequest.upstreamServiceId,
          upstreamServiceType: orderRequest.upstreamServiceType,
          upstreamSubmissionStatus: orderRequest.submissionStatus,
          upstreamRequestPayload: buildStoredUpstreamRequest(orderRequest),
        },
      });

      await tx.walletLedger.create({
        data: {
          entryKey: `order-payment:${order.id}`,
          walletId: wallet.id,
          userId: session.userId,
          orderId: order.id,
          type: LedgerType.ORDER_PAYMENT,
          direction: LedgerDirection.DEBIT,
          amountMicros: product.priceMicros,
          balanceBeforeMicros: wallet.balanceMicros,
          balanceAfterMicros: wallet.balanceMicros - product.priceMicros,
          note: `Order payment: ${product.name}`,
        },
      });

      return order;
    });

    if (isAutomatedProduct(product) && order.upstreamServiceId && order.upstreamServiceType) {
      try {
        let upstreamResponse;

        if (order.upstreamServiceType === UpstreamServiceType.DEFAULT) {
          upstreamResponse = await submitCrazysmmOrder(order.upstreamServiceType, {
            service: order.upstreamServiceId,
            link: order.targetLink!,
            quantity: order.quantity!,
            runs: order.runs ?? undefined,
            interval: order.intervalMinutes ?? undefined,
          });
        } else if (order.upstreamServiceType === UpstreamServiceType.CUSTOM_COMMENTS) {
          upstreamResponse = await submitCrazysmmOrder(order.upstreamServiceType, {
            service: order.upstreamServiceId,
            link: order.targetLink!,
            comments: order.commentsText!.split("\n").filter(Boolean),
          });
        } else {
          upstreamResponse = await submitCrazysmmOrder(order.upstreamServiceType, {
            service: order.upstreamServiceId,
            username: order.subscriptionUsername!,
            min: order.subscriptionMin!,
            max: order.subscriptionMax!,
            delay: order.subscriptionDelayMinutes!,
            posts: order.subscriptionPosts ?? undefined,
            old_posts: order.subscriptionOldPosts ?? undefined,
            expiry: order.subscriptionExpiry?.toISOString() ?? undefined,
          });
        }

        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: OrderStatus.PROCESSING,
            upstreamOrderId: String(upstreamResponse.order),
            upstreamStatus: "Pending",
            upstreamSubmissionStatus: UpstreamSubmissionStatus.SUBMITTED,
            upstreamSubmittedAt: new Date(),
            upstreamLastSyncAt: new Date(),
            upstreamSyncMessage: fulfillmentCopy.messages.orderSubmittedUpstream,
            upstreamResponsePayload: serializeUpstreamResponse(upstreamResponse),
          },
        });

        successMessage = fulfillmentCopy.messages.orderSubmittedUpstream;
      } catch (error) {
        if (error instanceof CrazysmmApiError && error.code === "hard") {
          await prisma.$transaction(async (tx) => {
            await refundOrderBalance(
              tx,
              order.id,
              session.userId,
              `Refund after upstream submit failure: ${error.message}`,
              {
                upstreamSubmissionStatus: UpstreamSubmissionStatus.FAILED,
                upstreamSyncMessage: error.message,
                upstreamResponsePayload: serializeUpstreamResponse({
                  error: error.message,
                }),
              },
            );
          });

          throw new Error(error.message);
        }

        const message =
          error instanceof Error
            ? error.message
            : fulfillmentCopy.messages.orderQueuedForReview;

        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: OrderStatus.PENDING,
            upstreamSubmissionStatus: UpstreamSubmissionStatus.UNKNOWN,
            upstreamSyncMessage: message,
            fulfillmentNote: message,
            upstreamResponsePayload: serializeUpstreamResponse({
              error: message,
            }),
          },
        });

        successMessage = fulfillmentCopy.messages.orderQueuedForReview;
      }
    }
  } catch (error) {
    redirect(
      withQueryMessage(
        "/orders",
        "error",
        resolveErrorMessage(error, actionCopy.common.submitFailed),
      ),
    );
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  redirect(withQueryMessage("/orders", "success", successMessage));
}

export async function syncOrderUpstreamAction(formData: FormData) {
  const session = await requireSession();
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const parsed = syncOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    returnTo: formData.get("returnTo") || undefined,
  });

  const returnTo =
    parsed.success && parsed.data.returnTo ? parsed.data.returnTo : "/orders";

  if (!parsed.success) {
    redirect(withQueryMessage(returnTo, "error", fulfillmentCopy.messages.upstreamSyncUnavailable));
  }

  try {
    await consumeRateLimits(
      [
        {
          scope: "shop.order.sync.user",
          subject: `user:${session.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "shop.order.sync.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.orderSync,
      securityCopy.orderTooManyAttempts,
    );

    const order = await prisma.order.findUnique({
      where: {
        id: parsed.data.orderId,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        deliveryType: true,
        upstreamProvider: true,
        upstreamOrderId: true,
        upstreamStatus: true,
        upstreamSubmissionStatus: true,
      },
    });

    if (!order || (order.userId !== session.userId && session.role !== "ADMIN")) {
      throw new Error(fulfillmentCopy.messages.upstreamSyncUnavailable);
    }

    const syncResult = await syncCrazysmmOrderStatus(order);

    await prisma.$transaction(async (tx) => {
      await applyCrazysmmOrderSync(tx, order.id, syncResult.nextStatus, syncResult.upstream);
    });
  } catch (error) {
    redirect(
      withQueryMessage(
        returnTo,
        "error",
        resolveErrorMessage(error, fulfillmentCopy.messages.upstreamSyncUnavailable),
      ),
    );
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/admin/orders");
  redirect(withQueryMessage(returnTo, "success", fulfillmentCopy.messages.upstreamStatusSynced));
}
