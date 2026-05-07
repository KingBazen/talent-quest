// Client-safe DTO type mirrors. Keep in sync with src/lib/dto.ts.
// (Server-only db.ts pulls in @neondatabase/serverless and ws, which can't
// be bundled into client components — so the server module is split from
// these client types.)

import type { TalentCategoryId } from "@/types";

export type ContestantStatus =
  | "registered"
  | "submitted"
  | "shortlisted"
  | "advanced"
  | "eliminated";

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
  status: ContestantStatus;
  createdAt: string;
  withdrawnAt: string | null;
  progress: { key: string; label: string; done: boolean; date?: string }[];
}

export interface PublicContestantDTO {
  id: string;
  /** Anonymized: stage name when set, otherwise initials (e.g., "H.T."). */
  displayName: string;
  stageName: string | null;
  city: string;
  category: TalentCategoryId;
  status: ContestantStatus;
  progress: { key: string; label: string; done: boolean; date?: string }[];
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
  status: "pending" | "approved" | "rejected" | "flagged" | "superseded";
  notes: string | null;
  createdAt: string;
}
