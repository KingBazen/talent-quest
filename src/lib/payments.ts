import crypto from "node:crypto";
import { exec, query, queryOne, type PaymentMethod, type PaymentRow } from "./db";
import { recordPaymentEvent, redactPayload } from "./payment-events";
import { ETHIOPIAN_BANK_CODES } from "@/data/banks";

/**
 * Telebirr / AdmasPay integration. Two runtime modes, in priority order:
 *
 *   1. Full API mode — all TELEBIRR_* env vars set. We POST a signed
 *      request to {TELEBIRR_API_URL}/payment/init and forward the
 *      provider's `toPayUrl` to the user.
 *   2. Hosted-checkout mode — only ADMASPAY_CHECKOUT_URL set. We record
 *      the payment locally as pending and redirect to the hosted URL.
 *      Webhook (HMAC-verified) reconciles success/failure later.
 *
 * If neither set, `initPayment` throws — there is no longer a `/payments/mock`
 * stub mode (the route never existed and the silent fallback hid configuration
 * mistakes). Configure at minimum `ADMASPAY_CHECKOUT_URL` for the hosted-link
 * flow.
 */

const REGISTRATION_FEE_CENTS = 50000; // 500 ETB
const CURRENCY = "ETB";

export type PaymentMode = "api" | "checkout" | "bank_transfer";

export interface InitResult {
  paymentId: string;
  amountCents: number;
  currency: string;
  /** For wallet payments — the AdmasPay/Telebirr URL to open. Empty string
   *  for bank-transfer payments (the modal collects the receipt instead). */
  redirectUrl: string;
  mode: PaymentMode;
  method: PaymentMethod;
  expiresAt: string;
}

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super(
      "No payment provider configured. Set ADMASPAY_CHECKOUT_URL (hosted-link mode) or all TELEBIRR_* vars (full-API mode)."
    );
  }
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
  method?: PaymentMethod;
  bankCode?: string;
}): Promise<InitResult> {
  const method: PaymentMethod = opts.method ?? "wallet";
  const id = "pay_" + crypto.randomBytes(8).toString("hex");
  const amount = opts.amountCents ?? REGISTRATION_FEE_CENTS;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Bank-transfer flow: no provider call. We record a pending row + wait for
  // the contestant to attach a receipt screenshot, then admin reviews.
  if (method === "bank_transfer") {
    if (!opts.bankCode || !ETHIOPIAN_BANK_CODES.includes(opts.bankCode)) {
      throw new PaymentValidationError("Pick one of the listed banks.");
    }
    await exec(
      `INSERT INTO payments (id, contestant_id, amount_cents, currency, status, provider, method, bank_name)
       VALUES (?, ?, ?, ?, 'pending', 'bank_transfer', 'bank_transfer', ?)`,
      [id, opts.contestantId, amount, CURRENCY, opts.bankCode]
    );
    await recordPaymentEvent({
      paymentId: id,
      kind: "init",
      payload: { amount_cents: amount, currency: CURRENCY, method, bank: opts.bankCode },
      statusAfter: "pending",
    });
    return {
      paymentId: id,
      amountCents: amount,
      currency: CURRENCY,
      redirectUrl: "",
      mode: "bank_transfer",
      method,
      expiresAt,
    };
  }

  // Wallet flow (Telebirr / M-Pesa / CBE Birr via AdmasPay).
  if (!isApiLive() && !isCheckoutLive()) {
    throw new PaymentsNotConfiguredError();
  }

  await exec(
    `INSERT INTO payments (id, contestant_id, amount_cents, currency, status, method)
     VALUES (?, ?, ?, ?, 'pending', 'wallet')`,
    [id, opts.contestantId, amount, CURRENCY]
  );
  await recordPaymentEvent({
    paymentId: id,
    kind: "init",
    payload: { amount_cents: amount, currency: CURRENCY, method },
    statusAfter: "pending",
  });

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
      method,
      expiresAt,
    };
  }

  // Mode 1: real Telebirr integration: build a signed request to AdmasPay.
  // Implementations vary by aggregator; this is the canonical AdmasPay shape.
  const payload = {
    appId: process.env.TELEBIRR_MERCHANT_ID,
    outTradeNo: id,
    subject: `Bling Records Show registration ${opts.contestantId}`,
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
    method,
    expiresAt,
  };
}

export class PaymentValidationError extends Error {}

/** Attach a bank-transfer receipt screenshot to a pending bank_transfer
 *  payment. The payment stays 'pending' — an admin must review the receipt
 *  and mark it 'succeeded' via the existing override flow. */
