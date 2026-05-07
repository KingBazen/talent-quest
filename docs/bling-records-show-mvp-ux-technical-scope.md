# Bling Records Show MVP — UX and Technical Scope

> **Document type:** Planning / scope. No code changes here.
> **Companion:** [docs/current-product-ux-ecosystem-audit.md](current-product-ux-ecosystem-audit.md) — read first.
> **Audience:** the implementation agent who will deliver the MVP, plus the founder/product owner who will sign off on scope.
> **Goal:** convert the audit into a precise, agent-executable scope that says — for every existing thing — *keep, drop, fix, add, or defer*.

---

## 0. Immediate Security Remediation (must come before any feature work)

The current audit identified that real production secrets are in the repository. **No new feature work should begin until this section is complete.** A leaked database credential or payment URL doesn’t become safer because the team is busy.

### What was leaked

- [.env.local](../.env.local) is tracked by Git and contains:
  - A live **Neon Postgres** connection string with username + password (pooled and direct endpoints, both EU-Central-1 / Frankfurt).
  - A live **AdmasPay** hosted-checkout URL (`apl_…` token).
  - A development `JWT_SECRET`.
- Treat all three as compromised. Anyone with read access to this repo (including past clones, forks, fork-of-fork, mirror, or CI cache) has them.

### What must be done — agent task list (do **not** execute yet — wait for explicit go-ahead)

| # | Task | Owner | Verification |
| --- | --- | --- | --- |
| 0.1 | In Neon, **rotate the `neondb_owner` password** (or rotate the role). Do this *before* removing the file from the repo, so the new value isn’t exposed in the same commit. | Founder / DBA | Connect with old creds → fails. Connect with new creds → succeeds. |
| 0.2 | In AdmasPay merchant dashboard, **rotate / regenerate the hosted-checkout link** (or void the leaked one) and any HMAC secret tied to that account. | Founder / payments owner | Old `apl_c557dc7f-9e27-4222-a0ea-93a3b0a90deb` link returns invalid; new link works. |
| 0.3 | Generate a new `JWT_SECRET` (≥ 48 random bytes, base64url). | Implementation agent | Old sessions invalidate; new logins succeed. |
| 0.4 | Add `.env`, `.env.local`, `.env.*.local` to [.gitignore](../.gitignore). Verify [.env.example](../.env.example) does **not** contain real values. | Implementation agent | `git check-ignore .env.local` → match. |
| 0.5 | `git rm --cached .env.local` and commit. **Do not** force-push history rewrites to a shared remote without the founder’s sign-off — coordinate before doing a `git filter-repo` / BFG cleanup if the file was pushed. | Implementation agent + founder | `git ls-files \| grep env.local` → empty. |
| 0.6 | If the repo was pushed to a remote (GitHub, GitLab, etc.), audit the remote: was `.env.local` pushed? Were there forks? Decide whether history rewrite is needed or whether rotation alone is sufficient (rotation alone is the usual right answer; history rewrite breaks every collaborator’s checkout). | Founder | Documented decision in this section once made. |
| 0.7 | Move all real secrets to **the host’s environment variable UI** (Vercel → Settings → Environment Variables). Do not place them in any committed file. | Implementation agent | `next dev` works locally with a fresh untracked `.env.local`; production reads from Vercel env. |
| 0.8 | Re-test database connectivity, login (bcrypt + JWT), and AdmasPay checkout init under the new credentials. | Implementation agent | Smoke checklist in §17 Phase 0. |
| 0.9 | Add a one-line README banner: *“Never commit `.env.local`. Secrets live in the deployment provider’s environment UI.”* | Implementation agent | Visible in [README.md](../README.md). |

### Why this is non-negotiable

- A leaked DB connection allows arbitrary read/write to all contestant PII, password hashes, scores, payments, and contact messages.
- A leaked payment URL is a phishing primitive — attackers can clone the brand and route payments to themselves.
- Any prior “demo” access using these credentials may already have been logged on the wrong side. Rotation is a one-shot action; the longer it’s deferred, the larger the blast radius.

---

## 1. Executive Product Direction

The product transitions from a generic *“TalentQuest — Ethiopia’s stage for the next big talent”* AGT-style site into:

> **A branded music audition and competition management platform for The Bling Records Show, in partnership with Neo Studios.**

The MVP should support, with production-grade quality, only the **audition funnel and the operator backend** behind it:

- Public promotion of the show (what it is, who is behind it, why it matters, how to enter).
- Contestant registration and profile creation.
- Contestant audition video submission.
- Optional registration / audition payment (AdmasPay/Telebirr).
- Referee/judge scoring against a clear rubric.
- Admin management of contestants, submissions, referees, and results.
- Public 6-digit result lookup.
- Bilingual EN/AM support where it adds value (FAQ, chatbot, key marketing copy).

The MVP **must not** try to become any of:

- A Netflix-grade streaming platform.
- A TikTok-grade social feed with audience accounts, likes, and comments.
- A live-voting platform.
- A 24-episode production / season / reality-house management system.
- A music rights / sponsor / mentor / celebrity-guest portal.

Those belong to **Phase 6+** (see §17), after a season-1 audition window has actually been run end-to-end.

---

## 2. MVP Definition

> **MVP = the minimum platform needed to publicly launch The Bling Records Show auditions, collect contestant applications, review submissions, score contestants, manage results, and present the project credibly as The Bling Records Show — and nothing more.**

### MVP success criteria

1. A first-time visitor on a phone understands the show, the prize, and how to enter **in under 10 seconds** on `/`.
2. A contestant can register, fill in their profile, upload an audition video, optionally pay, and receive a 6-digit code — without leaving the platform.
3. An admin can list, search, filter, and triage every contestant + submission with an audit-able status flow.
4. A referee can log in, see only the submissions assigned to (or available for) them, **watch the video inside the portal**, and score against the 5-criterion rubric without round-trips to YouTube.
5. A contestant (or anyone with their code) can check their current status via `/result-checker` and see one of a small, well-defined list of statuses.
6. The payment flow is **either fully working under a real AdmasPay/Telebirr account, or visibly disabled** — never half-broken.
7. The platform is secure enough for public use: secrets in the host env only, RBAC verified on every admin/referee API, rate-limit on `/api/auth/login` and `/api/contestants/[id]`, terms + privacy + consent pages live.
8. No remaining wording, route, or logo positions this as a vague AGT clone. Every public page reflects The Bling Records Show.

### Out of MVP success criteria

- Audience accounts, likes, votes, comments — explicitly **not** an MVP success criterion.
- Episode/season management, livestream — **not** MVP.
- Mobile app, push notifications — **not** MVP.

---

## 3. Target User Roles

