import crypto from "node:crypto";
import { exec, query, type PaymentEventKind, type PaymentEventRow } from "./db";

/**
 * Append-only audit log for payment lifecycle events. Every state change to a
 * row in `payments` should write a row here, including the actor (user id or
 * null for webhooks), the kind, before/after status, optional reason, and a
 * payload (raw provider body / override request).
 *
 * Callers are responsible for redacting credentials from `payload` before
 * passing it in. The shared `redactPayload` helper handles common cases.
 */
export interface RecordPaymentEventInput {
  paymentId: string;
  kind: PaymentEventKind;
  actorUserId?: string | null;
  payload?: unknown;
  statusBefore?: string | null;
  statusAfter?: string | null;
  reason?: string | null;
}

export async function recordPaymentEvent(
  input: RecordPaymentEventInput
): Promise<void> {
  const id = "pe_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO payment_events
       (id, payment_id, actor_user_id, kind, payload, status_before, status_after, reason)
     VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
    [
      id,
      input.paymentId,
      input.actorUserId ?? null,
      input.kind,
      input.payload === undefined ? null : JSON.stringify(input.payload),
      input.statusBefore ?? null,
      input.statusAfter ?? null,
      input.reason ?? null,
    ]
  );
}

export async function listPaymentEvents(
  paymentId: string
): Promise<PaymentEventRow[]> {
  return query<PaymentEventRow>(
    `SELECT * FROM payment_events
      WHERE payment_id = ?
      ORDER BY created_at ASC`,
    [paymentId]
  );
}

/**
 * Strip auth-sensitive keys from an object before storing it on a payment_event.
 * Mutates a shallow copy so the caller's original payload is untouched.
 */
const SECRET_KEYS = new Set([
  "appKey",
  "app_key",
  "apiKey",
  "api_key",
  "hmacSecret",
  "secret",
  "sign",
  "signature",
  "x-app-key",
  "authorization",
]);

export function redactPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload.map(redactPayload);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.has(k) ? "[redacted]" : redactPayload(v);
  }
  return out;
}
