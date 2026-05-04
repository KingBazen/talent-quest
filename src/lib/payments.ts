import crypto from "node:crypto";
import { exec, query, queryOne, type PaymentRow } from "./db";

/**
 * Telebirr / AdmasPay integration. Three runtime modes, in priority order:
 *
 *   1. Full API mode — all TELEBIRR_* env vars set. We POST a signed
 *      request to {TELEBIRR_API_URL}/payment/init and forward the
 *      provider's `toPayUrl` to the user.
 *   2. Hosted-checkout mode — only ADMASPAY_CHECKOUT_URL set. We record
 *      the payment locally as pending and redirect to the hosted URL.
 *      Webhook (HMAC-verified) reconciles success/failure later.
 *   3. Stub mode — neither set. Returns a /payments/mock URL so dev and
 *      Codespaces work without any provider credentials.
 */

const REGISTRATION_FEE_CENTS = 5000; // 50 ETB
const CURRENCY = "ETB";

export type PaymentMode = "api" | "checkout" | "stub";

export interface InitResult {
  paymentId: string;
  amountCents: number;
  currency: string;
  redirectUrl: string;
  mode: PaymentMode;
  stub: boolean;
  expiresAt: string;
}

function isApiLive() {
  return Boolean(
    process.env.TELEBIRR_MERCHANT_ID &&
      process.env.TELEBIRR_APP_KEY &&
      process.env.TELEBIRR_HMAC_SECRET
  );
}

function isCheckoutLive() {
  return Boolean(process.env.ADMASPAY_CHECKOUT_URL);
}

export async function initPayment(opts: {
  contestantId: string;
  amountCents?: number;
}): Promise<InitResult> {
  const id = "pay_" + crypto.randomBytes(8).toString("hex");
  const amount = opts.amountCents ?? REGISTRATION_FEE_CENTS;
  await exec(
    `INSERT INTO payments (id, contestant_id, amount_cents, currency, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [id, opts.contestantId, amount, CURRENCY]
  );

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Mode 2: hosted-checkout link (ADMASPAY_CHECKOUT_URL). We append our
  // internal payment id as `ref` so AdmasPay echoes it back on the webhook.
  if (!isApiLive() && isCheckoutLive()) {
    const base = process.env.ADMASPAY_CHECKOUT_URL!;
    const url = new URL(base);
    url.searchParams.set("ref", id);
    url.searchParams.set("amount", (amount / 100).toFixed(2));
    return {
      paymentId: id,
      amountCents: amount,
      currency: CURRENCY,
      redirectUrl: url.toString(),
      mode: "checkout",
      stub: false,
      expiresAt,
    };
  }

  // Mode 3: stub.
  if (!isApiLive()) {
    return {
      paymentId: id,
      amountCents: amount,
      currency: CURRENCY,
      redirectUrl: `/payments/mock?paymentId=${id}`,
      mode: "stub",
      stub: true,
      expiresAt,
    };
  }
  // Mode 1: real Telebirr integration: build a signed request to AdmasPay.
  // Implementations vary by aggregator; this is the canonical AdmasPay shape.
  const payload = {
    appId: process.env.TELEBIRR_MERCHANT_ID,
    outTradeNo: id,
    subject: `TalentQuest registration ${opts.contestantId}`,
    totalAmount: (amount / 100).toFixed(2),
    notifyUrl: process.env.TELEBIRR_NOTIFY_URL,
    timeoutExpress: "15m",
    nonce: crypto.randomBytes(16).toString("hex"),
    timestamp: Math.floor(Date.now() / 1000),
  };
  const sign = signTelebirrPayload(payload);
  const res = await fetch(`${process.env.TELEBIRR_API_URL}/payment/init`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-app-key": process.env.TELEBIRR_APP_KEY!,
    },
    body: JSON.stringify({ ...payload, sign }),
  });
  if (!res.ok) {
    await exec(
      `UPDATE payments SET status = 'failed', updated_at = (CURRENT_TIMESTAMP::text) WHERE id = ?`,
      [id]
    );
    throw new Error(`Telebirr init failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { toPayUrl?: string };
  if (!data.toPayUrl) {
    throw new Error("Telebirr response missing toPayUrl");
  }
  return {
    paymentId: id,
    amountCents: amount,
    currency: CURRENCY,
    redirectUrl: data.toPayUrl,
    mode: "api",
    stub: false,
    expiresAt,
  };
}

/** Verify the webhook HMAC signature exactly as Telebirr/AdmasPay sends it. */
export function verifyTelebirrSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  const secret = process.env.TELEBIRR_HMAC_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // timing-safe compare
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signTelebirrPayload(payload: Record<string, unknown>): string {
  const secret = process.env.TELEBIRR_HMAC_SECRET!;
  const sortedKeys = Object.keys(payload).sort();
  const queryString = sortedKeys
    .map((k) => `${k}=${(payload as any)[k]}`)
    .join("&");
  return crypto
    .createHmac("sha256", secret)
    .update(queryString)
    .digest("hex");
}

export async function recordWebhookResult(opts: {
  paymentId: string;
  providerRef: string;
  succeeded: boolean;
}): Promise<void> {
  await setPaymentStatus({
    paymentId: opts.paymentId,
    providerRef: opts.providerRef,
    status: opts.succeeded ? "succeeded" : "failed",
  });
}

export async function setPaymentStatus(opts: {
  paymentId: string;
  providerRef?: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
}): Promise<void> {
  await exec(
    `UPDATE payments
       SET status = ?, provider_ref = COALESCE(NULLIF(?, ''), provider_ref),
           updated_at = (CURRENT_TIMESTAMP::text)
     WHERE id = ?`,
    [opts.status, opts.providerRef ?? "", opts.paymentId]
  );
}

export async function getPaymentById(
  id: string
): Promise<PaymentRow | undefined> {
  return queryOne<PaymentRow>("SELECT * FROM payments WHERE id = ?", [id]);
}

export async function listPaymentsForContestant(
  contestantId: string
): Promise<PaymentRow[]> {
  return query<PaymentRow>(
    "SELECT * FROM payments WHERE contestant_id = ? ORDER BY created_at DESC",
    [contestantId]
  );
}

export const PAYMENTS_LIVE = isApiLive() || isCheckoutLive();
export const PAYMENTS_MODE: PaymentMode = isApiLive()
  ? "api"
  : isCheckoutLive()
  ? "checkout"
  : "stub";
export { REGISTRATION_FEE_CENTS, CURRENCY };
