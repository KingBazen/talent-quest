import crypto from "node:crypto";
import {
  exec,
  query,
  queryOne,
  tx,
  type ContestantRow,
  type ProgressStepRow,
  type SubmissionRow,
} from "./db";
import type { TalentCategoryId } from "@/types";

const PROGRESS_DEFAULTS = [
  { key: "registered", label: "Registered" },
  { key: "video_submitted", label: "Video submitted" },
  { key: "review", label: "Under review" },
  { key: "shortlisted", label: "Shortlist decision" },
  { key: "audition", label: "Live audition" },
  { key: "result", label: "Final result" },
];

/** Generate a unique 6-digit numeric contestant ID (collision-checked). */
export async function generateUniqueContestantId(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const id = String(100000 + crypto.randomInt(0, 900000));
    const exists = await queryOne(
      "SELECT 1 AS x FROM contestants WHERE id = ?",
      [id]
    );
    if (!exists) return id;
  }
  throw new Error("Failed to allocate contestant ID after 50 attempts");
}

export interface CreateContestantInput {
  userId: string;
  stageName?: string | null;
  phone: string;
  age: number;
  city: string;
  category: TalentCategoryId;
  experience: string;
  bio: string;
  agreedToTerms: boolean;
}

export async function createContestant(
  input: CreateContestantInput
): Promise<ContestantRow> {
  const id = await generateUniqueContestantId();
  await tx(async ({ q }) => {
    await q(
      `INSERT INTO contestants
        (id, user_id, stage_name, phone, age, city, category, experience, bio, agreed_to_terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId,
        input.stageName || null,
        input.phone,
        input.age,
        input.city,
        input.category,
        input.experience,
        input.bio,
        input.agreedToTerms ? 1 : 0,
      ]
    );
    for (let i = 0; i < PROGRESS_DEFAULTS.length; i++) {
      const s = PROGRESS_DEFAULTS[i];
      const isFirst = i === 0;
      await q(
        `INSERT INTO progress_steps (contestant_id, step_key, label, done, done_at, ord)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          s.key,
          s.label,
          isFirst ? 1 : 0,
          isFirst ? new Date().toISOString() : null,
          i,
        ]
      );
    }
  });
  return (await getContestantById(id))!;
}

export async function getContestantById(
  id: string
): Promise<ContestantRow | undefined> {
  return queryOne<ContestantRow>(
    "SELECT * FROM contestants WHERE id = ?",
    [id]
  );
}

export async function getContestantByUserId(
  userId: string
): Promise<ContestantRow | undefined> {
  return queryOne<ContestantRow>(
    "SELECT * FROM contestants WHERE user_id = ?",
    [userId]
  );
}

export async function listProgress(
  contestantId: string
): Promise<ProgressStepRow[]> {
  return query<ProgressStepRow>(
    "SELECT * FROM progress_steps WHERE contestant_id = ? ORDER BY ord ASC",
    [contestantId]
  );
}

export async function advanceProgress(contestantId: string): Promise<{
  step: ProgressStepRow | null;
  status: ContestantRow["status"];
}> {
  const next = await queryOne<ProgressStepRow>(
    `SELECT * FROM progress_steps
     WHERE contestant_id = ? AND done = 0
     ORDER BY ord ASC LIMIT 1`,
    [contestantId]
  );
  if (!next) {
    const c = await getContestantById(contestantId);
    return { step: null, status: c?.status ?? "registered" };
  }
  const now = new Date().toISOString();
  let nextStatus: ContestantRow["status"] | null = null;
  if (next.step_key === "video_submitted") nextStatus = "submitted";
  else if (next.step_key === "shortlisted") nextStatus = "shortlisted";
  else if (next.step_key === "result")
    nextStatus = Math.random() > 0.5 ? "advanced" : "eliminated";

  await tx(async ({ q }) => {
    await q(
      `UPDATE progress_steps SET done = 1, done_at = ?
       WHERE contestant_id = ? AND step_key = ?`,
      [now, contestantId, next.step_key]
    );
    if (nextStatus) {
      await q(`UPDATE contestants SET status = ? WHERE id = ?`, [
        nextStatus,
        contestantId,
      ]);
    }
  });
  const c = await getContestantById(contestantId);
  return {
    step: { ...next, done: 1, done_at: now },
    status: c?.status ?? "registered",
  };
}

export async function listContestants(opts?: {
  search?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ContestantRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts?.search) {
    where.push(
      `(id ILIKE ? OR city ILIKE ? OR EXISTS (
         SELECT 1 FROM users u WHERE u.id = contestants.user_id
           AND (u.full_name ILIKE ? OR u.email ILIKE ?)
       ))`
    );
    const q = `%${opts.search}%`;
    params.push(q, q, q, q);
  }
  if (opts?.category) {
    where.push("category = ?");
    params.push(opts.category);
  }
  if (opts?.status) {
    where.push("status = ?");
    params.push(opts.status);
  }
  const sql = `
    SELECT * FROM contestants
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(opts?.limit ?? 100, opts?.offset ?? 0);
  return query<ContestantRow>(sql, params);
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export async function createSubmission(input: {
  contestantId: string;
  title: string;
  category: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  notes?: string | null;
}): Promise<SubmissionRow> {
  const id = "sub_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO submissions
       (id, contestant_id, title, category, video_url, thumbnail_url, duration_sec, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.contestantId,
      input.title,
      input.category,
      input.videoUrl ?? null,
      input.thumbnailUrl ?? null,
      input.durationSec ?? null,
      input.notes ?? null,
    ]
  );
  // Auto-advance the "video_submitted" step.
  await exec(
    `UPDATE progress_steps
       SET done = 1, done_at = ?
     WHERE contestant_id = ? AND step_key = 'video_submitted' AND done = 0`,
    [new Date().toISOString(), input.contestantId]
  );
  await exec(
    `UPDATE contestants SET status = 'submitted'
     WHERE id = ? AND status = 'registered'`,
    [input.contestantId]
  );
  return (await queryOne<SubmissionRow>(
    "SELECT * FROM submissions WHERE id = ?",
    [id]
  ))!;
}

export async function listSubmissionsForContestant(
  contestantId: string
): Promise<SubmissionRow[]> {
  return query<SubmissionRow>(
    "SELECT * FROM submissions WHERE contestant_id = ? ORDER BY created_at DESC",
    [contestantId]
  );
}

export async function listSubmissionsForReview(
  limit = 50
): Promise<SubmissionRow[]> {
  return query<SubmissionRow>(
    `SELECT * FROM submissions
     WHERE status IN ('pending','approved')
     ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}
