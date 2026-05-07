# Bling Records Show — Full UX Ecosystem Documentation

> **Document type:** Long-term, full-ecosystem UX reference. Spans **MVP, post-MVP, and future** phases.
> **Read first:** [current-product-ux-ecosystem-audit.md](current-product-ux-ecosystem-audit.md), [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md).
> **Sister documents (planning package):** [full-development-roadmap.md](full-development-roadmap.md), [product-feature-matrix.md](product-feature-matrix.md), [technical-architecture-plan.md](technical-architecture-plan.md), [data-model-and-api-plan.md](data-model-and-api-plan.md), [admin-and-operations-plan.md](admin-and-operations-plan.md), [task-tracker.md](task-tracker.md), [agent-execution-rules.md](agent-execution-rules.md).
> **Status of code:** No application code is to be modified by the act of writing this doc.

---

## 1. Executive Product Vision

**The Bling Records Show** is a music-focused talent-competition ecosystem connecting Bling Records (label / brand) and Neo Studios (production), supporting the **complete lifecycle** of discovering, reviewing, selecting, promoting, and managing contestants — from a public visitor’s first encounter with the show through to season-finale broadcast and audience engagement.

The platform is **not** built in one shot. It evolves through clear phases:

| Phase | Layer it adds | One-line outcome |
| --- | --- | --- |
| Phase 1–7 (MVP) | Promotional + audition + review + admin + legal | A credible, public audition platform |
| Phase 8 | Audience engagement | Visitors can engage with selected contestants |
| Phase 9 | Voting | Audience influences competition outcomes |
| Phase 10 | Episodes / season | The 24-episode reality format becomes data |
| Phase 11 | Media platform | Clips, reels, highlights, watchlist |
| Phase 12 | Mobile apps | Native experience on iOS / Android |
| Phase 13 | Sponsor / partner tools | Monetization + brand integrations |
| Phase 14 | Advanced operations | Production-grade ops + analytics |

The MVP success criterion (already locked in the scope doc) is to publicly launch auditions credibly. Every phase after that adds a layer; **the platform never goes backwards** to recover from a missing prior phase.

---

## 2. Product Positioning

### Value proposition (proposed; founder to confirm)

> *“The Bling Records Show — Ethiopia’s next musical icon, made on stage. Apply, perform, get judged by the industry, and rise from your bedroom to the Bling Records music house.”*

### Target audiences

| Audience | Primary goal on platform |
| --- | --- |
| Aspiring musicians (rappers, singers, songwriters, instrumentalists) age 18–35 (with guardian-consent path for 13–17) | Apply, submit audition, track status |
| Music fans and casual viewers | Watch the show, follow contestants, eventually vote |
| Industry professionals (judges, mentors, talent scouts) | Review, score, mentor |
| Press / media partners | Discover the show, source assets |
| Sponsors / brand partners | Visibility, audience metrics |
| Internal operators (Bling Records, Neo Studios) | Run the show end-to-end |

### Brand tone

- **Premium**, music-industry-credible, cinematic.
- **Bold** without being loud — restraint is part of the premium feel.
- **Youthful** but trustworthy — speaks to ambitious 20-somethings without alienating their parents.
- **Performance-driven** — every page nudges toward an audition or a watch action.
- **Bilingual EN + አማርኛ** — natively, not as an afterthought.

### Visual tone

- Dark cinematic base (near-black) with **gold / amber stage-light accents** (Bling Records signature).
- Real performance photography; no Unsplash filler.
- Bold display typography; tight letter-spacing on headlines.
- High contrast; WCAG AA minimum.
- Motion is purposeful — entrance fades, micro-interactions on CTAs, never gratuitous.

### Main conversion goals (in order of priority)

1. **Visitor → Contestant** — clicks **Apply now** and starts registration.
2. **Contestant → Submission** — completes profile + uploads audition video.
3. **Contestant → Payment** (when applicable) — completes the registration / advancement fee.
4. **Visitor → Result Lookup** — uses the 6-digit checker.
5. **Visitor → Audience Member** *(post-MVP)* — creates a fan account, votes, follows.
6. **Visitor → Sponsor lead / press inquiry** — submits the contact form.

---

## 3. Ecosystem Map

The platform is layered. Each layer can be built and reasoned about independently. Layers depend on each other in a defined order — see the **Phase** column.

