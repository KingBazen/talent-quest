// Client-safe DTO type mirrors. Keep in sync with src/lib/dto.ts.
// (Server-only db.ts pulls in better-sqlite3, which can't be bundled into
// client components — so the server module is split from these client types.)

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
  city: string;
  category: TalentCategoryId;
  experience: string;
  bio: string;
  status: ContestantStatus;
  createdAt: string;
  progress: { key: string; label: string; done: boolean; date?: string }[];
}

export interface PublicContestantDTO {
  id: string;
  fullName: string;
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
  status: "pending" | "approved" | "rejected" | "flagged";
  notes: string | null;
  createdAt: string;
}
