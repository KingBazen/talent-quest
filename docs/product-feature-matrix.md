# Bling Records Show — Product Feature Matrix

> **Document type:** Single-row-per-feature catalogue. Source of truth for status / priority / phase.
> **Read first:** [current-product-ux-ecosystem-audit.md](current-product-ux-ecosystem-audit.md), [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md), [full-ux-ecosystem-documentation.md](full-ux-ecosystem-documentation.md), [full-development-roadmap.md](full-development-roadmap.md).
> **Status of code:** No application code is to be modified by the act of writing this doc.

---

## Legend

- **Priority:** P0 Critical · P1 Important · P2 Useful · P3 Future
- **Phase:** 0–14 — see [full-development-roadmap.md](full-development-roadmap.md)
- **Current Status:**
  - `Existing` — already in code, working
  - `Existing-cleanup` — exists but needs refinement / fix
  - `Missing` — must be added
  - `Future` — planned for a later phase
  - `Out of Scope (MVP)` — not built in MVP at all
- **Keep / Drop / Add:** terminal action verb on the existing artefact

---

## Module A — Public Website

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | Hero (Bling Records Show) | Branded hero with show identity + apply CTA | Public | P0 | 1 | Existing-cleanup | Modify | Light | Medium | Brand mistakes | No “TalentQuest” copy; Bling Records + Neo Studios attribution; one CTA above fold |
| A | About page | Show story, label, production partner | Public | P0 | 1 | Missing | Add | None | Medium | Copy approval | Founder-approved copy live; bilingual |
| A | Auditions page | Format + how to apply | Public | P0 | 1 | Existing-cleanup (`/how-it-works`) | Modify | None | Low | – | Page repurposed under `/auditions` with redirect from `/how-it-works` |
| A | Show format teaser | 24-episode reality, 12 finalists | Public | P0 | 1 | Missing | Add | None | Medium | Overpromising | Section published only after founder review |
| A | Judges page | Industry panel | Public | P1 | 1 (placeholder), 5 (real) | Missing | Add | DB read | Medium | Privacy of judges | Real names + bios only with judge consent |
| A | Mentors page | Celebrity mentors | Public | P2 | 13 | Future | Add | DB read | Medium | – | Phase 13 |
| A | Sponsors page | Brand partners | Public | P2 | 13 | Future | Add | DB read | Medium | Contracts | Phase 13 |
| A | Categories page | Music-first taxonomy | Public | P0 | 1 | Existing-cleanup | Modify | None | Low | – | New taxonomy: rap / singing / songwriter / performance / instruments / other |
| A | Showcase grid | Approved auditions only | Public | P1 | 1 (basic), 8 (real player) | Existing-cleanup | Modify | Existing API | Medium | Looks fake | Remove fake counters; show only real approved submissions |
| A | Showcase Reels view | TikTok-style vertical scroll | Public | P3 | 8+ | Existing-cleanup | Drop in MVP, add back in Phase 8 | Phase 8 backend | Phase 8 design | Trust collapse if fake | Removed in MVP |
| A | Footer (rebrand) | Footer w/o leaking operator routes | Public | P0 | 1 | Existing-cleanup | Modify | None | Low | – | No `/admin` or `/referee` links in public footer |
| A | Sitemap + robots | SEO basics | Public | P0 | 1 | Existing | Modify | None | Low | SEO regression on rebrand | All MVP routes in sitemap |
| A | Hardcoded testimonials | Fictional quotes | Public | – | 1 | Existing-cleanup | Drop | – | – | Trust risk | Removed or replaced with real ones |
| A | Hardcoded hero stats (`2,400+`, `4.9★`) | Fictional numbers | Public | – | 1 | Existing-cleanup | Drop | – | – | Trust risk | Removed or replaced with real numbers |

---

