import {
  Order,
  OrderDeliveryType,
  OrderStatus,
  Product,
  ProductFulfillmentMode,
  UpstreamServiceType,
  UpstreamSubmissionStatus,
} from "@prisma/client";

import { getFulfillmentCopy } from "./fulfillment-copy";
import { Locale } from "./i18n";
import { getProductListingMeta as getLegacyProductListingMeta } from "./product-listing-meta";

type ProductForFulfillment = Pick<
  Product,
  | "slug"
  | "name"
  | "fulfillmentMode"
  | "listingMin"
  | "listingMax"
  | "listingAverageTime"
  | "upstreamServiceId"
  | "upstreamServiceType"
>;

type OrderForFulfillment = Pick<
  Order,
  | "serialNo"
  | "status"
  | "deliveryType"
  | "userNote"
  | "targetLink"
  | "quantity"
  | "runs"
  | "intervalMinutes"
  | "commentsText"
  | "subscriptionUsername"
  | "subscriptionMin"
  | "subscriptionMax"
  | "subscriptionPosts"
  | "subscriptionOldPosts"
  | "subscriptionDelayMinutes"
  | "subscriptionExpiry"
  | "upstreamServiceId"
  | "upstreamOrderId"
  | "upstreamStatus"
  | "upstreamSubmissionStatus"
  | "upstreamLastSyncAt"
  | "upstreamSyncMessage"
>;

export type ParsedOrderRequest = {
  deliveryType: OrderDeliveryType;
  submissionStatus: UpstreamSubmissionStatus;
  userNote?: string;
  targetLink?: string;
  quantity?: number;
  runs?: number;
  intervalMinutes?: number;
  commentsText?: string;
  subscriptionUsername?: string;
  subscriptionMin?: number;
  subscriptionMax?: number;
  subscriptionPosts?: number;
  subscriptionOldPosts?: number;
  subscriptionDelayMinutes?: number;
  subscriptionExpiry?: Date;
  upstreamServiceId?: string;
  upstreamServiceType?: UpstreamServiceType;
};

export function isAutomatedProduct(product: ProductForFulfillment) {
  return product.fulfillmentMode === ProductFulfillmentMode.CRAZYSMM;
}

export function getOrderFormConfig(product: ProductForFulfillment) {
  if (!isAutomatedProduct(product) || !product.upstreamServiceType) {
    return {
      automated: false,
      serviceType: null,
      needsLink: false,
      needsQuantity: false,
      needsComments: false,
      needsUsername: false,
      needsSubscriptionRange: false,
      supportsRuns: false,
      supportsInterval: false,
      supportsPosts: false,
      supportsOldPosts: false,
      needsDelay: false,
      supportsExpiry: false,
    };
  }

  const serviceType = product.upstreamServiceType;

  return {
    automated: true,
    serviceType,
    needsLink:
      serviceType === UpstreamServiceType.DEFAULT ||
      serviceType === UpstreamServiceType.CUSTOM_COMMENTS,
    needsQuantity: serviceType === UpstreamServiceType.DEFAULT,
    needsComments: serviceType === UpstreamServiceType.CUSTOM_COMMENTS,
    needsUsername: serviceType === UpstreamServiceType.SUBSCRIPTIONS,
    needsSubscriptionRange: serviceType === UpstreamServiceType.SUBSCRIPTIONS,
    supportsRuns: serviceType === UpstreamServiceType.DEFAULT,
    supportsInterval: serviceType === UpstreamServiceType.DEFAULT,
    supportsPosts: serviceType === UpstreamServiceType.SUBSCRIPTIONS,
    supportsOldPosts: serviceType === UpstreamServiceType.SUBSCRIPTIONS,
    needsDelay: serviceType === UpstreamServiceType.SUBSCRIPTIONS,
    supportsExpiry: serviceType === UpstreamServiceType.SUBSCRIPTIONS,
  };
}

function cleanOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : undefined;
}

function parsePositiveInteger(
  value: FormDataEntryValue | null,
  errorMessage: string,
  options?: { allowEmpty?: boolean; max?: number },
) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (options?.allowEmpty) {
      return undefined;
    }

    throw new Error(errorMessage);
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error(errorMessage);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(errorMessage);
  }

  if (options?.max && parsed > options.max) {
    throw new Error(errorMessage);
  }

  return parsed;
}

