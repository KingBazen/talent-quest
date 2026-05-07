# CURRENT PRODUCT / UX ECOSYSTEM AUDIT

> **Document type:** Read-only inspection report.
> **Purpose:** Establish a precise picture of what exists in the repo today before any product/UX direction is locked in for the “Bling Records Show” / talent-hunt initiative.
> **Methodology:** Static inspection of every file under `src/`, `scripts/`, `data/`, `videos/`, `docs/`, and configuration files. The dev server was not started during the audit (type-check passes, codebase structure is intact, no behavioural surprises expected vs. what static analysis already reveals — see notes in section H). Where assumptions are made they are explicitly marked **(assumption)**.

---

## A. Executive Summary

The current product is a **functional, single-tenant talent-competition web application** built on Next.js 14 (App Router) with a real Postgres backend (Neon), real authentication (bcrypt + HS256 JWT cookies), three distinct user roles (contestant / referee / admin), persisted scoring, and a partially wired payment flow (AdmasPay / Telebirr). It is positioned as **“TalentQuest — Ethiopia’s stage for the next big talent.”**

It is **not** just a marketing landing page, and it is **not** yet a full-blown reality-show operating system or media platform. It sits in the middle:

- A polished marketing surface (Hero, Categories, Showcase, Testimonials, CTA, Upload Guide, FAQ, Contact, How-it-works).
- A working contestant funnel: register → confirm → submit a video URL → track progress → check status by 6-digit ID → pay registration fee.
- A working internal stack: referee scoring dashboard with a 100-point rubric, admin console with stats / search / payments, RBAC enforced at the edge.
- Payments and video uploads are scaffolded but each runs in a graceful fallback / stub mode unless live keys are provided.
- There is **no real video playback, no audience voting, no comments/likes that persist, no episodes/show-management, no notifications, no admin moderation tooling.**

Maturity: **roughly an MVP-grade audition platform**, with more polish on the public marketing pages than on the operator-facing tooling. The product looks production-shaped; some parts are demonstrably incomplete or dead-end (notably the showcase video player, local upload fallback, and the payments “stub” redirect).

---

## B. Current Product Positioning

| Aspect | Current state |
| --- | --- |
| Brand shown in UI | **TalentQuest** (sparkle/star logo, gold-on-black palette) |
| Primary headline | “Ethiopia’s stage for the next big talent.” |
| Secondary copy | “Sing, dance, act, joke, play, or wow us with something we’ve never seen.” |
| Geographic framing | Ethiopia-specific. Six host cities named (Addis Ababa, Bahir Dar, Hawassa, Mekelle, Dire Dawa, Adama). Bilingual EN / አማርኛ in FAQ + chatbot. |
| Genre framing | AGT-style talent hunt with a music-leaning bias (singing + instruments + dancing dominate the imagery). |
| Stated grand prize | 100,000 ETB (hero stat block) |
| Implied target users | Aspiring performers (13+), with an emphasis on phone-recorded auditions; secondary: referees, internal admin, press/sponsors (Contact page). |
| Messaging clarity | Generally clear and consistent. The competition concept, rounds, and rubric are explained on multiple pages. There is **no mention** anywhere in the UI of “Bling Records Show” or any record-label tie-in — that direction is not currently reflected in the code. |
| Ambiguities | Whether this is a one-season show, a recurring TV format, a label discovery pipeline, or a streaming destination is not stated. The grand-final outcome is described as a “live grand final” and “national broadcast” without partner attribution. |

It currently feels closest to: **AGT / Idol-style talent-hunt audition platform** (think a single-country, web-first, mobile-recorded version of Got Talent). It does **not** currently feel like a music-streaming app, a social media platform, or a record label. It carries faint streaming/TikTok inflections only in the Showcase “Reels view.”

---

## C. Current User Roles

| Role | Exists in UI? | Exists in Code? | Current Capabilities | Notes |
| --- | --- | --- | --- | --- |
| **Public visitor (anonymous)** | Yes | Yes | Browse all marketing pages, view showcase clips (thumbnails + external links), look up any contestant by 6-digit ID via `/result-checker`, submit a contact form, chat with Stage Bot. | No login required. |
| **Contestant** | Yes | Yes — DB role `contestant` | Register & log in, view profile (`/profile`), submit a video URL or use upload-intent endpoint, advance own progress (demo helper), pay the 50 ETB registration fee via AdmasPay popup, see own submissions. | The `Advance step` button on `/profile` is a **demo-only** affordance that lets a contestant tick their own progress — tagged as such in the code. |
| **Referee** | Yes | Yes — DB role `referee` | Log in, see review queue (top 50 pending/approved submissions), score against the 5-criterion / 100-point rubric, write private notes, mark items reviewed. Each subsequent submission auto-snaps. | Cannot reject, flag, or comment publicly. Cannot see who else has scored. |
| **Admin** | Yes | Yes — DB role `admin` | Log in, view stats (contestants, submissions, reviewed %, avg score, payments gross/paid/pending, category distribution), search/filter contestants, manually override payment status via API (no UI for this yet). Can also access the referee dashboard. | The “Open round 2” button in the admin header is a UI stub — not wired. |
| **Audience / fan** | No | No | None — there is no “like / vote / follow / comment” system that persists. The Showcase reels show a like button but the state is local-only. | **This is the largest missing role given the product framing.** |
| **Producer / show team / media partner** | No | No | None | No segmentation, no internal CMS for episodes, casting decisions, or schedule edits. |
| **Guest celebrity / featured judge** | No | No | None | Referees are flat — no “lead judge,” no profile cards, no rotation. |

---

## D. Current Page / Route Map

### Public marketing & utility routes