| Layer | Purpose | Main Users | Key Features | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| **A. Public Marketing Layer** | Tell the show story, drive auditions | Public Visitor | Hero, About, Auditions, Show Format, Judges, Mentors, Sponsors, FAQ, Contact, Legal pages | 1 | Replaces the generic AGT framing with Bling Records Show branding |
| **B. Contestant Audition Layer** | Capture and process applications | Contestant | Register, profile, audition submission, status, result | 2–3 | Cloudinary-backed real upload |
| **C. Payment Layer** | Collect audition or advancement fee | Contestant, Admin | AdmasPay/Telebirr init, checkout, webhook, manual reconciliation | 4 | Default: free to apply, fee at shortlist (Option B) |
| **D. Referee/Judge Review Layer** | Evaluate auditions on a rubric | Referee, Admin | Assigned queues, in-app player, 5-criterion scoring, notes, approve/reject/flag | 5 | Builds on existing scoring foundation |
| **E. Admin/Producer Control Layer** | Run the season operationally | Admin, Producer | Contestant/submission tables, assignments, status mutations, payments, exports, audit logs | 6 | Replaces today’s read-only admin |
| **F. Result/Status Layer** | Public + private status visibility | Public, Contestant | 6-digit lookup, contestant dashboard | 2, refined in 6 | Status copy must be lawyer/founder-approved |
| **G. Audience Engagement Layer** | Convert viewers into fans | Audience/Fan | Public contestant pages, likes, comments, watchlist | 8 | Persisted only — no fake interactions |
| **H. Media/Show Content Layer** | Distribute clips and highlights | Public, Audience/Fan | Clips, reels, featured performances, search/filter | 11 | Streaming evaluation belongs here |
| **I. Episode/Season Management Layer** | Model the 24-episode reality format | Producer, Admin | Seasons, episodes, challenges, performances, eliminations | 10 | Required before any “airing schedule” claims |
| **J. Celebrity/Mentor Layer** | Plug guests into the show | Mentor, Producer, Admin | Mentor profiles, scheduling, mentorship notes | 13–14 | Marketing surface in MVP only as static content |
| **K. Sponsor/Partner Layer** | Monetize and brand-integrate | Sponsor, Admin | Sponsor pages, campaign placements, analytics, branded content | 13 | Locked behind contracts |
| **L. Mobile App Layer** | Native iOS / Android experience | Contestant, Audience/Fan | Auth, audition submission, results, watch, vote, push notifications | 12 | Recommended stack: Flutter (single codebase) |
| **M. Analytics/Reporting Layer** | Measure and decide | Admin, Producer, Sponsor | Funnel KPIs, scoring analytics, payments, audience metrics | 14 (basic in 6) | Don’t over-instrument too early |
| **N. Support/Chatbot Layer** | Help users self-serve | Public, Contestant | EN/AM static FAQ + LLM fallthrough, contact form, future tickets | 1 (exists), Phase 14 (tickets) | Reposition existing chatbot as support, not marketing |

---

## 4. User Roles and Permissions

### MVP roles

| Role | Purpose | Permissions | Screens | Data Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Public Visitor** | Discover the show; lookup status | Read public pages; submit contact form; query 6-digit ID; chat with support bot | `/`, `/about`, `/auditions`, `/show-format`, `/judges`, `/mentors`, `/contestants`, `/episodes` (after Phase 10), `/sponsors` (after Phase 13), `/contact`, `/faq`, `/terms`, `/privacy`, `/refund-policy`, `/content-rights`, `/result-checker`, `/login`, `/register`, `/forgot-password` | None private | 1–14 | Anonymous; rate-limited on `/result-checker` |
| **Contestant** | Apply, submit audition, track status | Own profile CRUD (subset), own submission CRUD, payment init, result view | `/contestant/dashboard`, `/contestant/profile`, `/contestant/application`, `/contestant/submission`, `/contestant/payment`, `/contestant/result`, `/contestant/messages`, `/contestant/notifications` | Own only | 2–7 | One contestant per user account |
| **Referee/Judge** | Score auditions | Read assigned queue, watch videos, write scores + notes, mark reviewed, approve/reject/flag | `/referee/dashboard`, `/referee/submissions`, `/referee/submissions/[id]`, `/referee/reviews`, `/referee/score-history` | Assigned only | 5+ | Assignment model added in Phase 5 |
| **Admin** | Run the season | Full read; status mutations on contestants, submissions, payments, assignments; CSV export; settings | `/admin/dashboard`, `/admin/contestants`, `/admin/contestants/[id]`, `/admin/submissions`, `/admin/submissions/[id]`, `/admin/referees`, `/admin/assignments`, `/admin/results`, `/admin/payments`, `/admin/settings`, `/admin/audit-logs`, `/admin/exports` | All | 6+ | Highest-power role pre-Super-Admin |

### Post-MVP roles

| Role | Purpose | Permissions | Screens | Data Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Audience / Fan** | Watch + engage | Like, comment, vote, save to watchlist | `/fan/dashboard`, `/fan/vote`, `/fan/favorites`, `/fan/watchlist`, public contestant pages | Own engagement only | 8–9 | Identity required to vote |
| **Moderator** | Pre-screen submissions, moderate comments | Submission status (`pending → approved/rejected/flagged`); comment status (`visible/hidden/removed`); user warnings | `/admin/moderation`, `/admin/reports` | All flagged content | 8 | Splits content review off from admin |
| **Producer** | Plan rounds, schedule episodes | Episode/season/challenge CRUD, performance scheduling, mentor scheduling | `/producer/dashboard`, `/producer/episodes`, `/producer/contestants`, `/producer/schedule`, `/producer/media` | Production-relevant | 10 | Coordinates with Neo Studios |
| **Celebrity Guest / Mentor** | Mentor / guest-judge segments | Read assigned contestants; write mentor notes | `/mentor/contestants`, `/mentor/sessions` | Assigned + audit-log | 13 | Optional |
| **Sponsor / Partner** | Brand visibility, audience metrics | Read aggregate analytics, manage own campaign assets | `/sponsor/dashboard`, `/sponsor/campaigns`, `/sponsor/analytics` | Aggregate only | 13 | Tied to sponsorship deals |
| **Super Admin** | Trust-and-safety, role management | Manage admins, manage referees, override anything, see audit logs across the system | `/superadmin/*` | All | 14 | Belongs to Bling Records leadership only |
| **Support Agent** | Handle user issues | Read user accounts, send messages, change limited statuses, escalate | `/support/*` | Limited PII access | 14 | Audit-logged |

### Risks per role (summary)

