import { PrismaClient, ProductStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const products = [
  {
    slug: "gpt-plus-pro",
    name: "GPT Plus 共享席位",
    subtitle: "人工核销，稳定续费，适合日常办公与内容创作",
    category: "AI 服务",
    cover: "AI",
    summary: "适合常规办公、写作和研究场景，下单后由人工分配可用席位。",
    description:
      "订单提交后会进入人工处理队列，客服按付款顺序分配可用席位并回填交付说明。默认提供站内备注跟单和售后沟通。",
    tags: "中文界面|人工售后|手工交付|支持续费",
    deliveryNote: "人工分配席位，通常 5 到 30 分钟内完成处理。",
    priceMicros: BigInt(29_000_000),
    sortOrder: 10,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "spotify-family",
    name: "Spotify 家庭组",
    subtitle: "长期稳定，低干预，到账后人工拉组处理",
    category: "影音会员",
    cover: "SP",
    summary: "提供人工拉组服务，适合长期听歌与轻售后场景。",
    description:
      "下单后客服会根据地区和库存安排拉组，必要时通过订单备注补充邮箱或家庭地址信息，处理过程全程留痕。",
    tags: "家庭组|人工处理|稳定续费|售后支持",
    deliveryNote: "人工拉组，需用户配合确认邮箱或家庭地址信息。",
    priceMicros: BigInt(59_000_000),
    sortOrder: 20,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "netflix-premium",
    name: "Netflix 高级会员",
    subtitle: "热门商品，按订单顺序人工分配账号位",
    category: "影音会员",
    cover: "NF",
    summary: "适合追剧与家庭共享场景，订单完成后由人工交付。",
    description:
      "后台核对库存后分配可用账号位，售后问题会持续留在订单记录中，方便后续跟进与补单处理。",
    tags: "热门商品|人工交付|订单售后|稳定更新",
    deliveryNote: "人工发货，不承诺秒发，建议预留处理时间。",
    priceMicros: BigInt(99_000_000),
    sortOrder: 30,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "disney-annual",
    name: "Disney 年付会员",
    subtitle: "按年交付，适合长期稳定用户",
    category: "影音会员",
    cover: "DS",
    summary: "适合长期使用场景，后台核验库存后人工开通。",
    description:
      "订单生成后系统会先扣除余额，再由后台根据库存情况人工完成开通或迁移，交付进度会写回订单备注。",
    tags: "年付|人工开通|售后支持|长期稳定",
    deliveryNote: "人工开通，通常当天内完成。",
    priceMicros: BigInt(199_000_000),
    sortOrder: 40,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "claude-pro",
    name: "Claude Pro 代开",
    subtitle: "人工处理，需要配合提供必要资料",
    category: "AI 服务",
    cover: "CL",
    summary: "适合对模型能力有要求的进阶用户，采用人工代开模式。",
    description:
      "该类商品对账号和地区条件要求更高，后台会结合风控情况人工核对并处理，必要时补充资料后再继续交付。",
    tags: "人工审核|资料确认|代开服务|售后跟单",
    deliveryNote: "人工代开，可能需要用户补充必要资料。",
    priceMicros: BigInt(168_000_000),
    sortOrder: 50,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "gemini-pro",
    name: "Gemini Pro 会员",
    subtitle: "适合作为 AI 套餐中的补充商品",
    category: "AI 服务",
    cover: "GM",
    summary: "支持人工交付和售后备注跟进，适合与其他 AI 服务搭配销售。",
    description:
      "这类商品适合放在 AI 组合套餐中统一出售，后台可手工记录处理结果、售后备注和后续续费安排。",
    tags: "AI 套餐|人工交付|备注追踪|支持续费",
    deliveryNote: "人工交付，完成后会在订单中回填说明。",
    priceMicros: BigInt(88_000_000),
    sortOrder: 60,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "notion-ai-plus",
    name: "Notion AI Plus",
    subtitle: "适合知识库、文档协作与内容整理场景",
    category: "AI 服务",
    cover: "NT",
    summary: "适合团队文档、知识库整理与内容生成，采用人工开通方式。",
    description:
      "订单支付后进入人工处理队列，客服会根据库存安排开通或分配可用账号，并在订单备注中回填处理结果。",
    tags: "文档协作|人工开通|稳定续费|订单备注",
    deliveryNote: "人工开通，通常 10 到 30 分钟内完成。",
    priceMicros: BigInt(49_000_000),
    sortOrder: 70,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "midjourney-standard",
    name: "Midjourney Standard",
    subtitle: "适合图像生成、创意草图与素材产出",
    category: "AI 服务",
    cover: "MJ",
    summary: "面向高频出图场景，支持人工交付与后续续费跟单。",
    description:
      "该商品会根据账号可用性人工分配或代开，若需要补充邮箱或登录信息，会通过订单备注同步处理进度。",
    tags: "图像生成|人工交付|代开支持|可续费",
    deliveryNote: "人工交付，通常 15 到 45 分钟内完成。",
    priceMicros: BigInt(79_000_000),
    sortOrder: 80,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "canva-pro-team",
    name: "Canva Pro 团队版",
    subtitle: "适合设计协作、海报制作与日常出图",
    category: "AI 服务",
    cover: "CV",
    summary: "以人工邀请或席位分配方式交付，适合作为办公设计类常备商品。",
    description:
      "下单后客服根据团队库存安排拉组或席位开通，处理节点会持续记录在订单备注中，方便追踪和售后。",
    tags: "设计协作|人工邀请|席位分配|售后留痕",
    deliveryNote: "人工邀请加入，通常 5 到 20 分钟内完成。",
    priceMicros: BigInt(26_000_000),
    sortOrder: 90,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "perplexity-pro",
    name: "Perplexity Pro",
    subtitle: "适合检索增强、问答研究与信息整合",
    category: "AI 服务",
    cover: "PX",
    summary: "面向检索型工作流，支持人工开通与订单内售后备注。",
    description:
      "订单生成后进入人工处理流程，客服会按付款顺序安排开通，并在订单页面持续更新处理与售后信息。",
    tags: "信息检索|人工开通|研究场景|售后备注",
    deliveryNote: "人工开通，通常 10 到 30 分钟内完成。",
    priceMicros: BigInt(39_000_000),
    sortOrder: 100,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "youtube-premium-family",
    name: "YouTube Premium 家庭组",
    subtitle: "适合视频免广告与多设备长期使用",
    category: "影音会员",
    cover: "YT",
    summary: "通过人工拉组方式交付，适合长期稳定使用。",
    description:
      "客服会根据地区和库存安排家庭组邀请，必要时通过订单备注补充邮箱或地址信息，整个过程可回溯。",
    tags: "家庭组|多设备使用|人工拉组|稳定续费",
    deliveryNote: "人工拉组，通常 10 到 30 分钟内完成。",
    priceMicros: BigInt(42_000_000),
    sortOrder: 110,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "apple-music-family",
    name: "Apple Music 家庭组",
    subtitle: "适合日常听歌与家庭共享订阅场景",
    category: "影音会员",
    cover: "AM",
    summary: "人工邀请加入家庭组，适合稳定长期续费用户。",
    description:
      "下单后根据库存安排家庭组邀请，若需要补充 Apple ID 邮箱或地区信息，会在订单中同步说明。",
    tags: "家庭组|人工邀请|长期使用|订单跟单",
    deliveryNote: "人工邀请加入，通常 10 到 30 分钟内完成。",
    priceMicros: BigInt(36_000_000),
    sortOrder: 120,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "hbo-max-standard",
    name: "HBO Max 标准版",
    subtitle: "适合追剧观影与短周期补充采购",
    category: "影音会员",
    cover: "HB",
    summary: "热门影音类商品，按订单顺序人工处理交付。",
    description:
      "后台核对库存后人工分配可用账号位或完成迁移开通，处理结果与售后沟通会保留在订单记录中。",
    tags: "热门影视|人工交付|订单记录|售后支持",
    deliveryNote: "人工交付，通常 15 到 40 分钟内完成。",
    priceMicros: BigInt(64_000_000),
    sortOrder: 130,
    status: ProductStatus.ACTIVE,
  },
  {
    slug: "crunchyroll-premium",
    name: "Crunchyroll Premium",
    subtitle: "适合动漫会员需求与补充型视频服务",
    category: "影音会员",
    cover: "CR",
    summary: "适合补充型内容订阅场景，支持人工发货与售后备注。",
    description:
      "订单生成后客服会根据账号库存安排发货或开通，处理结果会实时写入订单备注，方便后续追踪。",
    tags: "动漫会员|人工发货|备注追踪|补充订阅",
    deliveryNote: "人工发货，通常 10 到 30 分钟内完成。",
    priceMicros: BigInt(25_000_000),
    sortOrder: 140,
    status: ProductStatus.ACTIVE,
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@xinglian.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const uniqueCategories = Array.from(new Set(products.map((product) => product.category)));

  for (const [index, categoryName] of uniqueCategories.entries()) {
    await prisma.productCategory.upsert({
      where: {
        name: categoryName,
      },
      update: {
        sortOrder: (index + 1) * 100,
      },
      create: {
        name: categoryName,
        slug: categoryName
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/(^-|-$)/g, ""),
        sortOrder: (index + 1) * 100,
      },
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      displayName: "平台管理员",
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      displayName: "平台管理员",
      passwordHash,
      inviteCode: "ADMIN888",
      role: Role.ADMIN,
      wallet: {
        create: {},
      },
    },
    include: {
      wallet: true,
    },
  });

  if (!admin.wallet) {
    await prisma.wallet.create({
      data: {
        userId: admin.id,
      },
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
