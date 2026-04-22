import {
  OrderStatus,
  ProductStatus,
  RechargeStatus,
  WithdrawalStatus,
} from "@prisma/client";

import { getSession } from "./auth";
import { prisma } from "./prisma";
import { expireStaleRechargeOrders } from "./recharge-service";
import { slugify } from "./utils";

export async function getViewer() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      inviteCode: true,
      wallet: {
        select: {
          balanceMicros: true,
        },
      },
    },
  });
}

export async function getHomepageData() {
  const [products] = await prisma.$transaction([
    prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const categories = Array.from(new Set(products.map((item) => item.category)));

  return {
    products,
    categories,
    metrics: [
      {
        label: "支持网络",
        value: "3 条",
      },
      {
        label: "在售品类",
        value: `${categories.length}+`,
      },
      {
        label: "在售商品",
        value: `${products.length}+`,
      },
      {
        label: "返佣策略",
        value: "充值返佣",
      },
    ],
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
  });
}

export async function getDashboardData(userId: string) {
  await expireStaleRechargeOrders(prisma);

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      orders: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      rechargeOrders: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      withdrawalRequests: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      walletEntries: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      referrals: {
        select: {
          id: true,
          displayName: true,
          email: true,
          createdAt: true,
          wallet: {
            select: {
              balanceMicros: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      commissionReceipts: {
        include: {
          fromUser: {
            select: {
              displayName: true,
              email: true,
            },
          },
          rechargeOrder: {
            select: {
              serialNo: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
    },
  });
}

export async function getRechargePageData(userId: string) {
  await expireStaleRechargeOrders(prisma);

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      wallet: {
        select: {
          balanceMicros: true,
        },
      },
      rechargeOrders: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });
}

export async function getOrdersPageData(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      wallet: {
        select: {
          balanceMicros: true,
        },
      },
      orders: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      },
    },
  });
}

export async function getAdminDashboardData() {
  await expireStaleRechargeOrders(prisma);

  const [
    userCount,
    productCount,
    pendingRecharges,
    pendingOrders,
    pendingWithdrawals,
    latestRecharges,
    latestOrders,
    latestWithdrawals,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.product.count({
      where: {
        status: ProductStatus.ACTIVE,
      },
    }),
    prisma.rechargeOrder.count({
      where: {
        status: {
          in: [RechargeStatus.AWAITING_PAYMENT, RechargeStatus.UNDER_REVIEW],
        },
      },
    }),
    prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PROCESSING],
        },
      },
    }),
    prisma.withdrawalRequest.count({
      where: {
        status: WithdrawalStatus.PENDING,
      },
    }),
    prisma.rechargeOrder.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.order.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
      product: {
        select: {
          name: true,
          upstreamSupportsCancel: true,
          fulfillmentMode: true,
        },
      },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.withdrawalRequest.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  return {
    userCount,
    productCount,
    pendingRecharges,
    pendingOrders,
    pendingWithdrawals,
    latestRecharges,
    latestOrders,
    latestWithdrawals,
  };
}

export async function getAdminProductsData() {
  return prisma.product.findMany({
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getAdminProductCategoriesData() {
  const [storedCategories, products] = await prisma.$transaction([
    prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      select: {
        category: true,
      },
    }),
  ]);

  const usedCountMap = products.reduce((map, item) => {
    map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const knownNames = new Set(storedCategories.map((item) => item.name));

  const merged = storedCategories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    productCount: usedCountMap.get(category.name) ?? 0,
    managed: true,
  }));

  const derived = Array.from(usedCountMap.entries())
    .filter(([category]) => category && !knownNames.has(category))
    .map(([category, productCount]) => ({
      id: `derived:${slugify(category)}`,
      name: category,
      slug: slugify(category),
      sortOrder: 9999,
      productCount,
      managed: false,
    }));

  return [...merged, ...derived].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function getAdminRechargesData() {
  await expireStaleRechargeOrders(prisma);

  return prisma.rechargeOrder.findMany({
    include: {
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

export async function getAdminRechargesPage(page: number, pageSize: number) {
  await expireStaleRechargeOrders(prisma);

  const safePageSize = Math.max(1, pageSize);
  const [totalCount, pendingCount, verifiedCount, failedCount] = await prisma.$transaction([
    prisma.rechargeOrder.count(),
    prisma.rechargeOrder.count({
      where: {
        status: {
          in: [RechargeStatus.AWAITING_PAYMENT, RechargeStatus.UNDER_REVIEW],
        },
      },
    }),
    prisma.rechargeOrder.count({
      where: {
        verificationStatus: "VERIFIED",
      },
    }),
    prisma.rechargeOrder.count({
      where: {
        verificationStatus: "FAILED",
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const skip = (currentPage - 1) * safePageSize;

  const items = await prisma.rechargeOrder.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: safePageSize,
    });

  return {
    totalCount,
    currentPage,
    pageCount,
    pendingCount,
    verifiedCount,
    failedCount,
    items,
  };
}

export async function getAdminOrdersData() {
  return prisma.order.findMany({
    include: {
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
      product: {
        select: {
          name: true,
          upstreamSupportsCancel: true,
          fulfillmentMode: true,
        },
      },
      handler: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

export async function getAdminWithdrawalsData() {
  return prisma.withdrawalRequest.findMany({
    include: {
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 80,
  });
}

export async function getAdminWithdrawalsPage(page: number, pageSize: number) {
  const safePageSize = Math.max(1, pageSize);
  const [totalCount, pendingCount, approvedCount, rejectedCount] =
    await prisma.$transaction([
    prisma.withdrawalRequest.count(),
    prisma.withdrawalRequest.count({
      where: {
        status: WithdrawalStatus.PENDING,
      },
    }),
    prisma.withdrawalRequest.count({
      where: {
        status: WithdrawalStatus.APPROVED,
      },
    }),
    prisma.withdrawalRequest.count({
      where: {
        status: WithdrawalStatus.REJECTED,
      },
    }),
    ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const skip = (currentPage - 1) * safePageSize;

  const items = await prisma.withdrawalRequest.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: safePageSize,
    });

  return {
    totalCount,
    currentPage,
    pageCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    items,
  };
}

export async function getAdminUsersData() {
  return prisma.user.findMany({
    include: {
      wallet: true,
      referrer: {
        select: {
          displayName: true,
          email: true,
        },
      },
      _count: {
        select: {
          referrals: true,
          orders: true,
          rechargeOrders: true,
          withdrawalRequests: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 80,
  });
}

export async function getAdminUsersPage(page: number, pageSize: number) {
  const safePageSize = Math.max(1, pageSize);
  const totalCount = await prisma.user.count();
  const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const skip = (currentPage - 1) * safePageSize;

  const items = await prisma.user.findMany({
      include: {
        wallet: true,
        referrer: {
          select: {
            displayName: true,
            email: true,
          },
        },
        _count: {
          select: {
            referrals: true,
            orders: true,
            rechargeOrders: true,
            withdrawalRequests: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: safePageSize,
    });

  return { totalCount, currentPage, pageCount, items };
}