| Role | Top risk |
| --- | --- |
| Contestant | PII exposure (DOB, phone, ID document) — rate-limit lookups, encrypt sensitive fields |
| Referee | Bias / score-tampering — audit logs, panel composition rules |
| Admin | Privilege over-reach — Super Admin separation, audit logs |
| Audience | Vote fraud — rate-limit + identity verification |
| Moderator | Censorship over-reach — escalation paths, audit logs |
| Producer | Schedule leaks before official announce — staging vs. published |
| Sponsor | Inflated metrics claims — read aggregate only, never per-user |

---

## 5. Full Information Architecture

The route map combines what already exists, what MVP adds, and what later phases add. **Phase** indicates when a route should first be built.

### Public

| Route | User Role | Purpose | Phase | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Public | Show landing | 1 | Yes | Rebrand existing |
| `/about` | Public | Bling Records + Neo Studios story | 1 | Yes | New |
| `/auditions` | Public | How to apply, format preview | 1 | Yes | Repurposes `/how-it-works` |
| `/show-format` | Public | 24-episode format teaser | 1, expanded in 10 | Yes | |
| `/judges` | Public | Industry panel | 1 (placeholder), 5 (real) | Yes | |
| `/mentors` | Public | Celebrity mentors | 13 | No (P2) | |
| `/contestants` | Public | Public contestant directory | 8 | No (Phase 8) | Out of MVP |
| `/contestants/[id]` | Public | Public contestant page | 8 | No (Phase 8) | |
| `/episodes` | Public | Episode list | 10 | No (Phase 10) | |
| `/episodes/[id]` | Public | Episode detail | 10 | No (Phase 10) | |
| `/stage-performances` | Public | Performance highlights | 10–11 | No | |
| `/sponsors` | Public | Sponsor showcase | 13 | No | |
| `/contact` | Public | Inbound | 1 | Yes | Refresh existing |
| `/faq` | Public | EN/AM FAQ | 1 | Yes | Refresh existing |
| `/terms` | Public | Legal | 7 | Yes | New |
| `/privacy` | Public | Legal | 7 | Yes | New |
| `/refund-policy` | Public | Legal | 7 | Yes (if payment) | New |
| `/content-rights` | Public | Legal — broadcast / re-distribution | 7 | Yes (if broadcast in scope) | New |
| `/result-checker` | Public | 6-digit lookup | 2 | Yes | Refine existing |

### Auth

| Route | Role | Purpose | Phase | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/login` | Public | Email + password | 1 | Yes | Hide seeded creds in production |
| `/register` | Public | Account + contestant creation | 2 | Yes | Rebrand + extend fields |
| `/forgot-password` | Public | Reset request | 2 | Yes | New |
| `/reset-password` | Public | Reset landing | 2 | Yes | New |

### Contestant

| Route | Role | Purpose | Phase | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/contestant/dashboard` | Contestant | Hub | 2 | Yes | Replaces `/profile` |
| `/contestant/profile` | Contestant | Edit profile | 2 | Yes | New |
| `/contestant/application` | Contestant | Application status / next step | 2 | Yes | |
| `/contestant/submission` | Contestant | Upload / replace audition | 3 | Yes | |
| `/contestant/payment` | Contestant | Initiate / view fee | 4 | Yes (if Option B) | |
| `/contestant/result` | Contestant | Personal result | 2, refined in 6 | Yes | |
| `/contestant/messages` | Contestant | Inbox from admin/support | 8 | No (P2) | |
| `/contestant/notifications` | Contestant | Notification feed | 7–8 | No (P1) | |

### Referee

| Route | Role | Purpose | Phase | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/referee/dashboard` | Referee, Admin | Queue overview | 5 | Yes | Existing `/referee` becomes this |
| `/referee/submissions` | Referee, Admin | Filterable list | 5 | Yes | New |
| `/referee/submissions/[id]` | Referee, Admin | Score detail | 5 | Yes | New |
| `/referee/reviews` | Referee | History of own reviews | 5 (P1) | Yes | New |
| `/referee/score-history` | Referee | Aggregate own scoring patterns | 14 | No | Calibration tool |

### Admin

| Route | Role | Purpose | Phase | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/admin/dashboard` | Admin | KPIs | 6 | Yes | Existing `/admin` |
| `/admin/contestants` | Admin | List + filter | 6 | Yes | List exists; needs detail link |
| `/admin/contestants/[id]` | Admin | Detail view | 6 | Yes | New |
| `/admin/submissions` | Admin | All submissions | 6 | Yes | New |
| `/admin/submissions/[id]` | Admin | Submission detail | 6 | Yes | New |
| `/admin/referees` | Admin | Referee mgmt | 6 | Yes | New |
| `/admin/assignments` | Admin | Assign referees | 6 | Yes | New |
| `/admin/results` | Admin | Round results | 6 | Yes | New |
| `/admin/payments` | Admin | Payments table + override | 6 | Yes | API exists, UI new |
| `/admin/episodes` | Producer/Admin | Episode mgmt | 10 | No (Phase 10) | |
| `/admin/stages` | Producer/Admin | Stage / performance scheduling | 10 | No (Phase 10) | |
| `/admin/mentors` | Admin | Mentor mgmt | 13 | No (Phase 13) | |
| `/admin/sponsors` | Admin | Sponsor mgmt | 13 | No (Phase 13) | |
| `/admin/settings` | Admin | Toggles + fee + round | 6 | Yes | New |
| `/admin/audit-logs` | Admin | Audit log viewer | 6 | Yes (P1) | New |
| `/admin/exports` | Admin | CSV export hub | 6 | Yes (P1) | New |
| `/admin/moderation` | Moderator/Admin | Flagged content queue | 8 | No (Phase 8) | |
| `/admin/reports` | Moderator/Admin | User reports | 8 | No (Phase 8) | |

### Audience / Fan

