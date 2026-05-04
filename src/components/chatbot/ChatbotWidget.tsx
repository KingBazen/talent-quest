"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  answer,
  CHAT_GREETING_AM,
  CHAT_GREETING_EN,
  ChatLang,
  ChatTurn,
  quickReplies,
} from "@/data/chatbot";
import { cn, isAmharic } from "@/lib/utils";

export function ChatbotWidget() {
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState<ChatLang>("en");
  const [input, setInput] = React.useState("");
  const [turns, setTurns] = React.useState<ChatTurn[]>([
    { role: "bot", lang: "en", text: CHAT_GREETING_EN },
  ]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, open]);

  function send(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const useAm = lang === "am" || isAmharic(trimmed);
    const userTurn: ChatTurn = {
      role: "user",
      lang: useAm ? "am" : "en",
      text: trimmed,
    };
    const reply = answer(trimmed, useAm ? "am" : "en");
    const botTurn: ChatTurn = {
      role: "bot",
      lang: useAm ? "am" : "en",
      text: reply.text,
      matched: reply.matched,
    };
    setTurns((t) => [...t, userTurn, botTurn]);
    setInput("");
  }

  function switchLang(next: ChatLang) {
    if (next === lang) return;
    setLang(next);
    setTurns((t) => [
      ...t,
      {
        role: "bot",
        lang: next,
        text: next === "am" ? CHAT_GREETING_AM : CHAT_GREETING_EN,
      },
    ]);
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            >
              <div className="bg-gradient-to-r from-brand-500 via-fuchsia-500 to-cyan-400 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold leading-tight text-sm">Stage Bot</p>
                      <p className="text-[11px] opacity-80">
                        Demo · English / አማርኛ
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close chat"
                    className="rounded-full p-1 hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-white/20 p-0.5 text-xs">
                  <button
                    onClick={() => switchLang("en")}
                    className={cn(
                      "rounded-full px-3 py-1 transition",
                      lang === "en" ? "bg-white text-brand-700" : "text-white/90"
                    )}
                  >
                    English
                  </button>
                  <button
                    onClick={() => switchLang("am")}
                    className={cn(
                      "rounded-full px-3 py-1 transition",
                      lang === "am" ? "bg-white text-brand-700" : "text-white/90"
                    )}
                  >
                    አማርኛ
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="h-80 space-y-3 overflow-y-auto p-4"
              >
                {turns.map((t, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
                      t.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {t.role === "bot" && t.matched && (
                      <p className="mb-1 text-[11px] font-semibold opacity-70">
                        {t.matched}
                      </p>
                    )}
                    {t.text}
                  </div>
                ))}
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {quickReplies(lang).map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 border-t border-border p-2"
              >
                <Globe className="h-4 w-4 text-muted-foreground" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    lang === "am" ? "ጥያቄዎን ይጻፉ..." : "Type your question..."
                  }
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
                <Button type="submit" size="icon" variant="default" aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="border-t border-border/60 px-3 py-1.5 text-center text-[10px] text-muted-foreground">
                Demo chatbot. Phase 2 will use a multilingual LLM with RAG over
                official rules and event data.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end">
          <Button
            onClick={() => setOpen((v) => !v)}
            variant="gradient"
            size="lg"
            className="rounded-full shadow-2xl"
            aria-label="Open chat"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline ml-2">Ask Stage Bot</span>
            <Badge variant="gold" className="ml-2 hidden sm:inline-flex">
              Demo
            </Badge>
          </Button>
        </div>
      </div>
    </>
  );
}