## Module B — Authentication

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | Email + password login | Existing | All | P0 | 0 | Existing | Keep | Existing | Low | Brute force | Rate-limit (10 fails / 15 min / IP) |
| B | bcrypt + JWT cookie | HS256, HTTP-only, SameSite=Lax | All | P0 | 0 | Existing | Keep | Existing | – | – | `JWT_SECRET` rotated; cookie `Secure` in prod |
| B | Edge RBAC middleware | `/admin`, `/referee` | All | P0 | 0 | Existing | Keep | Existing | – | – | New protected pages added to `matcher` |
| B | Forgot / reset password | Email-link reset | Contestant | P0 | 2 | Missing | Add | New API + table | Low | Token leakage | One-time tokens; 30-min expiry |
| B | Email verification | Verify before submit | Contestant | P1 | 7 | Missing | Add | New API + email | Low | Bounces | Unverified contestants cannot reach `submitted` |
| B | Forgot-password rate-limit | Per-IP + per-email | Public | P0 | 2 | Missing | Add | Existing rate-limit | – | Token-spam | < 3 requests / 5 min / email |
| B | Visible seeded creds on `/login` | Dev-mode hint | Public | – | 0 | Existing-cleanup | Drop | – | – | Critical in prod | Hidden when `NODE_ENV=production` |
| B | Logout | Clear session cookie | All | P0 | 0 | Existing | Keep | Existing | – | – | Cookie cleared, session invalidated |

---

## Module C — Contestant Application

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C | 3-step registration form | RHF + Zod | Contestant | P0 | 2 | Existing-cleanup | Modify | Existing API | Medium | – | Music-first taxonomy + new consents |
| C | Stage name field | Optional alias | Contestant | P0 | 2 | Existing | Keep | Existing | – | – | Editable post-registration |
| C | Real name field | Legal name | Contestant | P0 | 2 | Existing | Keep | Existing | – | PII | Visible only to contestant + admin |
| C | DOB / age | Age gate | Contestant | P0 | 2 | Existing (age only) | Modify | Schema add `dob` | Low | Under-18 handling | Under-18 requires guardian consent flow |
| C | Phone | Contact | Contestant | P0 | 2 | Existing | Keep | Existing | – | PII | Editable; never returned to public |
| C | City + country | Region + region routing | Contestant | P0 | 2 | Existing (city only) | Modify | Schema add `country` | Low | – | Default country = ET |
| C | Music category | Rap / singing / songwriter / performance / instruments / other | Contestant | P0 | 2 | Existing-cleanup | Modify | Schema enum update | Low | Migration | New enum live |
| C | Talent type | Free-form sub-category | Contestant | P1 | 2 | Missing | Add | Schema | Low | – | Optional 1-line text |
| C | Bio | 20–500 chars | Contestant | P0 | 2 | Existing | Keep | Existing | – | – | Existing |
| C | Social links (IG / TT / YT) | Optional | Contestant | P1 | 2 | Missing | Add | Schema | Low | – | URL validation |
| C | Consent: rules | Required | Contestant | P0 | 2 | Existing (single ToS) | Modify | Schema | Low | Legal | Three explicit consents recorded with timestamps |
| C | Consent: content licensing | Required | Contestant | P0 | 2 | Missing | Add | Schema | Low | Legal | Same as above |
| C | Consent: age confirmation | Required | Contestant | P0 | 2 | Missing | Add | Schema | Low | Legal | Same |
| C | Edit profile | Safe-fields update | Contestant | P0 | 2 | Missing | Add | New API | Medium | Tampering | Cannot change DOB / consents post-reg |
| C | Withdraw account | Soft-delete | Contestant | P1 | 2 | Missing | Add | New API | Low | Audit | Soft-delete preserves audit history |
| C | LocalStorage save-resume | UX continuity | Contestant | P1 | 2 | Missing | Add | None | Low | – | Resumable across page reloads |
| C | “Advance step” demo button | Dev shortcut | Contestant | – | 0/1 | Existing-cleanup | Drop | Remove API + UI | – | Tampering | Removed |

---

