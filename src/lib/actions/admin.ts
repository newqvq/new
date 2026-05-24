"use server";

import {
  CommissionStatus,
  CouponDiscountType,
  ProductCredentialStatus,
  ProductFulfillmentMode,
  ProductStatus,
  RechargeStatus,
  RechargeVerificationStatus,
  OrderDeliveryType,
  OrderStatus,
  UpstreamProvider,
  UpstreamServiceType,
  UpstreamSubmissionStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth";
import { getActionCopy } from "@/lib/action-copy";
import { cancelCrazysmmOrder } from "@/lib/crazysmm";
import { env } from "@/lib/env";
import { getFulfillmentCopy } from "@/lib/fulfillment-copy";
import { getCurrentLocale } from "@/lib/i18n-server";
import { calculateByBasisPoints, parseUsdt } from "@/lib/money";
import { canTransitionOrderStatus } from "@/lib/order-workflow";
import { prisma } from "@/lib/prisma";
import { getRequestContext } from "@/lib/request-context";
import { consumeRateLimits, throttlePolicies } from "@/lib/rate-limit";
import {
  expireRechargeIfNeeded,
  syncRechargeVerification,
} from "@/lib/recharge-service";
import { canReviewRecharge } from "@/lib/recharge-workflow";
import { getSecurityCopy } from "@/lib/security-copy";
import {
  applyCrazysmmOrderSync,
  refundOrderBalance,
  serializeUpstreamResponse,
  syncCrazysmmOrderStatus,
} from "@/lib/upstream-order-service";
import { generateSerial, slugify, withQueryMessage } from "@/lib/utils";

const DEFAULT_LISTING_MIN = 1;
const DEFAULT_LISTING_AVERAGE_TIME = "5-10分钟";
const defaultProductContent = {
  zh: {
    manualSubtitle: "人工处理，默认按下单顺序进入队列。",
    automatedSubtitle: "自动对接上游服务，提交后系统会同步状态。",
    manualDescription:
      "该商品走人工处理流程。下单后按支付顺序进入队列，处理结果和售后说明会回写到订单备注。",
    automatedDescription:
      "该商品会自动提交到上游服务处理，系统会持续同步执行状态并回写订单进度。",
    manualDelivery: "人工处理，默认5-10分钟内响应。",
    automatedDelivery: "系统自动提交，默认5-10分钟内同步状态。",
    tags: "人工处理|稳定|售后",
  },
  en: {
    manualSubtitle: "Handled manually and queued in payment order.",
    automatedSubtitle: "Submitted automatically to the upstream provider after checkout.",
    manualDescription:
      "This product follows the manual delivery flow. After the order is paid, the admin team processes it in queue order and writes the result back to the order notes.",
    automatedDescription:
      "This product is submitted automatically to the upstream provider. The system keeps syncing the delivery status back into the order.",
    manualDelivery: "Manual handling with a default 5 to 10 minute response window.",
    automatedDelivery: "Automatically submitted with a default 5 to 10 minute sync window.",
    tags: "manual|stable|support",
  },
  ko: {
    manualSubtitle: "수동 처리 상품이며 결제 순서대로 대기열에 들어갑니다.",
    automatedSubtitle: "결제 후 상위 공급처로 자동 제출되고 상태가 동기화됩니다.",
    manualDescription:
      "이 상품은 수동 처리 흐름을 사용합니다. 주문 결제 후 운영자가 순서대로 처리하고 결과 및 사후 안내를 주문 메모에 남깁니다.",
    automatedDescription:
      "이 상품은 상위 공급처로 자동 제출됩니다. 시스템이 처리 상태를 계속 동기화하여 주문에 반영합니다.",
    manualDelivery: "수동 처리, 기본 응답 시간은 5~10분입니다.",
    automatedDelivery: "자동 제출 후 기본 5~10분 내 상태가 동기화됩니다.",
    tags: "수동처리|안정적|사후지원",
  },
} as const;

function createProductSchema(
  copy: ReturnType<typeof getActionCopy>["admin"]["validation"],
) {
  const optionalListingNumber = z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized ? normalized : undefined;
    },
    z.coerce.number().int().min(0).max(1_000_000).optional(),
  );

  const optionalTrimmedString = z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized ? normalized : undefined;
    },
    z.string().trim().max(120).optional(),
  );

  const optionalCoverString = z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized ? normalized : undefined;
    },
    z.string().trim().max(12).optional(),
  );

  const optionalShortString = z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized ? normalized : undefined;
    },
    z.string().trim().max(180).optional(),
  );

  const optionalLongString = z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized ? normalized : undefined;
    },
    z.string().trim().max(2_000).optional(),
  );

  return z.object({
    productId: z.string().trim().optional(),
    name: z.string().trim().min(2, copy.productNameMin),
    slug: z.string().trim().optional(),
    subtitle: optionalShortString,
    category: z.string().trim().min(2, copy.productCategoryMin),
    cover: optionalCoverString,
    summary: optionalLongString,
    description: optionalLongString,
    tags: optionalShortString,
    deliveryNote: optionalShortString,
    price: z.string().trim().min(1),
    fulfillmentMode: z.nativeEnum(ProductFulfillmentMode),
    listingMin: optionalListingNumber,
    listingMax: optionalListingNumber,
    listingAverageTime: optionalTrimmedString,
    upstreamProvider: z.nativeEnum(UpstreamProvider).optional(),
    upstreamServiceId: z.string().trim().max(64).optional(),
    upstreamServiceType: z.nativeEnum(UpstreamServiceType).optional(),
    upstreamSupportsCancel: z.boolean().default(false),
    upstreamSupportsRefill: z.boolean().default(false),
    autoDeliverStock: z.boolean().default(false),
    commissionRateBps: z.coerce.number().int().min(0).max(10000).optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    status: z.nativeEnum(ProductStatus),
  });
}

