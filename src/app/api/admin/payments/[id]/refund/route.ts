import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getPaymentById, setPaymentStatus } from "@/lib/payments";
import { recordPaymentEvent } from "@/lib/payment-events";

export const runtime = "nodejs";

/**
 * Record-only refund. We don't (yet) call AdmasPay's refund API — the admin
 * issues the refund out-of-band in the merchant dashboard, then flips our
 * record here so the contestant's view + the audit log reflect reality.
 *
 * Two-step flow with `requestOnly`:
 *   • { requestOnly: true } — write a refund_request event but leave the
 *     payment row at `succeeded`. Lets finance start the manual flow without
 *     prematurely lying to the contestant.
 *   • { requestOnly: false } (default) — flip the row to `refunded` and
 *     write a refund_complete event.
 *
 * Either way `reason` is required and lands in the audit trail.
 */
const Body = z.object({
  reason: z.string().min(4, "Reason is required").max(500),
  requestOnly: z.boolean().optional(),
  providerRef: z.string().optional(),
});

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("admin");
  const { reason, requestOnly, providerRef } = await parseJson(req, Body);

  const p = await getPaymentById(ctx.params.id);
  if (!p) throw new ApiError(404, "Payment not found");

  if (p.status === "refunded") {
    throw new ApiError(409, "Payment is already refunded");
  }
  if (p.status !== "succeeded") {
    throw new ApiError(
      409,
      `Only succeeded payments can be refunded — this one is "${p.status}".`
    );
  }

  if (requestOnly) {
    await recordPaymentEvent({
      paymentId: p.id,
      kind: "refund_request",
      actorUserId: session.sub,
      statusBefore: p.status,
      statusAfter: p.status, // unchanged
      reason,
      payload: providerRef ? { provider_ref: providerRef } : null,
    });
    return ok({
      requested: true,
      payment: await getPaymentById(p.id),
    });
  }

  await setPaymentStatus({
    paymentId: p.id,
    providerRef: providerRef ?? "",
    status: "refunded",
    actorUserId: session.sub,
    reason,
    kind: "refund_complete",
  });
  return ok({
    refunded: true,
    payment: await getPaymentById(p.id),
  });
});
