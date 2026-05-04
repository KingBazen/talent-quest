import type { TalentCategory } from "@/types";

export const TALENT_CATEGORIES: TalentCategory[] = [
  {
    id: "singing",
    name: "Singing",
    amharicName: "ዘፈን",
    emoji: "🎤",
    description:
      "Solo vocalists, choirs, a cappella groups, original songwriters, and cover artists across any language or genre.",
    examples: ["Pop", "R&B", "Traditional Ethiopian", "Gospel", "Rap & Hip-Hop", "Opera"],
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "dancing",
    name: "Dancing",
    amharicName: "ጭፈራ",
    emoji: "💃",
    description:
      "Solo dancers, duets, and choreographed crews — modern, traditional, street, contemporary, or fusion.",
    examples: ["Eskista", "Hip-Hop", "Contemporary", "Ballet", "Afrobeat", "Crew choreography"],
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "acting",
    name: "Acting",
    amharicName: "ትወና",
    emoji: "🎭",
    description:
      "Monologue, scene work, character pieces, sketch comedy, and theatrical storytelling on camera.",
    examples: ["Monologue", "Scene partner", "Drama", "Theatre", "Improv"],
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "comedy",
    name: "Comedy",
    amharicName: "ኮሜዲ",
    emoji: "🤣",
    description:
      "Stand-up, sketch, observational, character, prop, and improv — make the judges (and Ethiopia) laugh.",
    examples: ["Stand-up", "Sketch", "Character work", "Improv", "Observational"],
    color: "from-yellow-400 to-amber-600",
  },
  {
    id: "instruments",
    name: "Instruments",
    amharicName: "የሙዚቃ መሣሪያ",
    emoji: "🎹",
    description:
      "Soloists and bands. Acoustic, electric, traditional, orchestral — show us your craft and your sound.",
    examples: ["Krar", "Masenqo", "Piano", "Guitar", "Drums", "Saxophone", "Full band"],
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: "other",
    name: "Other Talents",
    amharicName: "ሌሎች ችሎታዎች",
    emoji: "✨",
    description:
      "Magic, juggling, beatboxing, spoken word, illusion, acrobatics, mentalism — anything that wows a live crowd.",
    examples: ["Magic", "Beatbox", "Acrobatics", "Spoken word", "Mentalism", "Variety acts"],
    color: "from-emerald-500 to-teal-600",
  },
];