| Role | MVP or Future | Purpose | Permissions | Main Screens | Notes |
| --- | --- | --- | --- | --- | --- |
| **Public Visitor** | MVP | Learn about the show, decide to apply, look up a result | Read public pages; submit contact form; lookup by 6-digit code | `/`, `/about`, `/auditions`, `/apply`, `/contact`, `/result-checker`, `/terms`, `/privacy` | Anonymous |
| **Contestant** | MVP | Apply, submit a video audition, optionally pay, track status | Register, edit own profile, create/replace own submission, initiate payment, view own status | `/contestant/dashboard`, `/contestant/profile`, `/contestant/submission`, `/contestant/payment`, `/contestant/result` | One contestant per user |
| **Referee / Judge** | MVP | Watch and score auditions on the rubric | Read assigned (or open) queue, watch videos, write scores + private notes, mark reviewed | `/referee/dashboard`, `/referee/submissions`, `/referee/submissions/[id]` | No public-facing profile in MVP |
| **Admin** | MVP | Operate the season: triage, assign, decide, export | Read all contestants/submissions, change status, assign referees, override payments, export CSV, manage settings | `/admin/dashboard`, `/admin/contestants`, `/admin/submissions`, `/admin/referees`, `/admin/results`, `/admin/settings` | Single admin role; sub-roles deferred |
| **Audience / Fan** | Future (Phase 6) | Engage publicly with shortlisted/aired contestants | Like, vote, comment | `/show`, `/contestant/[publicId]`, `/leaderboard` | Requires audience accounts + abuse controls |
| **Moderator** | Future (Phase 5–6) | Pre-screen submissions, handle reports, moderate comments | Status changes only on submissions/comments; no payment access | `/moderator/queue` | Splits content review off from admin |
| **Producer / Show Team** | Future (Phase 6) | Plan rounds, schedule episodes, coordinate with Neo Studios | Round/episode CRUD, contestant scheduling | `/producer/*` | Tied to episode management |
| **Celebrity Guest / Mentor** | Future (Phase 6) | Headline appearances, mentor segments | Limited read on assigned contestants | `/mentor/*` | Optional |
| **Sponsor / Partner** | Future (Phase 6+) | Brand visibility, audience metrics | Read-only on aggregate analytics, brand placements | `/sponsor/*` | Tied to sponsorship deals |

---

## 4. Keep — Existing Features to Preserve

These already exist in the codebase (see the audit) and are worth preserving with focused cleanup. Do not rewrite them; refine them in place.

| Item | Keep Reason | Required Cleanup | MVP/Future | Notes |
| --- | --- | --- | --- | --- |
| Next.js 14 App Router project | Modern, well-supported, already shipping | None — keep on 14.2.x for now | MVP | |
| TypeScript (`tsc --noEmit` clean) | Audit confirmed type-check passes | Add `npm run lint` to CI; keep clean as new code lands | MVP | |
| Postgres (Neon) | Right call for serverless on Vercel | Rotate credentials per §0; keep `getPool()` lazy pattern | MVP | |
| Schema in `src/lib/db.ts` (migrations idempotent) | 8 tables already line up with most MVP needs | Add 2–3 new tables (see §12); harden referees/assignments | MVP | |
| bcrypt password hashing + HS256 JWT cookies | Solid baseline auth | Rotate `JWT_SECRET`; keep 14-day TTL | MVP | |
| Edge RBAC middleware (`/admin`, `/referee`) | Page-level enforcement is in place | Extend matcher to cover any new contestant-only pages; keep API-level `requireRole` | MVP | |
| Three-role model (contestant / referee / admin) | Matches MVP roles 1:1 | Keep DB constraint as-is | MVP | |
| Contestant registration (`/register` + `POST /api/auth/register`) | Multi-step Zod-validated form is a strong asset | Repoint copy to Bling Records Show; add edit-profile path; add consent-page link | MVP | |
| URL-based video submission | Useful **fallback** when uploads fail | Keep, but demote it visually behind the real upload UI | MVP (fallback only) | |
| Referee scoring (`/referee` + `POST /api/scores`) | Persisted, idempotent, aggregated | Add in-portal video player; add reject/approve actions; show who else scored (count only) | MVP | |
| 5-criterion / 100-point rubric in `src/data/judging.ts` | Clear, weighted, documented | Move to a `settings` table eventually so admin can edit; for MVP keep in code | MVP | |
| Public 6-digit result checker (`/result-checker`) | Tangible, AGT-flavoured public affordance — *and on-brand for a TV show* | Add rate-limit (see §16); refine status copy (see §7-F) | MVP | |
| AdmasPay/Telebirr payment scaffolding (`src/lib/payments.ts`) | 3-mode abstraction is well-shaped | Verify under rotated credentials; build the missing `/payments/mock` page or remove stub mode entirely | MVP (after security review) | |
| HMAC-verified webhook (`/api/payments/webhook`) | Correctly rejects on bad signature | Keep | MVP | |
| Cloudinary signed direct-upload intent (`src/lib/uploads.ts`) | Server signing is already implemented | **Wire the client** (this is the biggest single missing piece — see §15) | MVP | |
| Bilingual EN/AM chatbot (`/api/chatbot`) | Cultural fit + Anthropic fallthrough | Reposition as **support/help only**, not a marketing centerpiece | MVP | |
| FAQ static dataset (EN + AM) | Already well-curated | Update entries to Bling Records Show language | MVP | |
| shadcn/ui + Radix + Tailwind + Framer Motion | Production-quality primitives | Keep; no rewrite | MVP | |
| Gold-on-black brand palette (`tailwind.config.ts`) | Already on-genre for a music show | Layer in Bling Records Show specifics (logos, additional accents) | MVP | |
| `next-themes` dark/light toggle | Cheap to keep, accessibility win | Keep dark default | MVP | |
| Remotion promo subproject (`videos/`) | Pre-rendered MP4 promo assets in 3 aspect ratios | Re-skin once Bling Records Show branding is finalized | MVP/Future | Useful for paid ads |
| `JUDGING_CRITERIA` data shape | Stable contract for scoring | Keep schema; revisit weights when judges weigh in | MVP | |
| Sitemap + robots files | SEO basics done | Add new MVP routes to sitemap | MVP | |
| `/contact` + `contact_messages` table | Inbound channel, already persisted | Add admin queue UI in Phase 4 | MVP (form), Future (admin queue) | |

---

## 5. Drop / Remove — Existing Features or Files to Remove

These add zero value to the MVP and actively dilute the brand or confuse the codebase.

