import { UpstreamServiceType } from "@prisma/client";

import { env } from "./env";

const REQUEST_TIMEOUT_MS = 12_000;

export type CrazysmmService = {
  service: string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
};

type CrazysmmOrderResponse = {
  order: number | string;
};

type CrazysmmStatusResponse = {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
};

type CrazysmmBalanceResponse = {
  balance?: string;
  currency?: string;
  error?: string;
};

type CrazysmmRefillResponse = {
  refill?: number | string;
  error?: string;
};

type CrazysmmCancelResponse = {
  cancel?: number | string;
  error?: string;
};

type BaseRequest = Record<string, string | number | undefined>;

export type CrazysmmDefaultOrderInput = {
  service: string;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
};

export type CrazysmmCustomCommentsOrderInput = {
  service: string;
  link: string;
  comments: string[];
};

export type CrazysmmSubscriptionOrderInput = {
  service: string;
  username: string;
  min: number;
  max: number;
  delay: number;
  posts?: number;
  old_posts?: number;
  expiry?: string;
};

export class CrazysmmApiError extends Error {
  readonly code: "hard" | "ambiguous";

  constructor(message: string, code: "hard" | "ambiguous") {
    super(message);
    this.name = "CrazysmmApiError";
    this.code = code;
  }
}

function ensureConfigured() {
  if (!env.CRAZYSMM_API_KEY) {
    throw new CrazysmmApiError("CRAZYSMM API key is not configured.", "hard");
  }
}

function toFormData(payload: BaseRequest) {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  return params;
}

async function parseJsonResponse<T>(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    if (!response.ok || response.status >= 500) {
      throw new CrazysmmApiError("The upstream service returned an unreadable response.", "ambiguous");
    }

    throw new CrazysmmApiError("The upstream service returned an invalid response.", "hard");
  }
}

async function callCrazysmm<T>(payload: BaseRequest) {
  ensureConfigured();

  let response: Response;

  try {
    response = await fetch(env.CRAZYSMM_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: toFormData({
        key: env.CRAZYSMM_API_KEY,
        ...payload,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CrazysmmApiError(
      error instanceof Error && error.name === "TimeoutError"
        ? "The upstream service did not respond in time."
        : "The upstream service is temporarily unreachable.",
      "ambiguous",
    );
  }

  const data = await parseJsonResponse<T>(response);

  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    const errorMessage = (data as { error: string }).error;
    throw new CrazysmmApiError(
      errorMessage,
      response.status >= 500 ? "ambiguous" : "hard",
    );
  }

  if (!response.ok) {
    throw new CrazysmmApiError(
      `The upstream service rejected the request with HTTP ${response.status}.`,
      response.status >= 500 ? "ambiguous" : "hard",
    );
  }

  return data;
}

export async function fetchCrazysmmServices() {
  const data = await callCrazysmm<CrazysmmService[]>({
    action: "services",
  });

  return data;
}

export async function fetchCrazysmmBalance() {
  return callCrazysmm<CrazysmmBalanceResponse>({
    action: "balance",
  });
}

export async function submitCrazysmmOrder(
  serviceType: UpstreamServiceType,
  input:
    | CrazysmmDefaultOrderInput
    | CrazysmmCustomCommentsOrderInput
    | CrazysmmSubscriptionOrderInput,
) {
  const payload: BaseRequest = {
    action: "add",
    service: input.service,
  };

  if (serviceType === UpstreamServiceType.DEFAULT) {
    const defaultInput = input as CrazysmmDefaultOrderInput;
    payload.link = defaultInput.link;
    payload.quantity = defaultInput.quantity;
    payload.runs = defaultInput.runs;
    payload.interval = defaultInput.interval;
  }

  if (serviceType === UpstreamServiceType.CUSTOM_COMMENTS) {
    const commentsInput = input as CrazysmmCustomCommentsOrderInput;
    payload.link = commentsInput.link;
    payload.comments = commentsInput.comments.join("\n");
  }

  if (serviceType === UpstreamServiceType.SUBSCRIPTIONS) {
    const subscriptionsInput = input as CrazysmmSubscriptionOrderInput;
    payload.username = subscriptionsInput.username;
    payload.min = subscriptionsInput.min;
    payload.max = subscriptionsInput.max;
    payload.posts = subscriptionsInput.posts;
    payload.old_posts = subscriptionsInput.old_posts;
    payload.delay = subscriptionsInput.delay;
    payload.expiry = subscriptionsInput.expiry;
  }

  return callCrazysmm<CrazysmmOrderResponse>(payload);
}

export async function fetchCrazysmmOrderStatus(orderId: string) {
  return callCrazysmm<CrazysmmStatusResponse>({
    action: "status",
    order: orderId,
  });
}

export async function cancelCrazysmmOrder(orderId: string) {
  return callCrazysmm<CrazysmmCancelResponse>({
    action: "cancel",
    order: orderId,
  });
}

export async function refillCrazysmmOrder(orderId: string) {
  return callCrazysmm<CrazysmmRefillResponse>({
    action: "refill",
    order: orderId,
  });
}
