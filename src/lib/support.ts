import { env } from "./env";
import { Locale } from "./i18n";

export const supportConfig = {
  email: env.SUPPORT_EMAIL,
  telegram: env.SUPPORT_TELEGRAM || "@vc5444",
  hours: env.SUPPORT_HOURS,
};

export const publicPageCopy = {
  zh: {
    contact: {
      title: "客户支持",
      subtitle: "充值、订单、交付、退款或账户问题，都可以通过以下方式联系我们。",
      response: "我们通常会在 24 小时内回复。请在消息中附上订单号、充值单号或注册邮箱，方便快速核对。",
      cards: {
        email: "邮箱支持",
        telegram: "Telegram 客服",
        hours: "服务时间",
      },
      sections: [
        {
          title: "充值问题",
          body: "如果充值已完成但余额未到账，请提供充值金额、网络、交易哈希和注册邮箱。",
        },
        {
          title: "订单问题",
          body: "如果订单状态长时间未更新，请提供订单号和下单备注，我们会核对处理进度。",
        },
        {
          title: "退款问题",
          body: "符合退款条件的订单会退回平台余额，提现申请由后台审核后处理。",
        },
      ],
    },
    terms: {
      title: "服务条款",
      subtitle: "使用本网站即表示你同意以下服务规则。",
      sections: [
        ["账户与安全", "用户需要自行保护登录信息。发现异常登录、错误充值或订单异常时，应及时联系客服。"],
        ["充值与余额", "平台仅支持 USDT 充值。充值确认后会转为平台余额，平台余额可用于购买网站内服务。"],
        ["订单交付", "服务以页面展示的说明为准。部分订单需要人工处理，处理结果会在订单页面更新。"],
        ["禁止用途", "用户不得使用本网站服务从事违法、欺诈、侵权或违反第三方平台规则的行为。"],
      ],
    },
    privacy: {
      title: "隐私政策",
      subtitle: "我们只收集完成账户、充值、订单和客服所需的信息。",
      sections: [
        ["收集的信息", "我们可能收集邮箱、订单备注、充值记录、提现地址和必要的访问安全日志。"],
        ["使用目的", "信息用于账户登录、订单处理、余额入账、风控防护和客服支持。"],
        ["数据保护", "敏感配置和支付密钥仅保存在服务器环境变量中，不会展示给普通用户。"],
        ["第三方服务", "支付处理可能由 Cryptomus 等支付服务商完成，相关交易会遵循其服务规则。"],
      ],
    },
    refund: {
      title: "退款政策",
      subtitle: "退款以平台余额形式处理，具体结果取决于订单状态和服务交付情况。",
      sections: [
        ["可退款情况", "订单未开始处理、服务无法交付、或后台确认需要取消时，可退回平台余额。"],
        ["不可退款情况", "订单已经完成、用户提交信息错误、或服务已按要求开始执行后，通常无法退款。"],
        ["处理方式", "退款会记录在账户流水中。用户如需提现，可在账户页面提交提现地址和网络。"],
        ["申诉渠道", "如对处理结果有疑问，请通过邮箱或 Telegram 联系客服并提供订单号。"],
      ],
    },
    footer: {
      support: "客户支持",
      policies: "政策说明",
      contact: "联系我们",
      terms: "服务条款",
      privacy: "隐私政策",
      refund: "退款政策",
    },
  },
  en: {
    contact: {
      title: "Customer Support",
      subtitle: "Contact us for recharge, order, delivery, refund, or account issues.",
      response: "We usually respond within 24 hours. Please include your order number, recharge ID, or registered email.",
      cards: {
        email: "Email Support",
        telegram: "Telegram Support",
        hours: "Working Hours",
      },
      sections: [
        {
          title: "Recharge Issues",
          body: "If payment is complete but balance is not credited, send the amount, network, transaction hash, and registered email.",
        },
        {
          title: "Order Issues",
          body: "If an order status is not updated, send the order number and order remarks so we can check progress.",
        },
        {
          title: "Refund Issues",
          body: "Eligible refunds are returned to platform balance. Withdrawal requests are reviewed by the admin team.",
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      subtitle: "By using this website, you agree to the following service rules.",
      sections: [
        ["Account and Security", "Users are responsible for protecting their login information and should contact support when account or order issues occur."],
        ["Recharge and Balance", "The platform supports USDT recharge. Confirmed payments are converted into platform balance for service purchases."],
        ["Order Delivery", "Services are delivered according to the details shown on each service page. Manual orders are updated on the order page."],
        ["Prohibited Use", "Users may not use the services for illegal, fraudulent, infringing, or abusive activities."],
      ],
    },
    privacy: {
      title: "Privacy Policy",
      subtitle: "We only collect information needed for accounts, payments, orders, and support.",
      sections: [
        ["Information We Collect", "We may collect email, order remarks, recharge records, withdrawal addresses, and security logs."],
        ["How We Use It", "Information is used for login, order processing, balance crediting, risk controls, and customer support."],
        ["Data Protection", "Sensitive credentials and payment keys are stored in server environment variables and are not shown to regular users."],
        ["Third Party Services", "Payment processing may be handled by providers such as Cryptomus and follows their service rules."],
      ],
    },
    refund: {
      title: "Refund Policy",
      subtitle: "Refunds are handled as platform balance and depend on order status and delivery progress.",
      sections: [
        ["Eligible Refunds", "Orders may be refunded when processing has not started, delivery is unavailable, or admin review confirms cancellation."],
        ["Non-refundable Cases", "Completed orders, incorrect user-provided information, or services already in progress are usually not refundable."],
        ["Processing Method", "Refunds are recorded in the account ledger. Users may submit withdrawal requests from the account page."],
        ["Appeals", "For questions about a decision, contact support by email or Telegram with the order number."],
      ],
    },
    footer: {
      support: "Customer Support",
      policies: "Policies",
      contact: "Contact",
      terms: "Terms",
      privacy: "Privacy",
      refund: "Refunds",
    },
  },
  ko: {
    contact: {
      title: "고객 지원",
      subtitle: "충전, 주문, 배송, 환불, 계정 문제는 아래 연락처로 문의할 수 있습니다.",
      response: "보통 24시간 이내에 답변합니다. 주문 번호, 충전 번호 또는 가입 이메일을 함께 보내 주세요.",
      cards: {
        email: "이메일 지원",
        telegram: "Telegram 지원",
        hours: "운영 시간",
      },
      sections: [
        {
          title: "충전 문의",
          body: "결제가 완료되었지만 잔액이 반영되지 않았다면 금액, 네트워크, 거래 해시, 가입 이메일을 보내 주세요.",
        },
        {
          title: "주문 문의",
          body: "주문 상태가 오래 업데이트되지 않으면 주문 번호와 주문 메모를 보내 주세요.",
        },
        {
          title: "환불 문의",
          body: "환불 가능한 주문은 플랫폼 잔액으로 반환되며 출금 요청은 관리자 검토 후 처리됩니다.",
        },
      ],
    },
    terms: {
      title: "서비스 약관",
      subtitle: "이 웹사이트를 사용하면 아래 서비스 규칙에 동의한 것으로 간주됩니다.",
      sections: [
        ["계정 및 보안", "사용자는 로그인 정보를 보호해야 하며 계정 또는 주문 문제가 발생하면 고객 지원에 연락해야 합니다."],
        ["충전 및 잔액", "플랫폼은 USDT 충전을 지원하며 확인된 결제는 서비스 구매용 플랫폼 잔액으로 전환됩니다."],
        ["주문 처리", "서비스는 각 상품 페이지의 설명에 따라 처리되며 수동 주문 결과는 주문 페이지에 업데이트됩니다."],
        ["금지된 사용", "불법, 사기, 침해 또는 악용 목적의 서비스 이용은 금지됩니다."],
      ],
    },
    privacy: {
      title: "개인정보 처리방침",
      subtitle: "계정, 결제, 주문 및 고객 지원에 필요한 정보만 수집합니다.",
      sections: [
        ["수집 정보", "이메일, 주문 메모, 충전 기록, 출금 주소 및 보안 로그를 수집할 수 있습니다."],
        ["이용 목적", "로그인, 주문 처리, 잔액 반영, 위험 관리 및 고객 지원에 사용됩니다."],
        ["데이터 보호", "민감한 결제 키는 서버 환경 변수에 저장되며 일반 사용자에게 표시되지 않습니다."],
        ["제3자 서비스", "결제 처리는 Cryptomus 같은 결제 제공업체가 수행할 수 있으며 해당 서비스 규칙을 따릅니다."],
      ],
    },
    refund: {
      title: "환불 정책",
      subtitle: "환불은 플랫폼 잔액으로 처리되며 주문 상태와 처리 진행 상황에 따라 달라집니다.",
      sections: [
        ["환불 가능", "처리가 시작되지 않았거나 서비스 제공이 불가능하거나 관리자 검토 후 취소가 확인된 주문은 환불될 수 있습니다."],
        ["환불 불가", "완료된 주문, 사용자가 잘못 제출한 정보, 이미 처리 중인 서비스는 일반적으로 환불되지 않습니다."],
        ["처리 방식", "환불은 계정 내역에 기록됩니다. 출금은 계정 페이지에서 신청할 수 있습니다."],
        ["문의", "결과에 이의가 있으면 주문 번호와 함께 이메일 또는 Telegram으로 문의해 주세요."],
      ],
    },
    footer: {
      support: "고객 지원",
      policies: "정책",
      contact: "문의",
      terms: "약관",
      privacy: "개인정보",
      refund: "환불",
    },
  },
} as const satisfies Record<Locale, unknown>;

export function getPublicPageCopy(locale: Locale) {
  return publicPageCopy[locale];
}
