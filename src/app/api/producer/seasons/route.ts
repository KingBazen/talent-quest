import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSeason, listSeasons } from "@/lib/seasons";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 10 (P10-T003): producer season management.
 *
 *  GET                   → list every season the producer is allowed to see
 *  POST { number, title, summary?, startsAt?, endsAt? } → create
 */

export const GET = route(async () => {
  await requireRole("producer", "admin");
  const items = await listSeasons();
  return ok({ items });
});

const PostBody = z.object({
  number: z.number().int().min(1).max(99),
  title: z.string().min(2).max(120),
  summary: z.string().max(2000).optional().or(z.literal("")),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("producer", "admin");
  const data = await parseJson(req, PostBody);

  const season = await createSeason({
    number: data.number,
    title: data.title,
    summary: data.summary || null,
    startsAt: data.startsAt || null,
    endsAt: data.endsAt || null,
    createdByUserId: session.sub,
  });

  await recordAudit({
    actorUserId: session.sub,
    targetType: "round",
    targetId: season.id,
    action: "season.create",
    payload: { number: season.number, title: season.title },
  });

  return ok({ season }, { status: 201 });
});
