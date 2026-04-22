import { RechargeNetwork, WithdrawalStatus } from "@prisma/client";

import { Locale } from "./i18n";
import { getRechargeAddress } from "./site";
import { getWithdrawalCopy } from "./withdrawal-copy";

export function validateWithdrawalAddress(
  network: RechargeNetwork,
  rawAddress: string,
  locale: Locale,
) {
  const copy = getWithdrawalCopy(locale);
  const address = rawAddress.trim();

  if (!address) {
    throw new Error(copy.messages.invalidAddress);
  }

  const isValid =
    network === RechargeNetwork.TRC20
      ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
      : /^0x[a-fA-F0-9]{40}$/.test(address);

  if (!isValid) {
    throw new Error(copy.messages.invalidAddress);
  }

  if (address.toLowerCase() === getRechargeAddress(network).toLowerCase()) {
    throw new Error(copy.messages.addressMatchesPlatform);
  }

  return address;
}

export function validateWithdrawalTxHash(rawTxHash: string, locale: Locale) {
  const copy = getWithdrawalCopy(locale);
  const txHash = rawTxHash.trim();

  if (!/^(0x)?[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new Error(copy.messages.invalidTxHash);
  }

  return txHash;
}

export function getWithdrawalStatusMeta(
  status: WithdrawalStatus,
  locale: Locale,
) {
  const copy = getWithdrawalCopy(locale);

  switch (status) {
    case WithdrawalStatus.APPROVED:
      return {
        label: copy.statuses.APPROVED,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case WithdrawalStatus.REJECTED:
      return {
        label: copy.statuses.REJECTED,
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case WithdrawalStatus.PENDING:
    default:
      return {
        label: copy.statuses.PENDING,
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
  }
}

export function canReviewWithdrawal(status: WithdrawalStatus) {
  return status === WithdrawalStatus.PENDING;
}
