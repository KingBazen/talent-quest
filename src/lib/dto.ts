import {
  type ContestantRow,
  type ProgressStepRow,
  type SubmissionRow,
  type UserRow,
  queryOne,
} from "./db";
import type { TalentCategoryId } from "@/types";

/** Public-facing contestant shape (stable across the API). */
export interface ContestantDTO {
  id: string;
  fullName: string;
  stageName: string | null;
  email: string;
  phone: string;
  age: number;
  city: string;
  category: TalentCategoryId;
  experience: string;
  bio: string;
  status: ContestantRow["status"];
  createdAt: string;
  progress: { key: string; label: string; done: boolean; date?: string }[];
}

/** Trimmed, public-safe variant for /api/contestants/[id] (no PII). */
export interface PublicContestantDTO {
  id: string;
  fullName: string;
  stageName: string | null;
  city: string;
  category: TalentCategoryId;
  status: ContestantRow["status"];
  progress: { key: string; label: string; done: boolean; date?: string }[];
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
    city: contestant.city,
    category: contestant.category as TalentCategoryId,
    experience: contestant.experience,
    bio: contestant.bio,
    status: contestant.status,
    createdAt: contestant.created_at,
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
    fullName: user.full_name,
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
  status: SubmissionRow["status"];
  notes: string | null;
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
    status: s.status,
    notes: s.notes,
    createdAt: s.created_at,
  };
}

export async function userById(id: string): Promise<UserRow | undefined> {
  return queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}
