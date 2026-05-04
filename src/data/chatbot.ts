// Phase 1 chatbot is rule-based and runs entirely in the browser.
// Phase 2 will replace this with an LLM-backed RAG service (English + Amharic).

import { FAQ_ENTRIES } from "./faq";
import type { FaqEntry } from "@/types";

export type ChatLang = "en" | "am";

export interface ChatTurn {
  role: "user" | "bot";
  text: string;
  lang: ChatLang;
  matched?: string;
}

const QUICK_REPLIES_EN = [
  "How do I register?",
  "What categories are there?",
  "How long should my video be?",
  "When are results announced?",
  "Is registration free?",
  "How do judges score me?",
];

const QUICK_REPLIES_AM = [
  "እንዴት እመዘገባለሁ?",
  "ምን ምን ምድቦች አሉ?",
  "ቪዲዮዬ ምን ያህል ርዝመት መሆን አለበት?",
  "ውጤት መቼ ይወጣል?",
  "መመዝገብ ነፃ ነው?",
  "ዳኞች እንዴት ይገመግማሉ?",
];

export function quickReplies(lang: ChatLang): string[] {
  return lang === "am" ? QUICK_REPLIES_AM : QUICK_REPLIES_EN;
}

function score(query: string, entry: FaqEntry, lang: ChatLang): number {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return 0;

  const haystacks = [
    entry.q,
    entry.a,
    entry.qAm ?? "",
    entry.aAm ?? "",
    (entry.tags ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let s = 0;
  for (const t of tokens) {
    if (haystacks.includes(t)) s += 1;
    if ((entry.tags ?? []).some((tag) => tag.toLowerCase() === t)) s += 2;
  }

  // Direct script preference: if user typed Amharic, prefer entries with Amharic content.
  if (lang === "am" && entry.qAm) s += 0.5;
  return s;
}

export function answer(query: string, lang: ChatLang): {
  text: string;
  matched?: string;
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      text:
        lang === "am"
          ? "እባክዎ ጥያቄዎን ይጻፉ።"
          : "Please type your question — I'm here to help.",
    };
  }

  const ranked = FAQ_ENTRIES
    .map((e) => ({ entry: e, s: score(trimmed, e, lang) }))
    .sort((a, b) => b.s - a.s);

  const top = ranked[0];
  if (!top || top.s === 0) {
    return {
      text:
        lang === "am"
          ? "ይቅርታ፤ ይህን አልገባኝም። የእኛን FAQ ይመልከቱ ወይም ስለ ምዝገባ፣ ምድቦች፣ ቪዲዮ፣ ዳኝነት ወይም ውጤቶች ይጠይቁኝ።"
          : "I don't know that one yet — try asking about registration, categories, video, judging, or results, or check the FAQ list.",
    };
  }

  const e = top.entry;
  const useAm = lang === "am" && e.aAm;
  return {
    text: useAm ? (e.aAm as string) : e.a,
    matched: useAm ? e.qAm : e.q,
  };
}

export const CHAT_GREETING_EN =
  "Hi! I'm Stage Bot. Ask me about registration, categories, video tips, scoring, or results.";
export const CHAT_GREETING_AM =
  "ሰላም! የስቴጅ ቦት ነኝ። ስለ ምዝገባ፣ ምድቦች፣ ቪዲዮ፣ ግምገማ ወይም ውጤት ሊጠይቁኝ ይችላሉ።";
