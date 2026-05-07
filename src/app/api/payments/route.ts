import { ok, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import { listPaymentsForContestant } from "@/lib/payments";
import { getSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Logged-in contestant's full payment history + the global `fee_required_at`
 * setting. The contestant page uses this to decide whether to show the
 * "Pay now" CTA (when fee_required_at = 'apply' or status = 'shortlisted').
 */
export const GET = route(async () => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");

  const [payments, feeRequiredAt] = await Promise.all([
    listPaymentsForContestant(c.id),
    getSetting("fee_required_at"),
  ]);

  return ok({
    items: payments.map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      provider: p.provider,
      providerRef: p.provider_ref,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    feeRequiredAt,
    contestantStatus: c.status,
  });
});