| Route | Purpose | Main Features | Backend Connected? | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Marketing landing page | Hero (CTAs to `/register` and `/showcase`), HowItWorksTeaser (4-step), CategoryGrid (6 cards), Showcase (6 clips), Testimonials (3), CTA | Indirect (Showcase fetches `/api/showcase` from sub-component) | **Implemented** | Hero stats (`2,400+`, `4.9★`) are hardcoded. Testimonials are hardcoded. |
| `/how-it-works` | Detailed flow + judging rubric + schedule | 6-step flow, 5 rubric cards, 7-row schedule, gradient CTA | No (static content) | **Implemented** | Schedule lives in `src/data/judging.ts` (dates 2026-06 → 2026-10). |
| `/categories` | All 6 talent categories with examples + tips | 6 large category sections, deep-link via `#id`, tip lists per category | No (static) | **Implemented** | Hardcoded `tipsFor()` helper in the page itself. |
| `/upload-guide` | How to record a good submission | 9 tip cards (UPLOAD_TIPS), 60-second checklist, recommended specs | No (static) | **Implemented** | Doesn’t actually contain an upload widget — guide only. |
| `/showcase` | Public gallery of performances | Reels view (snap-scroll, single-column), Grid view (YouTube-style), category filter chips | Yes — `GET /api/showcase` (live submissions + static `SHOWCASE_CLIPS` backfill) | **Partially Implemented** | No real video player — only Unsplash thumbnails + a play icon. The Reels view “like” button is local-state only. |
| `/result-checker` | Public lookup by 6-digit ID | Numeric input, “Use my ID” shortcut, status card with progress + score | Yes — `GET /api/contestants/[id]` | **Implemented** | Returns aggregate score only after 3+ judges. |
| `/faq` | EN/AM FAQ + chatbot pointer | Search, language toggle, accordion of `FAQ_ENTRIES`, “Stage Bot” promo block | No (static), but chatbot widget posts to `/api/chatbot` | **Implemented** | |
| `/contact` | Inbound message form + brand contact info | Name/email/topic/message form, side panel with hardcoded email/phone/HQ | Yes — `POST /api/contact` (writes `contact_messages` row) | **Implemented** | Phone/email values are placeholder (`+251 11 000 0000`, `hello@talentquest.example.com`). |
| `/not-found` | 404 page | Branded fallback with 3 quick links | No | **Implemented** | |

### Account & contestant flow

| Route | Purpose | Main Features | Backend Connected? | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/register` | 3-step registration with password | RHF + Zod validation, step gating, success card with copy-able 6-digit ID | Yes — `POST /api/auth/register` (creates user + contestant + progress steps + JWT cookie) | **Implemented** | Step 3 mentions “Registration fee is collected at video upload time.” |
| `/login` | Email + password | RHF + Zod, role-aware redirect, seed-account hint box visible to all visitors | Yes — `POST /api/auth/login` | **Implemented** | The visible **seeded test credentials** in the UI are a deliberate dev-mode hint and a production red flag. |
| `/profile` | Contestant control panel | Tabs: Progress · Submission · Scores · Schedule · Account; PaymentCard for 50 ETB registration fee with polling modal; Submission tab accepts a URL only | Yes — `/api/auth/me`, `/api/submissions`, `/api/payments/init`, `/api/payments/[id]`, `/api/contestants/me/advance` | **Implemented (UI complete, scoring is read-only and shows zeros until judges score)** | The “Scores” tab always renders zeros from `JUDGING_CRITERIA` rather than the contestant’s own aggregate. Their actual aggregated score is **not** surfaced on `/profile` — it is only visible on `/result-checker`. **Inconsistency.** |

### Admin / operator routes

| Route | Purpose | Main Features | Backend Connected? | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/admin` | Mission-control dashboard | 4 KPI tiles, tabs (Contestants table with search, Category mix progress bars, Payments KPIs) | Yes — `/api/admin/stats`, `/api/admin/contestants` | **Implemented** | “Open round 2” button is a no-op stub. Payments tab links to `/docs/PAYMENTS_TELEBIRR.md` — that path is **not** served by Next.js, so the link 404s. |
| `/referee` | Scoring dashboard | Featured submission card with thumbnail, 5 sliders + star rows (per-criterion), private notes textarea, queue carousel, auto-advance | Yes — `/api/referee/queue`, `/api/scores` | **Implemented** | Video preview is just the thumbnail — clicking play opens the original `videoUrl` in a new tab. There is **no in-app player.** |
| `/admin-demo` | Legacy redirect | Redirects to `/admin` | n/a | **Unclear / vestigial** | Suggests a removed “demo mode” admin page. Safe to drop after route audit. |
| `/referee-demo` | Legacy redirect | Redirects to `/referee` | n/a | **Unclear / vestigial** | Same as above. |

### API routes (full inventory)

| Route | Method | Auth | Purpose | Status |
| --- | --- | --- | --- | --- |
| `/api/auth/register` | POST | none | Create user (role=contestant) + contestant + 6-step progress + session cookie | Implemented |
| `/api/auth/login` | POST | none | Verify password, set session cookie | Implemented |
| `/api/auth/logout` | POST | session | Clear session cookie | Implemented |
| `/api/auth/me` | GET | optional | Return user, contestant DTO, latestPayment | Implemented |
| `/api/contestants/[id]` | GET | none | Public 6-digit lookup with aggregate score (≥1 judge) | Implemented |
| `/api/contestants/me/advance` | POST | contestant | Demo-only: tick the next progress step | Implemented (flagged as demo) |
| `/api/submissions` | GET / POST | contestant | List own submissions / create one (URL only); auto-advances `video_submitted` step | Implemented |
| `/api/scores` | POST | referee \| admin | Upsert per-criterion scores + private notes; auto-shortlists at ≥3 judges & total ≥ 70 | Implemented |
| `/api/referee/queue` | GET | referee \| admin | Top 50 submissions in `pending` or `approved` state, with `reviewedByMe` | Implemented |
| `/api/admin/stats` | GET | admin | Contestants, submissions, reviewed, avg score, payments, category distribution | Implemented |
| `/api/admin/contestants` | GET | admin | Searchable list of contestants with their latest score | Implemented |
| `/api/admin/payments/[id]` | PATCH | admin | Manual payment status override | Implemented (no UI yet) |
| `/api/payments/init` | POST | contestant | Issue payment intent (api / checkout / stub modes) | Implemented |
| `/api/payments/[id]` | GET | contestant \| admin | Poll payment status | Implemented |
| `/api/payments/webhook` | POST | HMAC | Telebirr/AdmasPay webhook handler | Implemented |
| `/api/contact` | POST | none | Save contact message | Implemented |
| `/api/showcase` | GET | none | Approved submissions + static showcase backfill | Implemented |
| `/api/chatbot` | POST | none | Static FAQ matcher with optional Anthropic Haiku 4.5 LLM fallthrough | Implemented |
| `/api/submissions/local-upload` | POST | – | **Referenced** by `src/lib/uploads.ts` as the local fallback upload target — **route file does not exist**. | **Broken / Not Found** |

---

## E. Current UX Flow Map

### 1. Public Visitor Flow

- **Current status:** Implemented and coherent.
- **Step-by-step journey:**
  1. Land on `/` → see hero, value prop, “Register now” / “Watch the showcase” CTAs, four hero stats, four-step teaser, six categories, six showcase clips, three testimonials, gold gradient closing CTA.
  2. Optionally drill down to `/how-it-works`, `/categories`, `/upload-guide`, `/faq`, `/showcase`, `/contact`, or `/result-checker`.
  3. Every page surface eventually pushes to `/register`.
