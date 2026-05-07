import { z } from "zod";
import { err, route } from "@/lib/api";
import {
  getPaymentById,
  recordWebhookResult,
  verifyTelebirrSignature,
} from "@/lib/payments";
import { getContestantById } from "@/lib/contestants";
import { notifyPaymentReceipt } from "@/lib/notify";
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

// AdmasPay POSTs from their server, not a browser → no Sec-Fetch-Site, so
// we opt out of CSRF here. Authenticity is enforced by HMAC verification.
export const POST = route(async (req: Request) => {
  const raw = await req.text();
  const sig = req.headers.get("x-telebirr-signature");

  if (!verifyTelebirrSignature(raw, sig)) {
    return err(401, "Invalid signature");
  }

  let parsed: z.infer<typeof Body>;
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(raw);
    parsed = Body.parse(rawJson);
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
    rawPayload: rawJson,
  });

  // P7-T009: receipt email on success only. Failed webhooks reach the user
  // through the polling UI on /contestant/payment instead.
  if (succeeded) {
    try {
      const payment = await getPaymentById(parsed.outTradeNo);
      if (payment) {
        const contestant = await getContestantById(payment.contestant_id);
        if (contestant) {
          const amountText = `${payment.currency} ${(payment.amount_cents / 100)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
          await notifyPaymentReceipt({
            userId: contestant.user_id,
            amountText,
            reference:
              parsed.providerRef ?? parsed.tradeNo ?? parsed.outTradeNo,
            paidAtIso: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          evt: "payment.webhook.notify_failed",
          payment_id: parsed.outTradeNo,
          error: e instanceof Error ? e.message : "unknown",
        })
      );
    }
  }

  return NextResponse.json({ ok: true });
}, { csrf: "skip" });
