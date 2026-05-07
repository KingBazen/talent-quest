import type { ContestantStatus } from "./dto-types";

/**
 * Map raw DB status → public-facing label, supporting copy, and a single
 * actionable next step.
 *
 * The label and `nextStep` strings are user-facing — keep them honest.
 * Translations are added under `am` for bilingual surfaces.
 */

export interface StatusCopy {
  label: string;
  description: string;
  nextStep: string;
  badge: "secondary" | "outline" | "gradient" | "default";
}

const EN: Record<ContestantStatus, StatusCopy> = {
  registered: {
    label: "Application received",
    description:
      "Your contestant ID is reserved. Submit your audition video to move into review.",
    nextStep: "Submit your audition video",
    badge: "outline",
  },
  submitted: {
    label: "Audition under review",
    description:
      "Your video is in the queue. Industry referees score on a 100-point rubric — the aggregate appears here once at least three weigh in.",
    nextStep: "Hang tight — judges are reviewing",
    badge: "secondary",
  },
  shortlisted: {
    label: "Shortlisted",
    description:
      "Congrats — you cleared the first scoring round. Watch your inbox for the next-round details.",
    nextStep: "Confirm your spot in the next round",
    badge: "gradient",
  },
  advanced: {
    label: "Advanced",
    description:
      "You're through to the next round of the competition. Strong work.",
    nextStep: "Prepare for the next-round brief",
    badge: "gradient",
  },
  eliminated: {
    label: "Not selected this round",
    description:
      "This audition didn't make it through. Thank you for sharing your work — the door isn't closed; future seasons are coming.",
    nextStep: "Stay subscribed — future seasons open later",
    badge: "secondary",
  },
};

const AM: Record<ContestantStatus, StatusCopy> = {
  registered: {
    label: "ማመልከቻ ተቀብለናል",
    description:
      "የተወዳዳሪ መለያዎ ተመዝግቧል። ቪዲዮ አስገቡና ግምገማ ይጀመር።",
    nextStep: "የመጠቆሚያ ቪዲዮዎን ያስገቡ",
    badge: "outline",
  },
  submitted: {
    label: "ግምገማ ላይ",
    description:
      "ቪዲዮዎ ሰልፍ ላይ ነው። ሦስት ዳኞች ካገመገሙ በኋላ ውጤቱ እዚህ ይታያል።",
    nextStep: "ዳኞች እያገመገሙ ናቸው",
    badge: "secondary",
  },
  shortlisted: {
    label: "የተመረጡ ዝርዝር ላይ",
    description:
      "እንኳን ደስ አለዎ — የመጀመሪያውን ዙር አለፉ። ለቀጣዩ ዙር መልዕክት ይጠብቁ።",
    nextStep: "ለቀጣዩ ዙር ቦታዎን ያረጋግጡ",
    badge: "gradient",
  },
  advanced: {
    label: "ቀጣዩ ዙር ገብተዋል",
    description: "ቀጣዩ ዙር ላይ ናቸው። ጥሩ ሥራ።",
    nextStep: "ለቀጣዩ ዙር መመሪያ ይጠብቁ",
    badge: "gradient",
  },
  eliminated: {
    label: "በዚህ ዙር አልተመረጡም",
    description:
      "ይህ መጠቆሚያ አላለፈም። ለመጪ ሲዝን በሮችን ክፍት ናቸው።",
    nextStep: "ለመጪ ሲዝን ይጠብቁ",
    badge: "secondary",
  },
};

export function statusCopy(
  status: ContestantStatus,
  lang: "en" | "am" = "en"
): StatusCopy {
  return (lang === "am" ? AM : EN)[status];
}
