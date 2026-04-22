import { createHash } from "node:crypto";

import { RechargeNetwork } from "@prisma/client";
import bs58 from "bs58";

import { env } from "./env";

export const EVM_TRANSFER_TOPIC =
  "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function normalizeHex(value: string) {
  return value.trim().toLowerCase().replace(/^0x/, "");
}

export function normalizeEvmAddress(value: string) {
  return `0x${normalizeHex(value).slice(-40)}`;
}

function sha256(buffer: Uint8Array) {
  return createHash("sha256").update(buffer).digest();
}

export function tronBase58ToHex(address: string) {
  const decoded = bs58.decode(address);

  if (decoded.length !== 25) {
    throw new Error("TRON 地址长度异常");
  }

  const body = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21);
  const expected = sha256(sha256(body)).subarray(0, 4);

  if (!Buffer.from(checksum).equals(Buffer.from(expected))) {
    throw new Error("TRON 地址校验失败");
  }

  return Buffer.from(body).toString("hex").toLowerCase();
}

export function tronHexToBase58(rawHex: string) {
  const normalized = normalizeHex(rawHex);
  const bodyHex =
    normalized.length === 40 ? `41${normalized}` : normalized.slice(-42);
  const body = Buffer.from(bodyHex, "hex");
  const checksum = sha256(sha256(body)).subarray(0, 4);

  return bs58.encode(Buffer.concat([body, checksum]));
}

export function tronTopicToBase58(topic: string) {
  return tronHexToBase58(normalizeHex(topic).slice(-40));
}

export function getRechargeExplorerTxUrl(network: RechargeNetwork, txHash: string) {
  switch (network) {
    case RechargeNetwork.TRC20:
      return `https://tronscan.org/#/transaction/${txHash}`;
    case RechargeNetwork.ERC20:
      return `https://etherscan.io/tx/${txHash}`;
    case RechargeNetwork.BEP20:
      return `https://bscscan.com/tx/${txHash}`;
    default:
      return "";
  }
}

export function getRechargeExplorerAddressUrl(
  network: RechargeNetwork,
  address: string,
) {
  switch (network) {
    case RechargeNetwork.TRC20:
      return `https://tronscan.org/#/address/${address}`;
    case RechargeNetwork.ERC20:
      return `https://etherscan.io/address/${address}`;
    case RechargeNetwork.BEP20:
      return `https://bscscan.com/address/${address}`;
    default:
      return "";
  }
}

export function getExpectedTokenContract(network: RechargeNetwork) {
  switch (network) {
    case RechargeNetwork.TRC20:
      return env.USDT_TRC20_TOKEN_CONTRACT;
    case RechargeNetwork.ERC20:
      return env.USDT_ERC20_TOKEN_CONTRACT;
    case RechargeNetwork.BEP20:
      return env.USDT_BEP20_TOKEN_CONTRACT;
    default:
      return "";
  }
}

export function getMinimumConfirmations(network: RechargeNetwork) {
  switch (network) {
    case RechargeNetwork.TRC20:
      return env.TRC20_MIN_CONFIRMATIONS;
    case RechargeNetwork.ERC20:
      return env.ERC20_MIN_CONFIRMATIONS;
    case RechargeNetwork.BEP20:
      return env.BEP20_MIN_CONFIRMATIONS;
    default:
      return 1;
  }
}

export function getRpcUrl(network: RechargeNetwork) {
  switch (network) {
    case RechargeNetwork.ERC20:
      return env.ETH_RPC_URL;
    case RechargeNetwork.BEP20:
      return env.BSC_RPC_URL;
    default:
      return "";
  }
}