export async function attachReceipt(opts: {
  paymentId: string;
  contestantId: string;
  receiptUrl: string;
}): Promise<PaymentRow> {
  const p = await getPaymentById(opts.paymentId);
  if (!p) throw new PaymentValidationError("Payment not found.");
  if (p.contestant_id !== opts.contestantId) {
    throw new PaymentValidationError("Not your payment.");
  }
  if (p.method !== "bank_transfer") {
    throw new PaymentValidationError(
      "Receipts can only be attached to bank-transfer payments."
    );
  }
  if (p.status !== "pending") {
    throw new PaymentValidationError(
      `Payment is already ${p.status} — cannot replace the receipt.`
    );
  }
  await exec(
    `UPDATE payments
       SET receipt_url = ?, receipt_uploaded_at = (CURRENT_TIMESTAMP::text),
           updated_at = (CURRENT_TIMESTAMP::text)
     WHERE id = ?`,
    [opts.receiptUrl, opts.paymentId]
  );
  await recordPaymentEvent({
    paymentId: opts.paymentId,
    kind: "init",
    payload: { receipt_url: opts.receiptUrl },
    statusBefore: p.status,
    statusAfter: p.status,
    reason: "receipt_attached",
  });
  return (await getPaymentById(opts.paymentId))!;
}

/** Gate helper used by the upload routes: a contestant may upload only after
 *  at least one of their payments is `succeeded`. */
export async function hasPaidSubmissionFee(
  contestantId: string
): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM payments WHERE contestant_id = ? AND status = 'succeeded'`,
    [contestantId]
  );
  return (row?.n ?? 0) > 0;
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
  rawPayload?: unknown;
}): Promise<void> {
  const before = await getPaymentById(opts.paymentId);
  const status: PaymentRow["status"] = opts.succeeded ? "succeeded" : "failed";
  await exec(
    `UPDATE payments
       SET status = ?, provider_ref = COALESCE(NULLIF(?, ''), provider_ref),
           updated_at = (CURRENT_TIMESTAMP::text)
     WHERE id = ?`,
    [status, opts.providerRef ?? "", opts.paymentId]
  );
  await recordPaymentEvent({
    paymentId: opts.paymentId,
    kind: "webhook",
    payload: redactPayload(opts.rawPayload ?? null),
    statusBefore: before?.status ?? null,
    statusAfter: status,
  });
}

export async function setPaymentStatus(opts: {
  paymentId: string;
  providerRef?: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  actorUserId?: string | null;
  reason?: string | null;
  kind?: "override" | "refund_complete" | "reconcile";
}): Promise<void> {
  const before = await getPaymentById(opts.paymentId);
  await exec(
    `UPDATE payments
       SET status = ?, provider_ref = COALESCE(NULLIF(?, ''), provider_ref),
           updated_at = (CURRENT_TIMESTAMP::text)
     WHERE id = ?`,
    [opts.status, opts.providerRef ?? "", opts.paymentId]
  );
  await recordPaymentEvent({
    paymentId: opts.paymentId,
    kind: opts.kind ?? "override",
    actorUserId: opts.actorUserId ?? null,
    statusBefore: before?.status ?? null,
    statusAfter: opts.status,
    reason: opts.reason ?? null,
    payload: opts.providerRef ? { provider_ref: opts.providerRef } : null,
  });
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

/**
 * Admin-side filtered list. Paginated; supports filter by status, contestant
 * search (substring on contestant id), and a `stuckOnly` flag that returns
 * pending payments older than `stuckHours` for the reconciliation list.
 */
export async function adminListPayments(opts: {
  status?: PaymentRow["status"];
  method?: PaymentMethod;
  /** When true, restrict to bank-transfer payments that are pending and have
   *  a receipt attached — the admin's "review queue". */
  receiptsAwaitingReview?: boolean;
  search?: string;
  stuckOnly?: boolean;
  stuckHours?: number;
  limit?: number;
  offset?: number;
}): Promise<{ items: PaymentRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.status) {
    where.push("status = ?");
    params.push(opts.status);
  }
  if (opts.method) {
    where.push("method = ?");
    params.push(opts.method);
  }
  if (opts.receiptsAwaitingReview) {
    where.push(
      "method = 'bank_transfer' AND status = 'pending' AND receipt_url IS NOT NULL"
    );
  }
  if (opts.search) {
    where.push("(contestant_id ILIKE ? OR id ILIKE ?)");
    const q = `%${opts.search}%`;
    params.push(q, q);
  }
  if (opts.stuckOnly) {
    const hours = opts.stuckHours ?? 24;
    where.push(
      `status = 'pending' AND created_at::timestamp < NOW() - (? || ' hours')::interval`
    );
    params.push(String(hours));
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";

  const totalRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM payments ${w}`,
    params
  );

  const sql = `SELECT * FROM payments ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const items = await query<PaymentRow>(sql, [
    ...params,
    opts.limit ?? 100,
    opts.offset ?? 0,
  ]);
  return { items, total: totalRow?.n ?? 0 };
}

export const PAYMENTS_LIVE = isApiLive() || isCheckoutLive();
export const PAYMENTS_MODE: PaymentMode | null = isApiLive()
  ? "api"
  : isCheckoutLive()
  ? "checkout"
  : null;
export { REGISTRATION_FEE_CENTS, CURRENCY };