function parseTargetLink(value: FormDataEntryValue | null, locale: Locale) {
  const copy = getFulfillmentCopy(locale);
  const targetLink = cleanOptionalString(value);

  if (!targetLink) {
    throw new Error(copy.messages.invalidTargetLink);
  }

  try {
    const url = new URL(targetLink);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("invalid-protocol");
    }
  } catch {
    throw new Error(copy.messages.invalidTargetLink);
  }

  return targetLink;
}

function parseComments(value: FormDataEntryValue | null, locale: Locale) {
  const copy = getFulfillmentCopy(locale);
  const normalized = String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!normalized.length) {
    throw new Error(copy.messages.commentsRequired);
  }

  return normalized.join("\n");
}

function parseExpiry(value: FormDataEntryValue | null, locale: Locale) {
  const copy = getFulfillmentCopy(locale);
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return undefined;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(copy.messages.invalidExpiry);
  }

  return date;
}

export function parseOrderRequest(
  product: ProductForFulfillment,
  formData: FormData,
  locale: Locale,
) {
  const copy = getFulfillmentCopy(locale);
  const userNote = cleanOptionalString(formData.get("note"));

  if (!isAutomatedProduct(product)) {
    return {
      deliveryType: OrderDeliveryType.MANUAL,
      submissionStatus: UpstreamSubmissionStatus.NOT_REQUIRED,
      userNote,
    } satisfies ParsedOrderRequest;
  }

  if (!product.upstreamServiceId || !product.upstreamServiceType) {
    throw new Error(copy.messages.productNotMapped);
  }

  const config = getOrderFormConfig(product);
  const request: ParsedOrderRequest = {
    deliveryType: OrderDeliveryType.CRAZYSMM,
    submissionStatus: UpstreamSubmissionStatus.PENDING,
    userNote,
    upstreamServiceId: product.upstreamServiceId,
    upstreamServiceType: product.upstreamServiceType,
  };

  if (config.needsLink) {
    request.targetLink = parseTargetLink(formData.get("targetLink"), locale);
  }

  if (config.needsQuantity) {
    const quantity = parsePositiveInteger(
      formData.get("quantity"),
      copy.messages.invalidQuantity,
      { max: 1_000_000 },
    );

    if (quantity === undefined) {
      throw new Error(copy.messages.invalidQuantity);
    }

    if (product.listingMin && quantity < product.listingMin) {
      throw new Error(copy.messages.quantityBelowMinimum(product.listingMin));
    }

    if (product.listingMax && quantity > product.listingMax) {
      throw new Error(copy.messages.quantityAboveMaximum(product.listingMax));
    }

    request.quantity = quantity;
    request.runs = parsePositiveInteger(formData.get("runs"), copy.messages.invalidRuns, {
      allowEmpty: true,
      max: 10_000,
    });
    request.intervalMinutes = parsePositiveInteger(
      formData.get("intervalMinutes"),
      copy.messages.invalidInterval,
      {
        allowEmpty: true,
        max: 100_000,
      },
    );
  }

  if (config.needsComments) {
    request.commentsText = parseComments(formData.get("commentsText"), locale);
  }

  if (config.needsUsername) {
    request.subscriptionUsername = cleanOptionalString(formData.get("subscriptionUsername"));

    if (!request.subscriptionUsername) {
      throw new Error(copy.messages.usernameRequired);
    }
  }

  if (config.needsSubscriptionRange) {
    request.subscriptionMin = parsePositiveInteger(
      formData.get("subscriptionMin"),
      copy.messages.invalidMin,
      { max: 1_000_000 },
    );
    request.subscriptionMax = parsePositiveInteger(
      formData.get("subscriptionMax"),
      copy.messages.invalidMax,
      { max: 1_000_000 },
    );

    if (
      request.subscriptionMin === undefined ||
      request.subscriptionMax === undefined
    ) {
      throw new Error(copy.messages.invalidMin);
    }

    if (request.subscriptionMin > request.subscriptionMax) {
      throw new Error(copy.messages.minGreaterThanMax);
    }
  }

  if (config.needsDelay) {
    request.subscriptionDelayMinutes = parsePositiveInteger(
      formData.get("subscriptionDelayMinutes"),
      copy.messages.invalidDelay,
      { max: 100_000 },
    );
  }

  if (config.supportsPosts) {
    request.subscriptionPosts = parsePositiveInteger(
      formData.get("subscriptionPosts"),
      copy.messages.invalidPosts,
      {
        allowEmpty: true,
        max: 1_000_000,
      },
    );
  }

  if (config.supportsOldPosts) {
    request.subscriptionOldPosts = parsePositiveInteger(
      formData.get("subscriptionOldPosts"),
      copy.messages.invalidOldPosts,
      {
        allowEmpty: true,
        max: 1_000_000,
      },
    );
  }

  if (config.supportsExpiry) {
    request.subscriptionExpiry = parseExpiry(formData.get("subscriptionExpiry"), locale);
  }

  return request;
}

