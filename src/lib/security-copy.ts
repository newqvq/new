import { Locale } from "./i18n";

const securityCopy = {
  zh: {
    authTooManyAttempts: "尝试次数过多，请稍后再试。",
    registerTooManyAttempts: "注册请求过于频繁，请稍后再试。",
    rechargeTooManyAttempts: "充值相关操作过于频繁，请稍后再试。",
    orderTooManyAttempts: "下单操作过于频繁，请稍后再试。",
    adminTooManyAttempts: "后台操作过于频繁，请稍后再试。",
  },
  en: {
    authTooManyAttempts: "Too many attempts. Please try again later.",
    registerTooManyAttempts: "Too many registration attempts. Please try again later.",
    rechargeTooManyAttempts: "Too many recharge requests. Please try again later.",
    orderTooManyAttempts: "Too many order requests. Please try again later.",
    adminTooManyAttempts: "Too many admin actions. Please try again later.",
  },
  ko: {
    authTooManyAttempts: "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    registerTooManyAttempts: "가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    rechargeTooManyAttempts: "충전 관련 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    orderTooManyAttempts: "주문 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    adminTooManyAttempts: "관리 작업 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  },
} as const;

export function getSecurityCopy(locale: Locale) {
  return securityCopy[locale];
}
