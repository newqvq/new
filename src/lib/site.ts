import { RechargeNetwork, RechargeVerificationStatus } from "@prisma/client";

import {
  getMinimumConfirmations,
  getRechargeExplorerAddressUrl,
  getRechargeExplorerTxUrl,
} from "./blockchain";
import { env } from "./env";
import { Locale } from "./i18n";

export const siteConfig = {
  name: "星链小铺",
  shortName: "星链",
  description: "专注 USDT 充值、余额下单与人工交付的会员服务平台。",
  tagline: "仅支持 USDT 充值，到账后转为平台余额统一下单。",
};

export const rechargeNetworks = [
  {
    value: RechargeNetwork.TRC20,
    label: "TRC20",
    chainLabel: "TRON",
    note: "默认推荐网络，手续费更低，到账速度更稳，适合大多数日常充值场景。",
    address: env.USDT_TRC20_ADDRESS,
    minConfirmations: getMinimumConfirmations(RechargeNetwork.TRC20),
    recommended: true,
    autoVerifyReady: true,
  },
  {
    value: RechargeNetwork.ERC20,
    label: "ERC20",
    chainLabel: "Ethereum",
    note: "适合以太坊钱包用户，链上记录清晰，但矿工费通常更高。",
    address: env.USDT_ERC20_ADDRESS,
    minConfirmations: getMinimumConfirmations(RechargeNetwork.ERC20),
    recommended: false,
    autoVerifyReady: Boolean(env.ETH_RPC_URL && env.USDT_ERC20_TOKEN_CONTRACT),
  },
  {
    value: RechargeNetwork.BEP20,
    label: "BEP20",
    chainLabel: "BNB Chain",
    note: "适合 BNB Chain 钱包使用，转账成本较低，请确认代币与网络完全一致。",
    address: env.USDT_BEP20_ADDRESS,
    minConfirmations: getMinimumConfirmations(RechargeNetwork.BEP20),
    recommended: false,
    autoVerifyReady: Boolean(env.BSC_RPC_URL && env.USDT_BEP20_TOKEN_CONTRACT),
  },
] as const;

export function getLocalizedRechargeNetworks(locale: Locale) {
  const noteMap = {
    zh: {
      TRC20: "默认推荐网络，手续费更低，到账速度更稳，适合大多数日常充值场景。",
      ERC20: "适合以太坊钱包用户，链上记录清晰，但矿工费通常更高。",
      BEP20: "适合 BNB Chain 钱包使用，转账成本较低，请确认代币与网络完全一致。",
    },
    en: {
      TRC20: "Recommended by default with lower fees and stable arrival speed for most daily deposits.",
      ERC20: "Suitable for Ethereum wallets with clear on-chain records, but gas fees are usually higher.",
      BEP20: "Suitable for BNB Chain wallets with lower transfer costs. Make sure the token and network match exactly.",
    },
    ko: {
      TRC20: "기본 추천 네트워크로 수수료가 낮고 입금 속도가 안정적입니다.",
      ERC20: "이더리움 지갑에 적합하며 온체인 기록이 명확하지만 가스비가 더 높을 수 있습니다.",
      BEP20: "BNB Chain 지갑에 적합하며 전송 비용이 낮습니다. 토큰과 네트워크를 정확히 확인하세요.",
    },
  }[locale];

  return rechargeNetworks.map((network) => ({
    ...network,
    note: noteMap[network.value],
  }));
}

export function getRechargeAddress(network: RechargeNetwork) {
  const matched = rechargeNetworks.find((item) => item.value === network);

  if (!matched) {
    throw new Error("暂不支持该充值网络。");
  }

  return matched.address;
}

export function getRechargeNetworkMeta(network: RechargeNetwork) {
  const matched = rechargeNetworks.find((item) => item.value === network);

  if (!matched) {
    throw new Error("充值网络不存在。");
  }

  return matched;
}