export function buildStoredUpstreamRequest(request: ParsedOrderRequest) {
  const payload = {
    targetLink: request.targetLink,
    quantity: request.quantity,
    runs: request.runs,
    intervalMinutes: request.intervalMinutes,
    commentsText: request.commentsText,
    subscriptionUsername: request.subscriptionUsername,
    subscriptionMin: request.subscriptionMin,
    subscriptionMax: request.subscriptionMax,
    subscriptionPosts: request.subscriptionPosts,
    subscriptionOldPosts: request.subscriptionOldPosts,
    subscriptionDelayMinutes: request.subscriptionDelayMinutes,
    subscriptionExpiry: request.subscriptionExpiry?.toISOString(),
  };

  const serialized = JSON.stringify(payload);
  return serialized.length > 4000 ? `${serialized.slice(0, 3997)}...` : serialized;
}

export function mapUpstreamStatusToOrderStatus(status: string | null | undefined) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return OrderStatus.PROCESSING;
  }

  if (["completed", "complete"].includes(normalized)) {
    return OrderStatus.FULFILLED;
  }

  if (["partial"].includes(normalized)) {
    return OrderStatus.PROCESSING;
  }

  if (["pending", "processing", "in progress", "inprogress", "queued"].includes(normalized)) {
    return OrderStatus.PROCESSING;
  }

  if (["canceled", "cancelled", "failed"].includes(normalized)) {
    return OrderStatus.CANCELLED;
  }

  return OrderStatus.PROCESSING;
}

export function getListingMetaFromProduct(product: ProductForFulfillment, locale: Locale) {
  const fallback = getLegacyProductListingMeta(product.slug, locale);
  const defaultAverageTime =
    locale === "zh" ? "5-10分钟" : locale === "ko" ? "5~10분" : "5 to 10 min";

  return {
    minimum: product.listingMin ? String(product.listingMin) : "1",
    maximum: product.listingMax ? String(product.listingMax) : fallback.maximum,
    averageTime: product.listingAverageTime?.trim() || defaultAverageTime,
  };
}

export function formatOrderRequestSummary(order: OrderForFulfillment, locale: Locale) {
  const copy = getFulfillmentCopy(locale);
  const rows: Array<{ label: string; value: string }> = [
    {
      label: copy.order.deliveryTypeLabel,
      value:
        order.deliveryType === OrderDeliveryType.CRAZYSMM
          ? copy.order.automatedOrderLabel
          : copy.order.manualOrderLabel,
    },
  ];

  if (order.targetLink) {
    rows.push({
      label: copy.product.targetLinkLabel,
      value: order.targetLink,
    });
  }

  if (order.quantity) {
    rows.push({
      label: copy.product.quantityLabel,
      value: String(order.quantity),
    });
  }

  if (order.commentsText) {
    rows.push({
      label: copy.product.commentsLabel,
      value: order.commentsText,
    });
  }

  if (order.subscriptionUsername) {
    rows.push({
      label: copy.product.usernameLabel,
      value: order.subscriptionUsername,
    });
  }

  if (order.subscriptionMin) {
    rows.push({
      label: copy.product.minLabel,
      value: String(order.subscriptionMin),
    });
  }

  if (order.subscriptionMax) {
    rows.push({
      label: copy.product.maxLabel,
      value: String(order.subscriptionMax),
    });
  }

  if (order.subscriptionDelayMinutes) {
    rows.push({
      label: copy.product.delayLabel,
      value: String(order.subscriptionDelayMinutes),
    });
  }

  if (order.upstreamServiceId) {
    rows.push({
      label: copy.order.upstreamServiceIdLabel,
      value: order.upstreamServiceId,
    });
  }

  if (order.upstreamOrderId) {
    rows.push({
      label: copy.order.upstreamOrderIdLabel,
      value: order.upstreamOrderId,
    });
  }

  if (order.upstreamStatus) {
    rows.push({
      label: copy.order.upstreamStatusLabel,
      value: order.upstreamStatus,
    });
  }

  rows.push({
    label: copy.order.submissionStatusLabel,
    value: copy.submissionStatuses[order.upstreamSubmissionStatus],
  });

  if (order.userNote) {
    rows.push({
      label: copy.product.noteOptional,
      value: order.userNote,
    });
  }

  return rows;
}