- **Missing pieces:** No social proof timestamps (testimonials feel evergreen), no “season status” banner that changes over time (Hero badge says “Live · Season 1 registration open” permanently), no privacy/terms pages linked from the registration consent.
- **UX concerns:** The marketing layer makes promises (“live national broadcast,” “7-day review SLA,” “SMS/email notification”) that the operational backend does **not** currently deliver.

### 2. Contestant Flow

- **Current status:** Implemented end-to-end for the *registration* and *URL-based submission* path. **Direct video upload is not actually wired.**
- **Step-by-step journey:**
  1. `/register` 3-step form → server creates `users` row + `contestants` row + 6 default `progress_steps` (1st marked done) + JWT cookie.
  2. Success card shows the new 6-digit ID and three CTAs to `/profile`, `/upload-guide`, `/result-checker`.
  3. `/profile` shows progress bar, status, schedule, and an empty Scores tab.
  4. **Submission tab:** title + URL form, then list of submissions; on POST, contestant status flips to `submitted` if it was `registered`, and the `video_submitted` step is ticked.
  5. **Payment card:** click “Pay with AdmasPay” → server inserts a `payments` row, returns `redirectUrl` (real AdmasPay link in dev), opens new tab, polls `/api/payments/[id]` every 4s while the modal is open.
  6. Score visibility: only via `/result-checker`, never on `/profile` for the contestant themselves.
- **Missing pieces:**
  - No real **video upload UI** — only a URL input. The `createUploadIntent` exists server-side but nothing on the client uses it.
  - No upload progress, file picker, format validation, virus/duration check, transcoding, or thumbnail extraction.
  - No “my contestant ID” reminder anywhere prominent after first registration.
  - The Scores tab on `/profile` is decorative — the contestant cannot see their own aggregate, only the public-facing result-checker can.
  - No notification mechanism (no SMS, no email, no in-app toast about state changes).
  - No way to **edit** registration fields (FAQ promises “you can update bio, stage name, contact info” — no UI/API for this).
- **UX concerns:** The “Advance step” button is exposed to the live contestant; this is fine for QA but reads as a confusing self-service shortcut. The “Scores” tab promising aggregation is misleading until referees score and the data is wired in.

### 3. Referee Flow

- **Current status:** Implemented for scoring; thin everywhere else.
- **Step-by-step journey:**
  1. Login (must use a referee or admin account).
  2. Middleware lets them into `/referee`.
  3. Queue loads top 50 pending/approved submissions with `reviewedByMe` flag.
  4. The first un-reviewed item auto-snaps; referee uses 5 sliders or 5-star buttons to set per-criterion points; can write notes.
  5. Submit → `upsertScores` writes per-criterion rows + `score_notes`. If the submission now has ≥ 3 judges and avg ≥ 70, contestant becomes `shortlisted` and the `shortlisted` step ticks.
- **Missing pieces:**
  - No way to **reject / flag / approve** a submission (status update not exposed to referees — only the DB constraint allows `pending|approved|rejected|flagged`, but the API never sets `approved` or `rejected`).
  - No *“lead judge”* concept, no panel composition rules, no anonymisation, no conflict-of-interest declarations.
  - No video player — clicking play opens the original URL externally, hurting evaluation quality.
  - No way to revisit/edit their own past scores from a list.
- **UX concerns:** The reviewer cannot see who else has scored, so calibration is impossible. There is no “done reviewing” state, just an empty queue.

### 4. Admin Flow

- **Current status:** Read/list-heavy dashboard. Light on actions.
- **Step-by-step journey:**
  1. Login → `/admin`.
  2. View KPIs, search contestants, see category mix, see payments KPI.
- **Missing pieces:**
  - No detail view per contestant.
  - No way to advance/eliminate, send a message, change a referee assignment, post an episode, manage rounds (the “Open round 2” button is a stub).
  - No payments table — only counts. Manual `PATCH /api/admin/payments/[id]` exists but no UI.
  - No referee management (can’t invite, deactivate, or assign).
  - No content moderation queue.
  - No analytics over time (only weekly delta on contestants).
- **UX concerns:** It’s a read-mostly mission-control screen. Real production use would force admins back into the database.

### 5. Audience / Fan Flow

- **Current status:** **Effectively missing.** Only the Showcase page, which is anonymous and non-interactive in any persistent sense.
- **Step-by-step journey:**
  1. `/showcase` → reels or grid; filter by category; thumbnails play nothing (no real player).
  2. Reels: like/mute/share buttons exist; **like is local-state only**; share is a no-op; mute is decorative because nothing plays.
- **Missing pieces:** Voting, persisted likes, comments, accounts, follows, audience leaderboard, region-based engagement, sharing.
- **UX concerns:** The page sets the expectation of a TikTok-class experience and then can’t deliver — clicks lead nowhere, no audio.

---

## F. Current Feature Inventory