## Module D — Video Upload

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D | Cloudinary upload intent | Server signs upload | Contestant | P0 | 3 | Existing | Keep | Existing | – | – | Existing |
| D | Real client upload UI | Browser → Cloudinary | Contestant | P0 | 3 | Missing | Add | Existing API | High | Largest single missing piece | 200 MB MP4 < 2 min on 4G |
| D | Upload progress | KB / % / ETA | Contestant | P0 | 3 | Missing | Add | None | Medium | – | Percentage updates real-time |
| D | Format / size / duration validation | MP4/MOV/WEBM, ≤ 500 MB, 60–180 s | Contestant | P0 | 3 | Missing | Add | Cloudinary metadata | Low | Bad files | Out-of-spec rejected client + server |
| D | Resolution validation | ≥ 480p hard, ≥ 720p preferred | Contestant | P1 | 3 | Missing | Add | Cloudinary | Low | – | Below floor rejected |
| D | Retry with backoff | 3× transient | Contestant | P0 | 3 | Missing | Add | None | Low | – | Network errors auto-retry |
| D | Preview after upload | `<video controls>` | Contestant | P0 | 3 | Missing | Add | None | Low | – | Plays from `secure_url` |
| D | Replace submission | Mark old as `superseded` | Contestant | P1 | 3 | Missing | Add | Schema add `supersedes_id` | Low | – | Latest counts in scoring |
| D | URL submission fallback | YouTube paste | Contestant | P1 | 3 | Existing | Keep | Existing | Low | – | Demoted UI; behind “Trouble uploading?” |
| D | Local-upload route | Dev fallback | – | – | 3 | Missing (broken ref) | Drop or Add | Optional | – | Dead reference | Either implemented or all references removed |
| D | Audition video guidance | Music-tone tips | Contestant | P0 | 3 | Existing-cleanup | Modify | None | Low | – | Music-tone copy live |

---

## Module E — Payment

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E | AdmasPay init | Existing 3-mode `initPayment` | Contestant | P0 | 4 | Existing | Keep | Existing | – | Real money | Verified under rotated creds |
| E | Webhook signature verify | HMAC SHA-256 | Server | P0 | 4 | Existing | Keep | Existing | – | Forged callbacks | Existing test passes |
| E | Hosted-checkout mode | `ADMASPAY_CHECKOUT_URL` | Contestant | P0 | 4 | Existing | Keep | Existing | – | – | Works under rotated link |
| E | Full Telebirr API mode | `TELEBIRR_*` env | Contestant | P1 | 4 | Existing (untested) | Keep | Existing | – | Provider-specific bugs | Verified live or scoped out |
| E | Stub mode `/payments/mock` | Dev fallback | – | – | 4 | Missing (broken ref) | Drop or Add | Optional | Low | Dead path | Either built or removed |
| E | Payment polling modal | Already-shipped UI | Contestant | P0 | 4 | Existing | Keep | Existing | – | – | Polling stops on resolve |
| E | Payment retry CTA | Re-init on failure | Contestant | P0 | 4 | Existing | Keep | Existing | – | Duplicate rows | No duplicate `payments` row on retry |
| E | Admin payment override UI | UI on top of existing PATCH | Admin | P0 | 6 | Missing (API exists) | Add | Existing API | Medium | Audit | Override + reason field; audit-logged |
| E | Manual reconciliation | For stuck `pending` | Admin | P0 | 4 | Missing | Add | Existing API | Medium | Trust | 30-min stuck-state timer + admin alert |
| E | Refund flow | Mark refunded | Admin | P1 | 4 | Existing (status only) | Modify | New endpoint | Medium | Real money | Reason field + audit-log; refund policy live |
| E | Free-to-apply default (Option B) | Fee at shortlist | All | P0 | 4 | Missing | Add | New `settings.fee_required_at` | Low | – | Default = `'shortlist'`; admin can flip |

---