| Route | Role | Purpose | Phase | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/fan/dashboard` | Audience | Following, likes, comments | 8 | No | |
| `/fan/vote` | Audience | Voting hub | 9 | No | |
| `/fan/favorites` | Audience | Saved contestants | 8 | No | |
| `/fan/watchlist` | Audience | Saved clips/episodes | 11 | No | |

### Producer

| Route | Role | Purpose | Phase | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/producer/dashboard` | Producer | Production overview | 10 | No | |
| `/producer/episodes` | Producer | Episode CRUD | 10 | No | |
| `/producer/contestants` | Producer | Selection / progression | 10 | No | |
| `/producer/schedule` | Producer | Performances & mentor sessions | 10 | No | |
| `/producer/media` | Producer | Clips, highlights | 11 | No | |

---

## 6. Complete User Journeys

For each journey: **goal → entry → steps → screens → backend → success → failure → notifications → analytics events.**

### J1. Public visitor learns about the show

- **Goal:** Understand what the show is and how to apply.
- **Entry:** Direct, search, social, paid ad → `/`.
- **Steps:** Hero → Show Format teaser → Judges → CTA.
- **Screens:** `/`, `/about`, `/auditions`, `/show-format`, `/judges`.
- **Backend:** Static + light DB read for any “registration open?” flag.
- **Success:** Reaches `/apply` (= `/register`).
- **Failure:** Bounces. Mitigation: lightweight content, fast LCP, clear CTA above the fold.
- **Notifications:** None.
- **Analytics:** `landing_view`, `cta_click`, `nav_to_apply`, `time_on_landing`.

### J2. Public visitor → Contestant

- **Goal:** Move from learn to apply.
- **Entry:** Any CTA on public pages.
- **Steps:** Click **Apply now** → `/register` (multi-step). Step 1 identity + creds. Step 2 talent + bio + socials. Step 3 review + consents.
- **Screens:** `/register` 3-step, success card, `/contestant/dashboard`.
- **Backend:** `POST /api/auth/register`.
- **Success:** Account + contestant + 6-digit ID + JWT cookie; redirected to dashboard.
- **Failure:** Email taken (409), validation error (422), rate-limited (429). Each surfaced inline.
- **Notifications:** Welcome email + verification (Phase 5).
- **Analytics:** `register_step_1_view`, `…_complete`, `register_success`, `register_fail`.

### J3. Contestant registers → completes profile

- **Goal:** Profile filled enough to submit.
- **Entry:** `/contestant/dashboard` after registration.
- **Steps:** Open profile → fill any optional fields (socials, bio, stage name) → save.
- **Screens:** `/contestant/profile`.
- **Backend:** `PATCH /api/contestants/me`.
- **Success:** Profile completeness ≥ 80 %; submission unlocked.
- **Failure:** Validation errors inline; 401 forces re-login.
- **Notifications:** None.
- **Analytics:** `profile_edit_open`, `profile_save`, `profile_completeness_change`.

### J4. Contestant submits audition

- **Goal:** Upload a valid audition video.
- **Entry:** Dashboard → **Submit audition**.
- **Steps:** Read instructions → pick file → client requests upload intent → file uploads to Cloudinary with progress → server records `submissions` row → preview shown.
- **Screens:** `/contestant/submission`.
- **Backend:** `GET /api/submissions` (intent), browser → Cloudinary, `POST /api/submissions`.
- **Success:** Status flips to `submitted`; `video_submitted` step ticks; preview playable.
- **Failure:** File too big / wrong format / wrong duration → reject client-side. Network → retry up to 3×. Provider down → fallback to URL submission with banner.
- **Notifications:** Submission-received email (Phase 5).
- **Analytics:** `submission_intent_request`, `upload_progress`, `upload_success`, `upload_fail`, `submission_create`.

### J5. Contestant pays fee (Option B = post-shortlist)

- **Goal:** Confirm advancement by paying.
- **Entry:** Dashboard banner once shortlisted.
- **Steps:** **Pay** → `POST /api/payments/init` → modal opens AdmasPay tab → modal polls `/api/payments/[id]` → webhook flips status → modal closes.
- **Screens:** `/contestant/payment`, success / failed / pending modal.
- **Backend:** Existing payment scaffolding under rotated credentials.
- **Success:** `payments.status = succeeded`; contestant unlocked for next round.
- **Failure:** `failed` → retry CTA; `pending` past 30 min → admin manual reconciliation.
- **Notifications:** Payment-receipt email.
- **Analytics:** `payment_init`, `payment_succeeded`, `payment_failed`, `payment_retry`.

### J6. Contestant tracks status

- **Goal:** Know what’s happening.
- **Entry:** Dashboard.
- **Steps:** Status badge + timeline + next-step copy.
- **Screens:** `/contestant/dashboard`, `/contestant/result`.
- **Backend:** `GET /api/auth/me` + `GET /api/contestants/me`.
- **Success:** Single up-to-date status.
- **Failure:** Stale data → manual refresh CTA.
- **Notifications:** Status-change email on each transition.
- **Analytics:** `status_view`, `status_change_seen`.

### J7. Anyone checks a result

- **Goal:** Look up status by 6-digit code.
- **Entry:** `/result-checker`.
- **Steps:** Type code → result card with status + next-step copy + (if 3+ judges) public score.
- **Screens:** `/result-checker`.
- **Backend:** `GET /api/contestants/[id]` rate-limited.
- **Success:** Status card.
- **Failure:** Rate-limit (429), not found (404), brute-force throttled.
- **Notifications:** None.
- **Analytics:** `lookup_attempt`, `lookup_success`, `lookup_throttled`.