function createCategorySchema() {
  return z.object({
    name: z.string().trim().min(2).max(40),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(100),
  });
}

const reviewRechargeSchema = z.object({
  rechargeOrderId: z.string().trim().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  adminNote: z.string().trim().max(200).optional(),
});

const updateOrderSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.nativeEnum(OrderStatus),
  fulfillmentNote: z.string().trim().max(300).optional(),
});

const syncUpstreamOrderSchema = z.object({
  orderId: z.string().trim().min(1),
});

const categoryActionCopy = {
  zh: {
    invalid: "分类信息不完整。",
    exists: "该分类已经存在。",
    saved: "分类已保存。",
  },
  en: {
    invalid: "Category details are incomplete.",
    exists: "This category already exists.",
    saved: "Category saved.",
  },
  ko: {
    invalid: "분류 정보가 올바르지 않습니다.",
    exists: "이미 존재하는 분류입니다.",
    saved: "분류가 저장되었습니다.",
  },
} as const;

const normalizedCategoryActionCopy = {
  zh: {
    invalid: "分类信息不完整。",
    exists: "该分类已经存在。",
    saved: "分类已保存。",
  },
  en: {
    invalid: "Category details are incomplete.",
    exists: "This category already exists.",
    saved: "Category saved.",
  },
  ko: {
    invalid: "카테고리 정보가 올바르지 않습니다.",
    exists: "이미 존재하는 카테고리입니다.",
    saved: "카테고리가 저장되었습니다.",
  },
} as const;

const productCategoryValidationCopy = {
  zh: "请选择有效分类。",
  en: "Select a valid category.",
  ko: "유효한 카테고리를 선택하세요.",
} as const;

async function ensureUniqueSlug(baseValue: string, currentProductId?: string) {
  const base = slugify(baseValue) || generateSerial("product").toLowerCase();

  for (let index = 0; index < 8; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const existing = await prisma.product.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing || existing.id === currentProductId) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID().replace(/-/g, "").slice(0, 4)}`;
}

async function ensureUniqueCategorySlug(baseValue: string) {
  const base = slugify(baseValue) || generateSerial("category").toLowerCase();

  for (let index = 0; index < 8; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const existing = await prisma.productCategory.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID().replace(/-/g, "").slice(0, 4)}`;
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function buildProductCoverCode(name: string, cover?: string) {
  const manualValue = cover?.trim();
  const source = manualValue || name;
  const latinSegments = source.match(/[A-Za-z0-9]+/g) ?? [];

  if (manualValue && latinSegments.length > 0) {
    return latinSegments.join("").toUpperCase().slice(0, 4);
  }

  const [firstLatinSegment, secondLatinSegment] = latinSegments;

  if (firstLatinSegment && secondLatinSegment) {
    return `${firstLatinSegment[0]}${secondLatinSegment[0]}`.toUpperCase().slice(0, 4);
  }

  if (firstLatinSegment) {
    return firstLatinSegment.toUpperCase().slice(0, 4);
  }

  const compact = source.replace(/\s+/g, "").replace(/[^\p{L}\p{N}]/gu, "");
  return compact.slice(0, 2).toUpperCase() || "IT";
}

