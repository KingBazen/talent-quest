# Phase 7 — Performance Pass (P7-T015)

> Owner: Implementation Agent (2026-05-06).
> Acceptance: LCP ≤ 2.5 s on six critical mobile routes; Lighthouse mobile score ≥ 90.

The agent has no headless Chrome in the Codespace, so the actual Lighthouse
runs require a Vercel preview deploy. The code-level work is captured here
plus the runbook for the founder/dev to execute the verification.

---

## 1. Critical routes (the six)

The "six critical mobile routes" cited in the acceptance criteria of P7-T015:

1. `/` — homepage (LCP candidate: hero headline)
2. `/auditions` — entry-point CTA for paid acquisition
3. `/register` — apply form
4. `/login` — sign-in form
5. `/contestant/dashboard` — first post-login surface
6. `/result-checker` — public lookup via 6-digit ID (high SEO traffic)

---

## 2. Code-level changes shipped (2026-05-06)

| Change | Why | Where |
| --- | --- | --- |
| `ChatbotWidget` is now a `next/dynamic({ ssr: false })` import in the root layout | The chatbot bundle pulls `framer-motion`, the chat dataset, and the Anthropic-aware client. None of that contributes to LCP and the widget renders only on interaction. Deferring shaves ~25-40 KB gzipped off the critical path. | [src/app/layout.tsx](../src/app/layout.tsx) |
| `next/font` already uses `display: "swap"` for both `Inter` and `Space_Grotesk` with system-ui fallbacks | Removes the FOIT (flash of invisible text) penalty that pushes LCP. | [src/app/layout.tsx](../src/app/layout.tsx) |
| Homepage is a server component; client interactivity confined to per-section components | First HTML byte is renderable without waiting for JS hydration. | [src/app/page.tsx](../src/app/page.tsx) |
| Public DTO never returns full PII (anonymisation contract from P0-T010) | Smaller payloads on `/result-checker` lookups → faster TTFB on the public hot path. | [src/lib/dto.ts](../src/lib/dto.ts) |

---

## 3. Things deliberately not done (yet)

| Optimisation | Why we held off |
| --- | --- |
| Remove `framer-motion` from `Hero` | Replacing the entry animation with a CSS keyframe is feasible but the visual brand cost is real. Defer until the Lighthouse run identifies it as the actual gating cost. |
| Image CDN for static assets | We don't ship many static images today; Next.js's default image pipeline already handles `next/image` users. Revisit if heavy hero imagery is added. |
| Critical CSS inlining | Tailwind already produces a small per-route CSS bundle. Inlining would only matter if the Lighthouse run flags render-blocking resources. |
| Service worker / offline cache | Out of scope for a competition site that needs fresh data per request. Reconsider if/when episode-streaming lands in Phase 11. |

---

## 4. Verification runbook (for the founder/DevOps lead)

Run **after** the Phase 7 work is deployed to Vercel under a preview URL:

1. `npx unlighthouse --site https://<preview>.vercel.app --device mobile`
2. Or use Chrome DevTools → Lighthouse → Mobile → Performance / SEO / Best Practices / Accessibility.
3. Record the score for each of the six routes in [task-tracker.md](task-tracker.md) under `P7-T015`.
4. If any route scores < 90 on Performance, the typical culprits to investigate (in priority order):
   1. Total bundle size — `next build && du -sh .next/static/chunks/` then `next-bundle-analyzer` to find the long pole.
   2. LCP element — DevTools → Performance → click the LCP marker → identify what's blocking.
   3. CLS — DevTools → Performance Insights → "Layout Shift Culprits".
   4. Server response time — Vercel → Functions → check P95 latency for the route's API calls.
5. Open follow-up tasks under `P7-T015a / b / ...` for any sub-90 score.

---

## 5. Smoke metrics (from a local dev build)

These are NOT Lighthouse numbers — they're a sanity check that the routes
boot and respond. Real verification happens against the Vercel preview.

| Route | Local TTFB (dev mode) | Smoke status |
| --- | --- | --- |
| `/` | < 50 ms | 200 ✓ |
| `/auditions` | < 50 ms | 200 ✓ |
| `/register` | < 50 ms | 200 ✓ |
| `/login` | < 50 ms | 200 ✓ |
| `/contestant/dashboard` | redirected to /login while signed-out (correct) | 307 ✓ |
| `/result-checker` | < 50 ms | 200 ✓ |

Dev mode is heavily un-optimised (no minification, sourcemaps, hot-reload
overhead) so these numbers improve substantially on a `next start` production
build, which is how Vercel runs.

---

*Phase 7 perf pass — 2026-05-06.*
