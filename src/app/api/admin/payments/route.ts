import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { adminListPayments } from "@/lib/payments";
import type { PaymentRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-side payments list. Supports:
 *   ?status=pending|succeeded|failed|refunded
 *   ?stuck=1                       (pending payments older than 24 h)
 *   ?stuckHours=N                  (override the threshold)
 *   ?q=<contestant-id-or-pay-id>
 *   ?limit=N&offset=N
 */
const ALLOWED_STATUS: PaymentRow["status"][] = [
  "pending",
  "succeeded",
  "failed",
  "refunded",
];

export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") as PaymentRow["status"] | null;
  const status =
    statusParam && ALLOWED_STATUS.includes(statusParam) ? statusParam : undefined;
  const methodParam = url.searchParams.get("method");
  const method =
    methodParam === "wallet" || methodParam === "bank_transfer"
      ? methodParam
      : undefined;
  const search = url.searchParams.get("q") || undefined;
  const stuckOnly = url.searchParams.get("stuck") === "1";
  const receiptsAwaitingReview =
    url.searchParams.get("receipts") === "1";
  const stuckHoursRaw = url.searchParams.get("stuckHours");
  const stuckHours = stuckHoursRaw ? Number(stuckHoursRaw) : undefined;
  const limit = Math.min(200, Number(url.searchParams.get("limit") || "50"));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));

  const result = await adminListPayments({
    status,
    method,
    receiptsAwaitingReview,
    search,
    stuckOnly,
    stuckHours: Number.isFinite(stuckHours) ? stuckHours : undefined,
    limit,
    offset,
  });

  return ok(result);
});
