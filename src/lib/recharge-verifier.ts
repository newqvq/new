import {
  RechargeNetwork,
  RechargeOrder,
  RechargeVerificationStatus,
} from "@prisma/client";

import {
  EVM_TRANSFER_TOPIC,
  getExpectedTokenContract,
  getMinimumConfirmations,
  getRechargeExplorerTxUrl,
  getRpcUrl,
  normalizeEvmAddress,
  normalizeHex,
  tronBase58ToHex,
  tronTopicToBase58,
} from "./blockchain";
import { env } from "./env";
import { Locale } from "./i18n";
import { formatUsdt } from "./money";

type VerificationResult = {
  status: RechargeVerificationStatus;
  message: string;
  confirmations: number | null;
  blockNumber: number | null;
  detectedAmountMicros: bigint | null;
  detectedToAddress: string | null;
  explorerUrl: string;
};

type RechargeForVerify = Pick<
  RechargeOrder,
  "id" | "network" | "walletAddress" | "amountMicros" | "txHash"
>;

type RpcReceiptLog = {
  address: string;
  topics: string[];
  data: string;
};

type RpcReceipt = {
  status?: string;
  blockNumber?: string;
  logs?: RpcReceiptLog[];
};

const VERIFY_REQUEST_TIMEOUT_MS = 15_000;

function getVerificationCopy(locale: Locale) {
  return {
    zh: {
      rpcFailed: (status: number) => `RPC 请求失败：${status}`,
      rpcError: "RPC 返回错误",
      rpcEmpty: "RPC 返回为空",
      rpcUnavailable: "当前网络未配置 RPC 地址，无法自动核验。",
      tokenUnavailable: "当前网络未配置 USDT 合约地址，无法自动核验。",
      receiptPending: "链上尚未拿到交易回执，请稍后再核验。",
      receiptFailed: "交易回执状态不是成功。",
      transferMismatch: (amount: bigint, address: string) =>
        `链上找到了 USDT 转账，但目标地址或金额不匹配。检测到 ${formatUsdt(amount)} USDT -> ${address}`,
      transferMissing: "交易回执中没有找到匹配的 USDT Transfer 事件。",
      confirmationsLow: (current: number, required: number) =>
        `交易已上链，但确认数不足。当前 ${current}，要求 ${required}。`,
      verified: (confirmations: number) =>
        `链上核验通过，金额和收款地址匹配，确认数 ${confirmations}。`,
      tronGridFailed: (status: number) => `TronGrid 请求失败：${status}`,
      tronTokenUnavailable: "TRC20 网络未配置 USDT 合约地址，无法自动核验。",
      tronBlockPending: "TRON 节点尚未返回该交易的区块信息，请稍后重试。",
      tronReceiptFailed: "TRON 交易结果不是 SUCCESS。",
      tronTransferMismatch: (amount: bigint, address: string) =>
        `TRC20 链上找到了转账，但地址或金额不匹配。检测到 ${formatUsdt(amount)} USDT -> ${address}`,
      tronTransferMissing: "TRON 回执中没有找到匹配的 USDT Transfer 事件。",
      txHashMissing: "尚未提交链上交易哈希。",
      networkUnsupported: "当前网络暂不支持自动核验。",
      verifyFailed: "链上核验失败，请稍后重试。",
    },
    en: {
      rpcFailed: (status: number) => `RPC request failed: ${status}`,
      rpcError: "RPC returned an error.",
      rpcEmpty: "RPC returned an empty result.",
      rpcUnavailable: "RPC is not configured for this network.",
      tokenUnavailable: "USDT token contract is not configured for this network.",
      receiptPending: "The transaction receipt is not available yet. Please check again later.",
      receiptFailed: "The transaction receipt status is not successful.",
      transferMismatch: (amount: bigint, address: string) =>
        `A USDT transfer was found on-chain, but the target address or amount does not match. Detected ${formatUsdt(amount)} USDT -> ${address}`,
      transferMissing: "No matching USDT Transfer event was found in the receipt.",
      confirmationsLow: (current: number, required: number) =>
        `The transaction is on-chain, but confirmations are still too low. Current ${current}, required ${required}.`,
      verified: (confirmations: number) =>
        `On-chain verification passed. Amount and receiving address match with ${confirmations} confirmations.`,
      tronGridFailed: (status: number) => `TronGrid request failed: ${status}`,
      tronTokenUnavailable: "USDT contract is not configured for TRC20 verification.",
      tronBlockPending: "TRON has not returned block data for this transaction yet.",
      tronReceiptFailed: "The TRON transaction result is not SUCCESS.",
      tronTransferMismatch: (amount: bigint, address: string) =>
        `A TRC20 transfer was found, but the address or amount does not match. Detected ${formatUsdt(amount)} USDT -> ${address}`,
      tronTransferMissing: "No matching USDT Transfer event was found in the TRON receipt.",
      txHashMissing: "No on-chain transaction hash has been submitted yet.",
      networkUnsupported: "Automatic verification is not supported for this network.",
      verifyFailed: "On-chain verification failed. Please try again later.",
    },
    ko: {
      rpcFailed: (status: number) => `RPC 요청 실패: ${status}`,
      rpcError: "RPC 오류가 반환되었습니다.",
      rpcEmpty: "RPC 결과가 비어 있습니다.",
      rpcUnavailable: "이 네트워크에는 RPC가 설정되어 있지 않습니다.",
      tokenUnavailable: "이 네트워크에는 USDT 토큰 컨트랙트가 설정되어 있지 않습니다.",
      receiptPending: "거래 영수증이 아직 준비되지 않았습니다. 잠시 후 다시 확인하세요.",
      receiptFailed: "거래 영수증 상태가 성공이 아닙니다.",
      transferMismatch: (amount: bigint, address: string) =>
        `온체인에서 USDT 전송이 발견되었지만 대상 주소 또는 금액이 일치하지 않습니다. 감지값 ${formatUsdt(amount)} USDT -> ${address}`,
      transferMissing: "영수증에서 일치하는 USDT Transfer 이벤트를 찾지 못했습니다.",
      confirmationsLow: (current: number, required: number) =>
        `거래는 온체인에 반영되었지만 확인 수가 부족합니다. 현재 ${current}, 필요 ${required}.`,
      verified: (confirmations: number) =>
        `온체인 검증이 완료되었습니다. 금액과 수신 주소가 일치하며 확인 수는 ${confirmations}입니다.`,
      tronGridFailed: (status: number) => `TronGrid 요청 실패: ${status}`,
      tronTokenUnavailable: "TRC20 검증용 USDT 컨트랙트가 설정되어 있지 않습니다.",
      tronBlockPending: "TRON에서 아직 이 거래의 블록 정보를 반환하지 않았습니다.",
      tronReceiptFailed: "TRON 거래 결과가 SUCCESS가 아닙니다.",
      tronTransferMismatch: (amount: bigint, address: string) =>
        `TRC20 전송이 발견되었지만 주소 또는 금액이 일치하지 않습니다. 감지값 ${formatUsdt(amount)} USDT -> ${address}`,
      tronTransferMissing: "TRON 영수증에서 일치하는 USDT Transfer 이벤트를 찾지 못했습니다.",
      txHashMissing: "아직 온체인 거래 해시가 제출되지 않았습니다.",
      networkUnsupported: "현재 네트워크는 자동 검증을 지원하지 않습니다.",
      verifyFailed: "온체인 검증에 실패했습니다. 잠시 후 다시 시도하세요.",
    },
  }[locale];
}

