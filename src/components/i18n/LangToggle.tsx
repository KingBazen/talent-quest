"use client";

import { Globe } from "lucide-react";
import { useLang } from "./LangProvider";
import { LANG_LABEL, LANGS, type Lang } from "@/lib/i18n";

/**
 * Small EN / አማ toggle for the navbar. Click flips the language; the choice
 * is persisted in a cookie (1y, lax) so it survives reloads.
 */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next: Lang = lang === "en" ? "am" : "en";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={`Switch to ${LANG_LABEL[next]}`}
      title={`Switch to ${LANG_LABEL[next]}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted ${className}`}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{LANGS.map((l) => (l === lang ? l.toUpperCase() : l)).join(" / ")}</span>
    </button>
  );
}