| Feature | Category | Status | Evidence in Code/UI | Notes |
| --- | --- | --- | --- | --- |
| Hero / value prop / season badge | 1. Public Website | Implemented | `src/components/home/Hero.tsx` | Stats hardcoded |
| 4-step teaser of process | 1. Public Website | Implemented | `src/components/home/HowItWorksTeaser.tsx` | |
| Categories grid (6 categories) | 1. Public Website | Implemented | `src/components/home/CategoryGrid.tsx`, `src/data/categories.ts` | EN + Amharic names |
| Showcase clips on home | 1. Public Website | Partially Implemented (UI only) | `src/components/home/Showcase.tsx`, `SHOWCASE_CLIPS` | No player |
| Testimonials | 1. Public Website | UI Only / Mock | `src/components/home/Testimonials.tsx` | 3 hardcoded quotes |
| Closing CTA banner | 1. Public Website | Implemented | `src/components/home/CTA.tsx` | |
| `/how-it-works` flow + rubric + schedule | 1. Public Website | Implemented | `src/app/how-it-works/page.tsx`, `JUDGING_CRITERIA`, `SCHEDULE` | |
| `/categories` deep dive | 1. Public Website | Implemented | `src/app/categories/page.tsx` | |
| `/upload-guide` 9-tip + checklist | 1. Public Website | Implemented (content only) | `src/app/upload-guide/page.tsx`, `UPLOAD_TIPS` | No widget |
| `/faq` bilingual searchable | 1. Public Website | Implemented | `src/app/faq/page.tsx`, `FAQ_ENTRIES` | EN + Amharic |
| Contact form | 1 / 9 | Implemented | `src/app/contact/page.tsx`, `POST /api/contact` | Stores in `contact_messages` |
| Site sitemap.xml + robots.txt | 1. Public Website | Implemented | `src/app/sitemap.ts`, `src/app/robots.ts` | |
| Theme toggle (dark/light) | 1. Public Website | Implemented | `src/components/layout/ThemeToggle.tsx`, `next-themes` | Default dark |
| Public 6-digit result lookup | 1 / 5 | Implemented | `/result-checker` + `GET /api/contestants/[id]` | |
| 3-step registration with password | 2. Contestant | Implemented | `src/app/register/page.tsx` | RHF + Zod |
| Email/password login | 2. Contestant | Implemented | `src/app/login/page.tsx` | |
| Logout | 2. Contestant | Implemented | `POST /api/auth/logout` | |
| Profile dashboard (tabs) | 2. Contestant | Partially Implemented | `src/app/profile/page.tsx` | Scores tab is decorative |
| Submit a video by URL | 2 / 3 | Implemented | `POST /api/submissions` | |
| Self-advance progress | 2. Contestant | Implemented (demo helper) | `POST /api/contestants/me/advance` | |
| Edit registration fields | 2. Contestant | **Not Found** | – | Promised in FAQ; not built |
| Pay registration fee (50 ETB) | 2 / 8 | Partially Implemented | PaymentCard + `POST /api/payments/init` | Live with AdmasPay checkout link in `.env.local`; full Telebirr API path unverified |
| Cloudinary signed direct upload | 3. Media | Backend only | `src/lib/uploads.ts`, `createUploadIntent` returned by `GET /api/submissions` | No client uses the intent |
| Local-upload fallback endpoint | 3. Media | **Broken / Not Found** | Referenced as `/api/submissions/local-upload`, route file missing | |
| Real video player | 3. Media | **Not Found** | – | Showcase + referee both rely on external links |
| Video thumbnail extraction | 3. Media | **Not Found** | – | |
| Format / size / duration validation | 3. Media | **Not Found** | – | DB allows `duration_sec` up to 7200, no enforcement on submission |
| Static promo videos (Remotion) | 3. Media | Implemented (separate workspace) | `videos/` (`PromoReels`, `PromoSquare`, `PromoLandscape`) | Pre-rendered MP4s in `videos/out/` |
| Referee scoring on 5-criterion / 100-point rubric | 4. Judge/Review | Implemented | `/referee` + `POST /api/scores` | |
| Per-criterion private notes | 4. Judge/Review | Implemented | `score_notes` table | |
| Reject / flag / approve a submission | 4. Judge/Review | **Not Found** | – | DB supports it, API does not |
| Auto-shortlist on ≥ 3 judges & avg ≥ 70 | 4. Judge/Review | Implemented | `POST /api/scores` updates contestant status + `shortlisted` step | |
| Score aggregation (avg + judge count) | 4. Judge/Review | Implemented | `aggregateScoresFor` | |
| Admin KPI dashboard | 5. Admin | Implemented | `/admin` + `GET /api/admin/stats` | |
| Admin contestant search | 5. Admin | Implemented | `GET /api/admin/contestants` | |
| Admin payments override | 5. Admin | Backend only | `PATCH /api/admin/payments/[id]` | No UI |
| Admin moderation queue | 5. Admin | **Not Found** | – | |
| Admin round/episode/schedule management | 5. Admin | **Not Found** | – (schedule is hardcoded in `src/data/judging.ts`) | |
| Audience accounts | 6. Audience | **Not Found** | – | |
| Persistent likes/votes | 6. Audience | **Not Found** | – | |
| Comments / chat | 6. Audience | **Not Found** | – (only the chatbot) | |
| Reels view (TikTok-style) | 6. Audience | UI Only | `src/app/showcase/page.tsx` | Local-state like only |
| Grid / YouTube view | 6. Audience | UI Only | `src/app/showcase/page.tsx` | |
| Episodes / show segments | 7. Content/Show | **Not Found** | – | No `episodes` table |
| Live broadcast / streaming | 7. Content/Show | **Not Found** | – | Promised in copy only |
| Bilingual EN/AM chatbot | 9. Notifications/Comm. | Implemented | `ChatbotWidget` + `POST /api/chatbot` | Static matcher + LLM fallthrough |
| Email/SMS notifications | 9. Notifications/Comm. | **Not Found** | – | FAQ promises SMS/email; no integration |
| Server-side analytics | 10. Analytics | Partially Implemented | `/api/admin/stats` | No event analytics, no time series |
| Authentication: bcrypt password hashing | 8. Auth | Implemented | `src/lib/auth.ts` | cost 10 |
| Authentication: HS256 JWT cookie | 8. Auth | Implemented | `jose`, 14-day TTL | |
| RBAC at the edge | 8. Auth | Implemented | `src/middleware.ts` | `/admin`, `/referee` |
| Role-aware redirect post-login | 8. Auth | Implemented | `/login` page logic | |

---

## G. Current Design / UX Assessment

- **Visual style:** Premium gold-on-black “stage” aesthetic. Dark by default (`defaultTheme="dark"` in `RootLayout`). Heavy use of Framer Motion entrance animations, gradient text (`gradient-text`), glow utilities (`stage-glow`, `pulse-glow`), and a `bg-spotlight` radial. Effect on first impression is cinematic and on-brand for a talent show.
- **Brand consistency:** Strong. The same 5-icon vocabulary (Sparkles, Star, Trophy, Play, Mic2) repeats across pages. The brand palette in `tailwind.config.ts` (`brand-300…900` golds, `gold-400/500/600`, `ink-900/950`) is used consistently. The Remotion promo videos in `videos/` mirror this palette deliberately.
- **Typography:** Two Google fonts loaded (`Inter` for body, `Space Grotesk` for display) with proper variable + fallback wiring. Type scale up to `text-7xl`. Uses `text-balance` utility for hero headlines.
- **Color system:** Defined as HSL CSS variables in `globals.css` for both light and dark themes; no hard-coded colors in components. Light mode is a warm cream-paper variant — not as differentiated as the dark mode.
- **Layout quality:** Clean container width (`max 1320px`), generous spacing, consistent use of rounded `2xl/3xl` cards with `border-border/60 bg-card`. Nothing feels cramped.
- **Mobile responsiveness:** Strong. Every page uses Tailwind responsive prefixes; Navbar collapses to a hamburger; profile/admin/referee tabs stack; Reels view scales on small screens; Hero stats grid degrades from 4 columns to 2. No obvious horizontal-scroll bugs in the source.
- **Navigation clarity:** Top nav has 7 items + auth state + theme toggle. Footer mirrors and adds a “For staff” column with admin/referee/sign-in links. **Concern:** the “For staff” section publicly advertises `/admin` and `/referee` — fine because of edge auth, but it’s an unusual product choice.
- **CTA clarity:** Excellent on the marketing pages. Slightly noisy on `/profile` (an action bar with both Logout and a bright gradient “Advance step” at the same level).
- **Form usability:** Strong. RHF + Zod validation, helper text, multi-step progress bar, clearly surfaced inline errors. Login form deliberately surfaces seeded test creds — production-disabling required.
- **Accessibility issues observed:**
  - Reels view uses `<button>` elements that announce only via `aria-label` — fine, but the entire reel card is decorative (`<div>` + bg-image) and not exposed as a single playable item to AT.
  - The custom `<input type="range">` sliders in `/referee` aren’t labelled with their criterion via `aria-labelledby`.
  - The “Stage Bot” chat widget toggle is a `<Button>` with text + an inline lucide icon; OK for screen readers.
  - Color contrast for muted-foreground on dark mode is borderline by WCAG AA (HSL `45 12% 62%` on `0 0% 4%` background).
  - Some custom inputs in the Submission tab on `/profile` are raw `<input>` without `<Label htmlFor>` — they have placeholders only.