| Item | Remove Reason | Risk If Kept | Replacement / Action |
| --- | --- | --- | --- |
| Generic *“TalentQuest — Ethiopia’s stage for the next big talent”* positioning | Conflicts with Bling Records Show direction | Brand confusion, weak differentiation | Replace with Bling Records Show branding (see §7-A and §11) |
| AGT-style hardcoded testimonials in `src/components/home/Testimonials.tsx` | Fictional users undermine trust | Public-perception risk | Replace with real Bling Records Show / Neo Studios endorsements, or remove the section |
| Hardcoded hero stats (`2,400+`, `4.9★`) in `src/components/home/Hero.tsx` | Numbers are not real | Trust risk, regulatory risk | Replace with real numbers once we have them, or remove the stat block |
| `/admin-demo` redirect page | Vestigial redirect to `/admin` | Confusing route, search-engine bait | Delete the file once route protection is verified |
| `/referee-demo` redirect page | Vestigial redirect to `/referee` | Same as above | Delete |
| `data/talentquest.db`, `.db-shm`, `.db-wal` | SQLite leftovers; project now uses Postgres | Misleading repo state | Delete from repo and `.gitignore` the directory |
| `better-sqlite3` comment in `src/lib/dto-types.ts` | Stale docstring | Misleading future devs | Edit out the comment |
| README SQLite quick-start, seed-account hints | Mismatches Postgres reality | Confuses contributors | Rewrite README to match Postgres + Neon |
| Visible seeded credentials block on `/login` | Public login page reveals admin creds | Critical in production | Hide entirely in production builds, or delete |
| “Open round 2” admin button stub | No-op control | False expectation that round management exists | Hide until §7-E ships, or remove |
| Demo-only `POST /api/contestants/me/advance` + the contestant-facing button | Lets any contestant tick their own progress | Operationally dangerous in production | Remove the route + button; admin/referee actions advance status |
| Showcase Reels view’s **fake** like / share / mute interactions | UI without backend | Misleading users | Either ship persisted likes (Phase 6) or remove the buttons in MVP |
| Showcase Grid view’s mock “views” / “likes” counters | Hardcoded values from `SHOWCASE_CLIPS` | Trust risk | Hide counters until backed by real telemetry |
| `SHOWCASE_CLIPS` static gallery used as primary content | Stock-photo Unsplash thumbnails | Looks fake | Show only real, approved submissions in MVP; backfill only if zero exist |
| `/showcase` Reels view as a whole | Sets a TikTok expectation we won’t meet in MVP | Brand promise gap | Demote to a single grid view in MVP; bring Reels back in Phase 6 with real player + audience |
| Hardcoded contact info (`+251 11 000 0000`, `hello@talentquest.example.com`, `Bole, Addis Ababa`) on `/contact` | Placeholders | Trust risk | Replace with real Bling Records Show / Neo Studios contact |
| Footer + Contact social-media `#` links | Dead links | Looks unfinished | Replace with real handles or remove the icons |
| Decorative Volume / Maximize buttons in `/referee` (no functionality) | UI without behaviour | Confuses judges | Remove until real player ships |

> **Important:** *Drop* in this document means **plan to remove**. Actual file deletion happens only in the implementation phase, after the security cleanup and a confirming pass.

---

## 6. Fix — Broken or Dangerous Items

| Issue | Severity | Current Problem | Required Fix | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| `.env.local` committed with real secrets | **Critical** | Live Neon + AdmasPay credentials in repo | Execute §0 fully | `git ls-files .env.local` empty; old creds rejected by provider; new creds work; `.gitignore` updated |
| Seeded credentials shown on `/login` page | **Critical** | Admin/referee/contestant creds rendered to all visitors | Hide block when `process.env.NODE_ENV === "production"`; remove it before any public marketing push | Production build does not render seeded creds |
| Missing `/api/submissions/local-upload` referenced by `src/lib/uploads.ts` | **High** | Local fallback `uploadUrl` points at a non-existent route | Either implement the route (rejecting in production) or remove the local-fallback branch entirely | Either route returns 200 in dev for valid uploads, or `uploadsAreLive() === false` is treated as a hard error |
| Missing `/payments/mock` page referenced by stub-mode `redirectUrl` | **High** | Stub mode redirects to a 404 | Either implement a minimal mock page (dev-only) or remove the stub branch and require checkout/api mode | Stub mode redirect lands on a real page, or stub mode is removed and `initPayment` errors helpfully if no provider configured |
| Admin “Open round 2” no-op button | **Medium** | Implies functionality that doesn’t exist | Hide the button until real round management exists (§7-E P1) | Button does not render in MVP UI |
| Demo-only “Advance step” button on `/profile` | **High** | Lets any contestant fake their own progress | Remove the button + route per §5 | `POST /api/contestants/me/advance` returns 404 or is deleted; UI element removed |
| `/admin` Payments tab links to `/docs/PAYMENTS_TELEBIRR.md` | **Low** | Next.js does not serve `docs/` | Replace with a hosted help page or remove the link | No 404 from the admin payments tab |
| `/profile` Scores tab shows zeros even when scores exist | **Medium** | Tab renders rubric `0/weight` regardless of actual data | Wire to `aggregateScoresFor` for the contestant’s latest submission, or hide the tab until first score lands | Contestant sees their real aggregate (or nothing) — never fake zeros |
| Scoring is final but UI says “Update score” | **Low** | Implies edit support | Either support edits (UPDATE the rows by `(submission_id, referee_user_id, criterion)` is already idempotent) or change copy to “Submit” | UI matches behaviour |
| README documents SQLite stack | **Medium** | Future operators will use the wrong setup | Rewrite README for Postgres + Neon | README quick-start works against current code |
| `data/talentquest.db*` SQLite files in repo | **Low** | Confusing leftovers | Delete + `.gitignore` | Repo no longer contains them |
| `src/lib/dto-types.ts` mentions `better-sqlite3` | **Low** | Stale comment | Update comment | No file references `better-sqlite3` |
| Public `/api/contestants/[id]` allows 6-digit brute-force | **High** | Returns full name + status for any valid ID; no rate-limit | Add per-IP rate-limit (e.g. 30 requests / 5 min) and progressively delay; consider returning only initials + status when called anonymously | Burst of 1,000 sequential IDs from a single IP gets throttled |
| `/api/auth/login` lacks rate-limit | **High** | Password-spray feasible | Same rate-limit primitive as above | 10 failed attempts / 15 min from one IP returns 429 |
| No CSRF token on cookie-auth POSTs | **Medium** | Relies entirely on `SameSite=Lax` | Add a double-submit token or `Sec-Fetch-Site` check on `/api/*` mutations | Cross-site form posts blocked; in-app POSTs unaffected |
| Submissions are visible across referees with no assignment model | **Medium** | Every referee sees the global queue (top 50) | Add `submission_assignments` table and route `/api/referee/queue` to filter by assignment unless admin overrides | Referee A and Referee B can be given disjoint queues |
| Referee can’t mark a submission `approved/rejected/flagged` | **Medium** | DB allows it; API does not | Add `PATCH /api/referee/submissions/[id]/status` for referee/admin | Status flips persist and are visible to admin |
| Hard-coded hero stats and testimonials | **Medium** | Trust risk | Per §5 | No fictional users / numbers in production UI |
| Footer publicly advertises `/admin` and `/referee` | **Low** | Pen-test surface | Remove “For staff” column from public footer; staff can bookmark | Footer hides operator routes |

---

## 7. Add — MVP Features That Are Missing

Each item is scoped to MVP only. P0 = required for launch; P1 = should-have, can ship within MVP window; P2 = nice-to-have, can slip.

### A. Bling Records Show Branding

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Show-specific Hero | P0 | Public | Bling Records Show logo + tagline + Neo Studios attribution + “Apply now” CTA | Visible on `/` above the fold; mobile and desktop |
| About page (`/about`) | P0 | Public | Who Bling Records is, what Neo Studios brings, the show concept (24-episode reality format, 12 finalists, music house) — without overpromising in MVP copy | Page exists; bilingual EN/AM |
| Show format preview (`/auditions` or section on `/`) | P0 | Public | Steps from audition → review → shortlist → next round; no specific date claims unless confirmed | Section live; copy reviewed by founder |
| Judge / referee credibility section | P1 | Public | Photos + credentials of the actual referees if disclosed; otherwise show a generic “Industry panel” block until known | Section live with placeholder-or-real content; no fictional names |
| Production partner section (Neo Studios) | P1 | Public | Logo + 1-paragraph blurb. **Only if approved by client.** | Founder sign-off on copy before publish |
| Music/show visual direction | P0 | Public | Replace stock spotlight gradients with show-grade imagery (real photos or commissioned art) | At least 3 unique brand-grade images on `/`, `/about`, `/auditions` |
| Bling Records Show metadata (title/description/og) | P0 | Public | Rewrite [src/app/layout.tsx](../src/app/layout.tsx) `metadata` block | Lighthouse SEO ≥ 90 |
| Remove or repurpose `TalentQuest` references | P0 | All | Search-and-replace the brand string app-wide; keep the codebase folder name (`talent-quest`) for now to avoid Vercel project rename churn | No `TalentQuest` text in user-facing UI |

