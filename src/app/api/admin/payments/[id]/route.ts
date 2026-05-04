import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getPaymentById, setPaymentStatus } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Admin-only manual payment status override. Useful for QA until the
 * AdmasPay webhook is wired, or for handling exceptional cases (refunds,
 * stuck transactions). Audit-logged via the standard payments table update.
 */

const Body = z.object({
  status: z.enum(["succeeded", "failed", "refunded"]),
  providerRef: z.string().optional(),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  await requireRole("admin");
  const { status, providerRef } = await parseJson(req, Body);
  const p = await getPaymentById(ctx.params.id);
  if (!p) throw new ApiError(404, "Payment not found");
  await setPaymentStatus({
    paymentId: p.id,
    providerRef: providerRef ?? "",
    status,
  });
  return ok(await getPaymentById(p.id));
});
