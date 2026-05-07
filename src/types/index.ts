export type TalentCategoryId =
  | "rap"
  | "singing"
  | "songwriter"
  | "performance"
  | "instruments"
  | "other";

export interface TalentCategory {
  id: TalentCategoryId;
  name: string;
  amharicName: string;
  emoji: string;
  description: string;
  examples: string[];
  color: string; // tailwind gradient stops
}

export interface DemoContestant {
  id: string; // up to 6 numeric digits, demo only
  fullName: string;
  stageName?: string;
  email: string;
  phone: string;
  age: number;
  city: string;
  category: TalentCategoryId;
  experience: string;
  bio: string;
  agreedToTerms: boolean;
  createdAt: string;
  status: "registered" | "submitted" | "shortlisted" | "advanced" | "eliminated";
  progress: ProgressStep[];
}

export interface ProgressStep {
  key:
    | "registered"
    | "video_submitted"
    | "review"
    | "shortlisted"
    | "audition"
    | "result";
  label: string;
  done: boolean;
  date?: string;
}

export interface DemoSubmission {
  id: string;
  contestantId: string;
  videoTitle: string;
  category: TalentCategoryId;
  videoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface FaqEntry {
  q: string;
  a: string;
  qAm?: string;
  aAm?: string;
  tags?: string[];
}

export interface ShowcaseClip {
  id: string;
  title: string;
  contestant: string;
  category: TalentCategoryId;
  city: string;
  thumbnail: string;
  videoUrl?: string;
  durationSec: number;
}