### B. Real Contestant Application Flow

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Extended contestant profile fields | P0 | Contestant | Real name, stage name, DOB *or* age, phone, city, country, music category (rap / singing / songwriting / performance / instruments / other), social links (IG, TikTok, YouTube), short bio | All fields persist in `contestants` (extended schema, see §12); validation in Zod |
| Music-category set | P0 | Contestant | Replace generic “Other Talents” bucket with music-first taxonomy that fits Bling Records | Category enum updated in DB + Zod + UI; legacy `acting / comedy` deferred |
| Consent + terms checkboxes | P0 | Contestant | Three explicit consents: rules acceptance, content licensing, age confirmation (18+ default; under-18 needs guardian consent flow) | Cannot submit without each box checked; choices recorded |
| Edit profile after registration | P0 | Contestant | `PATCH /api/contestants/me` with the same Zod validators; UI on `/contestant/profile` | Contestant can change phone, bio, socials; cannot change DOB / consent |
| Forgot / reset password | P0 | Contestant | Email a one-time reset token; expire in 30 min | End-to-end test: lose access, recover access, log in |
| Withdraw / delete account | P1 | Contestant | Soft-delete; preserve scores for audit | Contestant marked withdrawn; cannot log in |
| Email verification on registration | P1 | Contestant | One-time link before `submitted` status is allowed | Unverified contestants can browse but cannot submit |

### C. Video Submission

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Real upload UI on top of `createUploadIntent` | P0 | Contestant | Browser POSTs the file directly to Cloudinary using the signed intent | A 200 MB MP4 uploads from a phone in under 2 minutes on a normal connection |
| Upload progress indicator | P0 | Contestant | XHR / fetch with progress events | UI shows percentage, kilobytes, ETA |
| Validation: format, size, duration, resolution | P0 | Contestant | MP4/MOV/WEBM; ≤ 500 MB; 60–180 s; ≥ 720p preferred | Out-of-spec uploads rejected client-side; server double-checks duration via Cloudinary metadata |
| Upload success / failure / retry state | P0 | Contestant | Resumable retries on transient failures | Failed upload prompts retry; never silently loses the file |
| In-app preview after upload | P0 | Contestant | `<video controls>` against the returned `secure_url` | Contestant can re-watch before final submit |
| Replace submission before round closes | P1 | Contestant | One open submission slot; replacing supersedes the old one | Old submission marked `superseded`; only the latest counts in scoring |
| URL submission as fallback | P1 | Contestant | Keep current YouTube-paste path | Reachable from a “Trouble uploading?” link, not the primary CTA |
| Audition video guidance | P0 | Contestant | The existing `/upload-guide` content tweaked for music auditions | Upload page links to the guide; pre-flight checklist visible above the upload widget |

### D. Judge / Referee Review Portal

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Assigned-queue model | P0 | Referee, Admin | New `submission_assignments` table; `/referee/dashboard` shows only what the referee owns | Two referees can have disjoint queues |
| In-portal video playback | P0 | Referee | Native `<video>` against Cloudinary `secure_url`; HLS later | Referee never has to leave the page to evaluate |
| Contestant context panel | P0 | Referee | Stage name, age, city, category, bio, social links | Visible alongside the player |
| 5-criterion scoring | P0 | Referee | Already implemented; preserve | Scores persist via `POST /api/scores` |
| Public notes / private notes | P1 | Referee | Two separate textareas: notes shareable with the contestant vs. internal-only | Public notes returned by result-checker API; private notes admin-only |
| Mark approved / rejected / flagged | P0 | Referee, Admin | New endpoint and DB transitions per §6 | Admin sees status changes immediately |
| Prevent silent score overwrite | P1 | Referee | If a score already exists, prompt before overwriting | UI shows current score before edit |
| “Done reviewing” state | P1 | Referee | When queue is empty, show a clear empty state with refresh CTA | Already partially implemented; tighten copy |
| Activity log for admin | P1 | Admin | Who scored what, when | New `audit_logs` table |

### E. Admin Dashboard

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Contestant detail view | P0 | Admin | Drill-down from list → full contestant + submissions + scores + payments timeline | Single page with all the data |
| Filters | P0 | Admin | Status, city, category, score band; combinable | Filter chips reflect URL params |
| Assign referees to submissions | P0 | Admin | Drag/drop or table action to assign 1+ referees per submission | Assigned referees see the item in their queue |
| Manual status change | P0 | Admin | Admin can move a contestant through `submitted → shortlisted → advanced/eliminated` | Status persists; audit-logged |
| Manual payment override UI | P0 | Admin | UI on top of existing `PATCH /api/admin/payments/[id]` | Admin can mark a payment succeeded/failed/refunded |
| CSV export | P1 | Admin | Contestants + scores + payments → CSV | Download triggers correctly |
| Settings page | P1 | Admin | Toggle “registration open”, “submissions open”, fee amount | Toggle changes runtime behaviour without redeploy |
| Contact-message inbox | P1 | Admin | List, mark handled | Visible only to admin |
| KPI tiles (already exist) | P0 | Admin | Keep existing `/api/admin/stats` | Numbers reflect production data |

### F. Result Checker

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Refined status copy | P0 | Public | Map raw DB statuses to clear public-facing labels: *Application received*, *Under review*, *Shortlisted*, *Not selected*, *Payment pending*, *Accepted to next round* | One label per state; bilingual EN/AM |
| Rate-limit + abuse-resistance | P0 | Public | Per §6 | 429 after threshold; no PII leak on miss |
| Per-status next step | P0 | Public | Each status surfaces 1 actionable next step | Copy reviewed |
| Hide private fields when looked up by public | P0 | Public | Already partial via `contestantToPublicDTO`; verify no email/phone/DOB leakage | Manual check + automated test |
| Look up by contestant ID *or* email + DOB | P2 | Public | Alternative path for contestants who lost their code | Optional |

### G. Legal / Trust Pages

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| `/terms` | P0 | Public | Entry rules, eligibility, judging, publication rights, prize, disqualification, dispute resolution | Lawyer-reviewed copy |
| `/privacy` | P0 | Public | Data collected, why, retention, contact | Lawyer-reviewed copy |
| `/contestant-rules` (or merge with `/terms`) | P0 | Public | Performance rules, originality, copyright, use of cover songs, age policy | Founder-approved |
| `/content-rights` | P1 | Public | Who owns the submitted videos; broadcast and re-distribution rights | Required if any TV broadcast is intended |
| `/refund-policy` | P0 | Public | If payment is required: when refunds apply | Clear, short |
| `/contact` (already exists) | P0 | Public | Already there; refresh content per §5 | Real contact info live |
| `/support` page or merging into `/contact` | P1 | Public | Support hours, response SLA | Clear expectation |

