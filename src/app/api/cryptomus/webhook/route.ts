import { NextResponse } from "next/server";

import { processCryptomusWebhook } from "@/lib/cryptomus-webhook";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  try {
    const result = await processCryptomusWebhook(payload as Record<string, unknown>);

    return NextResponse.json(
      { ok: result.ok, message: result.message },
      { status: result.status },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
