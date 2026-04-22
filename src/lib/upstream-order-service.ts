import {
  LedgerDirection,
  LedgerType,
  Order,
  OrderDeliveryType,
  OrderStatus,
  Prisma,
  UpstreamProvider,
  UpstreamSubmissionStatus,
} from "@prisma/client";

import { fetchCrazysmmOrderStatus } from "./crazysmm";
import { mapUpstreamStatusToOrderStatus } from "./order-fulfillment";

type PrismaLike = Prisma.TransactionClient;

type RefundOrderExtras = {
  deliveryType?: OrderDeliveryType;
  status?: OrderStatus;
  upstreamStatus?: string | null;
  upstreamSubmissionStatus?: UpstreamSubmissionStatus;
  upstreamLastSyncAt?: Date | null;
  upstreamSyncMessage?: string | null;
  upstreamResponsePayload?: string | null;
};

function serializePayload(value: unknown) {
  const serialized = JSON.stringify(value);
  return serialized.length > 4000 ? `${serialized.slice(0, 3997)}...` : serialized;
}

export async function refundOrderBalance(
  tx: PrismaLike,
  orderId: string,
  actorUserId: string,
  note: string,
  extraOrderData?: RefundOrderExtras,
) {
  const order = await tx.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      user: {
        include: {
          wallet: true,
        },
      },
    },
  });

  if (!order || !order.user.wallet) {
    throw new Error("Order or user wallet is missing.");
  }

  const refundEntryKey = `order-refund:${order.id}`;
  const existingRefund = await tx.walletLedger.findUnique({
    where: {
      entryKey: refundEntryKey,
    },
    select: {
      id: true,
    },
  });

  if (!existingRefund) {
    const walletBefore = order.user.wallet.balanceMicros;

    await tx.wallet.update({
      where: {
        id: order.user.wallet.id,
      },
      data: {
        balanceMicros: {
          increment: order.productSnapshotPriceMicros,
        },
        version: {
          increment: 1,
        },
      },
    });

    await tx.walletLedger.create({
      data: {
        entryKey: refundEntryKey,
        walletId: order.user.wallet.id,
        userId: order.userId,
        orderId: order.id,
        createdById: actorUserId,
        type: LedgerType.ORDER_REFUND,
        direction: LedgerDirection.CREDIT,
        amountMicros: order.productSnapshotPriceMicros,
        balanceBeforeMicros: walletBefore,
        balanceAfterMicros: walletBefore + order.productSnapshotPriceMicros,
        note,
      },
    });
  }

  return tx.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.REFUNDED,
      handlerId: actorUserId,
      handledAt: new Date(),
      fulfillmentNote: note,
      ...extraOrderData,
    },
  });
}

export async function syncCrazysmmOrderStatus(
  order: Pick<
    Order,
    | "id"
    | "status"
    | "deliveryType"
    | "upstreamOrderId"
    | "upstreamStatus"
    | "upstreamSubmissionStatus"
    | "upstreamProvider"
  >,
) {
  if (
    order.deliveryType !== OrderDeliveryType.CRAZYSMM ||
    order.upstreamProvider !== UpstreamProvider.CRAZYSMM ||
    !order.upstreamOrderId
  ) {
    throw new Error("Order is not linked to a CRAZYSMM upstream order.");
  }

  const upstream = await fetchCrazysmmOrderStatus(order.upstreamOrderId);
  return {
    upstream,
    nextStatus:
      order.status === OrderStatus.REFUNDED
        ? OrderStatus.REFUNDED
        : mapUpstreamStatusToOrderStatus(upstream.status),
  };
}

export async function applyCrazysmmOrderSync(
  tx: PrismaLike,
  orderId: string,
  nextStatus: OrderStatus,
  upstream: Awaited<ReturnType<typeof fetchCrazysmmOrderStatus>>,
) {
  return tx.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: nextStatus,
      upstreamStatus: upstream.status ?? null,
      upstreamCharge: upstream.charge ?? null,
      upstreamStartCount: upstream.start_count ?? null,
      upstreamRemains: upstream.remains ?? null,
      upstreamCurrency: upstream.currency ?? null,
      upstreamSubmissionStatus: UpstreamSubmissionStatus.SUBMITTED,
      upstreamLastSyncAt: new Date(),
      upstreamSyncMessage: upstream.status ?? "Synced",
      upstreamResponsePayload: serializePayload(upstream),
    },
  });
}

export function serializeUpstreamResponse(value: unknown) {
  return serializePayload(value);
}