### H. Responsive UX

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Mobile-first audition flow | P0 | Contestant | Every form, upload, payment, and result screen must be usable on a 5″ phone | Tested on iPhone SE viewport in DevTools |
| Smooth long-form flow | P0 | Contestant | Save-and-resume registration if interrupted | LocalStorage persistence between steps |
| Fast landing page | P0 | Public | LCP ≤ 2.5 s on 4G; CLS ≤ 0.1 | Lighthouse mobile run |
| Single primary CTA per page | P0 | Public | One golden “Apply now” / “Submit audition” / “Pay fee” per page | Manual review |
| Loading + empty states | P0 | All | No bare “Loading…” spinners with no escape | Each async screen has skeleton + retry |
| Error states with recovery | P0 | All | Specific, copy-reviewed messages, no raw stack traces | Manual review |

### I. Content Guidance

| Feature | Priority | User Role | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Audition video instructions | P0 | Contestant | Lighting, audio, length 60–180 s, file type, performance type, **originality clause**, **no full master-track cover** | Visible on `/upload-guide` and inline in the upload form |
| Music-specific tips per category | P0 | Contestant | Per-category guidance (rap → live vocal vs backing track; songwriter → original work only; etc.) | Per-category section on `/upload-guide` |
| Sample audition reference | P1 | Contestant | 1–2 short reference clips (ideally Bling Records artists) | Linked from `/upload-guide` |
| Pre-flight checklist | P0 | Contestant | Existing 10-point checklist preserved and Bling-Records-toned | Visible above the upload widget |

---

## 8. Out of Scope for MVP

| Feature | Why Out of Scope | Future Phase |
| --- | --- | --- |
| Audience accounts + persisted likes / votes | Requires identity, abuse controls, and rate-limiting that double the surface area | Phase 6 |
| Comments / chat threads on submissions | Same as above; needs moderation tooling | Phase 6 |
| Public TikTok/Reels-style social feed | Out of scope until persisted likes + real video player + audience accounts ship | Phase 6 |
| Livestreaming | Massive infra (encoder, CDN, DRM); deferred until a confirmed live event date | Phase 6+ |
| Full video-on-demand catalogue | Same | Phase 6+ |
| 24-episode / season manager | Production tool, only useful once season 1 is live | Phase 6 |
| Music-house logistics module | Operational software for after the show is cast | Phase 7 |
| Celebrity / mentor portal | Tied to the production phase, not auditions | Phase 6 |
| Sponsor dashboard | Tied to monetization, not auditions | Phase 7 |
| Advanced analytics (cohort, funnels, retention) | KPI tiles cover MVP; instrument later | Phase 6 |
| AI-assisted talent judging | Reputation risk + scope creep | Phase 7 |
| Native mobile apps | Mobile web is sufficient for MVP | Phase 7 (only if a clear ROI emerges) |
| In-app messaging between admin and contestants | Email is sufficient for MVP | Phase 6 |
| Rich notifications (push, SMS) | Plain transactional email is enough; SMS only if explicitly approved | Phase 5–6 |
| Multi-language beyond EN/AM | Out of scope unless Tigrinya/Oromifa requested | Phase 6+ |
| Contract / NDA signing flow | Belongs to post-shortlist operations, not auditions | Phase 6 |
| Music rights / licensing module | Big legal product on its own | Phase 7+ |
| Public contestant leaderboard | Mixes audience voting + score visibility — out until both are real | Phase 6 |
| Advanced payment monetization (subscriptions, paid boosts, sponsor tiers) | Single audition fee is enough for MVP | Phase 7 |

---

## 9. Recommended Information Architecture

### Public routes

| Route | User Role | Purpose | Keep / Add / Modify | Notes |
| --- | --- | --- | --- | --- |
| `/` | Public | Show landing page | Modify (re-brand, replace fake stats/testimonials) | Existing route |
| `/about` | Public | Bling Records + Neo Studios story | **Add** | New |
| `/auditions` | Public | Show format + how to apply | **Add** (replaces `/how-it-works` framing) | Repurpose existing `/how-it-works` content under this URL |
| `/apply` | Public → Contestant | Entry point to register / continue application | **Add** (alias of `/register` with show-flavoured copy) | Redirect old `/register` here |
| `/register` | Public → Contestant | Account creation | Modify (rebrand, add consents, music categories) | Existing |
| `/login` | Public | Email + password login | Modify (hide seed-cred block in production) | Existing |
| `/forgot-password` | Public | Reset flow | **Add** | P0 |
| `/reset-password` | Public | Token landing | **Add** | P0 |
| `/result-checker` | Public | 6-digit lookup | Modify (status copy, rate-limit) | Existing |
| `/contact` | Public | Inbound | Modify (real contact info) | Existing |
| `/terms` | Public | Legal | **Add** | P0 |
| `/privacy` | Public | Legal | **Add** | P0 |
| `/content-rights` | Public | Legal | **Add (P1)** | If broadcast is in scope |
| `/refund-policy` | Public | Legal | **Add** if payment required | P0 |
| `/upload-guide` | Public / Contestant | How to record | Modify (music tone) | Existing |
| `/faq` | Public | EN/AM FAQ | Modify (Bling Records Show entries) | Existing |
| `/showcase` | Public | Approved auditions gallery | Modify — collapse to single grid; remove fake counters | Existing; demote Reels view |
| `/categories` | Public | Music categories overview | Modify (music-first taxonomy) | Existing |
| `/admin-demo`, `/referee-demo` | – | Vestigial | **Remove** | See §5 |

### Contestant routes

| Route | User Role | Purpose | Keep / Add / Modify | Notes |
| --- | --- | --- | --- | --- |
| `/contestant/dashboard` | Contestant | Hub: status, submission, payment, schedule | **Add** (rename from `/profile`) | Old `/profile` redirects here |
| `/contestant/profile` | Contestant | Edit profile | **Add** | Replaces the “Account” tab on the old `/profile` |
| `/contestant/submission` | Contestant | Upload / replace audition | **Add** | Replaces the “Submission” tab |
| `/contestant/payment` | Contestant | Initiate / view fee | **Add** | Replaces the inline `PaymentCard` |
| `/contestant/result` | Contestant | Personal result page | **Add** | Mirrors `/result-checker` for the logged-in user |

### Referee routes

| Route | User Role | Purpose | Keep / Add / Modify | Notes |
| --- | --- | --- | --- | --- |
| `/referee/dashboard` | Referee, Admin | Queue overview + KPIs | Modify (split from current `/referee`) | Existing |
| `/referee/submissions` | Referee, Admin | Filterable list | **Add** | Replaces queue carousel-only view |
| `/referee/submissions/[id]` | Referee, Admin | Detail + scoring | **Add** (split from list) | New per-submission deep link |
| `/referee/reviews` | Referee, Admin | History of own reviews | **Add (P1)** | |

### Admin routes

