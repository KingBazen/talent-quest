import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { exec, queryOne } from "@/lib/db";
import { upsertScores, aggregateScoresFor } from "@/lib/scores";

export const runtime = "nodejs";

const Body = z.object({
  submissionId: z.string().min(3),
  scores: z.record(z.string(), z.coerce.number().int().min(0).max(100)),
  notes: z.string().max(2000).optional().nullable(),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("referee", "admin");
  const data = await parseJson(req, Body);

  const submission = await queryOne<{ id: string }>(
    `SELECT id FROM submissions WHERE id = ?`,
    [data.submissionId]
  );
  if (!submission) throw new ApiError(404, "Submission not found");

  await upsertScores({
    submissionId: data.submissionId,
    refereeUserId: session.sub,
    scores: data.scores,
    notes: data.notes ?? undefined,
  });

  // Once any submission has 3+ judges and avg > 70, mark contestant shortlisted.
  const agg = await aggregateScoresFor(data.submissionId);
  if (agg.judgesCount >= 3 && agg.total >= 70) {
    await exec(
      `UPDATE contestants
         SET status = 'shortlisted'
       WHERE id = (SELECT contestant_id FROM submissions WHERE id = ?)
         AND status IN ('submitted','registered')`,
      [data.submissionId]
    );
    await exec(
      `UPDATE progress_steps
         SET done = 1, done_at = ?
       WHERE step_key = 'shortlisted'
         AND done = 0
         AND contestant_id = (SELECT contestant_id FROM submissions WHERE id = ?)`,
      [new Date().toISOString(), data.submissionId]
    );
  }

  return ok({ aggregate: agg });
});
