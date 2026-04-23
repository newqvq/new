import crypto from "node:crypto";

import { RechargeNetwork } from "@prisma/client";
import { z } from "zod";

import { env } from "./env";
import { formatUsdt } from "./money";

const invoiceResponseSchema = z.object({
  state: z.number().optional(),
  result: z.object({
    uuid: z.string().min(1),
    order_id: z.string().min(1),
    url: z.string().url().optional(),
    payment_url: z.string().url().optional(),
    address: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const cryptomusSuccessfulStatuses = new Set(["paid", "paid_over"]);
export const cryptomusTerminalFailureStatuses = new Set([
  "cancel",
  "fail",
  "system_fail",
  "refund_process",
  "refund_fail",
  "refund_paid",
]);

export type CryptomusWebhookPayload = {
  sign?: string;
  uuid?: string;
  order_id?: string;
  status?: string;
  is_final?: boolean;
  amount?: string;
  payment_amount?: string;
  payer_amount?: string;
  currency?: string;
  payer_currency?: string;
  network?: string;
  txid?: string;
  url?: string;
  [key: string]: unknown;
};

export function getCryptomusNetwork(network: RechargeNetwork) {
  switch (network) {
    case RechargeNetwork.TRC20:
      return env.CRYPTOMUS_TRC20_NETWORK;
    case RechargeNetwork.ERC20:
      return env.CRYPTOMUS_ERC20_NETWORK;
    case RechargeNetwork.BEP20:
      return env.CRYPTOMUS_BEP20_NETWORK;
    default:
      throw new Error("Unsupported recharge network.");
  }
}

function stableStringify(payload: unknown) {
  return JSON.stringify(payload).replace(/\//g, "\\/");
}

export function signCryptomusPayload(payload: unknown, apiKey = env.CRYPTOMUS_PAYMENT_API_KEY) {
  return crypto
    .createHash("md5")
    .update(Buffer.from(stableStringify(payload)).toString("base64") + apiKey)
    .digest("hex");
}

export function verifyCryptomusWebhookSignature(payload: CryptomusWebhookPayload) {
  if (!env.CRYPTOMUS_PAYMENT_API_KEY || !payload.sign) {
    return false;
  }

  const { sign, ...unsignedPayload } = payload;
  const expected = signCryptomusPayload(unsignedPayload);
  const provided = Buffer.from(sign, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
}

export function isCryptomusConfigured() {
  return Boolean(env.CRYPTOMUS_MERCHANT_UUID && env.CRYPTOMUS_PAYMENT_API_KEY);
}

export function isCryptomusPaidFinal(payload: Pick<CryptomusWebhookPayload, "status" | "is_final">) {
  return Boolean(
    payload.is_final === true &&
      payload.status &&
      cryptomusSuccessfulStatuses.has(payload.status),
  );
}

export function isCryptomusFailedFinal(payload: Pick<CryptomusWebhookPayload, "status" | "is_final">) {
  return Boolean(
    payload.is_final === true &&
      payload.status &&
      cryptomusTerminalFailureStatuses.has(payload.status),
  );
}

export async function createCryptomusInvoice(input: {
  amountMicros: bigint;
  network: RechargeNetwork;
  serialNo: string;
}) {
  if (!isCryptomusConfigured()) {
    throw new Error("Cryptomus credentials are not configured.");
  }

  const callbackUrl = new URL("/api/cryptomus/webhook", env.SITE_URL).toString();
  const returnUrl = new URL(`/recharge#${input.serialNo}`, env.SITE_URL).toString();
  const body = {
    amount: formatUsdt(input.amountMicros),
    currency: "USDT",
    network: getCryptomusNetwork(input.network),
    order_id: input.serialNo,
    url_callback: callbackUrl,
    url_return: returnUrl,
    lifetime: 21_600,
    is_payment_multiple: false,
  };

  const response = await fetch(`${env.CRYPTOMUS_API_URL.replace(/\/$/, "")}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      merchant: env.CRYPTOMUS_MERCHANT_UUID,
      sign: signCryptomusPayload(body),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Cryptomus invoice failed: ${response.status}`);
  }

  const parsed = invoiceResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Cryptomus returned an invalid invoice response.");
  }

  return {
    uuid: parsed.data.result.uuid,
    orderId: parsed.data.result.order_id,
    paymentUrl: parsed.data.result.url ?? parsed.data.result.payment_url ?? "",
    address: parsed.data.result.address ?? "",
    status: parsed.data.result.status ?? "created",
    raw: JSON.stringify(payload),
  };
}