## Module F — Referee / Judge Review

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F | 5-criterion / 100-point rubric | Existing scoring model | Referee | P0 | 5 | Existing | Keep | Existing | – | – | Existing |
| F | Score upsert | Idempotent | Referee | P0 | 5 | Existing | Keep | Existing | – | – | Existing |
| F | Auto-shortlist trigger | ≥ 3 judges & avg ≥ 70 | Server | P0 | 5 | Existing | Keep | Existing | – | – | Existing |
| F | Score aggregation | Avg + judge count | Server | P0 | 5 | Existing | Keep | Existing | – | – | Existing |
| F | Referee queue | Top 50 global | Referee | P0 | 5 | Existing-cleanup | Modify | Existing → assignment-aware | Medium | Bias / overlap | Two referees see disjoint queues when assigned |
| F | Submission assignments | New table + UI | Admin | P0 | 5 | Missing | Add | New table | Medium | – | Assigned referees see new items |
| F | In-app video player | `<video controls>` against `secure_url` | Referee | P0 | 5 | Missing | Add | None | Low | – | Referee never leaves page to evaluate |
| F | Public + private notes | Two columns | Referee | P1 | 5 | Existing-cleanup | Modify | Schema add `public_notes` | Low | – | Public notes returned by result-checker |
| F | Approve / reject / flag | Status mutation | Referee, Admin | P0 | 5 | Missing (API) | Add | New endpoint | Low | – | Status persists; admin sees |
| F | Prevent silent overwrite | Confirm on edit | Referee | P1 | 5 | Missing | Add | None | Low | – | UI shows current score before edit |
| F | Done-reviewing state | Empty state with refresh | Referee | P1 | 5 | Existing | Keep | Existing | – | – | Existing |
| F | Score history | Own past reviews | Referee | P1 | 5 | Missing | Add | New endpoint | Medium | – | Paged list of own scored items |
| F | Cross-judge calibration | Aggregate of own bias | Referee | P3 | 14 | Future | Add | New analytics | Medium | – | Phase 14 |

---

## Module G — Admin Dashboard

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G | KPI tiles | Existing 4 tiles | Admin | P0 | 6 | Existing | Keep | Existing | – | – | Existing |
| G | Contestant list | Search + sort | Admin | P0 | 6 | Existing | Keep | Existing | Low | – | Existing |
| G | Contestant detail | New | Admin | P0 | 6 | Missing | Add | New endpoint | Medium | – | Submissions + scores + payments + audit |
| G | Filters (status / city / category / score) | New | Admin | P0 | 6 | Missing | Add | Query params | Low | – | URL params reflected in UI |
| G | Submission list | Cross-cut by status | Admin | P0 | 6 | Missing | Add | New endpoint | Medium | – | All filterable |
| G | Submission detail | New | Admin | P0 | 6 | Missing | Add | Existing data | Medium | – | Includes player + scores + notes |
| G | Assignment UI | Bulk assign referees | Admin | P0 | 6 | Missing | Add | New endpoint | Medium | – | Referees see new items |
| G | Status mutation | Move between states | Admin | P0 | 6 | Missing | Add | New endpoint | Medium | Audit | Reason field on downgrades; audit-logged |
| G | Settings page | Toggles + fee + round | Admin | P1 | 6 | Missing | Add | New endpoint + table | Low | – | Toggles change runtime behaviour |
| G | Audit log viewer | Read | Admin | P1 | 6 | Missing | Add | New endpoint + table | Low | – | Filterable by actor / target |
| G | CSV export | All filtered tables | Admin | P1 | 6 | Missing | Add | New endpoint | Low | – | Streamed download |
| G | Contact-message inbox | Existing DB, no UI | Admin | P1 | 6 | Existing-cleanup | Modify | New endpoint | Low | – | List + mark handled |
| G | “Open round 2” no-op | Existing stub | – | – | 6 | Existing-cleanup | Drop | – | – | False expectation | Removed until real |

---

## Module H — Result Checker

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H | 6-digit lookup | Existing public route | Public | P0 | 2 | Existing | Keep | Existing | Low | Brute force | Rate-limited (30 / 5 min / IP) |
| H | Public-friendly status copy | Map raw → user-facing | Public | P0 | 6 | Missing | Add | None | Low | – | One label per state; bilingual |
| H | Per-status next step | Actionable copy | Public | P0 | 6 | Missing | Add | None | Low | – | Each status surfaces one CTA |
| H | Score visibility | After 3+ judges | Public | P0 | 2 | Existing | Keep | Existing | – | – | Existing |
| H | PII reduction for anon lookup | Initials + status only | Public | P0 | 0 | Existing-cleanup | Modify | Existing | Low | PII | Full name removed for anonymous |
| H | Logged-in own-result page | `/contestant/result` | Contestant | P1 | 2 | Missing | Add | Existing API | Low | – | Mirrors public lookup with full PII |
| H | Lookup by email + DOB | Alternative path | Public | P2 | 6 | Missing | Add | New endpoint | Low | – | Optional |

