import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { listAudits } from "@/lib/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType") ?? undefined;
  const targetId = url.searchParams.get("targetId") ?? undefined;
  const action = url.searchParams.get("action") ?? undefined;
  const actorUserId = url.searchParams.get("actorUserId") ?? undefined;
  const limit = Math.min(500, Number(url.searchParams.get("limit") || "100"));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));

  const r = await listAudits({
    targetType: targetType as
      | "contestant"
      | "submission"
      | "payment"
      | "assignment"
      | "setting"
      | "contact_message"
      | "round"
      | undefined,
    targetId,
    action,
    actorUserId,
    limit,
    offset,
  });
  return ok(r);
});
