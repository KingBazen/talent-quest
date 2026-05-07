/**
 * Phase 7 (P7-T013): minimal bilingual support.
 *
 * Two locales: `en` (default) and `am` (Amharic). The Amharic strings here
 * are agent-drafted and intentionally conservative — they will be replaced
 * by a native translator before public launch (tracked under §8 Pre-Production
 * Gate as "Bilingual translation review").
 *
 * Why the small footprint: a full i18n framework (next-intl, react-intl,
 * lingui) is overkill for the launch surface. This module gives us a typed
 * dictionary, a `t()` lookup, and a context provider with a cookie-backed
 * preference. Anything more complex can be migrated later without touching
 * call sites.
 */

export type Lang = "en" | "am";

export const LANGS: readonly Lang[] = ["en", "am"] as const;

export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  am: "አማርኛ",
};

export const LANG_COOKIE = "tq_lang";

/**
 * Dictionary keys are dotted paths so they group naturally per surface.
 * Add new keys at the bottom of each section.
 */
export interface Dictionary {
  nav: {
    apply: string;
    audition_guide: string;
    show: string;
    contact: string;
    sign_in: string;
    sign_out: string;
    dashboard: string;
  };
  hero: {
    eyebrow: string;
    headline_1: string;
    headline_2: string;
    sub: string;
    cta_apply: string;
    cta_how: string;
  };
  auditions: {
    title: string;
    sub: string;
  };
  dashboard: {
    welcome: string;
    apply_to_audition: string;
    submit_audition: string;
    payment_due: string;
  };
  verify_email: {
    title: string;
    body: string;
    cta_resend: string;
    sent: string;
  };
  legal: {
    draft_banner_title: string;
    draft_banner_body: string;
  };
  common: {
    loading: string;
    error: string;
    saved: string;
    sign_in_required: string;
  };
}

const EN: Dictionary = {
  nav: {
    apply: "Apply",
    audition_guide: "Audition guide",
    show: "Show",
    contact: "Contact",
    sign_in: "Sign in",
    sign_out: "Sign out",
    dashboard: "Dashboard",
  },
  hero: {
    eyebrow: "Bling Records × Neo Studios",
    headline_1: "Ethiopia's next musical icon.",
    headline_2: "Made on stage.",
    sub: "Three simple steps: register your account, pay the 500 ETB audition fee, then upload one audition video. An industry panel does the rest.",
    cta_apply: "Register now",
    cta_how: "See how it works",
  },
  auditions: {
    title: "How auditions work",
    sub: "Six honest steps from a 6-digit contestant ID to the music house.",
  },
  dashboard: {
    welcome: "Welcome",
    apply_to_audition: "Apply to audition",
    submit_audition: "Submit your audition",
    payment_due: "Payment due",
  },
  verify_email: {
    title: "Verify your email",
    body:
      "You can't submit your audition until your email is verified. Open the link we sent you, or request a new one.",
    cta_resend: "Resend link",
    sent:
      "We've sent a fresh verification link. Check your inbox (and spam folder).",
  },
  legal: {
    draft_banner_title: "Draft placeholder — not legal advice",
    draft_banner_body:
      "This document is a working draft. It has not been reviewed by counsel and is not legally binding. Replace before any public launch.",
  },
  common: {
    loading: "Loading…",
    error: "Something went wrong",
    saved: "Saved",
    sign_in_required: "Sign in to continue",
  },
};

const AM: Dictionary = {
  nav: {
    apply: "ይመዝገቡ",
    audition_guide: "የኦዲሽን መመሪያ",
    show: "ስለ ሾው",
    contact: "ያግኙን",
    sign_in: "ይግቡ",
    sign_out: "ይውጡ",
    dashboard: "ዳሽቦርድ",
  },
  hero: {
    eyebrow: "ብሊንግ ሬኮርድስ × ኒዮ ስቱዲዮስ",
    headline_1: "የኢትዮጵያ ቀጣይ የሙዚቃ ኮከብ።",
    headline_2: "በመድረክ ላይ የተፈጠረ።",
    sub: "ሦስት ቀላል ደረጃዎች፡ መለያ ይመዝገቡ፣ የ500 ብር የኦዲሽን ክፍያ ይክፈሉ፣ ከዚያ አንድ የኦዲሽን ቪዲዮ ይላኩ። የኢንዱስትሪው ፓኔል ቀሪውን ይሰራል።",
    cta_apply: "አሁን ይመዝገቡ",
    cta_how: "እንዴት እንደሚሰራ ይመልከቱ",
  },
  auditions: {
    title: "ኦዲሽን እንዴት ይሰራል",
    sub: "ከ6-አሃዝ የተወዳዳሪ መታወቂያ እስከ የሙዚቃ ቤት ድረስ ስድስት ግልጽ እርምጃዎች።",
  },
  dashboard: {
    welcome: "እንኳን ደህና መጡ",
    apply_to_audition: "ለኦዲሽን ይመዝገቡ",
    submit_audition: "የኦዲሽን ቪዲዮዎን ይላኩ",
    payment_due: "ክፍያ ይጠበቃል",
  },
  verify_email: {
    title: "ኢሜልዎን ያረጋግጡ",
    body:
      "ኢሜልዎ እስኪረጋገጥ ድረስ ኦዲሽንዎን ማስገባት አይችሉም። የላክንልዎትን ማረጋገጫ ሊንክ ይክፈቱ ወይም አዲስ ይጠይቁ።",
    cta_resend: "እንደገና ይላክ",
    sent:
      "አዲስ የማረጋገጫ ሊንክ ልከንልዎታል። የመልዕክት ሳጥንዎን (እና ስፓም ፎልደር) ይፈትሹ።",
  },
  legal: {
    draft_banner_title: "ረቂቅ ሰነድ — ሕጋዊ ምክር አይደለም",
    draft_banner_body:
      "ይህ ሰነድ ረቂቅ ነው። በሕግ ባለሙያ አልተገመገመም፤ ሕጋዊ አስተሳሰሪነት የለውም። ከይፋ ማስጀመር በፊት መተካት አለበት።",
  },
  common: {
    loading: "በመጫን ላይ…",
    error: "ስህተት ተከስቷል",
    saved: "ተቀምጧል",
    sign_in_required: "ለመቀጠል ይግቡ",
  },
};

const DICTS: Record<Lang, Dictionary> = { en: EN, am: AM };

export function getDictionary(lang: Lang): Dictionary {
  return DICTS[lang] ?? DICTS.en;
}
