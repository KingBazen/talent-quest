import { ok, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import { initPayment, REGISTRATION_FEE_CENTS } from "@/lib/payments";

export const runtime = "nodejs";

export const POST = route(async () => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");

  const intent = await initPayment({
    contestantId: c.id,
    amountCents: REGISTRATION_FEE_CENTS,
  });

  return ok(intent);
});
