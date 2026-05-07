import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getAllSettings, setSetting, type KnownSettings } from "@/lib/settings";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireRole("admin");
  const all = await getAllSettings();
  return ok(all);
});

const PatchBody = z.object({
  fee_required_at: z.enum(["apply", "shortlist"]).optional(),
  fee_cents: z.number().int().min(0).max(10_000_00).optional(),
  registration_open: z.boolean().optional(),
  submissions_open: z.boolean().optional(),
  current_round: z.number().int().min(1).max(99).optional(),
  voting_open: z.boolean().optional(),
  voting_round: z.number().int().min(1).max(99).optional(),
});

export const PATCH = route(async (req) => {
  const session = await requireRole("admin");
  const data = await parseJson(req, PatchBody);
  const before = await getAllSettings();

  const changed: { key: keyof KnownSettings; from: unknown; to: unknown }[] = [];
  // setSetting<K> uses overloaded generics; widening through a helper avoids
  // the per-key narrow type collapsing to `never` at the call site.
  const setAny = setSetting as (
    key: keyof KnownSettings,
    value: KnownSettings[keyof KnownSettings],
    updatedBy?: string | null
  ) => Promise<void>;
  for (const k of Object.keys(data) as (keyof KnownSettings)[]) {
    const v = data[k];
    if (v === undefined) continue;
    if (before[k] !== v) {
      await setAny(k, v as KnownSettings[keyof KnownSettings], session.sub);
      changed.push({ key: k, from: before[k], to: v });
    }
  }

  if (changed.length > 0) {
    await recordAudit({
      actorUserId: session.sub,
      targetType: "setting",
      targetId: changed.map((c) => c.key).join(","),
      action: "settings.update",
      payload: changed,
    });
  }

  const after = await getAllSettings();
  return ok({ changed: changed.length, settings: after });
});
