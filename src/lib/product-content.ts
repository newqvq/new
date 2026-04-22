import { Product } from "@prisma/client";

import { Locale } from "./i18n";

type LocalizedProduct = {
  category: string;
  name: string;
  subtitle: string;
  summary: string;
  description: string;
  deliveryNote: string;
  tags: string[];
};

const categoryTranslations: Record<string, Record<Locale, string>> = {
  "AI 服务": {
    zh: "AI 服务",
    en: "AI Services",
    ko: "AI 서비스",
  },
  "影音会员": {
    zh: "影音会员",
    en: "Media Memberships",
    ko: "미디어 멤버십",
  },
};

const productTranslations: Record<string, Record<Exclude<Locale, "zh">, LocalizedProduct>> = {
  "gpt-plus-pro": {
    en: {
      category: "AI Services",
      name: "GPT Plus Shared Seat",
      subtitle: "Manual provisioning with stable renewal for daily office and content workflows",
      summary: "Suitable for writing, office work, and research. Seats are allocated manually after purchase.",
      description:
        "After the order is submitted, it enters the manual queue. Support allocates an available seat in payment order and writes the delivery result back into the order notes.",
      deliveryNote: "Manually assigned seat, usually completed within 5 to 30 minutes.",
      tags: ["Chinese UI", "Manual Support", "Manual Delivery", "Renewal Ready"],
    },
    ko: {
      category: "AI 서비스",
      name: "GPT Plus 공유 좌석",
      subtitle: "일상 업무와 콘텐츠 작업에 적합한 수동 배정형 상품",
      summary: "문서 작성, 업무, 리서치에 적합하며 주문 후 사용 가능한 좌석이 수동 배정됩니다.",
      description:
        "주문이 생성되면 수동 처리 대기열로 들어가며, 결제 순서에 따라 사용 가능한 좌석을 배정하고 결과를 주문 메모에 기록합니다.",
      deliveryNote: "수동 좌석 배정, 보통 5~30분 안에 처리됩니다.",
      tags: ["중문 UI", "수동 지원", "수동 전달", "연장 가능"],
    },
  },
  "spotify-family": {
    en: {
      category: "Media Memberships",
      name: "Spotify Family Plan",
      subtitle: "Stable long-term service with manual invite after payment",
      summary: "Manual family invitation service for long-term listening scenarios.",
      description:
        "After the order is placed, support arranges the invitation based on region and stock. Email or household details can be completed through the order remark if needed.",
      deliveryNote: "Manual invite. The user may need to confirm email or household details.",
      tags: ["Family Plan", "Manual Handling", "Stable Renewal", "After-sales Support"],
    },
    ko: {
      category: "미디어 멤버십",
      name: "Spotify 패밀리 플랜",
      subtitle: "장기 사용에 적합한 안정형 수동 초대 상품",
      summary: "가족 그룹 수동 초대 방식으로 장기 음악 이용에 적합합니다.",
      description:
        "주문 후 지역과 재고에 맞춰 수동으로 초대를 진행하며, 필요하면 이메일이나 가정 주소 정보를 주문 메모로 보완할 수 있습니다.",
      deliveryNote: "수동 초대 방식이며 이메일 또는 주소 확인이 필요할 수 있습니다.",
      tags: ["패밀리 플랜", "수동 처리", "안정 연장", "사후 지원"],
    },
  },
  "netflix-premium": {
    en: {
      category: "Media Memberships",
      name: "Netflix Premium",
      subtitle: "Popular service with manual seat allocation in order queue",
      summary: "Best for streaming and shared-family scenarios, delivered manually after purchase.",
      description:
        "Once stock is checked, support allocates an available account seat. After-sales issues remain on the order record for follow-up and replacement handling.",
      deliveryNote: "Manual delivery. Instant fulfillment is not guaranteed.",
      tags: ["Popular", "Manual Delivery", "Order Support", "Stable Updates"],
    },
    ko: {
      category: "미디어 멤버십",
      name: "Netflix 프리미엄",
      subtitle: "주문 순서대로 계정 좌석을 수동 배정하는 인기 상품",
      summary: "영상 시청과 가족 공유에 적합하며 주문 완료 후 수동 전달됩니다.",
      description:
        "재고 확인 후 사용 가능한 계정 좌석을 배정하며, 사후 이슈는 주문 기록에 남겨 후속 처리와 보충 발송에 활용합니다.",
      deliveryNote: "수동 발송 상품이며 즉시 발송은 보장하지 않습니다.",
      tags: ["인기 상품", "수동 전달", "주문 지원", "안정 업데이트"],
    },
  },
  "disney-annual": {
    en: {
      category: "Media Memberships",
      name: "Disney Annual Membership",
      subtitle: "Yearly delivery for long-term users",
      summary: "Suitable for long-term use. Activated manually after inventory verification.",
      description:
        "After the order is created, balance is deducted first, then support completes activation or migration manually based on stock. Progress is written back to the order remark.",
      deliveryNote: "Manual activation, usually completed on the same day.",
      tags: ["Annual", "Manual Activation", "After-sales Support", "Long-term"],
    },
    ko: {
      category: "미디어 멤버십",
      name: "Disney 연간 멤버십",
      subtitle: "장기 사용자를 위한 연간 전달형 상품",
      summary: "장기 이용에 적합하며 재고 확인 후 수동으로 개통됩니다.",
      description:
        "주문 생성 후 먼저 잔액이 차감되고, 이후 재고 상황에 따라 수동 개통 또는 이전 처리를 진행하며 진행 상황은 주문 메모에 기록됩니다.",
      deliveryNote: "수동 개통 상품으로 보통 당일 내 처리됩니다.",
      tags: ["연간", "수동 개통", "사후 지원", "장기 안정"],
    },
  },
  "claude-pro": {
    en: {
      category: "AI Services",
      name: "Claude Pro Setup",
      subtitle: "Manual handling with required account or region details",
      summary: "For advanced users who need stronger model access, handled manually.",
      description:
        "This service has stricter account and region requirements. Support checks the order manually and may request additional information before delivery continues.",
      deliveryNote: "Manual setup, additional user information may be required.",
      tags: ["Manual Review", "Info Confirmation", "Setup Service", "Tracked Support"],
    },
    ko: {
      category: "AI 서비스",
      name: "Claude Pro 대행 개통",
      subtitle: "계정 또는 지역 정보 확인이 필요한 수동 처리 상품",
      summary: "고급 사용자용 상품으로 더 높은 모델 접근이 필요한 경우에 적합합니다.",
      description:
        "이 상품은 계정과 지역 조건이 더 엄격하여, 수동으로 주문을 검토하고 필요 시 추가 정보를 받은 뒤 전달을 이어갑니다.",
      deliveryNote: "수동 개통 상품이며 추가 정보 제출이 필요할 수 있습니다.",
      tags: ["수동 심사", "정보 확인", "대행 서비스", "추적 지원"],
    },
  },
  "gemini-pro": {
    en: {
      category: "AI Services",
      name: "Gemini Pro Membership",
      subtitle: "A solid add-on product for AI bundles",
      summary: "Delivered manually with after-sales notes, ideal for bundled AI offers.",
      description:
        "This service works well inside AI bundles. The admin side can record processing results, after-sales notes, and renewal arrangements manually.",
      deliveryNote: "Manual delivery. Completion notes are written back to the order.",
      tags: ["AI Bundle", "Manual Delivery", "Remark Tracking", "Renewal Ready"],
    },
    ko: {
      category: "AI 서비스",
      name: "Gemini Pro 멤버십",
      subtitle: "AI 번들 상품에 잘 어울리는 보조 상품",
      summary: "수동 전달과 사후 메모를 지원하며 다른 AI 서비스와 함께 판매하기 좋습니다.",
      description:
        "AI 조합 상품에 넣기 좋은 서비스로, 관리자 측에서 처리 결과와 사후 메모, 연장 계획을 수동으로 기록할 수 있습니다.",
      deliveryNote: "수동 전달 상품이며 완료 후 주문에 설명이 기록됩니다.",
      tags: ["AI 번들", "수동 전달", "메모 추적", "연장 가능"],
    },
  },
  "notion-ai-plus": {
    en: {
      category: "AI Services",
      name: "Notion AI Plus",
      subtitle: "Great for knowledge bases, docs collaboration, and content organization",
      summary: "A manual setup product built for documentation, internal knowledge bases, and content generation.",
      description:
        "After payment, the order enters the manual queue. Support arranges activation or account assignment based on stock and writes the result back into the order remark.",
      deliveryNote: "Manual setup, usually completed within 10 to 30 minutes.",
      tags: ["Docs Collaboration", "Manual Setup", "Renewal Ready", "Order Notes"],
    },
    ko: {
      category: "AI 서비스",
      name: "Notion AI Plus",
      subtitle: "지식 베이스, 문서 협업, 콘텐츠 정리에 적합한 상품",
      summary: "문서 작성과 지식 정리에 적합하며 수동 개통 방식으로 전달됩니다.",
      description:
        "결제 후 주문은 수동 처리 대기열에 들어가며, 재고 상황에 따라 개통 또는 계정 배정을 진행하고 결과를 주문 메모에 기록합니다.",
      deliveryNote: "수동 개통 상품이며 보통 10~30분 내 처리됩니다.",
      tags: ["문서 협업", "수동 개통", "연장 가능", "주문 메모"],
    },
  },
  "midjourney-standard": {
    en: {
      category: "AI Services",
      name: "Midjourney Standard",
      subtitle: "Suitable for image generation, sketching, and visual output workflows",
      summary: "Built for high-frequency creative work with manual delivery and renewal follow-up.",
      description:
        "This service is assigned or set up manually based on account availability. If extra email or login information is required, progress is updated through the order remark.",
      deliveryNote: "Manual delivery, usually completed within 15 to 45 minutes.",
      tags: ["Image Generation", "Manual Delivery", "Setup Support", "Renewal Ready"],
    },
    ko: {
      category: "AI 서비스",
      name: "Midjourney Standard",
      subtitle: "이미지 생성, 스케치, 시각 자료 작업에 적합한 상품",
      summary: "고빈도 이미지 제작에 적합하며 수동 전달과 연장 대응을 지원합니다.",
      description:
        "계정 사용 가능 여부에 따라 수동 배정 또는 대행 개통을 진행하며, 추가 이메일이나 로그인 정보가 필요하면 주문 메모에 진행 상황을 남깁니다.",
      deliveryNote: "수동 전달 상품이며 보통 15~45분 내 처리됩니다.",
      tags: ["이미지 생성", "수동 전달", "대행 지원", "연장 가능"],
    },
  },
  "canva-pro-team": {
    en: {
      category: "AI Services",
      name: "Canva Pro Team",
      subtitle: "Suitable for collaborative design, posters, and daily visual production",
      summary: "Delivered through manual invite or seat assignment, ideal for daily design operations.",
      description:
        "After purchase, support arranges team invites or seat activation based on stock. Every processing step remains visible in the order remarks for follow-up.",
      deliveryNote: "Manual invite, usually completed within 5 to 20 minutes.",
      tags: ["Design Collaboration", "Manual Invite", "Seat Assignment", "After-sales Notes"],
    },
    ko: {
      category: "AI 서비스",
      name: "Canva Pro 팀",
      subtitle: "디자인 협업, 포스터 제작, 일상 시각 작업에 적합한 상품",
      summary: "수동 초대 또는 좌석 배정 방식으로 전달되며 디자인 업무용 상시 상품에 적합합니다.",
      description:
        "주문 후 재고에 따라 팀 초대 또는 좌석 개통을 진행하며, 처리 단계는 주문 메모에 남아 추적과 사후 대응이 가능합니다.",
      deliveryNote: "수동 초대 방식이며 보통 5~20분 내 처리됩니다.",
      tags: ["디자인 협업", "수동 초대", "좌석 배정", "사후 메모"],
    },
  },
  "perplexity-pro": {
    en: {
      category: "AI Services",
      name: "Perplexity Pro",
      subtitle: "Built for research, search-assisted workflows, and information synthesis",
      summary: "A retrieval-focused product with manual activation and tracked after-sales notes.",
      description:
        "Once the order is created, support activates the service in payment order and continues updating handling and after-sales notes on the order page.",
      deliveryNote: "Manual setup, usually completed within 10 to 30 minutes.",
      tags: ["Research Search", "Manual Setup", "Research Workflows", "Support Notes"],
    },
    ko: {
      category: "AI 서비스",
      name: "Perplexity Pro",
      subtitle: "검색 강화, 리서치, 정보 정리에 적합한 상품",
      summary: "리서치 중심 작업에 맞춘 상품으로 수동 개통과 사후 메모 추적을 지원합니다.",
      description:
        "주문 생성 후 수동 처리 순서에 따라 개통을 진행하며, 처리 현황과 사후 메모는 주문 페이지에 계속 기록됩니다.",
      deliveryNote: "수동 개통 상품이며 보통 10~30분 내 처리됩니다.",
      tags: ["리서치 검색", "수동 개통", "연구 작업", "지원 메모"],
    },
  },
  "youtube-premium-family": {
    en: {
      category: "Media Memberships",
      name: "YouTube Premium Family",
      subtitle: "Great for ad-free video access and multi-device long-term use",
      summary: "Delivered through manual family invite, suitable for long-term stable usage.",
      description:
        "Support arranges the family invitation based on region and stock. If needed, email or address details can be completed through the order remark for full traceability.",
      deliveryNote: "Manual invite, usually completed within 10 to 30 minutes.",
      tags: ["Family Plan", "Multi-device", "Manual Invite", "Stable Renewal"],
    },
    ko: {
      category: "미디어 멤버십",
      name: "YouTube Premium 패밀리",
      subtitle: "광고 없는 영상 시청과 다중 기기 사용에 적합한 상품",
      summary: "수동 패밀리 초대 방식으로 전달되며 장기 사용에 적합합니다.",
      description:
        "지역과 재고 상황에 따라 패밀리 초대를 진행하며, 필요 시 이메일이나 주소 정보를 주문 메모로 보완할 수 있어 전체 과정이 추적됩니다.",
      deliveryNote: "수동 초대 상품이며 보통 10~30분 내 처리됩니다.",
      tags: ["패밀리 플랜", "다중 기기", "수동 초대", "안정 연장"],
    },
  },
  "apple-music-family": {
    en: {
      category: "Media Memberships",
      name: "Apple Music Family",
      subtitle: "Built for daily listening and household shared subscription use",
      summary: "Manual family invitation service for users who want a stable long-term plan.",
      description:
        "After the order is placed, support arranges the family invitation based on inventory. If Apple ID email or region details are needed, they are recorded in the order.",
      deliveryNote: "Manual invite, usually completed within 10 to 30 minutes.",
      tags: ["Family Plan", "Manual Invite", "Long-term Use", "Order Tracking"],
    },
    ko: {
      category: "미디어 멤버십",
      name: "Apple Music 패밀리",
      subtitle: "일상 음악 감상과 가족 공유 구독에 적합한 상품",
      summary: "수동 가족 초대 방식으로 전달되며 장기 이용 고객에게 적합합니다.",
      description:
        "주문 후 재고에 따라 가족 초대를 진행하며, Apple ID 이메일이나 지역 정보가 필요하면 주문 메모에 함께 안내됩니다.",
      deliveryNote: "수동 초대 상품이며 보통 10~30분 내 처리됩니다.",
      tags: ["패밀리 플랜", "수동 초대", "장기 사용", "주문 추적"],
    },
  },
  "hbo-max-standard": {
    en: {
      category: "Media Memberships",
      name: "HBO Max Standard",
      subtitle: "A solid option for streaming and short-cycle replenishment orders",
      summary: "A popular media product handled manually in payment order.",
      description:
        "After inventory is checked, support assigns an available account seat or completes activation manually. Delivery and after-sales notes remain attached to the order record.",
      deliveryNote: "Manual delivery, usually completed within 15 to 40 minutes.",
      tags: ["Popular Media", "Manual Delivery", "Order Records", "After-sales Support"],
    },
    ko: {
      category: "미디어 멤버십",
      name: "HBO Max 스탠다드",
      subtitle: "영상 시청과 단기 보충 주문에 적합한 상품",
      summary: "인기 미디어 상품으로 결제 순서에 따라 수동 처리됩니다.",
      description:
        "재고 확인 후 사용 가능한 계정 좌석을 배정하거나 수동 개통을 진행하며, 처리 결과와 사후 대화는 주문 기록에 남습니다.",
      deliveryNote: "수동 전달 상품이며 보통 15~40분 내 처리됩니다.",
      tags: ["인기 미디어", "수동 전달", "주문 기록", "사후 지원"],
    },
  },
  "crunchyroll-premium": {
    en: {
      category: "Media Memberships",
      name: "Crunchyroll Premium",
      subtitle: "Suitable for anime-focused memberships and add-on streaming demand",
      summary: "A light subscription product with manual delivery and tracked order notes.",
      description:
        "After the order is created, support arranges account delivery or activation based on stock. Processing progress is written back into the order remark for follow-up.",
      deliveryNote: "Manual delivery, usually completed within 10 to 30 minutes.",
      tags: ["Anime Membership", "Manual Delivery", "Remark Tracking", "Add-on Subscription"],
    },
    ko: {
      category: "미디어 멤버십",
      name: "Crunchyroll Premium",
      subtitle: "애니메이션 멤버십과 보조형 영상 서비스에 적합한 상품",
      summary: "보조형 콘텐츠 구독 상품으로 수동 발송과 사후 메모 추적을 지원합니다.",
      description:
        "주문 생성 후 계정 재고에 따라 발송 또는 개통을 진행하며, 처리 결과는 주문 메모에 계속 기록되어 추후 확인이 쉽습니다.",
      deliveryNote: "수동 발송 상품이며 보통 10~30분 내 처리됩니다.",
      tags: ["애니 멤버십", "수동 발송", "메모 추적", "보조 구독"],
    },
  },
};

export function getLocalizedProduct(product: Product, locale: Locale) {
  const translated =
    locale === "zh" ? null : productTranslations[product.slug]?.[locale];

  return {
    ...product,
    category:
      translated?.category ??
      categoryTranslations[product.category]?.[locale] ??
      product.category,
    name: translated?.name ?? product.name,
    subtitle: translated?.subtitle ?? product.subtitle,
    summary: translated?.summary ?? product.summary,
    description: translated?.description ?? product.description,
    deliveryNote: translated?.deliveryNote ?? product.deliveryNote,
    tags: translated?.tags ?? product.tags.split("|").filter(Boolean),
  };
}
