import crypto from "node:crypto";
import {
  query,
  queryOne,
  tx,
  type ScoreNoteRow,
  type ScoreRow,
} from "./db";
import { JUDGING_CRITERIA } from "@/data/judging";

export async function upsertScores(input: {
  submissionId: string;
  refereeUserId: string;
  scores: Record<string, number>;
  notes?: string;
  publicNotes?: string;
}): Promise<void> {
  await tx(async ({ q }) => {
    for (const c of JUDGING_CRITERIA) {
      if (!(c.key in input.scores)) continue;
      const raw = Number(input.scores[c.key]);
      const points = Math.max(0, Math.min(c.weight, Math.round(raw)));
      const id = "sc_" + crypto.randomBytes(6).toString("hex");
      await q(
        `INSERT INTO scores (id, submission_id, referee_user_id, criterion, points, max_points)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (submission_id, referee_user_id, criterion)
         DO UPDATE SET points = excluded.points, max_points = excluded.max_points,
                       created_at = (CURRENT_TIMESTAMP::text)`,
        [id, input.submissionId, input.refereeUserId, c.key, points, c.weight]
      );
    }
    // Persist notes if either column is provided. We accept empty strings as
    // a deliberate clear (the row stays in place; both columns can hold "").
    if (
      typeof input.notes === "string" ||
      typeof input.publicNotes === "string"
    ) {
      await q(
        `INSERT INTO score_notes (submission_id, referee_user_id, notes, public_notes, updated_at)
         VALUES (?, ?, ?, ?, (CURRENT_TIMESTAMP::text))
         ON CONFLICT (submission_id, referee_user_id)
         DO UPDATE SET notes = COALESCE(excluded.notes, score_notes.notes),
                       public_notes = COALESCE(excluded.public_notes, score_notes.public_notes),
                       updated_at = (CURRENT_TIMESTAMP::text)`,
        [
          input.submissionId,
          input.refereeUserId,
          input.notes ?? null,
          input.publicNotes ?? null,
        ]
      );
    }
  });
}

export async function getMyScoreNote(
  refereeUserId: string,
  submissionId: string
): Promise<ScoreNoteRow | undefined> {
  return queryOne<ScoreNoteRow>(
    `SELECT * FROM score_notes
      WHERE referee_user_id = ? AND submission_id = ?`,
    [refereeUserId, submissionId]
  );
}

/** Aggregate of every public-facing note for a submission. Used by the
 *  contestant-facing result view to surface what referees have said. */
export async function listPublicNotesForSubmission(
  submissionId: string
): Promise<{ public_notes: string; updated_at: string }[]> {
  return query<{ public_notes: string; updated_at: string }>(
    `SELECT public_notes, updated_at FROM score_notes
      WHERE submission_id = ? AND public_notes IS NOT NULL AND public_notes <> ''
      ORDER BY updated_at DESC`,
    [submissionId]
  );
}

export interface AggregateScore {
  submissionId: string;
  total: number;
  judgesCount: number;
  perCriterion: { key: string; avg: number; max: number }[];
}

export async function aggregateScoresFor(
  submissionId: string
): Promise<AggregateScore> {
  const rows = await query<{
    criterion: string;
    avg_pts: string | number | null;
    max_pts: number | null;
    judges: string | number;
  }>(
    `SELECT criterion, AVG(points) AS avg_pts, MAX(max_points) AS max_pts,
            COUNT(DISTINCT referee_user_id) AS judges
     FROM scores WHERE submission_id = ?
     GROUP BY criterion`,
    [submissionId]
  );
  const perCriterion = JUDGING_CRITERIA.map((c) => {
    const r = rows.find((x) => x.criterion === c.key);
    return {
      key: c.key,
      avg: Math.round(Number(r?.avg_pts ?? 0)),
      max: c.weight,
    };
  });
  const total = perCriterion.reduce((s, c) => s + c.avg, 0);
  const judgesCount = rows.length
    ? Math.max(...rows.map((r) => Number(r.judges)))
    : 0;
  return { submissionId, total, judgesCount, perCriterion };
}

export async function listMyScores(
  refereeUserId: string,
  submissionId: string
): Promise<ScoreRow[]> {
  return query<ScoreRow>(
    `SELECT * FROM scores WHERE referee_user_id = ? AND submission_id = ?`,
    [refereeUserId, submissionId]
  );
}

export async function listMyScoredSubmissionIds(
  refereeUserId: string
): Promise<string[]> {
  const rows = await query<{ submission_id: string }>(
    "SELECT DISTINCT submission_id FROM scores WHERE referee_user_id = ?",
    [refereeUserId]
  );
  return rows.map((r) => r.submission_id);
}

export async function avgScoreOverall(): Promise<number> {
  const r = await queryOne<{ avg_total: string | number | null }>(
    `SELECT AVG(total) AS avg_total FROM (
       SELECT submission_id, SUM(points) AS total
       FROM scores GROUP BY submission_id, referee_user_id
     ) AS per_judge`
  );
  return Math.round(Number(r?.avg_total ?? 0));
}
