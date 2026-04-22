import { OrderStatus } from "@prisma/client";

const orderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PENDING,
    OrderStatus.PROCESSING,
    OrderStatus.FULFILLED,
    OrderStatus.REFUNDED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.PROCESSING,
    OrderStatus.FULFILLED,
    OrderStatus.REFUNDED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.FULFILLED]: [OrderStatus.FULFILLED, OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
};

export function getAllowedNextOrderStatuses(status: OrderStatus) {
  return orderStatusTransitions[status];
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return getAllowedNextOrderStatuses(currentStatus).includes(nextStatus);
}