---

## Module I — Audience Engagement (Phase 8+)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I | Audience accounts | Separate from contestants | Audience | P0 | 8 | Future | Add | New table | Medium | Identity | Phase 8 |
| I | Public contestant page | `/contestants/[id]` | Public | P0 | 8 | Future | Add | New endpoint | High | – | Phase 8 |
| I | Persisted likes | Per-user / per-target | Audience | P0 | 8 | Future | Add | New table | Low | Abuse | Phase 8 |
| I | Comments | Threaded? Flat? | Audience | P1 | 8 | Future | Add | New table + moderation | Medium | Abuse | Phase 8 |
| I | Watchlist / favorites | Save | Audience | P1 | 8 | Future | Add | New table | Low | – | Phase 8 |
| I | Share / link | Real share URLs | Public | P0 | 8 | Future | Add | None | Low | – | Phase 8 |

---

## Module J — Voting (Phase 9)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J | Vote casting | Per round | Audience | P0 | 9 | Future | Add | New endpoint | Medium | Fraud | Phase 9 |
| J | Identity verification | Phone OTP + email | Audience | P0 | 9 | Future | Add | New service | Medium | Cost (SMS) | Phase 9 |
| J | Vote rate-limit | Per IP / user / device | Audience | P0 | 9 | Future | Add | New | Low | – | Phase 9 |
| J | Vote audit log | Every vote logged | Server | P0 | 9 | Future | Add | New table | Low | – | Phase 9 |
| J | Paid voting | Monetisation | Audience | P3 | 9 | Future | Add | Existing payments | Medium | – | Phase 9 (founder + finance approval) |
| J | Public leaderboard | Optional | Public | P2 | 9 | Future | Add | New endpoint | Medium | Strategy | Phase 9 |

---

## Module K — Contestant Public Profiles (Phase 8)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K | Public profile DTO | No PII | Public | P0 | 8 | Future | Add | New DTO | Low | PII leak | Phase 8 |
| K | Audition video on profile | Real player | Public | P0 | 8 | Future | Add | Existing | Low | – | Phase 8 |
| K | Bio + socials display | From profile | Public | P1 | 8 | Future | Add | None | Low | – | Phase 8 |

---

## Module L — Episodes / Seasons (Phase 10)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L | Season model | DB | Producer | P0 | 10 | Future | Add | New table | Low | – | Phase 10 |
| L | Episode model | DB + UI | Producer | P0 | 10 | Future | Add | New table | High | – | Phase 10 |
| L | Challenge model | DB | Producer | P1 | 10 | Future | Add | New table | Medium | – | Phase 10 |
| L | Performance scheduling | Producer UI | Producer | P0 | 10 | Future | Add | New | High | – | Phase 10 |
| L | Elimination tracking | Status mutation | Admin | P0 | 10 | Future | Add | New | Medium | – | Phase 10 |
| L | Public episodes page | Listing + detail | Public | P0 | 10 | Future | Add | New endpoint | High | – | Phase 10 |

---

## Module M — Performance Stage / Media Clips (Phase 11)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M | `media_clips` table | Tied to performances | Server | P0 | 11 | Future | Add | New | – | – | Phase 11 |
| M | Clip browsing UI | Filter + search | Public | P0 | 11 | Future | Add | New endpoint | High | – | Phase 11 |
| M | Real Reels view | Vertical video | Public | P1 | 11 | Future | Add | Streaming provider | High | CDN cost | Phase 11 |
| M | Streaming provider eval | Cloudinary HLS / Mux / Bunny | Server | P0 | 11 | Future | Add | – | – | Cost | Phase 11 |
| M | Captions | Auto + manual | Public | P1 | 11 | Future | Add | Provider | Medium | – | Phase 11 |
| M | Watchlist | Save clips / episodes | Audience | P1 | 11 | Future | Add | New table | Low | – | Phase 11 |