| Route | User Role | Purpose | Keep / Add / Modify | Notes |
| --- | --- | --- | --- | --- |
| `/admin/dashboard` | Admin | KPI overview | Modify (rename `/admin`; keep KPIs) | Existing |
| `/admin/contestants` | Admin | List + filter + detail | **Add** | List exists; add detail view |
| `/admin/contestants/[id]` | Admin | Single contestant detail | **Add** | New |
| `/admin/submissions` | Admin | All submissions cross-cut by status | **Add** | New |
| `/admin/referees` | Admin | Referee mgmt + assignments | **Add** | New |
| `/admin/results` | Admin | Round results, shortlist, advance/eliminate | **Add** | New |
| `/admin/settings` | Admin | Toggles (registration/submissions/fee), audit log | **Add (P1)** | |
| `/admin/payments` | Admin | Payments table with override | **Add (P1)** | Backend exists |
| `/admin/messages` | Admin | Contact-form inbox | **Add (P1)** | DB exists |

---

## 10. Recommended User Flows

### 10.1 Public Visitor → Contestant Registration

- **Entry:** `/` or any marketing route.
- **Steps:**
  1. Visitor reads hero and CTA.
  2. Clicks **Apply now** → `/apply` (= `/register`, rebranded).
  3. Step 1: name, email, password, phone, age/DOB, city.
  4. Step 2: music category, talent type, bio, socials.
  5. Step 3: review + consents + ToS + privacy.
  6. Submit → server creates user + contestant + 6-digit ID + JWT cookie.
  7. Success card with ID + 3 next-step links: profile, submit audition, pay fee.
- **Success:** redirected to `/contestant/dashboard`.
- **Failure:** server-side 4xx surfaces inline; password too short, email taken, terms not accepted, rate-limited.
- **Required screens:** `/apply` (multi-step), success card, `/contestant/dashboard`.
- **Required backend:** existing `/api/auth/register` extended with new fields + consent timestamps.

### 10.2 Contestant → Payment (if Option A)

- **Entry:** `/contestant/dashboard` after registration.
- **Steps:**
  1. Dashboard shows “Pay registration fee — required to submit audition.”
  2. Click **Pay** → `POST /api/payments/init`.
  3. Open AdmasPay checkout in new tab; modal polls `/api/payments/[id]`.
  4. Webhook lands → status flips to `succeeded`.
  5. Dashboard updates; submission becomes available.
- **Success:** `payments.status = succeeded`, contestant unlocked for upload.
- **Failure:** `failed`/`pending` surfaces with retry; admin manual override available.
- **Required screens:** dashboard, payment modal, success/fail states.
- **Required backend:** existing init/webhook + admin override UI.

### 10.3 Contestant → Audition Video Submission

- **Entry:** `/contestant/dashboard` (after payment if Option A).
- **Steps:**
  1. Click **Upload audition** → `/contestant/submission`.
  2. Read inline checklist; pick file.
  3. Client requests upload intent (`GET /api/submissions` returns intent).
  4. File uploads directly to Cloudinary with progress.
  5. Cloudinary returns secure URL + duration.
  6. Client `POST /api/submissions` with title + URL + thumbnail + duration.
  7. Server marks `video_submitted` step done; status `submitted`.
- **Success:** preview player + “Replace video” CTA.
- **Failure:** retry on transient; reject on out-of-spec; clear error copy.
- **Required screens:** `/contestant/submission`.
- **Required backend:** Cloudinary intent (already there), submission create (already there), validation extension.

### 10.4 Contestant Checks Result

- **Entry:** `/result-checker` (public) or `/contestant/result` (logged-in).
- **Steps:**
  1. Enter 6-digit code (or auto-filled if logged in).
  2. Server returns mapped status + next-step copy + (if available) aggregate score.
- **Success:** status card with friendly label.
- **Failure:** clear “No match” state.
- **Required screens:** `/result-checker`, `/contestant/result`.
- **Required backend:** existing `/api/contestants/[id]` + rate-limit + status mapping.

### 10.5 Referee Reviews and Scores

- **Entry:** `/referee/dashboard`.
- **Steps:**
  1. Sees assigned queue.
  2. Opens `/referee/submissions/[id]` → in-app player + contestant context.
  3. Scores 5 criteria; writes notes.
  4. Submits → `POST /api/scores` → next item.
- **Success:** queue decrements; `reviewedByMe` flips.
- **Failure:** score validation errors inline.
- **Required screens:** dashboard, list, detail.
- **Required backend:** scores upsert + assignments.

### 10.6 Admin Manages and Shortlists Contestants

- **Entry:** `/admin/dashboard`.
- **Steps:**
  1. Filters contestants by status + score band.
  2. Opens detail; reviews scores + notes + payment.
  3. Updates status to `shortlisted` / `advanced` / `eliminated`.
  4. Optionally assigns/re-assigns referees.
- **Success:** contestant status persists; notification (Phase 5) sent.
- **Failure:** RBAC + audit-logged on every change.
- **Required screens:** dashboard, list, detail, results.
- **Required backend:** admin status mutation API + audit log.

### 10.7 Admin Exports Contestant Data

- **Entry:** `/admin/contestants` or `/admin/results`.
- **Steps:**
  1. Apply filters.
  2. Click **Export CSV**.
  3. Server streams CSV with respected filters.
- **Success:** CSV file download.
- **Failure:** download fails → admin retries.
- **Required screens:** filter bar + export button.
- **Required backend:** new `GET /api/admin/contestants/export.csv`.

---

## 11. UX Direction and Visual Style

### Feel

The product should feel **premium, cinematic, music-industry-credible, bold, performance-driven, youthful but trustworthy**. It should not look like a free Bootstrap talent-show template.

### Design language

- **Background:** dark cinematic, near-black with stage-light atmosphere.
- **Accents:** Bling Records gold/amber as a primary accent (already in `tailwind.config.ts` brand palette). Add a single secondary accent (e.g. Bling Records signature color, TBD) once brand guide is confirmed.
- **Imagery:** real performance photography — mics, stage lights, in-the-zone artist shots. **Replace all Unsplash filler** before launch.
- **Typography:** keep the existing Inter (body) + Space Grotesk (display) pairing; add tight letter-spacing on display headlines.
- **Motion:** purposeful — entrance fades on hero, micro-interactions on CTAs. Keep Framer Motion. Do not over-animate; respect `prefers-reduced-motion`.
- **CTAs:** one primary gold gradient button per screen; secondary outlined; tertiary ghost.
- **Forms:** mobile-first, single-column, generous tap targets (≥ 44 px), inline error copy, persistent step indicator on multi-step flows.
- **Trust:** show real referees / production partner logos; show real numbers only; keep contact info live; surface terms/privacy in the footer of every page.
- **Accessibility:** WCAG AA contrast everywhere (audit currently fails on `muted-foreground` on dark mode); `aria-label` on icon-only buttons; `prefers-reduced-motion`; `lang="en"` and `lang="am"` toggling on bilingual pages.

### What changes from the current vague AGT framing

- Drop generic copy (“Ethiopia’s stage for the next big talent”) for show-specific framing (“The Bling Records Show — where Ethiopia’s next musical icon is made, in partnership with Neo Studios”).
- Replace the 6-category “generic talent” taxonomy with a music-first taxonomy.
- Replace the “60-second pitch” language with “studio-ready audition” language.
- Replace fictional testimonials with named industry voices, or remove the section.
- Replace the “TalentQuest” lockup with the Bling Records Show lockup; keep gold-on-black brand grammar.

---

## 12. Data Model Recommendations

