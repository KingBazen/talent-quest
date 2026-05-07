import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import {
  initPayment,
  PaymentValidationError,
  PaymentsNotConfiguredError,
  REGISTRATION_FEE_CENTS,
} from "@/lib/payments";

export const runtime = "nodejs";

const Body = z
  .object({
    method: z.enum(["wallet", "bank_transfer"]).optional(),
    bankCode: z.string().min(2).max(20).optional(),
  })
  .optional();

export const POST = route(async (req: Request) => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");

  // Body is optional — wallet is the default to keep the existing call-site
  // (no body) on /contestant/payment working.
  let parsed: { method?: "wallet" | "bank_transfer"; bankCode?: string } = {};
  try {
    if (req.headers.get("content-length") && req.headers.get("content-length") !== "0") {
      parsed = (await parseJson(req, Body)) ?? {};
    }
  } catch {
    parsed = {};
  }

  try {
    const intent = await initPayment({
      contestantId: c.id,
      amountCents: REGISTRATION_FEE_CENTS,
      method: parsed.method,
      bankCode: parsed.bankCode,
    });
    return ok(intent);
  } catch (e) {
    if (e instanceof PaymentValidationError) {
      throw new ApiError(422, e.message);
    }
    if (e instanceof PaymentsNotConfiguredError) {
      throw new ApiError(503, e.message);
    }
    throw e;
  }
});
