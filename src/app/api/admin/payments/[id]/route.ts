import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getPaymentById, setPaymentStatus } from "@/lib/payments";
import { listPaymentEvents } from "@/lib/payment-events";

export const runtime = "nodejs";

/**
 * Admin payment management. Two operations:
 *
 *   • GET   — return the payment + its event history (the admin payment
 *             detail view consumes this).
 *   • PATCH — manual status override (used for stuck transactions, manual
 *             reconciliation). Requires a `reason` so the audit log captures
 *             *why* a human moved a payment off the auto-flow.
 *
 * Refunds have their own endpoint at `/api/admin/payments/[id]/refund`.
 */

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  await requireRole("admin");
  const p = await getPaymentById(ctx.params.id);
  if (!p) throw new ApiError(404, "Payment not found");
  const events = await listPaymentEvents(p.id);
  return ok({ payment: p, events });
});

const PatchBody = z.object({
  status: z.enum(["pending", "succeeded", "failed"]),
  providerRef: z.string().optional(),
  reason: z
    .string()
    .min(4, "Reason is required for any manual override")
    .max(500),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("admin");
  const { status, providerRef, reason } = await parseJson(req, PatchBody);
  const p = await getPaymentById(ctx.params.id);
  if (!p) throw new ApiError(404, "Payment not found");

  // Override is for fixing stuck-`pending` payments only — terminal states
  // (`succeeded`, `failed`, `refunded`) describe a real-world outcome we
  // shouldn't rewrite from this endpoint. Refunds have their own endpoint.
  if (p.status !== "pending") {
    throw new ApiError(
      409,
      `Override is only allowed on pending payments. This one is "${p.status}" — use the refund endpoint for succeeded payments.`
    );
  }

  await setPaymentStatus({
    paymentId: p.id,
    providerRef: providerRef ?? "",
    status,
    actorUserId: session.sub,
    reason,
    kind: "override",
  });
  return ok(await getPaymentById(p.id));
});
