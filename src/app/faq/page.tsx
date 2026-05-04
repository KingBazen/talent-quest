"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Sparkles, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ENTRIES } from "@/data/faq";
import { cn } from "@/lib/utils";

type Lang = "en" | "am";

export default function FaqPage() {
  const [q, setQ] = React.useState("");
  const [lang, setLang] = React.useState<Lang>("en");

  const filtered = FAQ_ENTRIES.filter((e) => {
    if (!q.trim()) return true;
    const hay = [e.q, e.a, e.qAm, e.aAm, ...(e.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <Badge variant="outline" className="mb-3">
        FAQ · Stage Bot
      </Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Got questions? <span className="gradient-text">Same.</span>
      </h1>
      <p className="mt-3 text-muted-foreground text-lg">
        Search the FAQ in English or አማርኛ, or open Stage Bot at the bottom-right
        of your screen for a conversational version.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              lang === "am"
                ? "ለመፈለግ ቁልፍ ቃላት ይጻፉ..."
                : "Search registration, video, scoring..."
            }
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-full border border-border bg-background p-1 text-sm">
          <button
            onClick={() => setLang("en")}
            className={cn(
              "rounded-full px-3 py-1.5",
              lang === "en"
                ? "bg-gradient-to-r from-brand-500 to-fuchsia-500 text-white"
                : "text-muted-foreground"
            )}
          >
            English
          </button>
          <button
            onClick={() => setLang("am")}
            className={cn(
              "rounded-full px-3 py-1.5",
              lang === "am"
                ? "bg-gradient-to-r from-brand-500 to-fuchsia-500 text-white"
                : "text-muted-foreground"
            )}
          >
            አማርኛ
          </button>
        </div>
      </div>

      <Accordion type="single" collapsible className="mt-8 rounded-2xl border border-border/60 bg-card px-4">
        {filtered.map((e, i) => (
          <AccordionItem key={i} value={`q-${i}`}>
            <AccordionTrigger className="text-left">
              {lang === "am" && e.qAm ? e.qAm : e.q}
            </AccordionTrigger>
            <AccordionContent>
              {lang === "am" && e.aAm ? e.aAm : e.a}
            </AccordionContent>
          </AccordionItem>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No matches. Try a different keyword or open Stage Bot.
          </p>
        )}
      </Accordion>

      <div className="mt-10 rounded-2xl border border-border/60 bg-gradient-to-br from-brand-500/5 via-fuchsia-500/5 to-cyan-500/5 p-6">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-bold">Talk to Stage Bot</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Open the chat in the bottom-right corner. Phase 1 uses a
              keyword-matched static knowledge base. Phase 2 ships an LLM-backed
              multilingual assistant with retrieval over rules, contestants, and
              schedule.
            </p>
            <div className="mt-3 flex gap-2 text-xs">
              <Badge variant="outline">
                <Globe className="h-3 w-3 mr-1" /> EN + አማርኛ
              </Badge>
              <Badge variant="secondary">Demo · static knowledge</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-border/60 bg-card p-6 text-center">
        <h3 className="font-display text-xl font-bold">Still stuck?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Send us a note via the contact page — humans answer within 48 hours.
        </p>
        <Button asChild variant="gradient" className="mt-3">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
