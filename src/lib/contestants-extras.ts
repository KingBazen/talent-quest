import { exec } from "./db";

/**
 * Soft-delete a contestant. We don't physically remove the row — scores,
 * payments, and audit history must be preserved. Withdrawn contestants
 * cannot log back in (the auth login route checks `withdrawn_at` before
 * issuing a session) and are filtered out of public surfaces.
 */
export async function withdrawContestant(contestantId: string): Promise<void> {
  const now = new Date().toISOString();
  await exec(
    `UPDATE contestants SET withdrawn_at = ? WHERE id = ? AND withdrawn_at IS NULL`,
    [now, contestantId]
  );
}

export interface UpdateContestantInput {
  stageName?: string | null;
  phone?: string;
  city?: string;
  country?: string;
  bio?: string;
  experience?: string;
  socialIg?: string | null;
  socialTt?: string | null;
  socialYt?: string | null;
}

/**
 * Update contestant fields the contestant is allowed to edit themselves.
 *
 * Explicitly excluded: full_name (on `users`, separate update path), email
 * (auth-sensitive), DOB / age (eligibility-sensitive), category (changing it
 * mid-season requires admin sign-off), the three consent timestamps (audit-
 * sensitive — once recorded they stay).
 */
export async function updateContestantSelf(
  contestantId: string,
  input: UpdateContestantInput
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];

  function addNullable<K extends keyof UpdateContestantInput>(
    column: string,
    key: K
  ) {
    if (input[key] === undefined) return;
    sets.push(`${column} = ?`);
    params.push(input[key] ?? null);
  }
  function addRequired<K extends keyof UpdateContestantInput>(
    column: string,
    key: K
  ) {
    if (input[key] === undefined) return;
    sets.push(`${column} = ?`);
    params.push(input[key]);
  }

  addNullable("stage_name", "stageName");
  addRequired("phone", "phone");
  addRequired("city", "city");
  addRequired("country", "country");
  addRequired("bio", "bio");
  addRequired("experience", "experience");
  addNullable("social_ig", "socialIg");
  addNullable("social_tt", "socialTt");
  addNullable("social_yt", "socialYt");

  if (sets.length === 0) return;

  params.push(contestantId);
  await exec(
    `UPDATE contestants SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
}
