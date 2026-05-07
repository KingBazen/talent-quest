import { exec, query, queryOne, type SubmissionAssignmentRow } from "./db";

/**
 * Submission ↔ referee assignment helpers. The composite PK means the
 * UPSERT below is safe to call repeatedly — re-assigning the same referee
 * to the same submission is a no-op.
 *
 * Admin-only writes (the API routes enforce this); referees only read.
 */

export async function assignReferees(input: {
  submissionId: string;
  refereeUserIds: string[];
  assignedByUserId: string;
}): Promise<{ added: number }> {
  if (input.refereeUserIds.length === 0) return { added: 0 };
  let added = 0;
  for (const refId of input.refereeUserIds) {
    const before = await queryOne<{ exists: number }>(
      `SELECT 1::int AS exists FROM submission_assignments
        WHERE submission_id = ? AND referee_user_id = ?`,
      [input.submissionId, refId]
    );
    if (before) continue;
    await exec(
      `INSERT INTO submission_assignments
         (submission_id, referee_user_id, assigned_by_user_id)
       VALUES (?, ?, ?)`,
      [input.submissionId, refId, input.assignedByUserId]
    );
    added += 1;
  }
  return { added };
}

export async function unassignReferee(
  submissionId: string,
  refereeUserId: string
): Promise<void> {
  await exec(
    `DELETE FROM submission_assignments
      WHERE submission_id = ? AND referee_user_id = ?`,
    [submissionId, refereeUserId]
  );
}

export async function listAssignmentsForReferee(
  refereeUserId: string
): Promise<string[]> {
  const rows = await query<{ submission_id: string }>(
    `SELECT submission_id FROM submission_assignments
      WHERE referee_user_id = ?`,
    [refereeUserId]
  );
  return rows.map((r) => r.submission_id);
}

export async function listAssignmentsForSubmission(
  submissionId: string
): Promise<SubmissionAssignmentRow[]> {
  return query<SubmissionAssignmentRow>(
    `SELECT * FROM submission_assignments WHERE submission_id = ?`,
    [submissionId]
  );
}

/**
 * Is this referee allowed to view + score the given submission? Admins are
 * implicitly allowed (the caller is responsible for admin-vs-referee
 * branching).
 */
export async function refereeCanAccess(
  submissionId: string,
  refereeUserId: string
): Promise<boolean> {
  const row = await queryOne<{ exists: number }>(
    `SELECT 1::int AS exists FROM submission_assignments
      WHERE submission_id = ? AND referee_user_id = ?`,
    [submissionId, refereeUserId]
  );
  return Boolean(row);
}