- **Premium-show fit:** Yes — this looks like a TV-show landing page with audition mechanics behind it. Cinematic gradients, gold accents, large display type.
- **Production-level credibility:** Visually, yes; but the gap between marketing promises and the operator tooling will be obvious to anyone testing for more than five minutes.

---

## H. Current Technical Ecosystem

| Layer | Implementation |
| --- | --- |
| **Framework** | Next.js 14.2.18 (App Router), React 18.3.1, TypeScript 5.6.3 |
| **Runtime** | Node runtime on every API route (`runtime = "nodejs"`); `dynamic = "force-dynamic"` on session/auth/admin endpoints |
| **Routing** | App Router with file-system routes; edge `middleware.ts` enforcing `/admin` and `/referee` |
| **Backend** | Next.js Route Handlers under `/api/*`. Thin pattern: `route()` wrapper around handlers, `parseJson(req, ZodSchema)` for validation, `ok()/err()` envelope helpers |
| **Database** | **Postgres (Neon serverless)** via `@neondatabase/serverless` + `ws`. Connection is lazy (`getPool()`), migrations are idempotent (`ensureMigrated()` runs once per process). 8 tables: `users`, `contestants`, `progress_steps`, `submissions`, `scores`, `score_notes`, `contact_messages`, `payments`. |
| **Drift vs. README** | The README says SQLite via `better-sqlite3`. The code is **fully Postgres** (Neon). `data/talentquest.db*` files are leftovers from the old SQLite era. `src/lib/dto-types.ts` still has a stale comment referring to better-sqlite3. **Stale documentation.** |
| **Auth** | bcrypt-js (cost 10) for hashing; `jose` HS256 JWT in HTTP-only `tq_session` cookie, `Secure` in production, 14-day TTL; verified at the edge in `middleware.ts` |
| **File / media storage** | Cloudinary signed direct-upload (server signs, browser POSTs); local fallback endpoint **referenced but missing**; Remotion-generated promo MP4s checked into `videos/out/` |
| **Payments** | Telebirr / AdmasPay. Three modes auto-detected: full API (`TELEBIRR_*` set), hosted-checkout (`ADMASPAY_CHECKOUT_URL` set — currently the case in `.env.local`), and stub (neither set, redirects to `/payments/mock` which **does not exist**). HMAC-verified webhook. |
| **External APIs** | Anthropic Messages API (Claude Haiku 4.5) — optional; AdmasPay/Telebirr — optional; Neon Postgres — required |
| **Hosting target** | Vercel (`vercel.json`) — confirmed by `next.config.mjs` `serverComponentsExternalPackages: ["@neondatabase/serverless", "ws", "bcryptjs"]` |
| **Env vars in use** | `JWT_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `SEED_*`, `ADMASPAY_CHECKOUT_URL`, `TELEBIRR_*`, `CLOUDINARY_*`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `NODE_ENV` |
| **State management** | React `useState` + small `SessionProvider` context (`src/components/auth/SessionProvider.tsx`) sourced from `/api/auth/me` |
| **Form handling** | `react-hook-form` + `@hookform/resolvers/zod` + `zod` schemas mirrored on both client and server |
| **Validation** | Zod everywhere (registration, login, submissions, scores, contact, chatbot, webhook). Single error envelope from `parseJson()`. |
| **UI libraries** | shadcn/ui style (custom-coded primitives in `src/components/ui/*`) over Radix UI: accordion, avatar, dialog, label, progress, select, separator, slot, tabs, toast, tooltip; `lucide-react` icons; `class-variance-authority`, `clsx`, `tailwind-merge`. `framer-motion` for animations. `next-themes` for theming. |
| **Build/lint** | `eslint-config-next` 14.2.18; `tsc --noEmit` available as `npm run type-check`. Type-check **passes** as of audit time. |
| **DevContainer** | `.devcontainer/devcontainer.json` provided for Codespaces (auto-installs, applies migrations, seeds). |

### Security concerns observed

1. **Secrets committed.** `.env.local` is checked in (it shouldn’t be) and contains a **real Neon Postgres connection string with credentials**, a real AdmasPay hosted-checkout URL, and a development JWT secret. **High severity.** Rotate Neon credentials and add `.env.local` to `.gitignore`.
2. **Seeded credentials publicly displayed.** `/login` page renders the seeded admin/referee/contestant credentials to all visitors — convenient in dev, dangerous in production.
3. **README documents an out-of-date stack** (claims SQLite + `better-sqlite3`); a future operator following the README will have a mismatched mental model.
4. **Middleware coverage gap.** Edge middleware protects only `/admin` and `/referee` *pages*. Admin API routes like `/api/admin/stats`, `/api/admin/payments/[id]` rely on the **request-time** `requireRole("admin")` check — that’s fine, but means edge protection is per-page, not per-API.
5. **Webhook `recordWebhookResult` accepts an arbitrary `paymentId`.** If signed with a leaked HMAC secret, the attacker could flip any payment to succeeded. Standard for HMAC webhooks but worth keying off provider trade refs as a second guard.
6. **`/result-checker` exposes contestant `fullName` to anyone with a 6-digit ID.** Given IDs are 6 digits in `[100000, 999999]`, brute-force enumeration is plausible without rate-limiting. No rate-limit is implemented.
7. **No CSRF token for state-changing cookie-auth POSTs.** The `tq_session` cookie is `SameSite=Lax`, which mitigates most CSRF, but cross-site form posts to `/api/contact`, `/api/auth/login`, etc. are not blocked otherwise.

### Why the dev server was not started

The audit target is *what exists*, not *runtime behaviour*. Type-check passes, the schema applies idempotently, and code paths are clear from inspection. Running the dev server would also create a Neon connection from the audit environment — undesirable for a static review.

---

## I. Data Model / Content Model Discovery

| Entity | Exists? | Source / File / Table | Key Fields | Mock or Real? | Notes |
| --- | --- | --- | --- | --- | --- |
| **User** | Yes | `users` table (`src/lib/db.ts`) | `id`, `email` (unique), `password_hash`, `role` ∈ {contestant, referee, admin}, `full_name`, `created_at` | Real (Postgres) | Seeded by `scripts/db-seed.ts` |
| **Contestant** | Yes | `contestants` table | 6-digit `id`, `user_id` (FK), `stage_name?`, `phone`, `age`, `city`, `category`, `experience`, `bio`, `agreed_to_terms`, `status` ∈ {registered, submitted, shortlisted, advanced, eliminated}, `created_at` | Real (Postgres) | 1-to-1 with users; status transitions exist but only `submitted` and `shortlisted` are auto-applied today |
| **Progress step** | Yes | `progress_steps` table | composite (`contestant_id`, `step_key`), `label`, `done`, `done_at`, `ord` | Real (Postgres) | 6 default steps inserted on registration: registered → video_submitted → review → shortlisted → audition → result |
| **Submission** | Yes | `submissions` table | `id`, `contestant_id`, `title`, `category`, `video_url?`, `thumbnail_url?`, `duration_sec?`, `status` ∈ {pending, approved, rejected, flagged}, `notes?`, `created_at` | Real (Postgres) | Status only ever set to `pending` (default) by the current code path — `approved/rejected/flagged` not used |
| **Score** | Yes | `scores` table | `id`, `submission_id`, `referee_user_id`, `criterion`, `points`, `max_points`, `created_at`, UNIQUE on (submission_id, referee_user_id, criterion) | Real (Postgres) | Idempotent upsert |
| **Score note** | Yes | `score_notes` table | composite (`submission_id`, `referee_user_id`), `notes`, `updated_at` | Real (Postgres) | Private, never returned to contestants |
| **Contact message** | Yes | `contact_messages` table | `id`, `name`, `email`, `topic`, `message`, `handled`, `created_at` | Real (Postgres) | No admin UI yet |
| **Payment** | Yes | `payments` table | `id`, `contestant_id`, `amount_cents`, `currency`, `provider`, `provider_ref?`, `status` ∈ {pending, succeeded, failed, refunded}, `created_at`, `updated_at` | Real (Postgres) | |
| **Talent category** | Yes | `src/data/categories.ts` | id, name, amharicName, emoji, description, examples[], color | Static (in code) | 6 entries |
| **Judging criterion** | Yes | `src/data/judging.ts` | key, label, weight, description | Static (in code) | 5 criteria summing to 100 |
| **Schedule entry** | Yes | `src/data/judging.ts` | date, label | Static (in code) | 7 dates 2026-06 → 2026-10 |
| **FAQ entry** | Yes | `src/data/faq.ts` | q, a, qAm, aAm, tags | Static (in code) | EN + Amharic |
| **Showcase clip** | Yes | `src/data/showcase.ts` | id, title, contestant, category, city, thumbnail, durationSec, views, likes, optional youtubeId | Mock (Unsplash thumbnails, fake counts) | 9 entries; live submissions can be prepended via `/api/showcase` |
| **Upload tip** | Yes | `src/data/uploadGuide.ts` | title, summary, do[], dont[], icon | Static (in code) | |
| **Chatbot greeting / quick replies** | Yes | `src/data/chatbot.ts` | EN + AM strings | Static | |
| **Episode** | **No** | – | – | – | No table, no UI, no seed |
| **Audience vote / like** | **No** | – | – | – | UI-only on showcase reels |
| **Comment** | **No** | – | – | – | |
| **Notification** | **No** | – | – | – | |
| **Round / show season config** | **No** | – | Schedule is hardcoded; no DB-backed round table | – | |
| **Audit log** | **No** | – | – | – | |

---

## J. Gaps, Confusion, and Duplications

### Duplicates / vestigial

- **`/admin-demo`** and **`/referee-demo`** are bare redirect pages to the real dashboards — leftovers from a pre-auth demo era.
- **`data/talentquest.db*`** SQLite files in the repo with the database actually being Neon Postgres now.
- **`src/lib/dto-types.ts`** mentions `better-sqlite3` in a comment that no longer applies.
- **README.md** documents the SQLite stack, seed accounts, and `npm run db:reset` workflow that doesn’t fit the Postgres reality.

### Conflicting product direction

- **Marketing copy promises a TV-grade live broadcast and SMS/email notifications**, but neither show-management nor messaging infrastructure exists.
- **The seeded test credentials block on `/login`** is a marketing-grade page detail at odds with “production-mode” claims in the README and metadata.
- **The Showcase “Reels view”** sets a TikTok expectation that the current data model and player support cannot fulfil.

### Out of scope for an MVP audition platform (probably)

- Reels-style social feed (no audience accounts, no engagement persistence).
- Hardcoded testimonials.
- Promo Remotion subproject (great asset, but separate workspace; not strictly part of the web product).
- Theme toggle (dark/light) — neither harmful nor critical for MVP.

### Unused / under-used components

- `src/components/ui/separator.tsx`, `card.tsx`, `tooltip` (Radix dep imported, never imported in `src/`) — present but rarely referenced.
- `createUploadIntent()` is built and returned by `GET /api/submissions` but **no client code consumes** it.

### Placeholder content

- Hero stats: `2,400+`, `4.9★`, `100K ETB`, `6 cities`, `6 categories` — all hardcoded, no real-time numbers.
- Testimonials: 3 names, evergreen.
- Contact: `+251 11 000 0000`, `hello@talentquest.example.com`, `Bole, Addis Ababa`.
- Footer social icons link to `#`.

### Broken links / dead code paths

- `<a href="/docs/PAYMENTS_TELEBIRR.md">` on `/admin` Payments tab → 404 (Next.js does not serve `docs/`).
- `redirectUrl: "/payments/mock?paymentId=…"` returned from `initPayment()` in stub mode → `/payments/mock` route does not exist.
- `uploadUrl: "/api/submissions/local-upload"` returned from `createUploadIntent()` → route file missing.
- Footer + Contact social-media icons (`Instagram`, `YouTube`, `Telegram`) all link to `#`.

### Hardcoded data that will need to move into DB

- `JUDGING_CRITERIA` (referee dashboard, profile scores tab, how-it-works rubric, scores upsert) — currently the source of truth in code; if rubric changes, `scores.criterion` strings drift.
- `SCHEDULE` — show timeline.
- `TALENT_CATEGORIES` — used for both UI and registration validation enum.

### Poorly named / misleading

- “Advance step” button on `/profile` is exposed as a normal contestant action even though the API comment states it’s a demo helper.
- `/result-checker` framing (“Did you make the cut?”) is at odds with the actual result it returns (just status + 6-step progress + an *if-available* aggregate score).

### Missing routes / journeys

- No `/contestant/[id]` rich public profile (only the result-checker card).
- No `/forgot-password` / password-reset flow.
- No `/privacy`, `/terms`, `/rules` — although the registration consent says “I agree to the TalentQuest entry rules, content licensing terms, and the privacy policy.”
- No `/episodes` or `/season-1` show hub.

### Backend-not-connected UI

- `/profile` Scores tab shows the rubric with `0 / weight` for the contestant — never wired to the actual aggregate.
- “Open round 2” admin button is a no-op stub.

---

## K. Current MVP Readiness

| Launch type | Rating | Why |
| --- | --- | --- |
| **1. Promotional landing page** | **Ready** | The marketing surface is polished, fast, mobile-friendly, on-brand, and tells a coherent story. Could be deployed standalone today behind a feature flag that hides `/register` and `/profile`. |
| **2. Audition registration website** | **Almost Ready** | Registration, login, payment, and progress tracking work. Blockers: secrets in repo, seeded creds on login page, no edit-profile, no notifications, no terms/privacy pages, the “Advance step” shortcut. None of these are weeks of work. |
| **3. Full contestant submission platform** | **Not Ready** | URL-based submission works, but **direct video upload is not actually wired on the client** even though the server intent is implemented. There is also no transcoding, validation, or playback. |
| **4. Judge review portal** | **Almost Ready** | Scoring + rubric + queue + auto-shortlist are implemented. Blockers: no in-app player, no approve/reject, no per-judge calibration view, no panel composition. |
| **5. Audience voting platform** | **Not Ready** | No audience accounts, no persisted votes/likes, no comments, no rate-limit, no content moderation. The reels UI is decorative. |
| **6. Full competition ecosystem** | **Not Ready** | No episode/round/season management, no notifications, no media pipeline, no public moderation, no producer tooling, no sponsor view. |

---

## L. What the Product Currently Looks Like It Wants to Become

Based purely on what is in the code today (not on intent that might exist outside the repo):

- **Primary intent is clear: an audition / contestant submission system** with a strong, near-launchable marketing layer in front of it.
- **Secondary intent: a review-and-judging operating system** — the rubric, scoring persistence, and admin KPI dashboard suggest the team has internalised the operator side of running a season.
- **Tertiary intent: a *future* audience-engagement / streaming surface** — gestured at by the Showcase reels view, the like/share buttons, and the FAQ wording about “SMS/email notifications,” but not actually built.
- **Aspiration in copy: a national TV-grade format** — “live grand final,” “national broadcast,” six host cities, 100K ETB prize, named schedule dates 2026-06 → 2026-10. The aspiration is plainly larger than the current MVP-grade implementation.

It does **not** look like it wants to be a record-label discovery pipeline, a music-streaming service, or a social network. None of those concepts are reflected in the data model, page tree, or UI copy. **The gap between “TalentQuest” and any “Bling Records Show” direction is not bridged anywhere in the current code.**

---

## M. Initial Keep / Drop / Add Observations

These are observations only, not decisions.

### Potential things to KEEP

- The **Next.js 14 / App Router + Postgres + Zod + RHF + JWT** stack — solid choices for a small Ethiopian-context launch.
- **Three-role auth model** (contestant / referee / admin) and the **edge middleware** that enforces it.
- **The 5-criterion / 100-point rubric** implementation — the data model + upsert + aggregation pattern is clean and extensible.
- **The 6-digit contestant ID** mechanic (with collision check) and the **public result-checker** — strong, AGT-flavoured concrete affordance.
- **The bilingual EN/AM chatbot** (static + LLM fallthrough) — high-leverage cultural fit.
- **The marketing surface** as it stands (Hero, Categories, How-it-works, Upload Guide, FAQ, Contact, Showcase grid view).
- **Telebirr / AdmasPay** abstraction with three runtime modes and HMAC-verified webhook.
- **Cloudinary signed direct-upload** scaffolding (worth keeping; client wiring is the small remaining piece).
- **Shadcn/ui + Tailwind + Framer Motion** design system and the gold-on-black brand identity.
- **Remotion promo subproject** under `videos/` — great brand asset, even if separate.

### Potential things to DROP later (or revisit)

- **Out-of-MVP scope:**
  - The Reels view in `/showcase` (until video player + audience accounts are real, it sets expectations the product can’t meet).
  - Hardcoded testimonials (replace with real ones or remove).
  - Hardcoded hero stats (`2,400+`, `4.9★`) until real numbers exist.
  - The “Open round 2” admin button stub.
  - The visible seeded credentials on `/login` (move to a dev-only banner or remove entirely).
- **Dead / vestigial:**
  - `/admin-demo`, `/referee-demo` redirect pages.
  - `data/talentquest.db*` SQLite files.
  - `better-sqlite3` mention in `src/lib/dto-types.ts` comment.
  - The “Advance step” button on `/profile` (demo helper that has no place in production).
- **Broken paths:**
  - `/api/submissions/local-upload` reference (or implement the route).
  - `/payments/mock` reference in stub mode (or implement the page).
  - The `/docs/PAYMENTS_TELEBIRR.md` link on the admin page (point to a hosted page instead).
  - Footer + contact social-media `#` links.
- **Stale documentation:** rewrite README to match Postgres + Neon; remove SQLite quick-start.

### Potential things to ADD later (likely needed for the product framing)

- **Real video upload** with a client UI on top of `createUploadIntent`, plus playback (Mux/Cloudinary HLS), transcoding, thumbnail extraction, and duration enforcement.
- **Contestant edit-profile** (FAQ promises this).
- **Forgot-password / password-reset.**
- **Privacy / terms / rules** static pages (already linked from registration consent).
- **Approve / reject / flag controls** for referees and/or moderators.
- **Notifications** (email + SMS, ideally Telegram for the local context).
- **Round/season manager** (DB-backed schedule, current-round state, who’s eligible per round).
- **Audience accounts** with persisted likes / votes / comments and rate-limiting.
- **Episode model** (if the “show” framing matters) — episodes, segments, host/guest panel, per-episode contestants, public airing date.
- **Admin payments table UI** on top of the existing `PATCH /api/admin/payments/[id]`.
- **Admin moderation queue** for `contact_messages`, flagged submissions, abuse reports.
- **Rate-limit** on `/api/contestants/[id]` (6-digit brute-force) and `/api/auth/login`.
- **CSRF token** for cookie-auth POSTs (defence in depth on top of `SameSite=Lax`).
- **Rotate the Neon credentials currently committed to `.env.local`** and add `.env.local` to `.gitignore`.

---

## N. Questions for the Founder / Product Owner

### Business model

1. Is the 50 ETB registration fee per contestant the only revenue stream for season 1, or are sponsors / SMS voting / brand integration in the plan?
2. Is there an actual partnership in place with **AdmasPay / Telebirr**? The hosted-checkout link in `.env.local` suggests live testing — is it production-ready?
3. What is the link, if any, between **TalentQuest** and the **“Bling Records Show”** concept? Is one a sub-brand of the other? Are we white-labelling?
4. Is there a record label, agency, or media partner whose rights the platform must respect? (Affects content licensing terms in the registration consent.)

### Competition rules

5. Is one entry per contestant, or can a contestant re-submit? (Schema allows multiple `submissions` per contestant; UI presents it as one act.)
6. Does each contestant compete in **exactly one** primary category per season? (UI implies yes; DB doesn’t enforce per-season uniqueness.)
7. What are the precise advancement thresholds per round? (Code currently auto-shortlists at ≥ 3 judges & avg ≥ 70 — is that the agreed rule?)

### User roles

8. Will there be a **lead judge / celebrity judge** role with elevated visibility, or do all referees stay anonymous and equal?
9. Will there be a separate **producer / show-team** role distinct from `admin`?
10. Will there be a **moderator** role for content review, separate from referee scoring?

### Audition flow

11. Is registration **continuously open**, or does it open and close per-season? (Hero badge currently says “Live · Season 1 registration open” permanently.)
12. Is age 13 the lower bound for real (legal sign-off considered), or should we cap differently? (Currently 13–99.)
13. Should contestants be able to **edit** their bio, stage name, and contact details after submitting? (FAQ promises yes; not built.)
14. Should there be a **withdraw / delete account** flow?

### Video upload

15. Direct upload (Cloudinary/Mux) or YouTube/external URL — which is the canonical path?
16. Required format, max size, max duration, vertical vs horizontal — currently 60–180s + ≤500 MB in copy, ≤7200s in DB. Need a single source of truth.
17. Do submissions need to be reviewed (approved/rejected) before becoming visible in `/showcase`, or auto-public on submit? (Current code: `status='approved'` in showcase query — but nothing flips status to `approved`.)

### Judge / referee review

18. How many judges per submission, and what panel composition rules (region, gender, expertise)?
19. Should judges see **each other’s scores** before submitting? (Currently no.)
20. Should judges have a **public bio** shown alongside their score, or stay anonymous?
21. Are scores **final once submitted**, or revisable before round close?

### Voting

22. Will there be **public audience voting**? Web + SMS + Telebirr-paid votes? (Big architectural fork.)
23. If voting, what protections against vote-fraud, and what weight relative to judge scoring?

### Admin controls

24. What does the admin actually need to *do* in season 1: view, advance contestants, override payments, send mass messages, manage referees, schedule rounds, post episodes? (Determines admin-tooling priorities.)
25. Should admin have a **detail view per contestant** with edit, message, status-override?

### Payment / monetization

26. Is the 50 ETB fee a single payment, or should there be **per-round** fees / paid voting?
27. Are refunds in scope? (Schema supports `refunded`, no UI.)
28. Will payment receipts be issued (PDF/email)?

### Legal / content rights

29. Where are the **entry rules**, **content licensing terms**, and **privacy policy** that the registration form claims the user is agreeing to?
30. Who owns the submitted videos? (Required for any TV broadcast / re-distribution.)
31. Parental consent for under-18 contestants: collected how and where?

### Launch timeline

32. Is the schedule in `src/data/judging.ts` (registration opens 2026-06-01 → grand final 2026-10-12) the **real** timeline?
33. What is the **target soft-launch** date for the registration website?

### Technical constraints

34. Are we committing to **Vercel + Neon Postgres + Cloudinary + AdmasPay + Anthropic**, or are any of these subject to change?
35. Do we have a domain, brand SSL cert, and email-sender domain for transactional emails?
36. Is **Amharic-first** a requirement, or is bilingual (with English default) acceptable?

---

## O. Final Summary

1. **Current state.** TalentQuest is a Next.js 14 + Postgres MVP-grade audition platform with three real user roles, end-to-end registration, URL-based submissions, persisted referee scoring on a 5-criterion 100-point rubric, public 6-digit result lookup, AdmasPay payment scaffolding (live in checkout mode), and a polished gold-on-black marketing surface. It does **not** yet have real video upload + playback, audience voting, episode/season management, notifications, edit-profile, password reset, or a moderator role. The codebase is internally consistent and type-checked, but the README, the demo redirects, and the leftover SQLite files signal a recent migration that hasn’t been fully cleaned up.

2. **Biggest product risk.** The marketing surface promises substantially more than the operational platform delivers — most acutely, **video playback**, **a TV-grade live final**, **SMS/email notifications**, and a **TikTok-style audience reel**. Without alignment between marketing promise and product reality, early users will discover the gap quickly.

3. **Biggest technical risk.** Real production credentials (Neon Postgres + a live AdmasPay checkout link) are committed to `.env.local` in the repo. This needs to be remediated **before any external audit, demo, or fork**, regardless of any other product decision. Beyond that, the broken `/api/submissions/local-upload` and `/payments/mock` references will surface as runtime errors as soon as a non-stub upload or payment path is exercised.

4. **Most important thing to clarify before development.** Whether the project is targeting a **registration-and-judging audition platform** (the current code) or a **full reality-show ecosystem with audience voting, broadcast, episodes, and label tie-ins**. Until that is decided, every feature decision is guesswork — especially around audience accounts, voting, video playback, and episode/season modelling. The “TalentQuest vs. Bling Records Show” relationship is the second-most-important thing to nail down.

5. **Recommended next step.** Treat this audit as the product baseline. Do **two things in parallel**:
   - **Track A — clean up.** Rotate the leaked Neon credentials, gitignore `.env.local`, drop the demo redirects and stale SQLite files, refresh the README to match the Postgres reality, and either implement or remove the dangling stub paths (`/payments/mock`, `/api/submissions/local-upload`, the admin docs link). One day of focused work.
   - **Track B — write the technical scope document.** Use this audit to author a follow-up spec that says, per feature, *keep / drop / add / out-of-MVP / future-phase* with explicit answers to the 36 questions in section N. Then plan implementation against the keep/add list.

---

*End of audit.*
