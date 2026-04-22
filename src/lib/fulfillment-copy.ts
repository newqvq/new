import {
  ProductFulfillmentMode,
  UpstreamServiceType,
  UpstreamSubmissionStatus,
} from "@prisma/client";

import { Locale } from "./i18n";

type FulfillmentCopy = {
  modes: Record<ProductFulfillmentMode, string>;
  serviceTypes: Record<UpstreamServiceType, string>;
  submissionStatuses: Record<UpstreamSubmissionStatus, string>;
  product: {
    automatedLabel: string;
    automatedHint: string;
    manualHint: string;
    noteOptional: string;
    targetLinkLabel: string;
    targetLinkPlaceholder: string;
    quantityLabel: string;
    quantityPlaceholder: string;
    runsLabel: string;
    runsPlaceholder: string;
    intervalLabel: string;
    intervalPlaceholder: string;
    commentsLabel: string;
    commentsPlaceholder: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    minLabel: string;
    minPlaceholder: string;
    maxLabel: string;
    maxPlaceholder: string;
    postsLabel: string;
    postsPlaceholder: string;
    oldPostsLabel: string;
    oldPostsPlaceholder: string;
    delayLabel: string;
    delayPlaceholder: string;
    expiryLabel: string;
    serviceConfigTitle: string;
    serviceConfigHint: string;
  };
  order: {
    deliveryTypeLabel: string;
    automatedOrderLabel: string;
    manualOrderLabel: string;
    upstreamOrderIdLabel: string;
    upstreamServiceIdLabel: string;
    upstreamStatusLabel: string;
    submissionStatusLabel: string;
    lastSyncLabel: string;
    requestDetailsLabel: string;
    syncAction: string;
    cancelAction: string;
    upstreamNotSubmitted: string;
    upstreamPendingReview: string;
    syncPending: string;
    cancelPending: string;
  };
  admin: {
    sectionTitle: string;
    sectionHint: string;
    fulfillmentModeLabel: string;
    listingMinLabel: string;
    listingMaxLabel: string;
    listingAverageTimeLabel: string;
    providerLabel: string;
    serviceIdLabel: string;
    serviceTypeLabel: string;
    supportsCancelLabel: string;
    supportsRefillLabel: string;
    automatedHelp: string;
    manualHelp: string;
    syncAction: string;
    cancelAction: string;
  };
  messages: {
    productNotMapped: string;
    upstreamCredentialsMissing: string;
    invalidTargetLink: string;
    invalidQuantity: string;
    invalidRuns: string;
    invalidInterval: string;
    commentsRequired: string;
    usernameRequired: string;
    invalidMin: string;
    invalidMax: string;
    invalidDelay: string;
    invalidPosts: string;
    invalidOldPosts: string;
    invalidExpiry: string;
    minGreaterThanMax: string;
    quantityBelowMinimum: (value: number) => string;
    quantityAboveMaximum: (value: number) => string;
    orderSubmittedUpstream: string;
    orderQueuedForReview: string;
    upstreamStatusSynced: string;
    upstreamSyncUnavailable: string;
    upstreamCancellationUnsupported: string;
    upstreamCancelled: string;
  };
};

