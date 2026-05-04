import { ok, route } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import {
  getContestantById,
  listProgress,
} from "@/lib/contestants";
import { contestantToPublicDTO, userById } from "@/lib/dto";
import { aggregateScoresFor } from "@/lib/scores";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const id = String(ctx.params.id || "").trim();
  if (!/^\d{6}$/.test(id)) throw new ApiError(400, "ID must be 6 digits");
  const c = await getContestantById(id);
  if (!c) throw new ApiError(404, "No contestant with that ID");
  const u = (await userById(c.user_id))!;
  const progress = await listProgress(c.id);

  // Pull the most recent submission's aggregated public score, if any.
  const sub = await queryOne<{ id: string }>(
    `SELECT id FROM submissions WHERE contestant_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [c.id]
  );

  let score: { total: number; judges: number } | null = null;
  if (sub) {
    const a = await aggregateScoresFor(sub.id);
    if (a.judgesCount > 0) {
      score = { total: a.total, judges: a.judgesCount };
    }
  }

  return ok({
    contestant: contestantToPublicDTO(c, u, progress),
    score,
  });
});