---

## Module N — Notifications

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N | Welcome email | On registration | Contestant | P1 | 7 | Missing | Add | Postmark / Resend | Low | – | Email arrives in < 1 min |
| N | Status-change email | On every status mutation | Contestant | P0 | 7 | Missing | Add | Service | Low | Spam | Single email per change |
| N | Payment receipt | On payment success | Contestant | P0 | 7 | Missing | Add | Service | Low | – | PDF attachment optional |
| N | Referee assignment email | On new assignment | Referee | P1 | 7 | Missing | Add | Service | Low | – | Phase 7 |
| N | Notification preferences | Opt-out per category | Contestant | P1 | 7 | Missing | Add | Schema | Low | Compliance | Email-frequency choice |
| N | SMS (Telebirr / Africa’s Talking) | Phase 14+ | All | P3 | 14 | Future | Add | Provider | Medium | Cost | Phase 14 |
| N | Push (mobile) | Firebase / APNs | Mobile users | P0 | 12 | Future | Add | – | – | – | Phase 12 |

---

## Module O — Chatbot / Support

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O | Static EN/AM FAQ matcher | Existing | Public | P0 | 1 | Existing | Keep | Existing | Low | – | Existing |
| O | Anthropic LLM fallthrough | Optional | Public | P1 | 1 | Existing | Keep | Existing | – | – | Existing; toggleable |
| O | Reposition as support | Hide from marketing centerpiece | Public | P1 | 1 | Existing-cleanup | Modify | None | Low | – | Existing chatbot, lower-key placement |
| O | Support tickets | Real ticketing | Support | P2 | 14 | Future | Add | New table + UI | Medium | – | Phase 14 |
| O | Contact form | Existing | Public | P0 | 1 | Existing | Keep | Existing | – | – | Existing |

---

## Module P — Analytics

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P | KPI tiles | Already in `/admin` | Admin | P0 | 6 | Existing | Keep | Existing | – | – | Existing |
| P | Funnel events (apply / submit / pay) | Server-logged | Server | P1 | 7 | Missing | Add | New | Low | – | Phase 7 |
| P | Cohort analytics | Retention | Admin | P3 | 14 | Future | Add | New | Medium | – | Phase 14 |
| P | Sponsor analytics | Aggregate-only | Sponsor | P3 | 13 | Future | Add | New | Medium | PII | Phase 13 |

---

## Module Q — Moderation (Phase 8+)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q | Moderation queue | Flagged content | Moderator | P0 | 8 | Future | Add | New table + UI | Medium | – | Phase 8 |
| Q | Report mechanism | User-initiated | Audience | P0 | 8 | Future | Add | New endpoint | Low | Abuse | Phase 8 |
| Q | Comment moderation | Hide / remove | Moderator | P0 | 8 | Future | Add | New endpoint | Low | – | Phase 8 |
| Q | Auto-flag heuristics | NSFW / spam | Server | P1 | 14 | Future | Add | ML provider | Medium | False positives | Phase 14 |
| Q | User blocking | Per-user | Audience | P1 | 8 | Future | Add | New table | Low | – | Phase 8 |

---

## Module R — Mobile Apps (Phase 12)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R | Flutter app | Single codebase | Mobile | P0 | 12 | Future | Add | – | High | – | Phase 12 |
| R | Mobile auth | Refresh token flow | Mobile | P0 | 12 | Future | Add | New endpoint | Low | – | Phase 12 |
| R | Mobile audition upload | Native picker / camera | Contestant | P0 | 12 | Future | Add | Existing intent | High | – | Phase 12 |
| R | Push notifications | Firebase / APNs | Mobile | P0 | 12 | Future | Add | New | Medium | – | Phase 12 |
| R | Offline result-checker | Cache last known | Mobile | P2 | 12 | Future | Add | Local cache | Low | – | Phase 12 |

---

