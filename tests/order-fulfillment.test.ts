import assert from "node:assert/strict";
import test from "node:test";

import {
  OrderDeliveryType,
  OrderStatus,
  ProductFulfillmentMode,
  UpstreamServiceType,
  UpstreamSubmissionStatus,
} from "@prisma/client";

import {
  buildStoredUpstreamRequest,
  formatOrderRequestSummary,
  mapUpstreamStatusToOrderStatus,
  parseOrderRequest,
} from "../src/lib/order-fulfillment";

const baseManualProduct = {
  slug: "manual-item",
  name: "Manual Item",
  fulfillmentMode: ProductFulfillmentMode.MANUAL,
  listingMin: null,
  listingMax: null,
  listingAverageTime: null,
  upstreamServiceId: null,
  upstreamServiceType: null,
};

const defaultUpstreamProduct = {
  ...baseManualProduct,
  fulfillmentMode: ProductFulfillmentMode.CRAZYSMM,
  listingMin: 10,
  listingMax: 5000,
  upstreamServiceId: "1517",
  upstreamServiceType: UpstreamServiceType.DEFAULT,
};

test("manual products keep the legacy manual order flow", () => {
  const formData = new FormData();
  formData.set("note", "Need delivery today");

  const request = parseOrderRequest(baseManualProduct, formData, "en");

  assert.equal(request.deliveryType, OrderDeliveryType.MANUAL);
  assert.equal(request.submissionStatus, UpstreamSubmissionStatus.NOT_REQUIRED);
  assert.equal(request.userNote, "Need delivery today");
});

test("default upstream products require a valid link and bounded quantity", () => {
  const formData = new FormData();
  formData.set("targetLink", "https://example.com/post/123");
  formData.set("quantity", "100");
  formData.set("runs", "3");
  formData.set("intervalMinutes", "60");

  const request = parseOrderRequest(defaultUpstreamProduct, formData, "en");

  assert.equal(request.deliveryType, OrderDeliveryType.CRAZYSMM);
  assert.equal(request.targetLink, "https://example.com/post/123");
  assert.equal(request.quantity, 100);
  assert.equal(request.runs, 3);
  assert.equal(request.intervalMinutes, 60);
  assert.equal(request.upstreamServiceId, "1517");
});

test("custom comments upstream products require at least one comment line", () => {
  const formData = new FormData();
  formData.set("targetLink", "https://example.com/post/456");
  formData.set("commentsText", "first comment\nsecond comment");

  const request = parseOrderRequest(
    {
      ...defaultUpstreamProduct,
      upstreamServiceType: UpstreamServiceType.CUSTOM_COMMENTS,
    },
    formData,
    "en",
  );

  assert.equal(request.commentsText, "first comment\nsecond comment");
});

test("subscription upstream products reject inverted min/max ranges", () => {
  const formData = new FormData();
  formData.set("subscriptionUsername", "target-user");
  formData.set("subscriptionMin", "100");
  formData.set("subscriptionMax", "10");
  formData.set("subscriptionDelayMinutes", "60");

  assert.throws(
    () =>
      parseOrderRequest(
        {
          ...defaultUpstreamProduct,
          upstreamServiceType: UpstreamServiceType.SUBSCRIPTIONS,
        },
        formData,
        "en",
      ),
    /Minimum cannot be greater than maximum/,
  );
});

test("upstream payload storage keeps the relevant request fields", () => {
  const payload = buildStoredUpstreamRequest({
    deliveryType: OrderDeliveryType.CRAZYSMM,
    submissionStatus: UpstreamSubmissionStatus.PENDING,
    targetLink: "https://example.com/post/123",
    quantity: 250,
    upstreamServiceId: "1517",
    upstreamServiceType: UpstreamServiceType.DEFAULT,
  });

  assert.match(payload, /"targetLink":"https:\/\/example.com\/post\/123"/);
  assert.match(payload, /"quantity":250/);
});

test("upstream panel statuses map to local order states safely", () => {
  assert.equal(mapUpstreamStatusToOrderStatus("Completed"), OrderStatus.FULFILLED);
  assert.equal(mapUpstreamStatusToOrderStatus("Pending"), OrderStatus.PROCESSING);
  assert.equal(mapUpstreamStatusToOrderStatus("Partial"), OrderStatus.PROCESSING);
  assert.equal(mapUpstreamStatusToOrderStatus("Canceled"), OrderStatus.CANCELLED);
});

test("order request summaries include submission status and upstream IDs", () => {
  const rows = formatOrderRequestSummary(
    {
      serialNo: "OD202604070001",
      status: OrderStatus.PROCESSING,
      deliveryType: OrderDeliveryType.CRAZYSMM,
      userNote: "rush",
      targetLink: "https://example.com/post/123",
      quantity: 250,
      runs: null,
      intervalMinutes: null,
      commentsText: null,
      subscriptionUsername: null,
      subscriptionMin: null,
      subscriptionMax: null,
      subscriptionPosts: null,
      subscriptionOldPosts: null,
      subscriptionDelayMinutes: null,
      subscriptionExpiry: null,
      upstreamServiceId: "1517",
      upstreamOrderId: "998877",
      upstreamStatus: "Pending",
      upstreamSubmissionStatus: UpstreamSubmissionStatus.SUBMITTED,
      upstreamLastSyncAt: null,
      upstreamSyncMessage: null,
    },
    "en",
  );

  assert.ok(rows.some((row) => row.value === "998877"));
  assert.ok(rows.some((row) => row.value === "Submitted"));
});