export async function upsertProductAction(formData: FormData) {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const admin = await requireAdminSession();

  try {
    await consumeRateLimits(
      [
        {
          scope: "admin.products.write.user",
          subject: `user:${admin.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "admin.products.write.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.adminMutation,
      securityCopy.adminTooManyAttempts,
    );
  } catch (error) {
    redirect(
      withQueryMessage(
        "/admin/products",
        "error",
        resolveErrorMessage(error, securityCopy.adminTooManyAttempts),
      ),
    );
  }

  const productSchema = createProductSchema(actionCopy.admin.validation);

  const parsed = productSchema.safeParse({
    productId: formData.get("productId") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    subtitle: formData.get("subtitle"),
    category: formData.get("category"),
    cover: formData.get("cover"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    tags: formData.get("tags"),
    deliveryNote: formData.get("deliveryNote"),
    price: formData.get("price"),
    fulfillmentMode: formData.get("fulfillmentMode"),
    listingMin: formData.get("listingMin") || undefined,
    listingMax: formData.get("listingMax") || undefined,
    listingAverageTime: formData.get("listingAverageTime") || undefined,
    upstreamProvider: formData.get("upstreamProvider") || undefined,
    upstreamServiceId: formData.get("upstreamServiceId") || undefined,
    upstreamServiceType: formData.get("upstreamServiceType") || undefined,
    upstreamSupportsCancel: formData.get("upstreamSupportsCancel") === "on",
    upstreamSupportsRefill: formData.get("upstreamSupportsRefill") === "on",
    autoDeliverStock: formData.get("autoDeliverStock") === "on",
    commissionRateBps: formData.get("commissionRateBps") || undefined,
    sortOrder: formData.get("sortOrder"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(
      withQueryMessage(
        "/admin/products",
        "error",
        parsed.error.issues[0]?.message ?? actionCopy.admin.messages.productIncomplete,
      ),
    );
  }

  const managedCategory = await prisma.productCategory.findUnique({
    where: {
      name: parsed.data.category,
    },
    select: {
      id: true,
    },
  });
  const currentProduct = parsed.data.productId
    ? await prisma.product.findUnique({
        where: {
          id: parsed.data.productId,
        },
        select: {
          category: true,
        },
      })
    : null;

  if (!managedCategory && currentProduct?.category !== parsed.data.category) {
    redirect(
      withQueryMessage(
        "/admin/products",
        "error",
        productCategoryValidationCopy[locale],
      ),
    );
  }

  let priceMicros: bigint;
  try {
    priceMicros = parseUsdt(parsed.data.price);
  } catch {
    redirect(withQueryMessage("/admin/products", "error", actionCopy.common.invalidAmount));
  }

  if (
    parsed.data.listingMin &&
    parsed.data.listingMax &&
    parsed.data.listingMin > parsed.data.listingMax
  ) {
    redirect(withQueryMessage("/admin/products", "error", "Listing min cannot exceed listing max."));
  }

  const slug = await ensureUniqueSlug(
    parsed.data.slug || parsed.data.name,
    parsed.data.productId,
  );

  const defaultContent = defaultProductContent[locale];
  const normalizedSubtitle =
    parsed.data.subtitle?.trim() ||
    (parsed.data.fulfillmentMode === ProductFulfillmentMode.CRAZYSMM
      ? defaultContent.automatedSubtitle
      : defaultContent.manualSubtitle);
  const rawTagsValue = parsed.data.tags?.trim() || defaultContent.tags;
  const normalizedDeliveryNote =
    parsed.data.deliveryNote?.trim() ||
    (parsed.data.fulfillmentMode === ProductFulfillmentMode.CRAZYSMM
      ? defaultContent.automatedDelivery
      : defaultContent.manualDelivery);
  const normalizedSummary = parsed.data.summary?.trim() || normalizedSubtitle;
  const normalizedDescription =
    parsed.data.description?.trim() ||
    (parsed.data.fulfillmentMode === ProductFulfillmentMode.CRAZYSMM
      ? defaultContent.automatedDescription
      : defaultContent.manualDescription);

  const normalizedTags = rawTagsValue
    .replace(/[，、]/g, "|")
    .replace(/,/g, "|")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("|");
  const normalizedCover = buildProductCoverCode(parsed.data.name, parsed.data.cover);
  const normalizedListingMin = parsed.data.listingMin ?? DEFAULT_LISTING_MIN;
  const normalizedListingAverageTime =
    parsed.data.listingAverageTime ?? DEFAULT_LISTING_AVERAGE_TIME;

  const upstreamData =
    parsed.data.fulfillmentMode === ProductFulfillmentMode.CRAZYSMM
      ? {
          upstreamProvider: parsed.data.upstreamProvider ?? UpstreamProvider.CRAZYSMM,
          upstreamServiceId: parsed.data.upstreamServiceId?.trim() || null,
          upstreamServiceType: parsed.data.upstreamServiceType ?? null,
          upstreamSupportsCancel: parsed.data.upstreamSupportsCancel,
          upstreamSupportsRefill: parsed.data.upstreamSupportsRefill,
        }
      : {
          upstreamProvider: null,
          upstreamServiceId: null,
          upstreamServiceType: null,
          upstreamSupportsCancel: false,
          upstreamSupportsRefill: false,
        };

  if (
    parsed.data.fulfillmentMode === ProductFulfillmentMode.CRAZYSMM &&
    (!upstreamData.upstreamServiceId || !upstreamData.upstreamServiceType)
  ) {
    redirect(
      withQueryMessage(
        "/admin/products",
        "error",
        "Upstream products require a service ID and service type.",
      ),
    );
  }

  await prisma.product.upsert({
    where: {
      id: parsed.data.productId || "create-only",
    },
    update: {
      slug,
      name: parsed.data.name,
      subtitle: normalizedSubtitle,
      category: parsed.data.category,
      cover: normalizedCover,
      summary: normalizedSummary,
      description: normalizedDescription,
      tags: normalizedTags,
      deliveryNote: normalizedDeliveryNote,
      priceMicros,
      fulfillmentMode: parsed.data.fulfillmentMode,
      listingMin: normalizedListingMin,
      listingMax: parsed.data.listingMax ?? null,
      listingAverageTime: normalizedListingAverageTime,
      autoDeliverStock: parsed.data.autoDeliverStock,
      commissionRateBps: parsed.data.commissionRateBps ?? null,
      ...upstreamData,
      sortOrder: parsed.data.sortOrder,
      status: parsed.data.status,
    },
    create: {
      slug,
      name: parsed.data.name,
      subtitle: normalizedSubtitle,
      category: parsed.data.category,
      cover: normalizedCover,
      summary: normalizedSummary,
      description: normalizedDescription,
      tags: normalizedTags,
      deliveryNote: normalizedDeliveryNote,
      priceMicros,
      fulfillmentMode: parsed.data.fulfillmentMode,
      listingMin: normalizedListingMin,
      listingMax: parsed.data.listingMax ?? null,
      listingAverageTime: normalizedListingAverageTime,
      autoDeliverStock: parsed.data.autoDeliverStock,
      commissionRateBps: parsed.data.commissionRateBps ?? null,
      ...upstreamData,
      sortOrder: parsed.data.sortOrder,
      status: parsed.data.status,
    },
  });

  // Handle inline translation fields (Task 6)
  const translationFields = ["name", "subtitle", "description", "deliveryNote", "tags"] as const;
  const hasTranslation = (["en", "ko"] as const).some((loc) =>
    translationFields.some((field) => {
      const val = String(formData.get(`${loc}_${field}`) ?? "").trim();
      return val.length > 0;
    }),
  );

  if (hasTranslation) {
    for (const loc of ["en", "ko"] as const) {
      for (const field of translationFields) {
        const value = String(formData.get(`${loc}_${field}`) ?? "").trim();
        const textKey = `product.${slug}.${field}`;

        if (!value) {
          await prisma.siteText.deleteMany({
            where: { textKey, locale: loc },
          });
          continue;
        }

        await prisma.siteText.upsert({
          where: {
            textKey_locale: { textKey, locale: loc },
          },
          update: { value },
          create: { textKey, locale: loc, value },
        });
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect(withQueryMessage("/admin/products", "success", actionCopy.admin.messages.productSaved));
}

export async function upsertProductCategoryAction(
  _prevState: { status: "idle" | "success" | "error"; message: string },
  formData: FormData,
): Promise<{ status: "idle" | "success" | "error"; message: string }> {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const securityCopy = getSecurityCopy(locale);
  const admin = await requireAdminSession();
  const categoryCopy = {
    ...categoryActionCopy[locale],
    ...normalizedCategoryActionCopy[locale],
  };

  try {
    await consumeRateLimits(
      [
        {
          scope: "admin.categories.write.user",
          subject: `user:${admin.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "admin.categories.write.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.adminMutation,
      securityCopy.adminTooManyAttempts,
    );
  } catch (error) {
    return {
      status: "error",
      message: resolveErrorMessage(error, securityCopy.adminTooManyAttempts),
    };
  }

  const parsed = createCategorySchema().safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: categoryCopy.invalid,
    };
  }

  const existing = await prisma.productCategory.findUnique({
    where: {
      name: parsed.data.name,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      status: "error",
      message: categoryCopy.exists,
    };
  }

  const slug = await ensureUniqueCategorySlug(parsed.data.name);

  await prisma.productCategory.create({
    data: {
      name: parsed.data.name,
      slug,
      sortOrder: parsed.data.sortOrder,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/products");
  return {
    status: "success",
    message: categoryCopy.saved,
  };
}

const couponSchema = z.object({
  code: z.string().trim().min(2).max(64),
  title: z.string().trim().max(80).optional(),
  discountType: z.nativeEnum(CouponDiscountType),
  discountValue: z.string().trim().min(1),
  minOrder: z.string().trim().optional(),
  maxDiscount: z.string().trim().optional(),
  usageLimit: z.coerce.number().int().min(1).max(1_000_000).optional(),
  perUserLimit: z.coerce.number().int().min(1).max(1000).optional(),
  productId: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export async function createCouponAction(formData: FormData) {
  await requireAdminSession();
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title") || undefined,
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minOrder: formData.get("minOrder") || undefined,
    maxDiscount: formData.get("maxDiscount") || undefined,
    usageLimit: formData.get("usageLimit") || undefined,
    perUserLimit: formData.get("perUserLimit") || undefined,
    productId: formData.get("productId") || undefined,
    categoryName: formData.get("categoryName") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    redirect(withQueryMessage("/admin/products", "error", "优惠券参数不完整。"));
  }

  let discountValue: number;
  try {
    discountValue =
      parsed.data.discountType === CouponDiscountType.PERCENT
        ? Math.round(Number(parsed.data.discountValue) * 100)
        : Number(parseUsdt(parsed.data.discountValue) / 1_000_000n);
  } catch {
    redirect(withQueryMessage("/admin/products", "error", "优惠券金额或比例不合法。"));
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    redirect(withQueryMessage("/admin/products", "error", "优惠券优惠值必须大于 0。"));
  }

  const minOrderMicros = parsed.data.minOrder ? parseUsdt(parsed.data.minOrder) : 0n;
  const maxDiscountMicros = parsed.data.maxDiscount
    ? parseUsdt(parsed.data.maxDiscount)
    : null;

  await prisma.coupon.upsert({
    where: {
      code: parsed.data.code.toUpperCase(),
    },
    update: {
      title: parsed.data.title || null,
      discountType: parsed.data.discountType,
      discountValue,
      minOrderMicros,
      maxDiscountMicros,
      usageLimit: parsed.data.usageLimit ?? null,
      perUserLimit: parsed.data.perUserLimit ?? null,
      productId: parsed.data.productId || null,
      categoryName: parsed.data.categoryName || null,
      isActive: parsed.data.isActive,
    },
    create: {
      code: parsed.data.code.toUpperCase(),
      title: parsed.data.title || null,
      discountType: parsed.data.discountType,
      discountValue,
      minOrderMicros,
      maxDiscountMicros,
      usageLimit: parsed.data.usageLimit ?? null,
      perUserLimit: parsed.data.perUserLimit ?? null,
      productId: parsed.data.productId || null,
      categoryName: parsed.data.categoryName || null,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect(withQueryMessage("/admin/products", "success", "优惠券已保存。"));
}

export async function addProductCredentialsAction(formData: FormData) {
  await requireAdminSession();
  const productId = String(formData.get("productId") ?? "").trim();
  const stockText = String(formData.get("stockText") ?? "").trim();

  if (!productId || !stockText) {
    redirect(withQueryMessage("/admin/products", "error", "请选择商品并填写账号库存。"));
  }

  const lines = stockText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 500);

  if (!lines.length) {
    redirect(withQueryMessage("/admin/products", "error", "账号库存不能为空。"));
  }

  await prisma.productCredential.createMany({
    data: lines.map((secret) => ({
      productId,
      secret,
      status: ProductCredentialStatus.AVAILABLE,
    })),
  });

  await prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      autoDeliverStock: true,
    },
  });

  revalidatePath("/admin/products");
  redirect(withQueryMessage("/admin/products", "success", `已导入 ${lines.length} 条账号库存。`));
}

const siteTextSchema = z.object({
  textKey: z.string().trim().min(2).max(80),
  zh: z.string().trim().max(2000).optional(),
  en: z.string().trim().max(2000).optional(),
  ko: z.string().trim().max(2000).optional(),
});

export async function upsertSiteTextAction(formData: FormData) {
  await requireAdminSession();
  const parsed = siteTextSchema.safeParse({
    textKey: formData.get("textKey"),
    zh: formData.get("zh") || undefined,
    en: formData.get("en") || undefined,
    ko: formData.get("ko") || undefined,
  });

  if (!parsed.success) {
    redirect(withQueryMessage("/admin/settings", "error", "文案参数不完整。"));
  }

  for (const locale of ["zh", "en", "ko"] as const) {
    const value = parsed.data[locale];

    if (!value) {
      continue;
    }

    await prisma.siteText.upsert({
      where: {
        textKey_locale: {
          textKey: parsed.data.textKey,
          locale,
        },
      },
      update: {
        value,
      },
      create: {
        textKey: parsed.data.textKey,
        locale,
        value,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect(withQueryMessage("/admin/settings", "success", "站点文案已保存。"));
}

export async function reviewRechargeAction(formData: FormData) {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const admin = await requireAdminSession();
  const parsed = reviewRechargeSchema.safeParse({
    rechargeOrderId: formData.get("rechargeOrderId"),
    decision: formData.get("decision"),
    adminNote: formData.get("adminNote") || undefined,
  });

  if (!parsed.success) {
    redirect(
      withQueryMessage(
        "/admin/recharges",
        "error",
        actionCopy.admin.messages.reviewParamsInvalid,
      ),
    );
  }

  try {
    await consumeRateLimits(
      [
        {
          scope: "admin.recharges.review.user",
          subject: `user:${admin.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "admin.recharges.review.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.adminMutation,
      securityCopy.adminTooManyAttempts,
    );

    if (parsed.data.decision === "REJECT") {
      const result = await prisma.rechargeOrder.updateMany({
        where: {
          id: parsed.data.rechargeOrderId,
          status: {
            in: [RechargeStatus.AWAITING_PAYMENT, RechargeStatus.UNDER_REVIEW],
          },
        },
        data: {
          status: RechargeStatus.REJECTED,
          adminNote: parsed.data.adminNote,
          reviewerId: admin.userId,
          reviewedAt: new Date(),
        },
      });

      if (result.count !== 1) {
        throw new Error(actionCopy.admin.messages.rechargeRejectChanged);
      }
    } else {
      const recharge = await prisma.rechargeOrder.findUnique({
        where: {
          id: parsed.data.rechargeOrderId,
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

      if (!recharge) {
        throw new Error(actionCopy.admin.messages.rechargeMissing);
      }

      if (!canReviewRecharge(recharge)) {
        if (await expireRechargeIfNeeded(prisma, recharge)) {
          throw new Error(actionCopy.admin.messages.rechargeExpiredNoCredit);
        }

        throw new Error(actionCopy.admin.messages.rechargeProcessed);
      }

      if (!recharge.txHash) {
        throw new Error(actionCopy.admin.messages.rechargeTxHashRequired);
      }

      if (!recharge.user.wallet) {
        throw new Error(actionCopy.admin.messages.userWalletMissing);
      }

      const refreshedRecharge = await syncRechargeVerification(prisma, recharge, locale);

      if (refreshedRecharge.verificationStatus !== RechargeVerificationStatus.VERIFIED) {
        throw new Error(
          refreshedRecharge.verificationMessage ||
            actionCopy.admin.messages.rechargeNotVerified,
        );
      }

      await prisma.$transaction(async (tx) => {
        const currentRecharge = await tx.rechargeOrder.findUnique({
          where: {
            id: parsed.data.rechargeOrderId,
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
          throw new Error(actionCopy.admin.messages.rechargeMissing);
        }

        if (!canReviewRecharge(currentRecharge)) {
          throw new Error(actionCopy.admin.messages.rechargeProcessed);
        }

        if (!currentRecharge.user.wallet) {
          throw new Error(actionCopy.admin.messages.userWalletMissing);
        }

        if (currentRecharge.verificationStatus !== RechargeVerificationStatus.VERIFIED) {
          throw new Error(
            currentRecharge.verificationMessage ||
              actionCopy.admin.messages.rechargeNotVerified,
          );
        }

        const alreadyCredited = await tx.walletLedger.findUnique({
          where: {
            entryKey: `recharge:${currentRecharge.id}`,
          },
          select: {
            id: true,
          },
        });

        if (alreadyCredited) {
          throw new Error(actionCopy.admin.messages.rechargeCredited);
        }

        await tx.rechargeOrder.update({
          where: {
            id: currentRecharge.id,
          },
          data: {
            status: RechargeStatus.APPROVED,
            creditedMicros: currentRecharge.amountMicros,
            adminNote: parsed.data.adminNote,
            reviewerId: admin.userId,
            reviewedAt: new Date(),
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
            createdById: admin.userId,
            type: "RECHARGE",
            direction: "CREDIT",
            amountMicros: currentRecharge.amountMicros,
            balanceBeforeMicros: userWalletBefore,
            balanceAfterMicros: userWalletBefore + currentRecharge.amountMicros,
            note: `Recharge approved: ${currentRecharge.serialNo}`,
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

            const referrerWalletBefore =
              currentRecharge.user.referrer.wallet.balanceMicros;

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
                createdById: admin.userId,
                type: "COMMISSION",
                direction: "CREDIT",
                amountMicros: commissionAmount,
                balanceBeforeMicros: referrerWalletBefore,
                balanceAfterMicros: referrerWalletBefore + commissionAmount,
                note: `Commission from referred user ${currentRecharge.user.displayName}`,
              },
            });
          }
        }
      });
    }
  } catch (error) {
    redirect(
      withQueryMessage(
        "/admin/recharges",
        "error",
        resolveErrorMessage(error, actionCopy.common.processingFailed),
      ),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/recharge");
  revalidatePath("/admin");
  revalidatePath("/admin/recharges");
  revalidatePath("/admin/users");
  redirect(
    withQueryMessage(
      "/admin/recharges",
      "success",
      actionCopy.admin.messages.rechargeReviewed,
    ),
  );
}

export async function updateOrderStatusAction(formData: FormData) {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const actionCopy = getActionCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const admin = await requireAdminSession();
  const parsed = updateOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    fulfillmentNote: formData.get("fulfillmentNote") || undefined,
  });

  if (!parsed.success) {
    redirect(
      withQueryMessage(
        "/admin/orders",
        "error",
        actionCopy.admin.messages.orderParamsInvalid,
      ),
    );
  }

  try {
    await consumeRateLimits(
      [
        {
          scope: "admin.orders.write.user",
          subject: `user:${admin.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "admin.orders.write.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.adminMutation,
      securityCopy.adminTooManyAttempts,
    );

    if (parsed.data.status === OrderStatus.REFUNDED) {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: {
            id: parsed.data.orderId,
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
          throw new Error(actionCopy.admin.messages.orderMissingOrWallet);
        }

        if (!canTransitionOrderStatus(order.status, parsed.data.status)) {
          throw new Error(actionCopy.admin.messages.refundTransitionInvalid);
        }

        await refundOrderBalance(
          tx,
          order.id,
          admin.userId,
          parsed.data.fulfillmentNote || `Order refunded: ${order.serialNo}`,
        );
      });
    } else {
      const order = await prisma.order.findUnique({
        where: {
          id: parsed.data.orderId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!order) {
        throw new Error(actionCopy.admin.messages.orderMissing);
      }

      if (!canTransitionOrderStatus(order.status, parsed.data.status)) {
        throw new Error(actionCopy.admin.messages.orderTransitionInvalid);
      }

      await prisma.order.update({
        where: {
          id: parsed.data.orderId,
        },
        data: {
          status: parsed.data.status,
          handlerId: admin.userId,
          handledAt: new Date(),
          fulfillmentNote: parsed.data.fulfillmentNote,
        },
      });
    }
  } catch (error) {
    redirect(
      withQueryMessage(
        "/admin/orders",
        "error",
        resolveErrorMessage(error, actionCopy.common.processingFailed),
      ),
    );
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(withQueryMessage("/admin/orders", "success", actionCopy.admin.messages.orderUpdated));
}

export async function syncUpstreamOrderAction(formData: FormData) {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const admin = await requireAdminSession();
  const parsed = syncUpstreamOrderSchema.safeParse({
    orderId: formData.get("orderId"),
  });

  if (!parsed.success) {
    redirect(withQueryMessage("/admin/orders", "error", fulfillmentCopy.messages.upstreamSyncUnavailable));
  }

  try {
    await consumeRateLimits(
      [
        {
          scope: "admin.orders.sync.user",
          subject: `user:${admin.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "admin.orders.sync.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.adminMutation,
      securityCopy.adminTooManyAttempts,
    );

    const order = await prisma.order.findUnique({
      where: {
        id: parsed.data.orderId,
      },
      select: {
        id: true,
        status: true,
        deliveryType: true,
        upstreamProvider: true,
        upstreamOrderId: true,
        upstreamStatus: true,
        upstreamSubmissionStatus: true,
      },
    });

    if (
      !order ||
      order.deliveryType !== OrderDeliveryType.CRAZYSMM ||
      order.upstreamProvider !== UpstreamProvider.CRAZYSMM ||
      !order.upstreamOrderId
    ) {
      throw new Error(fulfillmentCopy.messages.upstreamSyncUnavailable);
    }

    const syncResult = await syncCrazysmmOrderStatus(order);

    await prisma.$transaction(async (tx) => {
      await applyCrazysmmOrderSync(tx, order.id, syncResult.nextStatus, syncResult.upstream);
    });
  } catch (error) {
    redirect(
      withQueryMessage(
        "/admin/orders",
        "error",
        resolveErrorMessage(error, fulfillmentCopy.messages.upstreamSyncUnavailable),
      ),
    );
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/admin/orders");
  redirect(withQueryMessage("/admin/orders", "success", fulfillmentCopy.messages.upstreamStatusSynced));
}

export async function cancelUpstreamOrderAction(formData: FormData) {
  const requestContext = await getRequestContext();
  const locale = await getCurrentLocale();
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const securityCopy = getSecurityCopy(locale);
  const admin = await requireAdminSession();
  const parsed = syncUpstreamOrderSchema.safeParse({
    orderId: formData.get("orderId"),
  });

  if (!parsed.success) {
    redirect(withQueryMessage("/admin/orders", "error", fulfillmentCopy.messages.upstreamCancellationUnsupported));
  }

  try {
    await consumeRateLimits(
      [
        {
          scope: "admin.orders.cancel.user",
          subject: `user:${admin.userId}`,
        },
        ...(requestContext.ip !== "unknown"
          ? [
              {
                scope: "admin.orders.cancel.ip",
                subject: `ip:${requestContext.ip}`,
              },
            ]
          : []),
      ],
      throttlePolicies.adminMutation,
      securityCopy.adminTooManyAttempts,
    );

    const order = await prisma.order.findUnique({
      where: {
        id: parsed.data.orderId,
      },
      include: {
        product: {
          select: {
            upstreamSupportsCancel: true,
          },
        },
      },
    });

    if (
      !order ||
      order.deliveryType !== OrderDeliveryType.CRAZYSMM ||
      order.upstreamProvider !== UpstreamProvider.CRAZYSMM ||
      !order.upstreamOrderId
    ) {
      throw new Error(fulfillmentCopy.messages.upstreamCancellationUnsupported);
    }

    if (!order.product.upstreamSupportsCancel) {
      throw new Error(fulfillmentCopy.messages.upstreamCancellationUnsupported);
    }

    const cancelResponse = await cancelCrazysmmOrder(order.upstreamOrderId);

    await prisma.$transaction(async (tx) => {
      await refundOrderBalance(
        tx,
        order.id,
        admin.userId,
        fulfillmentCopy.messages.upstreamCancelled,
        {
          deliveryType: OrderDeliveryType.CRAZYSMM,
          status: OrderStatus.REFUNDED,
          upstreamSubmissionStatus: UpstreamSubmissionStatus.SUBMITTED,
          upstreamStatus: "Cancelled",
          upstreamLastSyncAt: new Date(),
          upstreamSyncMessage: fulfillmentCopy.messages.upstreamCancelled,
          upstreamResponsePayload: serializeUpstreamResponse(cancelResponse),
        },
      );
    });
  } catch (error) {
    redirect(
      withQueryMessage(
        "/admin/orders",
        "error",
        resolveErrorMessage(error, fulfillmentCopy.messages.upstreamCancellationUnsupported),
      ),
    );
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/admin/orders");
  redirect(withQueryMessage("/admin/orders", "success", fulfillmentCopy.messages.upstreamCancelled));
}

const orderMessageSchema = z.object({
  orderId: z.string().trim().min(1),
  body: z.string().trim().min(1).max(1000),
});

export async function addOrderMessageAction(formData: FormData) {
  const admin = await requireAdminSession();
  const parsed = orderMessageSchema.safeParse({
    orderId: formData.get("orderId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    redirect(withQueryMessage("/admin/orders", "error", "留言内容不能为空。"));
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true },
  });

  if (!order) {
    redirect(withQueryMessage("/admin/orders", "error", "订单不存在。"));
  }

  await prisma.orderMessage.create({
    data: {
      orderId: parsed.data.orderId,
      authorId: admin.userId,
      authorRole: "ADMIN",
      body: parsed.data.body,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  redirect(withQueryMessage("/admin/orders", "success", "留言已发送。"));
}

const productTranslationFields = ["name", "subtitle", "description", "deliveryNote", "tags"] as const;

export async function upsertProductTranslationAction(formData: FormData) {
  await requireAdminSession();
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    redirect(withQueryMessage("/admin/settings", "error", "商品 ID 缺失。"));
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });

  if (!product) {
    redirect(withQueryMessage("/admin/settings", "error", "商品不存在。"));
  }

  for (const locale of ["en", "ko"] as const) {
    for (const field of productTranslationFields) {
      const value = String(formData.get(`${locale}_${field}`) ?? "").trim();
      const textKey = `product.${product.slug}.${field}`;

      if (!value) {
        // Delete if empty so it falls back to Chinese
        await prisma.siteText.deleteMany({
          where: { textKey, locale },
        });
        continue;
      }

      await prisma.siteText.upsert({
        where: {
          textKey_locale: { textKey, locale },
        },
        update: { value },
        create: { textKey, locale, value },
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect(withQueryMessage("/admin/settings", "success", `商品「${product.slug}」翻译已保存。`));
}

export async function deleteProductCategoryAction(formData: FormData) {
  await requireAdminSession();
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!categoryId) {
    redirect(withQueryMessage("/admin/products", "error", "分类 ID 缺失。"));
  }

  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
    select: { name: true },
  });

  if (!category) {
    redirect(withQueryMessage("/admin/products", "error", "分类不存在。"));
  }

  // Move products in this category to "未分类"
  await prisma.product.updateMany({
    where: { category: category.name },
    data: { category: "未分类" },
  });

  await prisma.productCategory.delete({ where: { id: categoryId } });

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect(withQueryMessage("/admin/products", "success", "分类已删除，原有商品已移至「未分类」。"));
}

export async function adjustUserBalanceAction(formData: FormData) {
  const admin = await requireAdminSession();
  const userId = String(formData.get("userId") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || "管理员手动调整";

  if (!userId || !amountStr) {
    redirect(withQueryMessage("/admin/users", "error", "参数不完整。"));
  }

  const amountMicros = parseUsdt(amountStr);

  if (amountMicros === 0n) {
    redirect(withQueryMessage("/admin/users", "error", "金额不能为零。"));
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    redirect(withQueryMessage("/admin/users", "error", "用户钱包不存在。"));
  }

  const direction = amountMicros > 0n ? "CREDIT" : "DEBIT";
  const absMicros = amountMicros > 0n ? amountMicros : -amountMicros;
  const balanceBefore = wallet.balanceMicros;
  const balanceAfter = balanceBefore + amountMicros;

  if (balanceAfter < 0n) {
    redirect(withQueryMessage("/admin/users", "error", "余额不足，无法扣减。"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balanceMicros: { increment: amountMicros },
        version: { increment: 1 },
      },
    });

    await tx.walletLedger.create({
      data: {
        entryKey: `admin-adjust:${wallet.id}:${Date.now()}`,
        walletId: wallet.id,
        userId,
        createdById: admin.userId,
        type: "ADMIN_ADJUSTMENT",
        direction,
        amountMicros: absMicros,
        balanceBeforeMicros: balanceBefore,
        balanceAfterMicros: balanceAfter,
        note,
      },
    });
  });

  revalidatePath("/admin/users");
  redirect(withQueryMessage("/admin/users", "success", "余额已调整。"));
}

export async function toggleProductStatusAction(formData: FormData) {
  await requireAdminSession();
  const productId = String(formData.get("productId") ?? "").trim();
  const targetStatus = String(formData.get("status") ?? "").trim();

  if (!productId || !targetStatus) {
    redirect(withQueryMessage("/admin/products", "error", "参数不完整。"));
  }

  const validStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
  if (!validStatuses.includes(targetStatus as typeof validStatuses[number])) {
    redirect(withQueryMessage("/admin/products", "error", "状态无效。"));
  }

  await prisma.product.update({
    where: { id: productId },
    data: { status: targetStatus as ProductStatus },
  });

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect(withQueryMessage("/admin/products", "success", targetStatus === "ACTIVE" ? "商品已上架。" : "商品已下架。"));
}