## Module S — Sponsor / Partner Tools (Phase 13)

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S | Sponsor admin UI | CRUD | Admin | P0 | 13 | Future | Add | New table + UI | Medium | – | Phase 13 |
| S | Sponsor pages | Public | Public | P1 | 13 | Future | Add | New | Medium | – | Phase 13 |
| S | Campaign placements | Banners on episodes | Sponsor, Admin | P1 | 13 | Future | Add | New | Medium | – | Phase 13 |
| S | Sponsor dashboard | Aggregate metrics | Sponsor | P0 | 13 | Future | Add | New endpoint | Medium | PII | Aggregate-only |

---

## Module T — Security / Compliance

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T | Remove committed `.env.local` | Critical | – | P0 | 0 | Existing-cleanup | Drop | – | – | Critical | Removed + rotated |
| T | Rotate Neon creds | Critical | – | P0 | 0 | Existing-cleanup | Drop (old) / Add (new) | – | – | Critical | Rotated |
| T | Rotate AdmasPay link | Critical | – | P0 | 0 | Existing-cleanup | Drop (old) / Add (new) | – | – | Critical | Rotated |
| T | Generate fresh `JWT_SECRET` | Critical | – | P0 | 0 | Missing | Add | – | – | Critical | Rotated |
| T | `.gitignore` env files | Hygiene | – | P0 | 0 | Missing | Add | – | – | High | `.env*.local` ignored |
| T | Vercel env-var move | Hygiene | – | P0 | 0 | Missing | Add | – | – | High | All real secrets in Vercel |
| T | Login rate-limit | Anti-spray | All | P0 | 0 | Missing | Add | Rate-limit primitive | Low | High | 10 fails / 15 min / IP |
| T | Result-checker rate-limit | Anti-brute | Public | P0 | 0 | Missing | Add | Same | Low | High | 30 / 5 min / IP |
| T | Forgot-password rate-limit | Anti-spam | Public | P0 | 2 | Missing | Add | Same | Low | – | < 3 / 5 min / email |
| T | CSRF defence | On cookie POSTs | Server | P0 | 6 | Missing | Add | Token / Sec-Fetch-Site | Low | – | Cross-site mutations blocked |
| T | Audit logs | Admin actions | Admin | P0 | 6 | Missing | Add | New table | Low | – | Every admin mutation logged |
| T | RBAC on every privileged API | Existing | Server | P0 | 6 | Existing | Keep | Existing | – | – | Audited per PR |
| T | Upload server-validation | Cloudinary metadata | Server | P0 | 3 | Missing | Add | Existing API | Low | – | Out-of-spec rejected post-upload |
| T | Webhook signature verify | Existing | Server | P0 | 4 | Existing | Keep | Existing | – | – | Existing |
| T | Backup + restore plan | Documented | DevOps | P1 | 7 | Missing | Add | – | – | – | Doc + drill |
| T | Sentry / observability | Real errors | DevOps | P1 | 7 | Missing | Add | Sentry | Low | – | Phase 7 |

---

## Module U — Content / Legal Pages

| Module | Feature | Description | User Role | Priority | Phase | Current Status | Keep/Drop/Add | Backend Needed | Design Needed | Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U | `/terms` | Entry rules + judging + disqualification | Public | P0 | 7 | Missing | Add | None | Low | Legal | Lawyer-reviewed |
| U | `/privacy` | Data collection / retention | Public | P0 | 7 | Missing | Add | None | Low | Legal | Lawyer-reviewed |
| U | `/refund-policy` | If payment | Public | P0 | 7 | Missing | Add | None | Low | Legal | Lawyer-reviewed |
| U | `/content-rights` | Broadcast / re-distribution | Public | P1 | 7 | Missing | Add | None | Low | Legal | If broadcast in scope |
| U | `/contact` refresh | Real info | Public | P0 | 1 | Existing-cleanup | Modify | Existing | Low | – | Real contact info |
| U | Bilingual EN/AM legal | All legal pages | Public | P1 | 7 | Missing | Add | None | Medium | Translation | EN approved → AM translated |

---

*End of Product Feature Matrix.*
