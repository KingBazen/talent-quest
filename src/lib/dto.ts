import {
  type ContestantRow,
  type ProgressStepRow,
  type SubmissionRow,
  type UserRow,
  queryOne,
} from "./db";
import type { TalentCategoryId } from "@/types";

/** Private contestant shape returned to the contestant themselves and to
 *  admins. Includes PII not safe for the public lookup endpoint. */
export interface ContestantDTO {
  id: string;
  fullName: string;
  stageName: string | null;
  email: string;
  phone: string;
  age: number;
  dob: string | null;
  city: string;
  country: string;
  category: TalentCategoryId;
  experience: string;
  bio: string;
  socialIg: string | null;
  socialTt: string | null;
  socialYt: string | null;
  status: ContestantRow["status"];
  createdAt: string;
  withdrawnAt: string | null;
  progress: { key: string; label: string; done: boolean; date?: string }[];
}

/** Trimmed, public-safe variant for /api/contestants/[id] (no PII).
 *  `displayName` is anonymized: stage name when set, otherwise initials only.
 *  Full name, email, phone, and DOB are never returned by the public lookup
 *  — those live on the logged-in `/api/auth/me` endpoint. */
export interface PublicContestantDTO {
  id: string;
  displayName: string;
  stageName: string | null;
  city: string;
  category: TalentCategoryId;
  status: ContestantRow["status"];
  progress: { key: string; label: string; done: boolean; date?: string }[];
}

/** Two-letter initials from a full name, e.g. "Hanna Tesfaye" → "H.T.". */
function initialsFromName(fullName: string): string {
  const parts = fullName
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "—";
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
  return letters.filter(Boolean).join(".") + ".";
}

export function progressFromRows(rows: ProgressStepRow[]) {
  return rows.map((r) => ({
    key: r.step_key,
    label: r.label,
    done: r.done === 1,
    date: r.done_at ?? undefined,
  }));
}

export function contestantToDTO(
  contestant: ContestantRow,
  user: UserRow,
  progress: ProgressStepRow[]
): ContestantDTO {
  return {
    id: contestant.id,
    fullName: user.full_name,
    stageName: contestant.stage_name,
    email: user.email,
    phone: contestant.phone,
    age: contestant.age,
    dob: contestant.dob,
    city: contestant.city,
    country: contestant.country,
    category: contestant.category as TalentCategoryId,
    experience: contestant.experience,
    bio: contestant.bio,
    socialIg: contestant.social_ig,
    socialTt: contestant.social_tt,
    socialYt: contestant.social_yt,
    status: contestant.status,
    createdAt: contestant.created_at,
    withdrawnAt: contestant.withdrawn_at,
    progress: progressFromRows(progress),
  };
}

export function contestantToPublicDTO(
  contestant: ContestantRow,
  user: UserRow,
  progress: ProgressStepRow[]
): PublicContestantDTO {
  return {
    id: contestant.id,
    // Prefer the stage name (already a public-facing alias). Fall back to
    // initials so an anonymous lookup can never leak a contestant's legal
    // name to anyone with their 6-digit ID.
    displayName: contestant.stage_name || initialsFromName(user.full_name),
    stageName: contestant.stage_name,
    city: contestant.city,
    category: contestant.category as TalentCategoryId,
    status: contestant.status,
    progress: progressFromRows(progress),
  };
}

export interface SubmissionDTO {
  id: string;
  contestantId: string;
  title: string;
  category: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  format: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  supersedesId: string | null;
  status: SubmissionRow["status"];
  notes: string | null;
  slot: SubmissionRow["slot"];
  createdAt: string;
}

export function submissionToDTO(s: SubmissionRow): SubmissionDTO {
  return {
    id: s.id,
    contestantId: s.contestant_id,
    title: s.title,
    category: s.category,
    videoUrl: s.video_url,
    thumbnailUrl: s.thumbnail_url,
    durationSec: s.duration_sec,
    format: s.format,
    sizeBytes: s.size_bytes,
    width: s.width,
    height: s.height,
    supersedesId: s.supersedes_id,
    status: s.status,
    notes: s.notes,
    slot: s.slot,
    createdAt: s.created_at,
  };
}

export async function userById(id: string): Promise<UserRow | undefined> {
  return queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}