const fulfillmentCopy: Record<Locale, FulfillmentCopy> = {
  zh: {
    modes: {
      MANUAL: "人工开单",
      CRAZYSMM: "上游自动下单",
    },
    serviceTypes: {
      DEFAULT: "标准数量单",
      CUSTOM_COMMENTS: "自定义评论单",
      SUBSCRIPTIONS: "订阅单",
    },
    submissionStatuses: {
      NOT_REQUIRED: "无需提交",
      PENDING: "待提交上游",
      SUBMITTED: "已提交上游",
      FAILED: "提交失败",
      UNKNOWN: "提交结果待核实",
    },
    product: {
      automatedLabel: "上游接口下单",
      automatedHint: "该商品会在余额扣款后自动向上游提交订单，并持续回写处理状态。",
      manualHint: "该商品继续走人工开单和人工交付流程。",
      noteOptional: "补充备注（选填）",
      targetLinkLabel: "目标链接",
      targetLinkPlaceholder: "例如 https://x.com/your-post 或频道链接",
      quantityLabel: "数量",
      quantityPlaceholder: "请输入下单数量",
      runsLabel: "重复次数",
      runsPlaceholder: "可选，适用于定时重复下单",
      intervalLabel: "间隔分钟",
      intervalPlaceholder: "可选，例如 30",
      commentsLabel: "评论内容",
      commentsPlaceholder: "每行一条评论内容",
      usernameLabel: "用户名",
      usernamePlaceholder: "请输入账号或用户名",
      minLabel: "最小值",
      minPlaceholder: "请输入最小值",
      maxLabel: "最大值",
      maxPlaceholder: "请输入最大值",
      postsLabel: "新增帖子数",
      postsPlaceholder: "可选，例如 5",
      oldPostsLabel: "历史帖子数",
      oldPostsPlaceholder: "可选，例如 30",
      delayLabel: "检查间隔（分钟）",
      delayPlaceholder: "请输入轮询间隔，例如 60",
      expiryLabel: "到期时间",
      serviceConfigTitle: "下单参数",
      serviceConfigHint: "不同上游服务类型需要不同参数，提交前请确认链接、数量和账号信息无误。",
    },
    order: {
      deliveryTypeLabel: "履约方式",
      automatedOrderLabel: "上游自动单",
      manualOrderLabel: "人工单",
      upstreamOrderIdLabel: "上游订单号",
      upstreamServiceIdLabel: "上游服务 ID",
      upstreamStatusLabel: "上游状态",
      submissionStatusLabel: "提交状态",
      lastSyncLabel: "最近同步",
      requestDetailsLabel: "请求参数",
      syncAction: "同步上游状态",
      cancelAction: "取消上游订单",
      upstreamNotSubmitted: "该订单尚未生成上游订单号。",
      upstreamPendingReview: "上游提交结果不明确，请在后台核对后再继续处理。",
      syncPending: "同步中...",
      cancelPending: "取消中...",
    },
    admin: {
      sectionTitle: "履约配置",
      sectionHint: "人工商品继续由后台处理；映射到上游的商品会严格按服务类型收集参数并提交到 CRAZYSMM。",
      fulfillmentModeLabel: "履约模式",
      listingMinLabel: "前台最小值",
      listingMaxLabel: "前台最大值",
      listingAverageTimeLabel: "前台参考时间",
      providerLabel: "上游提供方",
      serviceIdLabel: "上游服务 ID",
      serviceTypeLabel: "上游服务类型",
      supportsCancelLabel: "支持取消",
      supportsRefillLabel: "支持补单",
      automatedHelp: "配置完成后，用户下单会自动走 API 提交和状态同步。",
      manualHelp: "未映射商品继续走人工开单，不会调用任何上游接口。",
      syncAction: "同步",
      cancelAction: "取消并退款",
    },
    messages: {
      productNotMapped: "该商品还没有完成上游映射，当前不能按接口单提交。",
      upstreamCredentialsMissing: "上游接口密钥尚未配置，暂时不能提交自动订单。",
      invalidTargetLink: "请输入有效的目标链接。",
      invalidQuantity: "请输入有效的数量。",
      invalidRuns: "重复次数必须是正整数。",
      invalidInterval: "间隔分钟必须是正整数。",
      commentsRequired: "请至少填写一条评论内容。",
      usernameRequired: "请输入用户名。",
      invalidMin: "请输入有效的最小值。",
      invalidMax: "请输入有效的最大值。",
      invalidDelay: "请输入有效的检查间隔。",
      invalidPosts: "新增帖子数必须是正整数。",
      invalidOldPosts: "历史帖子数必须是正整数。",
      invalidExpiry: "请输入有效的到期时间。",
      minGreaterThanMax: "最小值不能大于最大值。",
      quantityBelowMinimum: (value: number) => `数量不能低于 ${value}。`,
      quantityAboveMaximum: (value: number) => `数量不能高于 ${value}。`,
      orderSubmittedUpstream: "订单已提交到上游，系统会继续同步处理结果。",
      orderQueuedForReview: "订单已进入待核实状态，后台需要确认上游提交结果。",
      upstreamStatusSynced: "已拉取最新上游状态。",
      upstreamSyncUnavailable: "该订单没有可同步的上游订单号。",
      upstreamCancellationUnsupported: "该商品当前不支持取消上游订单。",
      upstreamCancelled: "上游订单已取消，余额已退回用户钱包。",
    },
  },
  en: {
    modes: {
      MANUAL: "Manual",
      CRAZYSMM: "Upstream API",
    },
    serviceTypes: {
      DEFAULT: "Default",
      CUSTOM_COMMENTS: "Custom Comments",
      SUBSCRIPTIONS: "Subscriptions",
    },
    submissionStatuses: {
      NOT_REQUIRED: "Not required",
      PENDING: "Pending submit",
      SUBMITTED: "Submitted",
      FAILED: "Submission failed",
      UNKNOWN: "Needs verification",
    },
    product: {
      automatedLabel: "Automated upstream order",
      automatedHint: "This product submits the order to the upstream panel after wallet deduction and keeps syncing status back.",
      manualHint: "This product continues through the manual ticket and delivery workflow.",
      noteOptional: "Extra note (optional)",
      targetLinkLabel: "Target link",
      targetLinkPlaceholder: "For example: https://x.com/your-post",
      quantityLabel: "Quantity",
      quantityPlaceholder: "Enter the desired quantity",
      runsLabel: "Runs",
      runsPlaceholder: "Optional repeat count",
      intervalLabel: "Interval (minutes)",
      intervalPlaceholder: "Optional, for example 30",
      commentsLabel: "Comments",
      commentsPlaceholder: "One comment per line",
      usernameLabel: "Username",
      usernamePlaceholder: "Enter the target username",
      minLabel: "Min",
      minPlaceholder: "Enter the minimum value",
      maxLabel: "Max",
      maxPlaceholder: "Enter the maximum value",
      postsLabel: "Posts",
      postsPlaceholder: "Optional, for example 5",
      oldPostsLabel: "Old posts",
      oldPostsPlaceholder: "Optional, for example 30",
      delayLabel: "Delay (minutes)",
      delayPlaceholder: "Required, for example 60",
      expiryLabel: "Expiry",
      serviceConfigTitle: "Order parameters",
      serviceConfigHint: "Each upstream service type has different required fields. Double-check the link, quantity, and account data before submitting.",
    },
    order: {
      deliveryTypeLabel: "Fulfillment",
      automatedOrderLabel: "Upstream order",
      manualOrderLabel: "Manual order",
      upstreamOrderIdLabel: "Upstream order ID",
      upstreamServiceIdLabel: "Upstream service ID",
      upstreamStatusLabel: "Upstream status",
      submissionStatusLabel: "Submission state",
      lastSyncLabel: "Last sync",
      requestDetailsLabel: "Request data",
      syncAction: "Sync upstream status",
      cancelAction: "Cancel upstream order",
      upstreamNotSubmitted: "No upstream order ID is attached yet.",
      upstreamPendingReview: "The upstream submission result is uncertain and needs admin review.",
      syncPending: "Syncing...",
      cancelPending: "Cancelling...",
    },
    admin: {
      sectionTitle: "Fulfillment settings",
      sectionHint: "Manual products stay in the in-house workflow. Products mapped to the upstream panel collect the exact CRAZYSMM order parameters.",
      fulfillmentModeLabel: "Fulfillment mode",
      listingMinLabel: "Listing min",
      listingMaxLabel: "Listing max",
      listingAverageTimeLabel: "Listing average time",
      providerLabel: "Upstream provider",
      serviceIdLabel: "Upstream service ID",
      serviceTypeLabel: "Upstream service type",
      supportsCancelLabel: "Supports cancel",
      supportsRefillLabel: "Supports refill",
      automatedHelp: "Once configured, wallet-paid orders will be submitted through the API and synced back automatically.",
      manualHelp: "Unmapped products stay manual and never call the upstream API.",
      syncAction: "Sync",
      cancelAction: "Cancel and refund",
    },
    messages: {
      productNotMapped: "This product has not been mapped to an upstream service yet.",
      upstreamCredentialsMissing: "The upstream API key is not configured.",
      invalidTargetLink: "Enter a valid target link.",
      invalidQuantity: "Enter a valid quantity.",
      invalidRuns: "Runs must be a positive integer.",
      invalidInterval: "Interval must be a positive integer.",
      commentsRequired: "Enter at least one comment line.",
      usernameRequired: "Enter a username.",
      invalidMin: "Enter a valid minimum value.",
      invalidMax: "Enter a valid maximum value.",
      invalidDelay: "Enter a valid delay value.",
      invalidPosts: "Posts must be a positive integer.",
      invalidOldPosts: "Old posts must be a positive integer.",
      invalidExpiry: "Enter a valid expiry date.",
      minGreaterThanMax: "Minimum cannot be greater than maximum.",
      quantityBelowMinimum: (value: number) => `Quantity cannot be lower than ${value}.`,
      quantityAboveMaximum: (value: number) => `Quantity cannot be higher than ${value}.`,
      orderSubmittedUpstream: "Order submitted to the upstream provider. Status sync will continue.",
      orderQueuedForReview: "Order placed, but the upstream submission needs manual verification.",
      upstreamStatusSynced: "Latest upstream status synced.",
      upstreamSyncUnavailable: "This order does not have a syncable upstream order ID.",
      upstreamCancellationUnsupported: "This product does not support upstream cancellation.",
      upstreamCancelled: "Upstream order cancelled and balance refunded.",
    },
  },
  ko: {
    modes: {
      MANUAL: "수동 처리",
      CRAZYSMM: "상위 API 주문",
    },
    serviceTypes: {
      DEFAULT: "기본 주문",
      CUSTOM_COMMENTS: "댓글 주문",
      SUBSCRIPTIONS: "구독 주문",
    },
    submissionStatuses: {
      NOT_REQUIRED: "제출 불필요",
      PENDING: "제출 대기",
      SUBMITTED: "제출 완료",
      FAILED: "제출 실패",
      UNKNOWN: "확인 필요",
    },
    product: {
      automatedLabel: "상위 패널 자동 주문",
      automatedHint: "이 상품은 잔액 차감 후 상위 패널로 자동 제출되며 진행 상태를 계속 동기화합니다.",
      manualHint: "이 상품은 계속 수동 접수와 수동 전달 방식으로 처리됩니다.",
      noteOptional: "추가 메모(선택)",
      targetLinkLabel: "대상 링크",
      targetLinkPlaceholder: "예: https://x.com/your-post",
      quantityLabel: "수량",
      quantityPlaceholder: "주문 수량 입력",
      runsLabel: "반복 횟수",
      runsPlaceholder: "선택 입력",
      intervalLabel: "간격(분)",
      intervalPlaceholder: "예: 30",
      commentsLabel: "댓글 내용",
      commentsPlaceholder: "한 줄에 한 개씩 입력",
      usernameLabel: "사용자명",
      usernamePlaceholder: "대상 사용자명 입력",
      minLabel: "최소값",
      minPlaceholder: "최소값 입력",
      maxLabel: "최대값",
      maxPlaceholder: "최대값 입력",
      postsLabel: "신규 게시물 수",
      postsPlaceholder: "선택 입력, 예: 5",
      oldPostsLabel: "기존 게시물 수",
      oldPostsPlaceholder: "선택 입력, 예: 30",
      delayLabel: "지연 시간(분)",
      delayPlaceholder: "예: 60",
      expiryLabel: "만료 시간",
      serviceConfigTitle: "주문 파라미터",
      serviceConfigHint: "상위 서비스 유형마다 필요한 입력값이 다릅니다. 링크, 수량, 계정 정보를 다시 확인하세요.",
    },
    order: {
      deliveryTypeLabel: "처리 방식",
      automatedOrderLabel: "상위 자동 주문",
      manualOrderLabel: "수동 주문",
      upstreamOrderIdLabel: "상위 주문 번호",
      upstreamServiceIdLabel: "상위 서비스 ID",
      upstreamStatusLabel: "상위 상태",
      submissionStatusLabel: "제출 상태",
      lastSyncLabel: "최근 동기화",
      requestDetailsLabel: "요청 정보",
      syncAction: "상위 상태 동기화",
      cancelAction: "상위 주문 취소",
      upstreamNotSubmitted: "아직 상위 주문 번호가 없습니다.",
      upstreamPendingReview: "상위 제출 결과가 불명확하여 관리자의 확인이 필요합니다.",
      syncPending: "동기화 중...",
      cancelPending: "취소 중...",
    },
    admin: {
      sectionTitle: "처리 설정",
      sectionHint: "수동 상품은 기존 방식대로 처리됩니다. 상위 패널에 매핑된 상품은 CRAZYSMM 규격에 맞춰 주문합니다.",
      fulfillmentModeLabel: "처리 모드",
      listingMinLabel: "목록 최소값",
      listingMaxLabel: "목록 최대값",
      listingAverageTimeLabel: "목록 평균 시간",
      providerLabel: "상위 제공자",
      serviceIdLabel: "상위 서비스 ID",
      serviceTypeLabel: "상위 서비스 유형",
      supportsCancelLabel: "취소 지원",
      supportsRefillLabel: "리필 지원",
      automatedHelp: "설정이 끝나면 잔액 결제 주문이 API로 전송되고 상태가 다시 반영됩니다.",
      manualHelp: "매핑되지 않은 상품은 수동 처리만 진행합니다.",
      syncAction: "동기화",
      cancelAction: "취소 후 환불",
    },
    messages: {
      productNotMapped: "이 상품은 아직 상위 서비스와 매핑되지 않았습니다.",
      upstreamCredentialsMissing: "상위 API 키가 아직 설정되지 않았습니다.",
      invalidTargetLink: "유효한 대상 링크를 입력하세요.",
      invalidQuantity: "유효한 수량을 입력하세요.",
      invalidRuns: "반복 횟수는 양의 정수여야 합니다.",
      invalidInterval: "간격은 양의 정수여야 합니다.",
      commentsRequired: "최소 한 줄 이상의 댓글을 입력하세요.",
      usernameRequired: "사용자명을 입력하세요.",
      invalidMin: "유효한 최소값을 입력하세요.",
      invalidMax: "유효한 최대값을 입력하세요.",
      invalidDelay: "유효한 지연 시간을 입력하세요.",
      invalidPosts: "신규 게시물 수는 양의 정수여야 합니다.",
      invalidOldPosts: "기존 게시물 수는 양의 정수여야 합니다.",
      invalidExpiry: "유효한 만료 시간을 입력하세요.",
      minGreaterThanMax: "최소값은 최대값보다 클 수 없습니다.",
      quantityBelowMinimum: (value: number) => `수량은 ${value}보다 작을 수 없습니다.`,
      quantityAboveMaximum: (value: number) => `수량은 ${value}보다 클 수 없습니다.`,
      orderSubmittedUpstream: "주문이 상위 패널로 제출되었습니다. 상태를 계속 동기화합니다.",
      orderQueuedForReview: "주문은 생성되었지만 상위 제출 결과 확인이 필요합니다.",
      upstreamStatusSynced: "최신 상위 상태를 동기화했습니다.",
      upstreamSyncUnavailable: "동기화할 상위 주문 번호가 없습니다.",
      upstreamCancellationUnsupported: "이 상품은 상위 취소를 지원하지 않습니다.",
      upstreamCancelled: "상위 주문이 취소되었고 잔액이 환불되었습니다.",
    },
  },
};

export function getFulfillmentCopy(locale: Locale) {
  return fulfillmentCopy[locale];
}