export function getRechargeStatusMeta(status: string, locale: Locale = "zh") {
  const labels = {
    zh: {
      awaiting: "待转账",
      review: "待审核",
      approved: "已入账",
      rejected: "已驳回",
      expired: "已过期",
    },
    en: {
      awaiting: "Awaiting Transfer",
      review: "Under Review",
      approved: "Credited",
      rejected: "Rejected",
      expired: "Expired",
    },
    ko: {
      awaiting: "전송 대기",
      review: "검토 대기",
      approved: "입금 완료",
      rejected: "거절됨",
      expired: "만료됨",
    },
  }[locale];

  switch (status) {
    case "AWAITING_PAYMENT":
      return {
        label: labels.awaiting,
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "UNDER_REVIEW":
      return {
        label: labels.review,
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "APPROVED":
      return {
        label: labels.approved,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "REJECTED":
      return {
        label: labels.rejected,
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "EXPIRED":
      return {
        label: labels.expired,
        className: "border-slate-200 bg-slate-100 text-slate-600",
      };
    default:
      return {
        label: status,
        className: "border-slate-200 bg-slate-100 text-slate-600",
      };
  }
}

export function getRechargeVerificationMeta(
  status: RechargeVerificationStatus,
  locale: Locale = "zh",
) {
  const labels = {
    zh: {
      verified: "链上已匹配",
      failed: "链上异常",
      unavailable: "未配置核验",
      pending: "待核验",
    },
    en: {
      verified: "Matched On-chain",
      failed: "On-chain Error",
      unavailable: "Verification Unavailable",
      pending: "Pending Verification",
    },
    ko: {
      verified: "온체인 일치",
      failed: "온체인 이상",
      unavailable: "검증 미설정",
      pending: "검증 대기",
    },
  }[locale];

  switch (status) {
    case RechargeVerificationStatus.VERIFIED:
      return {
        label: labels.verified,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case RechargeVerificationStatus.FAILED:
      return {
        label: labels.failed,
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case RechargeVerificationStatus.UNAVAILABLE:
      return {
        label: labels.unavailable,
        className: "border-slate-200 bg-slate-100 text-slate-600",
      };
    case RechargeVerificationStatus.PENDING:
    default:
      return {
        label: labels.pending,
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
  }
}

type RechargeVerificationSummaryInput = {
  network: RechargeNetwork;
  txHash?: string | null;
  verificationStatus: RechargeVerificationStatus;
  verificationConfirmations?: number | null;
  verificationDetectedAmountMicros?: bigint | null;
  verificationDetectedToAddress?: string | null;
};

export function getRechargeVerificationSummary(
  recharge: RechargeVerificationSummaryInput,
  locale: Locale = "zh",
) {
  const copy = {
    zh: {
      waitingHash: "等待提交交易哈希。",
      pending: "系统正在拉取链上结果，请稍后刷新。",
      unavailable: "当前网络尚未完成自动核验配置。",
      verified: (confirmations: number | null) =>
        confirmations !== null
          ? `链上核验通过，确认数 ${confirmations}。`
          : "链上核验通过，金额和地址已匹配。",
      confirmationsLow: (current: number, required: number) =>
        `交易已上链，但确认数不足。当前 ${current}，要求 ${required}。`,
      mismatch: "检测到链上转账，但金额或收款地址不匹配。",
      failed: "链上核验未通过，请检查哈希、金额和收款地址。",
    },
    en: {
      waitingHash: "Waiting for a submitted transaction hash.",
      pending: "The system is fetching on-chain results. Please refresh shortly.",
      unavailable: "Automatic verification is not configured for this network yet.",
      verified: (confirmations: number | null) =>
        confirmations !== null
          ? `On-chain verification passed with ${confirmations} confirmations.`
          : "On-chain verification passed and the amount and address match.",
      confirmationsLow: (current: number, required: number) =>
        `The transaction is on-chain, but confirmations are still too low. Current ${current}, required ${required}.`,
      mismatch: "An on-chain transfer was detected, but the amount or receiving address does not match.",
      failed: "On-chain verification failed. Please check the hash, amount, and destination address.",
    },
    ko: {
      waitingHash: "거래 해시 제출을 기다리고 있습니다.",
      pending: "시스템이 온체인 결과를 가져오는 중입니다. 잠시 후 새로고침하세요.",
      unavailable: "현재 네트워크에는 자동 검증 설정이 완료되지 않았습니다.",
      verified: (confirmations: number | null) =>
        confirmations !== null
          ? `온체인 검증이 완료되었고 확인 수는 ${confirmations}입니다.`
          : "온체인 검증이 완료되었고 금액과 주소가 일치합니다.",
      confirmationsLow: (current: number, required: number) =>
        `거래는 온체인에 반영되었지만 확인 수가 부족합니다. 현재 ${current}, 필요 ${required}.`,
      mismatch: "온체인 전송은 감지되었지만 금액 또는 수신 주소가 일치하지 않습니다.",
      failed: "온체인 검증에 실패했습니다. 해시, 금액, 수신 주소를 확인하세요.",
    },
  }[locale];

  if (!recharge.txHash) {
    return copy.waitingHash;
  }

  if (recharge.verificationStatus === RechargeVerificationStatus.UNAVAILABLE) {
    return copy.unavailable;
  }

  if (recharge.verificationStatus === RechargeVerificationStatus.VERIFIED) {
    return copy.verified(recharge.verificationConfirmations ?? null);
  }

  if (recharge.verificationStatus === RechargeVerificationStatus.FAILED) {
    const requiredConfirmations = getMinimumConfirmations(recharge.network);

    if (
      recharge.verificationConfirmations !== null &&
      recharge.verificationConfirmations !== undefined &&
      recharge.verificationConfirmations < requiredConfirmations
    ) {
      return copy.confirmationsLow(
        recharge.verificationConfirmations,
        requiredConfirmations,
      );
    }

    if (
      recharge.verificationDetectedAmountMicros !== null ||
      recharge.verificationDetectedToAddress
    ) {
      return copy.mismatch;
    }

    return copy.failed;
  }

  return copy.pending;
}

export function getRechargeExplorerLinks(
  network: RechargeNetwork,
  txHash?: string | null,
  address?: string | null,
) {
  return {
    txUrl: txHash ? getRechargeExplorerTxUrl(network, txHash) : "",
    addressUrl: address ? getRechargeExplorerAddressUrl(network, address) : "",
  };
}
