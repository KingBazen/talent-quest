"use client";

import * as React from "react";
import {
  getDictionary,
  LANG_COOKIE,
  LANGS,
  type Dictionary,
  type Lang,
} from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dictionary;
}

const LangContext = React.createContext<LangContextValue | null>(null);

function readCookieLang(): Lang | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]+)`)
  );
  if (!m) return null;
  const v = decodeURIComponent(m[1]) as Lang;
  return LANGS.includes(v) ? v : null;
}

function writeCookieLang(lang: Lang): void {
  if (typeof document === "undefined") return;
  // 1 year, lax — preference, not a security cookie.
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${oneYear}; samesite=lax`;
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("en");

  React.useEffect(() => {
    const fromCookie = readCookieLang();
    if (fromCookie) setLangState(fromCookie);
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    writeCookieLang(l);
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  const value = React.useMemo<LangContextValue>(
    () => ({ lang, setLang, t: getDictionary(lang) }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = React.useContext(LangContext);
  if (!ctx) {
    // Default to EN if used outside the provider — keeps server-rendered
    // pages renderable without a provider wrapper.
    return { lang: "en", setLang: () => {}, t: getDictionary("en") };
  }
  return ctx;
}