async function jsonRpc<T>(
  url: string,
  method: string,
  params: unknown[],
  locale: Locale,
): Promise<T> {
  const copy = getVerificationCopy(locale);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method,
      params,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(VERIFY_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(copy.rpcFailed(response.status));
  }

  const payload = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };

  if (payload.error) {
    throw new Error(payload.error.message || copy.rpcError);
  }

  if (!payload.result) {
    throw new Error(copy.rpcEmpty);
  }

  return payload.result;
}

function bigintFromHex(value: string) {
  return BigInt(`0x${normalizeHex(value) || "0"}`);
}

async function verifyEvmRecharge(
  recharge: RechargeForVerify,
  locale: Locale,
): Promise<VerificationResult> {
  const copy = getVerificationCopy(locale);
  const rpcUrl = getRpcUrl(recharge.network);
  const expectedTokenContract = getExpectedTokenContract(recharge.network);

  if (!rpcUrl) {
    return {
      status: RechargeVerificationStatus.UNAVAILABLE,
      message: copy.rpcUnavailable,
      confirmations: null,
      blockNumber: null,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  if (!expectedTokenContract) {
    return {
      status: RechargeVerificationStatus.UNAVAILABLE,
      message: copy.tokenUnavailable,
      confirmations: null,
      blockNumber: null,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  const receipt = await jsonRpc<RpcReceipt>(
    rpcUrl,
    "eth_getTransactionReceipt",
    [recharge.txHash],
    locale,
  );

  if (!receipt.blockNumber) {
    return {
      status: RechargeVerificationStatus.FAILED,
      message: copy.receiptPending,
      confirmations: 0,
      blockNumber: null,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  if (receipt.status && bigintFromHex(receipt.status) !== 1n) {
    return {
      status: RechargeVerificationStatus.FAILED,
      message: copy.receiptFailed,
      confirmations: 0,
      blockNumber: Number(bigintFromHex(receipt.blockNumber)),
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  const latestBlockHex = await jsonRpc<string>(rpcUrl, "eth_blockNumber", [], locale);
  const latestBlock = Number(bigintFromHex(latestBlockHex));
  const blockNumber = Number(bigintFromHex(receipt.blockNumber));
  const confirmations = latestBlock - blockNumber + 1;
  const requiredConfirmations = getMinimumConfirmations(recharge.network);
  const normalizedContract = normalizeEvmAddress(expectedTokenContract);
  const normalizedReceiver = normalizeEvmAddress(recharge.walletAddress);

  const matchedTransfer = (receipt.logs || [])
    .filter(
      (log) =>
        normalizeEvmAddress(log.address) === normalizedContract &&
        normalizeHex(log.topics[0] || "") === EVM_TRANSFER_TOPIC &&
        log.topics.length >= 3,
    )
    .map((log) => ({
      toAddress: normalizeEvmAddress(log.topics[2]),
      amountMicros: bigintFromHex(log.data),
    }))
    .find(
      (log) =>
        log.toAddress === normalizedReceiver &&
        log.amountMicros === recharge.amountMicros,
    );

  if (!matchedTransfer) {
    const candidate = (receipt.logs || [])
      .filter(
        (log) =>
          normalizeEvmAddress(log.address) === normalizedContract &&
          normalizeHex(log.topics[0] || "") === EVM_TRANSFER_TOPIC &&
          log.topics.length >= 3,
      )
      .map((log) => ({
        toAddress: normalizeEvmAddress(log.topics[2]),
        amountMicros: bigintFromHex(log.data),
      }))[0];

    return {
      status: RechargeVerificationStatus.FAILED,
      message: candidate
        ? copy.transferMismatch(candidate.amountMicros, candidate.toAddress)
        : copy.transferMissing,
      confirmations,
      blockNumber,
      detectedAmountMicros: candidate?.amountMicros ?? null,
      detectedToAddress: candidate?.toAddress ?? null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  if (confirmations < requiredConfirmations) {
    return {
      status: RechargeVerificationStatus.FAILED,
      message: copy.confirmationsLow(confirmations, requiredConfirmations),
      confirmations,
      blockNumber,
      detectedAmountMicros: matchedTransfer.amountMicros,
      detectedToAddress: matchedTransfer.toAddress,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  return {
    status: RechargeVerificationStatus.VERIFIED,
    message: copy.verified(confirmations),
    confirmations,
    blockNumber,
    detectedAmountMicros: matchedTransfer.amountMicros,
    detectedToAddress: matchedTransfer.toAddress,
    explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
  };
}

type TronTransactionInfo = {
  blockNumber?: number;
  log?: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  receipt?: {
    result?: string;
  };
};

type TronBlockResponse = {
  block_header?: {
    raw_data?: {
      number?: number;
    };
  };
};

async function tronFetch<T>(
  path: string,
  locale: Locale,
  body?: object,
): Promise<T> {
  const copy = getVerificationCopy(locale);
  const headers: HeadersInit = {
    "content-type": "application/json",
  };

  if (env.TRONGRID_API_KEY) {
    headers["TRON-PRO-API-KEY"] = env.TRONGRID_API_KEY;
  }

  const response = await fetch(`${env.TRONGRID_API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    signal: AbortSignal.timeout(VERIFY_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(copy.tronGridFailed(response.status));
  }

  return (await response.json()) as T;
}

async function verifyTronRecharge(
  recharge: RechargeForVerify,
  locale: Locale,
): Promise<VerificationResult> {
  const copy = getVerificationCopy(locale);
  const expectedTokenContract = getExpectedTokenContract(recharge.network);

  if (!expectedTokenContract) {
    return {
      status: RechargeVerificationStatus.UNAVAILABLE,
      message: copy.tronTokenUnavailable,
      confirmations: null,
      blockNumber: null,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  const transactionInfo = await tronFetch<TronTransactionInfo>(
    "/wallet/gettransactioninfobyid",
    locale,
    {
      value: recharge.txHash,
    },
  );

  if (!transactionInfo.blockNumber) {
    return {
      status: RechargeVerificationStatus.FAILED,
      message: copy.tronBlockPending,
      confirmations: 0,
      blockNumber: null,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  if (transactionInfo.receipt?.result !== "SUCCESS") {
    return {
      status: RechargeVerificationStatus.FAILED,
      message: copy.tronReceiptFailed,
      confirmations: 0,
      blockNumber: transactionInfo.blockNumber,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  const latestBlock = await tronFetch<TronBlockResponse>("/wallet/getnowblock", locale);
  const latestBlockNumber = latestBlock.block_header?.raw_data?.number || 0;
  const confirmations = latestBlockNumber - transactionInfo.blockNumber + 1;
  const requiredConfirmations = getMinimumConfirmations(recharge.network);
  const normalizedContract = normalizeHex(tronBase58ToHex(expectedTokenContract)).slice(
    -40,
  );

  const matchedTransfer = (transactionInfo.log || [])
    .filter(
      (log) =>
        normalizeHex(log.address).slice(-40) === normalizedContract &&
        normalizeHex(log.topics[0] || "") === EVM_TRANSFER_TOPIC &&
        log.topics.length >= 3,
    )
    .map((log) => ({
      toAddress: tronTopicToBase58(log.topics[2]),
      amountMicros: bigintFromHex(log.data),
    }))
    .find(
      (log) =>
        log.toAddress === recharge.walletAddress &&
        log.amountMicros === recharge.amountMicros,
    );

  if (!matchedTransfer) {
    const candidate = (transactionInfo.log || [])
      .filter(
        (log) =>
          normalizeHex(log.address).slice(-40) === normalizedContract &&
          normalizeHex(log.topics[0] || "") === EVM_TRANSFER_TOPIC &&
          log.topics.length >= 3,
      )
      .map((log) => ({
        toAddress: tronTopicToBase58(log.topics[2]),
        amountMicros: bigintFromHex(log.data),
      }))[0];

    return {
      status: RechargeVerificationStatus.FAILED,
      message: candidate
        ? copy.tronTransferMismatch(candidate.amountMicros, candidate.toAddress)
        : copy.tronTransferMissing,
      confirmations,
      blockNumber: transactionInfo.blockNumber,
      detectedAmountMicros: candidate?.amountMicros ?? null,
      detectedToAddress: candidate?.toAddress ?? null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  if (confirmations < requiredConfirmations) {
    return {
      status: RechargeVerificationStatus.FAILED,
      message: copy.confirmationsLow(confirmations, requiredConfirmations),
      confirmations,
      blockNumber: transactionInfo.blockNumber,
      detectedAmountMicros: matchedTransfer.amountMicros,
      detectedToAddress: matchedTransfer.toAddress,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
    };
  }

  return {
    status: RechargeVerificationStatus.VERIFIED,
    message: copy.verified(confirmations),
    confirmations,
    blockNumber: transactionInfo.blockNumber,
    detectedAmountMicros: matchedTransfer.amountMicros,
    detectedToAddress: matchedTransfer.toAddress,
    explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash!),
  };
}

export async function verifyRechargeOnChain(
  recharge: RechargeForVerify,
  locale: Locale = "zh",
): Promise<VerificationResult> {
  const copy = getVerificationCopy(locale);
  if (!recharge.txHash) {
    return {
      status: RechargeVerificationStatus.PENDING,
      message: copy.txHashMissing,
      confirmations: null,
      blockNumber: null,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: "",
    };
  }

  try {
    switch (recharge.network) {
      case RechargeNetwork.TRC20:
        return await verifyTronRecharge(recharge, locale);
      case RechargeNetwork.ERC20:
      case RechargeNetwork.BEP20:
        return await verifyEvmRecharge(recharge, locale);
      default:
        return {
          status: RechargeVerificationStatus.UNAVAILABLE,
          message: copy.networkUnsupported,
          confirmations: null,
          blockNumber: null,
          detectedAmountMicros: null,
          detectedToAddress: null,
          explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash),
        };
    }
  } catch (error) {
    return {
      status: RechargeVerificationStatus.FAILED,
      message: error instanceof Error ? error.message : copy.verifyFailed,
      confirmations: null,
      blockNumber: null,
      detectedAmountMicros: null,
      detectedToAddress: null,
      explorerUrl: getRechargeExplorerTxUrl(recharge.network, recharge.txHash),
    };
  }
}
