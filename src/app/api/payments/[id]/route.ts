import { ok, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import { getPaymentById } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const session = await requireRole("contestant", "admin");
  const id = String(ctx.params.id || "");
  const p = await getPaymentById(id);
  if (!p) throw new ApiError(404, "Payment not found");
  if (session.role !== "admin") {
    const c = await getContestantByUserId(session.sub);
    if (!c || c.id !== p.contestant_id) {
      throw new ApiError(403, "Not your payment");
    }
  }
  return ok({
    id: p.id,
    status: p.status,
    amountCents: p.amount_cents,
    currency: p.currency,
    provider: p.provider,
    providerRef: p.provider_ref,
    method: p.method,
    bankName: p.bank_name,
    receiptUrl: p.receipt_url,
    receiptUploadedAt: p.receipt_uploaded_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  });
});
