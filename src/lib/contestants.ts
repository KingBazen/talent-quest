import crypto from "node:crypto";
import {
  exec,
  query,
  queryOne,
  tx,
  type ContestantRow,
  type ProgressStepRow,
  type SubmissionRow,
  type SubmissionSlot,
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
  dob?: string | null;
  city: string;
  country?: string;
  category: TalentCategoryId;
  experience: string;
  bio: string;
  socialIg?: string | null;
  socialTt?: string | null;
  socialYt?: string | null;
  agreedToRules: boolean;
  agreedToRights: boolean;
  agreedToAge: boolean;
}

export async function createContestant(
  input: CreateContestantInput
): Promise<ContestantRow> {
  const id = await generateUniqueContestantId();
  const now = new Date().toISOString();
  await tx(async ({ q }) => {
    await q(
      `INSERT INTO contestants
        (id, user_id, stage_name, phone, age, dob, city, country, category,
         experience, bio, social_ig, social_tt, social_yt,
         agreed_to_terms, agreed_to_rules_at, agreed_to_rights_at, agreed_to_age_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId,
        input.stageName || null,
        input.phone,
        input.age,
        input.dob ?? null,
        input.city,
        input.country ?? "ET",
        input.category,
        input.experience,
        input.bio,
        input.socialIg ?? null,
        input.socialTt ?? null,
        input.socialYt ?? null,
        // Keep legacy `agreed_to_terms = 1` set when all three new consents
        // are collected; preserves backward-compat with rows + queries that
        // still rely on the binary flag.
        input.agreedToRules && input.agreedToRights && input.agreedToAge ? 1 : 0,
        input.agreedToRules ? now : null,
        input.agreedToRights ? now : null,
        input.agreedToAge ? now : null,
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

export interface CreateSubmissionInput {
  contestantId: string;
  title: string;
  category: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  cloudinaryPublicId?: string | null;
  format?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  supersedesId?: string | null;
  notes?: string | null;
  /** Defaults to 'main' so legacy callers keep producing competition entries. */
  slot?: SubmissionSlot;
}

export async function createSubmission(
  input: CreateSubmissionInput
): Promise<SubmissionRow> {
  const id = "sub_" + crypto.randomBytes(8).toString("hex");
  const now = new Date().toISOString();
  const slot: SubmissionSlot = input.slot ?? "main";

  await tx(async ({ q }) => {
    await q(
      `INSERT INTO submissions
         (id, contestant_id, title, category, video_url, thumbnail_url, duration_sec,
          cloudinary_public_id, format, size_bytes, width, height,
          supersedes_id, notes, slot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.contestantId,
        input.title,
        input.category,
        input.videoUrl ?? null,
        input.thumbnailUrl ?? null,
        input.durationSec ?? null,
        input.cloudinaryPublicId ?? null,
        input.format ?? null,
        input.sizeBytes ?? null,
        input.width ?? null,
        input.height ?? null,
        input.supersedesId ?? null,
        input.notes ?? null,
        slot,
      ]
    );

    // If this submission supersedes a prior one, mark the old one as
    // `superseded` so it stops appearing in showcases / referee queues. We
    // only flip rows that are still in a non-terminal state — once an admin
    // has explicitly approved or rejected a take, that decision sticks.
    if (input.supersedesId) {
      await q(
        `UPDATE submissions
            SET status = 'superseded', superseded_at = ?
          WHERE id = ?
            AND contestant_id = ?
            AND status IN ('pending','approved','flagged')`,
        [now, input.supersedesId, input.contestantId]
      );
    }

    // Only the main slot drives contestant status / progress. Extra videos
    // are supplementary context for referees, so adding them shouldn't flip
    // a contestant from `registered` to `submitted` on their own.
    if (slot === "main") {
      await q(
        `UPDATE progress_steps
           SET done = 1, done_at = ?
         WHERE contestant_id = ? AND step_key = 'video_submitted' AND done = 0`,
        [now, input.contestantId]
      );
      await q(
        `UPDATE contestants SET status = 'submitted'
         WHERE id = ? AND status = 'registered'`,
        [input.contestantId]
      );
    }
  });

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

export async function getSubmissionById(
  id: string
): Promise<SubmissionRow | undefined> {
  return queryOne<SubmissionRow>("SELECT * FROM submissions WHERE id = ?", [id]);
}

/**
 * Update a submission's review status. Allowed transitions are limited to the
 * referee/admin review states — superseded is set elsewhere (replace flow).
 */
export async function setSubmissionStatus(
  submissionId: string,
  status: "pending" | "approved" | "rejected" | "flagged"
): Promise<void> {
  await exec(`UPDATE submissions SET status = ? WHERE id = ?`, [
    status,
    submissionId,
  ]);
}

/**
 * Latest non-superseded *main* submission for a contestant, if any.
 *
 * Public surfaces (profile page, voting card, etc.) show the competition
 * entry — never an extra. Extras are referee-only context. Callers that
 * specifically want a non-main slot should use `getLatestSubmissionForSlot`.
 */
export async function getLatestSubmissionForContestant(
  contestantId: string
): Promise<SubmissionRow | undefined> {
  return queryOne<SubmissionRow>(
    `SELECT * FROM submissions
      WHERE contestant_id = ? AND slot = 'main' AND status != 'superseded'
      ORDER BY created_at DESC LIMIT 1`,
    [contestantId]
  );
}

/** All non-superseded extras for a contestant, ordered by slot then recency. */
export async function listExtrasForContestant(
  contestantId: string
): Promise<SubmissionRow[]> {
  return query<SubmissionRow>(
    `SELECT * FROM submissions
      WHERE contestant_id = ?
        AND slot IN ('extra_1','extra_2')
        AND status != 'superseded'
      ORDER BY slot ASC, created_at DESC`,
    [contestantId]
  );
}

/**
 * Latest non-superseded submission for a specific slot. Used by the multi-slot
 * upload flow so re-uploading the main entry only supersedes the previous
 * main, leaving extras intact (and vice-versa).
 */
export async function getLatestSubmissionForSlot(
  contestantId: string,
  slot: SubmissionSlot
): Promise<SubmissionRow | undefined> {
  return queryOne<SubmissionRow>(
    `SELECT * FROM submissions
      WHERE contestant_id = ? AND slot = ? AND status != 'superseded'
      ORDER BY created_at DESC LIMIT 1`,
    [contestantId, slot]
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