### J8. Referee logs in & sees queue

- **Goal:** Get to work.
- **Entry:** `/login` → role-aware redirect to `/referee/dashboard`.
- **Steps:** Queue → assigned items.
- **Screens:** `/referee/dashboard`, `/referee/submissions`.
- **Backend:** `GET /api/referee/queue` (assignment-aware).
- **Success:** Queue visible.
- **Failure:** Empty state with refresh.
- **Notifications:** New-assignment email (Phase 7).
- **Analytics:** `referee_login`, `queue_view`.

### J9. Referee scores a submission

- **Goal:** Score against the rubric with full context.
- **Entry:** Click queue item.
- **Steps:** In-app player → context → 5 sliders + notes → submit → next item auto-snaps.
- **Screens:** `/referee/submissions/[id]`.
- **Backend:** `POST /api/scores`.
- **Success:** Score persisted; auto-shortlist trigger fires when conditions met.
- **Failure:** Validation; duplicate-score warning.
- **Notifications:** None to contestant immediately; aggregate publishes after 3+ judges.
- **Analytics:** `score_submit`, `score_change`, `auto_shortlist_fired`.

### J10. Admin manages applications

- **Goal:** Triage and decide.
- **Entry:** `/admin/dashboard` → `/admin/contestants`.
- **Steps:** Filter → drill → view submissions + scores + payments → mutate status.
- **Screens:** `/admin/contestants`, `/admin/contestants/[id]`, `/admin/submissions`.
- **Backend:** Admin status mutation API (new) + audit log.
- **Success:** Status persists; audit log captures who/when/what.
- **Failure:** RBAC blocks unauthorised mutations; audit log preserves attempts.
- **Notifications:** Status-change email to contestant.
- **Analytics:** `admin_status_change`, `admin_view_contestant`.

### J11. Admin assigns referees

- **Goal:** Distribute the queue.
- **Entry:** `/admin/assignments`.
- **Steps:** Select submissions → pick referees → save.
- **Screens:** `/admin/assignments`.
- **Backend:** New `submission_assignments` write API.
- **Success:** Referees see new items in their queues.
- **Failure:** Conflicts (already-assigned) prompt confirm.
- **Notifications:** Email to referees (Phase 7).
- **Analytics:** `assignment_create`, `assignment_remove`.

### J12. Admin shortlists / publishes results

- **Goal:** Move contestants forward, lock results for a round.
- **Entry:** `/admin/results`.
- **Steps:** Filter shortlist candidates → confirm → set round-published flag.
- **Screens:** `/admin/results`.
- **Backend:** Bulk status update + `audit_logs`.
- **Success:** Public `result-checker` reflects the new status; emails go out (Phase 7).
- **Failure:** Pre-publish review screen; cancel possible.
- **Notifications:** Status emails.
- **Analytics:** `round_publish`, `bulk_status_update`.

### J13. Admin manages payments

- **Goal:** Reconcile payments + override edge cases.
- **Entry:** `/admin/payments`.
- **Steps:** Filter pending/failed → drill → mark succeeded/refunded with note.
- **Screens:** `/admin/payments`.
- **Backend:** existing `PATCH /api/admin/payments/[id]` + UI.
- **Success:** Status persists with `provider_ref`; audit-logged.
- **Failure:** Cannot override succeeded payments to failed without a reason field.
- **Notifications:** Payment-status email to contestant.
- **Analytics:** `payment_override`, `payment_refund`.

### J14. Audience watches contestants *(Phase 8+)*

- **Goal:** Discover and follow contestants.
- **Entry:** `/contestants` directory or social share link.
- **Steps:** Browse → open contestant page → watch → like / save.
- **Screens:** `/contestants`, `/contestants/[id]`.
- **Backend:** Public profile API (Phase 8).
- **Success:** Engagement persisted.
- **Failure:** Login wall when liking/saving without account.
- **Notifications:** Optional new-clip alerts (Phase 11).
- **Analytics:** `contestant_view`, `like`, `save`, `share`.

### J15. Audience votes *(Phase 9)*

- **Goal:** Influence outcomes.
- **Entry:** `/fan/vote` during open round.
- **Steps:** Identify (verified phone/email) → cast vote(s) → see leaderboard if public.
- **Screens:** `/fan/vote`.
- **Backend:** Vote API with anti-fraud + rate-limit.
- **Success:** Vote counted; receipt shown.
- **Failure:** Quota exceeded, identity not verified, voting closed.
- **Notifications:** Vote-receipt email; round-result email.
- **Analytics:** `vote_cast`, `vote_throttled`, `vote_round_close`.

### J16. Producer manages episodes *(Phase 10)*

- **Goal:** Plan a season + 24 episodes.
- **Entry:** `/producer/dashboard`.
- **Steps:** Create season → add episodes → schedule challenges → assign performances → publish.
- **Screens:** `/producer/episodes`, `/producer/schedule`.
- **Backend:** Season/episode/performance APIs.
- **Success:** Episode visible publicly when published.
- **Failure:** Drafts vs. published separation; cannot publish without required fields.
- **Notifications:** Internal team notifications.
- **Analytics:** `episode_create`, `episode_publish`.

### J17. Mentor / celebrity guest *(Phase 13)*

- **Goal:** Mentor assigned contestants.
- **Entry:** `/mentor/contestants`.
- **Steps:** Read contestant context → write mentor note → optional video session.
- **Screens:** `/mentor/contestants`, `/mentor/sessions`.
- **Backend:** Mentor read API + notes write.
- **Success:** Note persisted; visible to contestant + admin.
- **Notifications:** Contestant gets mentor-note email.
- **Analytics:** `mentor_note_create`.

