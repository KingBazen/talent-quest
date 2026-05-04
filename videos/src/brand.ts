// Brand tokens mirrored from /workspaces/talent-quest/tailwind.config.ts.
// Keep these in sync if the app's brand palette changes.

export const BRAND = {
  pink: "#ff2773",
  pinkDeep: "#f00056",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  gold: "#eab308",
  bg: "#0a0a0a",
  fg: "#ffffff",
  muted: "#a1a1aa",
};

export const STAGE_GRADIENT = `linear-gradient(135deg, ${BRAND.pink} 0%, ${BRAND.violet} 50%, ${BRAND.cyan} 100%)`;

export const COPY = {
  badge: "LIVE · SEASON 1",
  headline1: "Ethiopia's stage for the",
  headline2: "next big talent.",
  sub: "Sing. Dance. Act. Wow us.",
  categories: ["Singing", "Dancing", "Acting", "Comedy", "Instruments", "One-of-a-kind"],
  stats: [
    { num: "6", label: "Categories" },
    { num: "6", label: "Cities" },
    { num: "100K", label: "ETB prize" },
    { num: "2.4K+", label: "Registered" },
  ],
  cta: "Register now",
  url: "talentquest.example.com",
};

export const FONT_DISPLAY =
  '"Space Grotesk", "Helvetica Neue", system-ui, -apple-system, sans-serif';
export const FONT_BODY =
  'Inter, "Helvetica Neue", system-ui, -apple-system, sans-serif';
