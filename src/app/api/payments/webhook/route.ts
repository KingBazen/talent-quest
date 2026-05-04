import { z } from "zod";
import { err, route } from "@/lib/api";
import { recordWebhookResult, verifyTelebirrSignature } from "@/lib/payments";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Telebirr / AdmasPay payment-result webhook.
 *
 * Verifies the HMAC signature, then updates the local payment record. The
 * provider expects a 200 OK response. If the signature fails we MUST 401 so
 * the provider retries — silent acceptance would let attackers forge results.
 */

const Body = z.object({
  outTradeNo: z.string().min(3),
  status: z.string().min(1),
  providerRef: z.string().optional(),
  tradeNo: z.string().optional(),
});

export const POST = route(async (req: Request) => {
  const raw = await req.text();
  const sig = req.headers.get("x-telebirr-signature");

  if (!verifyTelebirrSignature(raw, sig)) {
    return err(401, "Invalid signature");
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(JSON.parse(raw));
  } catch (e) {
    return err(422, "Invalid webhook payload");
  }

  const succeeded = ["SUCCESS", "succeeded", "TRADE_SUCCESS"].includes(
    parsed.status
  );

  await recordWebhookResult({
    paymentId: parsed.outTradeNo,
    providerRef: parsed.providerRef ?? parsed.tradeNo ?? "",
    succeeded,
  });

  return NextResponse.json({ ok: true });
});