### J18. Sponsor views performance *(Phase 13)*

- **Goal:** See campaign metrics.
- **Entry:** `/sponsor/dashboard`.
- **Steps:** Read campaign aggregate metrics; export.
- **Screens:** `/sponsor/dashboard`, `/sponsor/analytics`.
- **Backend:** Sponsor analytics API (aggregate only).
- **Success:** Metrics shown; export downloadable.
- **Failure:** No per-user data; only aggregate.
- **Notifications:** Weekly digest (Phase 14).
- **Analytics:** `sponsor_view_dashboard`.

### J19. Support handles user issues *(Phase 14)*

- **Goal:** Resolve a user-reported issue.
- **Entry:** `/support/dashboard`.
- **Steps:** Open ticket → read user account → take action → resolve.
- **Screens:** `/support/*`.
- **Backend:** Ticket APIs + audit log.
- **Success:** Ticket closed with resolution note.
- **Failure:** Escalation to admin.
- **Notifications:** User receives resolution email.
- **Analytics:** `ticket_open`, `ticket_close`.

---

## 7. Screen-by-Screen UX Requirements

Below are the major screens that span MVP → late phases. Format: short, repeatable, machine-readable.

### Screen: `/` (Public Landing)

- **Purpose:** Convey show + drive auditions.
- **User:** Public Visitor.
- **Main Sections:** Hero (Bling Records Show + Neo Studios), 4-step flow teaser, judges/mentors strip, show format preview, FAQ teaser, footer CTA.
- **Primary Actions:** **Apply now** (→ `/register`), **Watch the show** (→ `/episodes` post-Phase-10).
- **States:** Idle (always-on; no loading state needed for a static page), error (404 / 500 fallback).
- **Mobile UX:** Stacked single-column; sticky bottom CTA.
- **Accessibility:** All images `alt`; CTA contrast ≥ 4.5:1; reduced-motion respected.
- **Acceptance Criteria:** LCP ≤ 2.5 s on 4G, single golden CTA above fold, no fictional users / numbers.

### Screen: `/register` (3-step Application)

- **Purpose:** Capture contestant identity + talent profile.
- **User:** Public → Contestant.
- **Main Sections:** Step 1 identity, Step 2 talent + bio + socials, Step 3 review + consents.
- **Primary Actions:** **Continue**, **Back**, **Create account**.
- **States:** Field validation errors, server errors (409, 422, 429), submitting, success card.
- **Mobile UX:** One field per row; OS-native keyboard hints (`tel`, `email`, `numeric`).
- **Accessibility:** `<label>` on every field; visible focus ring; step progress announced via `aria-live`.
- **Acceptance Criteria:** Cannot submit without all consents; success card shows 6-digit ID; LocalStorage save-resume.

### Screen: `/contestant/dashboard`

- **Purpose:** Single hub for the contestant.
- **User:** Contestant.
- **Main Sections:** Status banner, profile completeness, submission card, payment card (if applicable), schedule, support entry.
- **Primary Actions:** Submit audition, edit profile, pay fee, contact support.
- **States:** Loading skeleton, empty (no submission), submitted, scoring, shortlisted, eliminated, paid.
- **Mobile UX:** Stack of cards; primary CTA pinned.
- **Accessibility:** Status badges include text + colour.
- **Acceptance Criteria:** Reflects DB state on load; no stale fields after `refresh()`.

### Screen: `/contestant/submission`

- **Purpose:** Upload + manage audition.
- **User:** Contestant.
- **Main Sections:** Pre-flight checklist, file picker, progress bar, validation results, preview, replace CTA.
- **Primary Actions:** Pick file, upload, replace, submit metadata.
- **States:** idle → uploading (with progress) → validating → success | failed | retrying.
- **Mobile UX:** Big file-picker tap target; pause/resume copy if upload long.
- **Accessibility:** Progress as `role="progressbar"`; cancellable.
- **Acceptance Criteria:** 200 MB MP4 uploads in < 2 min on 4G; out-of-spec uploads rejected with copy.

### Screen: `/contestant/payment`

- **Purpose:** Initiate / view AdmasPay.
- **User:** Contestant.
- **Main Sections:** Fee details, payment method, status, retry, refund link.
- **Primary Actions:** Pay, check status, reopen checkout.
- **States:** idle → pending (modal) → succeeded | failed.
- **Mobile UX:** External tab fallback if popup blocked.
- **Accessibility:** Modal focus trap; Esc closes.
- **Acceptance Criteria:** Polling stops on resolve; webhook updates status without manual refresh; retries possible after failure.

### Screen: `/result-checker`

- **Purpose:** Public 6-digit lookup.
- **User:** Public.
- **Main Sections:** Numeric input, result card, status + next-step copy, score (if available).
- **Primary Actions:** Check, copy ID, share.
- **States:** idle → looking up → found | not found | rate-limited.
- **Mobile UX:** `inputmode="numeric"`; auto-focus first field.
- **Accessibility:** `aria-live` on result region.
- **Acceptance Criteria:** Throttle after threshold; no PII leaked on miss; no full DOB / phone returned.

### Screen: `/referee/submissions/[id]`

- **Purpose:** Watch + score one submission with full context.
- **User:** Referee, Admin.
- **Main Sections:** Player, contestant context, 5-criterion sliders + star buttons, notes (private + public), prior-scores summary, submit.
- **Primary Actions:** Score, save notes, mark approved/rejected/flagged, next item.
- **States:** loading → ready → submitting → done.
- **Mobile UX:** Vertical layout; player above sliders.
- **Accessibility:** Sliders have `aria-labelledby`; star button group is a labelled `radiogroup`.
- **Acceptance Criteria:** Cannot leave page without prompt if unsaved changes; aggregate updates after submit.

