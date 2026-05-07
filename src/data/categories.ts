import type { TalentCategory } from "@/types";

export const TALENT_CATEGORIES: TalentCategory[] = [
  {
    id: "rap",
    name: "Rap",
    amharicName: "ራፕ",
    emoji: "🎤",
    description:
      "Solo MCs, hip-hop crews, conscious rap, drill, freestyle — original delivery, signature flow, distinct voice.",
    examples: ["Solo MC", "Crew", "Conscious", "Freestyle", "Drill"],
    color: "from-brand-300 to-brand-600",
  },
  {
    id: "singing",
    name: "Singing",
    amharicName: "ዘፈን",
    emoji: "🎙️",
    description:
      "Solo vocalists, duets, a cappella — Tezeta, gospel, R&B, pop, traditional Ethiopian or anything in between.",
    examples: ["Pop", "R&B", "Traditional Ethiopian", "Gospel", "A cappella"],
    color: "from-brand-400 to-brand-700",
  },
  {
    id: "songwriter",
    name: "Songwriter",
    amharicName: "የዘፈን ጸሐፊ",
    emoji: "🎼",
    description:
      "Original-song writers — lyrics, melody, or both. Acoustic guitar in your bedroom or a finished studio cut, originality is the bar.",
    examples: [
      "Lyrics + melody",
      "Acoustic demo",
      "Co-write",
      "Studio cut",
    ],
    color: "from-brand-500 to-brand-800",
  },
  {
    id: "performance",
    name: "Performance",
    amharicName: "ትዕይንት",
    emoji: "💃",
    description:
      "Dancers, choreographed crews, music-led movement — modern, traditional, street, fusion, solo or group.",
    examples: [
      "Eskista",
      "Hip-Hop",
      "Contemporary",
      "Crew choreography",
      "Afrobeat",
    ],
    color: "from-brand-200 to-brand-500",
  },
  {
    id: "instruments",
    name: "Instruments",
    amharicName: "የሙዚቃ መሣሪያ",
    emoji: "🎹",
    description:
      "Instrumentalists and bands. Acoustic, electric, traditional, orchestral — show your craft and your sound.",
    examples: ["Krar", "Masenqo", "Piano", "Guitar", "Drums", "Saxophone", "Full band"],
    color: "from-brand-600 to-brand-900",
  },
  {
    id: "other",
    name: "Other",
    amharicName: "ሌሎች",
    emoji: "✨",
    description:
      "Music-adjacent acts that don't fit the other categories — beatboxing, looping, music production, sound design, spoken-word with a beat.",
    examples: ["Beatbox", "Looping", "Producer", "Spoken word", "DJ"],
    color: "from-brand-400 to-brand-800",
  },
];
