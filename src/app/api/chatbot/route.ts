import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { answer } from "@/data/chatbot";
import { isAmharic } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  query: z.string().min(1).max(1000),
  lang: z.enum(["en", "am"]).optional(),
});

export const POST = route(async (req: Request) => {
  const { query, lang } = await parseJson(req, Body);
  const useAm = lang === "am" || isAmharic(query);
  const reply = answer(query, useAm ? "am" : "en");

  // If an Anthropic key is configured, fall through to a real LLM call.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const llm = await callAnthropic(query, useAm ? "am" : "en");
      return ok({
        text: llm,
        matched: useAm ? "ኤልኤም መልስ" : "LLM answer",
        source: "anthropic",
      });
    } catch (e) {
      console.error("[chatbot] LLM fallback failed, using static matcher:", e);
    }
  }

  return ok({
    text: reply.text,
    matched: reply.matched,
    source: "static",
  });
});

async function callAnthropic(query: string, lang: "en" | "am"): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system:
        lang === "am"
          ? "You are Stage Bot for The Bling Records Show, the Bling Records × Neo Studios music competition in Ethiopia. Answer in Amharic. Be concise (under 80 words). Topics: registration, audition video submission, referee scoring, payment (Telebirr / AdmasPay), schedule. If unsure, say so."
          : "You are Stage Bot for The Bling Records Show, the Bling Records × Neo Studios music competition in Ethiopia. Answer in English. Be concise (under 80 words). Topics: registration, audition video submission, referee scoring, payment (Telebirr / AdmasPay), schedule. If unsure, say so.",
      messages: [{ role: "user", content: query }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n");
  return text || "(no response)";
}
