export interface JudgingCriterion {
  key: string;
  label: string;
  weight: number; // out of 100
  description: string;
}

export const JUDGING_CRITERIA: JudgingCriterion[] = [
  {
    key: "talent",
    label: "Talent & Skill",
    weight: 25,
    description:
      "Technical proficiency, control, and command of the chosen craft.",
  },
  {
    key: "originality",
    label: "Originality",
    weight: 25,
    description:
      "How fresh, surprising, or distinctly *yours* the performance feels.",
  },
  {
    key: "stagePresence",
    label: "Stage Presence",
    weight: 20,
    description:
      "Confidence, charisma, and how the performer fills the frame.",
  },
  {
    key: "production",
    label: "Production Quality",
    weight: 15,
    description:
      "Clarity of audio, lighting, framing, and overall video craft.",
  },
  {
    key: "connection",
    label: "Audience Connection",
    weight: 15,
    description:
      "Emotional pull and ability to make the audience feel something.",
  },
];

export const SCHEDULE = [
  { date: "2026-06-01", label: "Registration opens" },
  { date: "2026-07-15", label: "Video submissions close" },
  { date: "2026-08-05", label: "Shortlist published" },
  { date: "2026-08-20", label: "City qualifiers — Addis, Bahir Dar, Hawassa" },
  { date: "2026-09-05", label: "City qualifiers — Mekelle, Dire Dawa, Adama" },
  { date: "2026-09-25", label: "National semi-final" },
  { date: "2026-10-12", label: "Live grand final" },
];