The current schema (audit §I) is a strong starting point. Below are the entities the MVP needs, with deltas from the current state.

| Entity | Purpose | Key Fields | MVP Required? | Notes |
| --- | --- | --- | --- | --- |
| `users` | Account + role | id, email, password_hash, role, full_name, created_at | Yes (exists) | Add `email_verified_at`, `last_login_at` (P1) |
| `password_reset_tokens` | Forgot password | user_id, token, expires_at, used_at | Yes | New |
| `contestant_profiles` *(was `contestants`)* | Application data | id (6-digit), user_id, stage_name, real_name, dob, phone, city, country, music_category, talent_type, bio, social_ig, social_tt, social_yt, status, agreed_to_terms_at, agreed_to_rights_at, age_consent_at | Yes | Extend existing `contestants` table; do not rename if the cost is high — see §17 phase 2 |
| `progress_steps` | Per-contestant pipeline | composite (contestant_id, step_key), label, done, done_at, ord | Yes (exists) | Refresh step labels for the show |
| `submissions` | Audition entries | id, contestant_id, title, video_url, cloudinary_public_id, thumbnail_url, duration_sec, format, size_bytes, resolution, status, supersedes_id, created_at | Yes (exists, extend) | Add Cloudinary public_id, format, size, resolution, supersedes_id |
| `submission_media` | Optional: multiple takes | id, submission_id, kind (audio/video), url, public_id | P1 | Future-proofing; not strictly required for MVP |
| `submission_assignments` | Which referee owns which submission | submission_id, referee_user_id, assigned_at, assigned_by_user_id | Yes | New |
| `scores` | Per-criterion scoring | id, submission_id, referee_user_id, criterion, points, max_points | Yes (exists) | Keep |
| `score_notes` | Private notes | composite (submission_id, referee_user_id), notes, public_notes (P1), updated_at | Yes (exists) | Add `public_notes` column for §7-D |
| `payments` | Fee collection | id, contestant_id, amount_cents, currency, provider, provider_ref, status, created_at, updated_at | Yes (exists) | Keep |
| `contact_messages` | Inbound | id, name, email, topic, message, handled, created_at | Yes (exists) | Add `handled_by_user_id`, `handled_at` |
| `audit_logs` | Admin/referee action trail | id, actor_user_id, target_type, target_id, action, payload (jsonb), created_at | Yes | New, P1 |
| `settings` | Runtime toggles | key, value (jsonb), updated_by_user_id, updated_at | Yes | New, P1: `registration_open`, `submissions_open`, `fee_cents`, `current_round` |
| `result_codes` | Optional: separate lookup tokens | code, contestant_id | No | Stick with existing 6-digit `contestant_profiles.id` for MVP |
| `episodes`, `rounds`, `votes`, `comments`, `audience_users` | Phase 6 | – | No | Out of MVP |

> **Migration discipline:** every schema change ships through `src/lib/db.ts`’s `doMigrate()` and runs idempotently. Never write “drop column / drop table” without a 2-step deploy.

---

## 13. API / Backend Scope

| API Area | Required Capability | MVP/Future | Notes |
| --- | --- | --- | --- |
| Auth | Register, login, logout, me | MVP (exists) | Keep |
| Auth | Forgot/reset password | MVP | New |
| Auth | Email verification | P1 | New |
| Profile | Edit own contestant profile | MVP | New `PATCH /api/contestants/me` |
| Submission | Issue Cloudinary upload intent | MVP (exists) | Keep; client must consume it |
| Submission | Create / replace own submission | MVP (exists for create; **add replace**) | Mark `superseded` on replace |
| Submission | List own submissions | MVP (exists) | Keep |
| Submission | Public approved feed (for `/showcase`) | MVP (exists) | Tighten so only really-approved items show |
| Submission | Validate format/size/duration | MVP | Server-side using Cloudinary metadata |
| Referee | Assigned queue | MVP | Replace global top-50 query with assignment join |
| Referee | Score upsert | MVP (exists) | Keep |
| Referee | Notes (public + private) | MVP / P1 | Extend `score_notes` |
| Referee | Status mutation (approve/reject/flag) | MVP | New |
| Admin | Stats / KPIs | MVP (exists) | Keep |
| Admin | Contestants list + detail | MVP (list exists; detail new) | Detail aggregates submissions + scores + payments |
| Admin | Status mutation per contestant | MVP | New |
| Admin | Referee management + assignments | MVP | New |
| Admin | Payments override | MVP (exists) | Add UI |
| Admin | CSV export | P1 | New |
| Admin | Settings toggles | P1 | New |
| Admin | Contact-message inbox | P1 | New |
| Admin | Audit log read | P1 | New |
| Result checker | Public lookup with rate-limit | MVP (exists; harden) | Per §6 |
| Payment | Init checkout | MVP (exists) | Keep |
| Payment | Status poll | MVP (exists) | Keep |
| Payment | Webhook | MVP (exists) | Keep |
| Chatbot | Static + LLM fallthrough | MVP (exists) | Reposition as support |
| Notifications | Transactional email (registration, password reset, status change) | P1 | New — recommend Postmark / Resend; SMS only if explicitly approved |

---

## 14. Payment Scope

The current scaffolding (3-mode AdmasPay/Telebirr) is the right foundation. The product question is **when** payment is required.

### Two acceptable MVP options

**Option A — Pay before submission.**
- Contestant must pay the registration fee before they can upload their audition.
- Pros: maximises serious applicants; predictable cash flow; lighter moderation load.
- Cons: lower top-of-funnel conversion; stricter refund policy required; requires payment infra to be 100% solid before launch.

**Option B — Pay after passing screening.**
- Contestant applies + uploads for free; if they pass initial admin/referee screening, they pay to advance to the next round.
- Pros: bigger applicant pool; richer data; easier launch-day story (“apply free”).
- Cons: more storage/moderation cost; second round-trip with the contestant; conversion drop after screening.

### Recommendation

**Option B for MVP.** Reasons:
- It de-risks launch — the platform doesn’t need to be perfect on day 1, only good enough to accept a free submission.
- It protects against a leaked payment link causing real-money harm during the cleanup window.
- It produces a richer dataset to inform whether a fee is even needed long-term.
- It allows the show to advertise “free to apply” — a stronger marketing CTA in the Ethiopian context.

A fallback to Option A can be enabled by a single `settings.fee_required_at = 'apply' | 'shortlist'` toggle (Phase 4 settings work).

### Required for either option

- Real provider account (AdmasPay or Telebirr) under the rotated credentials.
- Working webhook with HMAC verification (already exists).
- Manual reconciliation UI for admin (already exists at API level; needs UI per §7-E).
- Clear payment success / failure / cancel screens with copy reviewed by founder.
- `/refund-policy` page (§7-G).

---

## 15. Video Upload Scope

### MVP recommendation: managed direct upload to Cloudinary

The server already produces a signed upload intent. The remaining work is **client wiring + validation + playback**.

### Specifics