### Screen: `/admin/contestants/[id]`

- **Purpose:** Full operator detail view.
- **User:** Admin.
- **Main Sections:** Identity, contact, application, submissions list, score aggregate, payments timeline, audit log, status mutation.
- **Primary Actions:** Change status, message contestant (Phase 8), reset password (Phase 14), refund (Phase 14).
- **States:** loading → ready; mutation in flight → success / fail toast.
- **Mobile UX:** Single-column at narrow widths.
- **Accessibility:** All actions confirm-before-execute on destructive mutations.
- **Acceptance Criteria:** Every status change writes to `audit_logs`; PII visible only to admin; no edit-without-reason on status downgrades.

### Screen: `/admin/dashboard`

- **Purpose:** Operator KPIs + jump-points.
- **User:** Admin.
- **Main Sections:** KPI tiles, recent registrations, payments mix, category mix.
- **Primary Actions:** Refresh, drill into list views.
- **States:** loading → ready → error.
- **Mobile UX:** Cards stack; tiles 2-up on phones.
- **Accessibility:** KPI tiles include both icon + text.
- **Acceptance Criteria:** Numbers reflect production data; weekly delta is real.

### Screen: `/contestants/[id]` (public, Phase 8)

- **Purpose:** Public-facing contestant page for engagement.
- **User:** Public, Audience.
- **Main Sections:** Profile, audition video, story / bio, social links, like / share / save.
- **Primary Actions:** Watch, like, share, save.
- **States:** loading → ready → unauthenticated-engagement-blocked.
- **Mobile UX:** Player on top, actions below; sticky like button.
- **Accessibility:** Captions where possible (Phase 11+).
- **Acceptance Criteria:** Likes persisted; shares produce real share URLs; no fake counters.

---

## 8. Full Feature Catalogue

> The full per-feature priority/phase/status grid lives in [product-feature-matrix.md](product-feature-matrix.md). This section gives the high-level groupings; the matrix is the source of truth for status and priority.

| Module | Module purpose | Lives in |
| --- | --- | --- |
| A. Public Website | Tell the show story | Phase 1 |
| B. Authentication | Identity + RBAC | Phase 0–2 |
| C. Contestant Application | Capture profiles | Phase 2 |
| D. Video Upload | Capture auditions | Phase 3 |
| E. Payment | Collect fees | Phase 4 |
| F. Referee/Judge Review | Score auditions | Phase 5 |
| G. Admin Dashboard | Operate the season | Phase 6 |
| H. Result Checker | Public + private status | Phase 2 + 6 |
| I. Audience Engagement | Likes / follows / comments | Phase 8 |
| J. Voting | Audience influences outcomes | Phase 9 |
| K. Contestant Public Profiles | Discovery surface | Phase 8 |
| L. Episodes / Seasons | Reality format model | Phase 10 |
| M. Performance Stage | Stage segments + media | Phase 10–11 |
| N. Celebrity / Mentor | Guest features | Phase 13 |
| O. Sponsor / Partner | Brand integration | Phase 13 |
| P. Notifications | Email/SMS/Push | Phase 7 + 12 |
| Q. Chatbot / Support | Self-serve + tickets | Phase 1 + 14 |
| R. Analytics | Measure + decide | Phase 6 + 14 |
| S. Moderation | Trust & safety | Phase 8 |
| T. Mobile Apps | Native experience | Phase 12 |
| U. Security / Compliance | Trust foundation | Phase 0 + 7 |
| V. Content / Legal Pages | Trust pages | Phase 7 |

---

## 9. UX Design System Direction

### Foundations

- **Colour:** dark base (`hsl(0 0% 4%)`), gold accents (`brand-300…600` + `gold-400/500/600`), warm cream light-mode (`hsl(45 60% 99%)`). All defined in [globals.css](../src/app/globals.css) and [tailwind.config.ts](../tailwind.config.ts) — keep.
- **Typography:** Inter (body) + Space Grotesk (display). Tighten letter-spacing on display headlines (`-0.02em`).
- **Spacing:** 4-px grid; container max 1320 px; vertical rhythm in 8 / 16 / 24 / 32 px increments.
- **Radius:** `--radius` 0.75 rem; cards `2xl/3xl`; inputs `lg`.
- **Shadows:** `stage-glow` only on hero / payment-success / hard-CTA contexts. Don’t over-glow.

### Components

- **Buttons:** primary gold gradient, secondary outline, tertiary ghost. Use `variant="gradient"` for one CTA per section.
- **Cards:** `border-border/60 bg-card`. Hoverable cards lift to `border-brand-500/50` only when clickable.
- **Forms:** mobile-first single-column; sticky step indicator on multi-step.
- **Tables:** sortable, filterable, paginated; admin tables use the existing `Tabs` + `Input` combination as a baseline.
- **Video player:** native `<video controls preload="metadata">` for MVP; HLS in Phase 11.
- **Dashboards:** KPI tile pattern (label + value + trend + icon), already established in `/admin`.
- **Status badges:** semantic colour map: registered → secondary, submitted → outline, shortlisted → gradient gold, advanced → gradient gold + check, eliminated → muted, paid → emerald, failed → destructive.
- **Score cards:** progress bar per criterion; aggregate with judge count.
- **Mobile navigation:** existing Navbar collapses to hamburger; add a sticky bottom CTA on contestant flows.
- **Admin navigation:** sidebar layout in Phase 6+ with the grouped routes from §5.

