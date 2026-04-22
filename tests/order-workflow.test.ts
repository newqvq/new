import assert from "node:assert/strict";
import test from "node:test";

import { OrderStatus } from "@prisma/client";

import {
  canTransitionOrderStatus,
  getAllowedNextOrderStatuses,
} from "../src/lib/order-workflow";

test("refunded orders cannot transition back into active processing states", () => {
  assert.deepEqual(getAllowedNextOrderStatuses(OrderStatus.REFUNDED), [
    OrderStatus.REFUNDED,
  ]);
  assert.equal(
    canTransitionOrderStatus(OrderStatus.REFUNDED, OrderStatus.PROCESSING),
    false,
  );
  assert.equal(
    canTransitionOrderStatus(OrderStatus.REFUNDED, OrderStatus.FULFILLED),
    false,
  );
});

test("cancelled orders may still move to refunded, but not back to processing", () => {
  assert.equal(
    canTransitionOrderStatus(OrderStatus.CANCELLED, OrderStatus.REFUNDED),
    true,
  );
  assert.equal(
    canTransitionOrderStatus(OrderStatus.CANCELLED, OrderStatus.PROCESSING),
    false,
  );
});

test("fulfilled orders can only stay fulfilled or move into refunded", () => {
  assert.deepEqual(getAllowedNextOrderStatuses(OrderStatus.FULFILLED), [
    OrderStatus.FULFILLED,
    OrderStatus.REFUNDED,
  ]);
});