- **Provider:** Cloudinary (already integrated; switching to Mux is Phase 6).
- **Path:** browser uploads directly to Cloudinary using the signed intent — no bytes ever transit our server.
- **Storage:** persist `secure_url`, `public_id`, `format`, `bytes`, `duration`, `width`, `height` returned by Cloudinary in `submissions`.
- **Accepted formats:** MP4, MOV, WEBM (Cloudinary will normalise on delivery).
- **Max size:** 500 MB.
- **Max duration:** 180 seconds (server-validated against Cloudinary metadata).
- **Min duration:** 60 seconds (client-warned, server-enforced).
- **Min resolution:** 720p recommended; 480p hard floor.
- **Upload states:** `idle → uploading (with progress) → validating → success | failed`.
- **Failure handling:**
  - Transient (network, 5xx) → automatic retry up to 3 times with exponential backoff.
  - Validation (too long, too small) → user-facing copy explaining why and how to fix.
  - Provider down → fall back to URL submission with a “We’ll review your link” banner; admin notified.
- **Playback:** referee + admin **must** play the video inside the portal (`<video controls preload="metadata">` against `secure_url`). HLS / adaptive streaming can wait.
- **Replace flow:** uploading a new file marks the prior submission as `superseded`; only the latest is scored.
- **Thumbnail:** Cloudinary auto-generates a poster frame; we store it in `thumbnail_url`.

---

## 16. Security and Privacy Scope

| Requirement | Status today | MVP target |
| --- | --- | --- |
| No committed secrets | ❌ | ✅ — §0 cleanup complete; CI check forbids env files |
| Secrets in host env only | Partial | ✅ — Vercel env for prod + preview |
| bcrypt password hashing | ✅ | Keep cost 10; bump to 12 if benchmarks allow |
| HS256 JWT, HTTP-only, Secure, SameSite=Lax | ✅ | Keep; rotate `JWT_SECRET`; add `__Host-` cookie prefix in prod |
| Edge RBAC for `/admin`, `/referee` | ✅ | Extend to any new contestant-only pages |
| API-level `requireRole(...)` on every privileged endpoint | ✅ | Audit on every PR |
| Private contestant data protection | Partial — `/api/contestants/[id]` returns full name to anyone with the code | Strip to initials + status for anonymous lookups; logged-in contestant sees their own |
| Payment verification | ✅ HMAC | Keep; treat any signature mismatch as 401 (already does) |
| Upload validation | ❌ | Server validates format / size / duration via Cloudinary metadata |
| Rate-limit on `/api/auth/login` | ❌ | 10 fails / 15 min / IP |
| Rate-limit on `/api/contestants/[id]` | ❌ | 30 / 5 min / IP, escalating |
| CSRF defence on cookie-auth POSTs | Partial (SameSite=Lax) | Add double-submit token or `Sec-Fetch-Site` check on `/api/*` mutations |
| Audit logs for admin actions | ❌ | New `audit_logs` table; write on every status change, payment override, role change |
| Terms / privacy / consent pages | ❌ | §7-G live before launch |
| Age-of-consent handling | ❌ | DOB collected; under-18 flow requires explicit guardian email + checkbox |
| Data retention policy | ❌ | Documented in `/privacy`; soft-delete on withdrawal |
| Backup + restore plan | Implicit (Neon snapshots) | Document RPO/RTO in `docs/SECURITY.md` (already exists in repo) |
| Observability | Minimal | Add `console.error → Vercel logs`; consider Sentry in Phase 5 |

---

## 17. Implementation Phasing

### Phase 0 — Security cleanup *(start here, blocks everything else)*

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Remove all committed secrets and rotate them | All of §0 (tasks 0.1–0.9) | `git ls-files .env.local` empty; old creds rejected; production build reads from host env; smoke test green |

### Phase 1 — Product repositioning

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Land the Bling Records Show brand and remove generic talent-hunt confusion | §7-A all P0; §5 brand-related drops; §6 README/leftover fixes | Marketing pages say Bling Records Show; no fictional users/numbers; Lighthouse SEO ≥ 90 |

### Phase 2 — Contestant application

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Production-quality audition funnel | §7-B all P0; §7-C all P0; §7-G `/terms`, `/privacy`, `/refund-policy` (P0); §7-I content guidance | Contestant can register → upload → see status; consents recorded; legal pages live; mobile flow tested on a 5″ viewport |

### Phase 3 — Referee portal

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Score auditions with full context, in-app | §7-D all P0; assignment model in §12 | Referee never leaves the page to evaluate; assigned queues work; status mutations persist |

### Phase 4 — Admin portal

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Operate the season end-to-end | §7-E all P0 (+ P1 settings/payments UI/messages inbox) | Admin can list, filter, drill, assign, mutate, override payments, export CSV; audit log captures every mutation |

### Phase 5 — Trust, legal, and launch readiness

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Be safe and credible enough to publicise | Rate-limits, CSRF, audit logs, transactional email (P1), full QA pass, founder/lawyer copy review, bilingual pass | All §16 items checked; no “TODO” or “mock” strings in prod build; Lighthouse ≥ 90 across the audition path |

### Future Phase 6 — Audience layer

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Open the show to public engagement | Audience accounts, persisted likes, comments, real Reels view, in-app player upgrades, simple notifications | Out of MVP. Plan only when a confirmed broadcast partner needs it. |

### Future Phase 7+ — Production layer

| Goal | Tasks | Acceptance Criteria |
| --- | --- | --- |
| Production-tooling for the 24-episode format | Episode/season manager, mentor portal, sponsor dashboard, music rights, livestream | Out of MVP. Triggered by a green-lit production schedule. |

---

## 18. Final Agent Execution Notes

For the implementation agent who picks up this scope:

- **Do Phase 0 first.** No feature work, no refactor, no rebrand until §0 is complete and verified. Treat §0 as a hard precondition.
- **Do not keep the vague AGT branding.** Once Phase 0 is green, Phase 1 is pure rebrand to Bling Records Show. Don’t mix Phases 0 and 1.
- **Do not build out-of-scope features (§8).** If the founder asks for something on that list, push back with this document and ask which MVP item to swap out.
- **Do not implement fake UI.** Every visible button, badge, count, like, vote, or notification icon must be backed by a real persisted state. Empty states are better than fictional ones.
- **Prefer completing existing strong foundations over adding new complexity.** The Cloudinary intent + scoring + RBAC + payment scaffolding are all 70 % done. Finishing them is higher leverage than greenfield.
- **Keep TypeScript clean.** `npm run type-check` must stay green at the end of every commit. No `// @ts-ignore` without an attached issue.
- **Preserve working auth, RBAC, scoring, and the result checker.** These are the load-bearing parts of the product. Don’t rewrite them; refine them in place.
- **Remove dead demo / SQLite leftovers** (§5) early in Phase 1, in their own commits, so the cleanup is reviewable.
- **Keep implementation incremental.** One PR per feature in §7. No omnibus PRs.
- **Every new feature must have acceptance criteria.** Use the table in §7 as the contract. Don’t merge a feature whose acceptance criteria aren’t demonstrably met.
- **Every broken route must either be implemented or removed.** No commit should leave a dangling `redirectUrl` or referenced-but-missing API route. Track every fix in §6 to closure.
- **Communicate uncertainty.** If a question in the audit (or §14 Option A vs B) hasn’t been answered by the founder, do not guess — call it out in the PR and pause.
- **Bias toward removing scope, not adding it.** When in doubt, defer to Phase 6+. The MVP wins by being shipped, not by being complete.

---

*End of scope document.*