### Accessibility

- WCAG AA contrast across all themes.
- All icon-only buttons require `aria-label`.
- All forms require `<label>` with `for`/`id`.
- All status badges must include text, not colour alone.
- Respect `prefers-reduced-motion` (the existing Framer Motion patterns must check it).

---

## 10. Content Strategy

| Surface | Required content | Owner | Phase |
| --- | --- | --- | --- |
| Homepage hero | Tagline, sub-tag, CTA | Founder + copywriter | 1 |
| About page | Bling Records origin, Neo Studios role, show concept | Founder | 1 |
| Audition instructions | Format, length, technical specs, originality clause, no full-master cover rule | Founder + legal | 2 |
| Video quality guidance | Lighting, audio, framing, file size; per-category music tips | Production team | 3 |
| Judge credibility copy | Bios + photos of confirmed referees; placeholder otherwise | Founder | 1 (placeholder) → 5 |
| Show format explanation | 24-episode reality, 12-finalist music house, performance stages | Founder | 1 (teaser), 10 (full) |
| Prize explanation | Real prize amount + secondary prizes + terms | Founder + legal | 1 |
| Payment explanation | When fee applies, how much, what it pays for | Founder + finance | 4 |
| Result / status copy | Public-facing labels for every internal status | Product + founder | 6 |
| FAQ | EN + AM; reuse existing `FAQ_ENTRIES` and update for Bling Records Show | Product + Amharic translator | 1 |
| Terms | Eligibility, judging rules, broadcast rights, disqualification, dispute | Legal | 7 |
| Privacy | Data collected, retention, contact | Legal | 7 |
| Refund policy | When refunds apply | Legal + finance | 7 |
| Content rights | Who owns submitted videos; broadcast / re-distribution | Legal | 7 |
| Support chatbot KB | Top 50 Q&A entries (EN + AM) | Support | 1 |
| Bilingual EN/AM strategy | EN default; AM equal weight on contestant-facing pages; partial AM on operator pages | Product | 1 (FAQ + chatbot), expand 7+ |

---

## 11. Accessibility and Responsiveness

- **Mobile-first.** Every page must be designed for a 5-inch portrait viewport before desktop.
- **Tap targets:** minimum 44 × 44 px for any interactive element.
- **Keyboard:** every action reachable by `Tab`; skip-to-content link on each page; focus ring visible.
- **Alt text:** every meaningful image; decorative images marked `aria-hidden`.
- **Captions:** auto-generated captions for any audition / episode video where Cloudinary or the streaming provider supports it (Phase 11+).
- **Contrast:** WCAG AA minimum, AAA where feasible (audit notes `muted-foreground` is borderline — fix in Phase 1).
- **Form validation:** specific copy, not generic; tied to fields by `aria-describedby`.
- **Low-bandwidth:** image `srcSet`; lazy-load below-fold; skeletons not spinners.
- **Slow uploads:** chunked / resumable upload; user can leave page and come back.
- **Graceful failure:** every async screen has a retry CTA and a fallback path; never a dead-end spinner.

---

## 12. UX Risks

| Risk | Impact | Mitigation | Phase |
| --- | --- | --- | --- |
| Users misread the platform as a generic AGT clone | Low conversion, weak brand | Phase 1 rebrand; replace fictional testimonials/stats; add Bling Records + Neo Studios attribution | 1 |
| Upload failures cause abandonment | Lost contestants | Resumable uploads; retry with progress; URL fallback; phone-first guidance | 3 |
| Payment-before-trust reduces conversion | Smaller applicant pool | Default to Option B (free apply, fee at shortlist); revisit after first cohort | 4 |
| Fake / non-persistent likes or votes damage credibility | Trust collapse | Don’t ship engagement features without backend; remove Reels likes in MVP | 5, 8 |
| Public claims exceed backend capability (live broadcast, SMS, TikTok feed) | PR risk | Audit copy in every phase; founder must approve any “coming soon” claim | 1, 7 |
| Judges struggle if review UI is slow / breaks playback | Bad scoring data | In-app player + assignment queues; load-test referee flow before season opens | 5 |
| Contestants don’t understand statuses | Support load + complaints | Public-facing status copy lawyer-reviewed; status-change emails | 6, 7 |
| Public 6-digit IDs are brute-forceable | PII leak | Rate-limit + return only initials for anonymous lookups | 0 (rate-limit), 6 (copy) |
| Rebrand breaks SEO | Loss of organic traffic | 301 redirects from old routes; submit new sitemap; preserve URL slugs where possible | 1 |
| Bilingual fragmentation (EN-only operator UI vs. EN/AM contestant UI) | Operator confusion | Operator UI EN-only is acceptable; contestant UI fully bilingual on critical flows | 2, 7 |
| Mobile uploads on flaky connections drop large files | Lost auditions | Use Cloudinary chunked upload; show progress; allow retry without re-pick | 3 |
| Notifications spam contestants | Unsubscribes | One email per status change; digest pattern; clear unsubscribe path | 7 |
| Audience-engagement features pull focus away from MVP | Slipped MVP | Phase 8 is gated behind a working MVP — enforced in [task-tracker.md](task-tracker.md) | 8 |
| Voting fraud destroys legitimacy of results | Show credibility ruined | Phase 9 requires identity verification + rate-limit + audit log before any vote can be counted | 9 |
| Mobile app launched too early | Wasted engineering | Phase 12 only after Phases 1–10 are stable | 12 |

---

*End of Full UX Ecosystem Documentation.*
