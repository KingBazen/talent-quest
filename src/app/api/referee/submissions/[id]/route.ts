import { ok, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { refereeCanAccess } from "@/lib/assignments";
import {
  getSubmissionById,
  listExtrasForContestant,
} from "@/lib/contestants";
import { aggregateScoresFor, getMyScoreNote, listMyScores } from "@/lib/scores";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Detail payload for the referee scoring page. Returns:
 *   • submission row + Cloudinary fields for the in-app player
 *   • anonymised contestant context (stage name + city + category — never
 *     full name, in line with the public DTO contract)
 *   • per-criterion scores **this** referee has previously given (so the
 *     UI can pre-fill sliders + warn before overwrite)
 *   • the referee's own private + public notes
 *   • aggregate (judge count + total) — read-only
 */
export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const session = await requireRole("referee", "admin");
  const id = ctx.params.id;

  const submission = await getSubmissionById(id);
  if (!submission) throw new ApiError(404, "Submission not found");

  if (session.role === "referee") {
    const allowed = await refereeCanAccess(id, session.sub);
    if (!allowed) throw new ApiError(403, "Submission not assigned to you");
  }

  const ctx2 = await queryOne<{
    contestant_id: string;
    stage_name: string | null;
    city: string;
    category: string;
    full_name: string;
  }>(
    `SELECT c.id AS contestant_id, c.stage_name, c.city, c.category, u.full_name
       FROM contestants c
       JOIN users u ON u.id = c.user_id
      WHERE c.id = ?`,
    [submission.contestant_id]
  );

  // Initials fallback mirrors PublicContestantDTO behaviour.
  function initials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "—";
    return (
      parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join(".") + "."
    );
  }
  const displayName = ctx2?.stage_name || (ctx2 ? initials(ctx2.full_name) : "—");

  const myScores = await listMyScores(session.sub, id);
  const myNote = await getMyScoreNote(session.sub, id);
  const aggregate = await aggregateScoresFor(id);

  // Phase 13: surface the contestant's optional extras alongside the
  // competition entry so referees who want more context can preview them
  // without leaving the scoring page. Scoring still applies to the main
  // submission only — extras are review-only.
  const extras = (await listExtrasForContestant(submission.contestant_id)).map(
    (s) => ({
      id: s.id,
      slot: s.slot,
      title: s.title,
      videoUrl: s.video_url,
      durationSec: s.duration_sec,
      width: s.width,
      height: s.height,
      createdAt: s.created_at,
    })
  );

  return ok({
    submission: {
      id: submission.id,
      title: submission.title,
      status: submission.status,
      videoUrl: submission.video_url,
      thumbnailUrl: submission.thumbnail_url,
      durationSec: submission.duration_sec,
      cloudinaryPublicId: submission.cloudinary_public_id,
      width: submission.width,
      height: submission.height,
      slot: submission.slot,
      createdAt: submission.created_at,
    },
    extras,
    contestant: ctx2
      ? {
          id: ctx2.contestant_id,
          displayName,
          stageName: ctx2.stage_name,
          city: ctx2.city,
          category: ctx2.category,
        }
      : null,
    myScores: myScores.map((s) => ({
      criterion: s.criterion,
      points: s.points,
      maxPoints: s.max_points,
    })),
    myNote: myNote
      ? {
          notes: myNote.notes,
          publicNotes: myNote.public_notes,
          updatedAt: myNote.updated_at,
        }
      : null,
    aggregate,
    iHaveScored: myScores.length > 0,
  });
});
