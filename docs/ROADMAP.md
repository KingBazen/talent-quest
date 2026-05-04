# Implementation roadmap

Two phases, eight milestones. Calendar dates are indicative; the dependency
ordering is firm.

## Phase 1 — Promotional MVP (this repository)

Goal: ship a polished, public-facing site that explains the competition,
demonstrates every screen, and lets the audience pre-register interest.

### M1 · Foundation (week 1)

- Next.js + Tailwind + shadcn/ui scaffold.
- Design tokens (brand-pink → fuchsia → cyan), dark/light theme.
- Navbar, footer, demo banner, chatbot widget shell.

### M2 · Marketing surfaces (week 2)

- Homepage (hero, how-it-works, categories, showcase, testimonials, CTA).
- Categories page.
- Upload guide page.
- How-it-works page with rubric and schedule.

### M3 · Demo flows (week 3)

- 3-step registration with React Hook Form + Zod.
- Demo contestant ID generation (6 numeric digits, browser-local).
- Profile page with progress timeline and "simulate next step" affordance.
- Result Checker page.
- Showcase page with reels-style and YouTube-style views.

### M4 · Bilingual support, admin/referee previews, deploy (week 4)

- Static EN + AM FAQ.
- Stage Bot widget (rule-based) with EN / AM toggle.
- Admin demo dashboard with mock data.
- Referee demo console with live-updating rubric.
- Vercel deploy with custom domain.
- 404, sitemap, robots, SEO meta.

**Phase 1 exit criteria:** every page in this list is live, mobile-responsive,
keyboard-navigable, and clearly labels demo vs. future-production features.

---

## Phase 2 — Production system

### M5 · Infra + auth (4 weeks)

- Monorepo (`apps/web`, `apps/api`, `packages/shared`).
- Managed PostgreSQL + Redis up; Prisma migrations bootstrapped.
- Email + phone OTP auth, JWT sessions, RBAC, password reset, 2FA for admin/judge.
- Audit log table + middleware.
- Sentry, structured logging, healthchecks.

### M6 · Registration + payments (3 weeks)

- Real contestant registration with server-side validation.
- Globally unique contestant IDs (sequence with collision-safe insert).
- Telebirr via AdmasPay/Paylib; webhook verifier; reconciler cron.
- Receipt PDFs (EN + AM).

### M7 · Video pipeline + judging (4 weeks)

- Direct upload to Mux/Cloudinary with chunked + resumable client.
- Transcoding webhooks + moderation gate.
- Judge dashboard: queue, scoring, notes, flagging.
- Score aggregation worker; per-round result publish action.

### M8 · Admin tooling, AI chatbot, polish (3 weeks)

- Admin dashboard wired to live data.
- Bulk SMS + email notifications via templated jobs.
- LLM-backed bilingual chatbot (RAG over rules, schedule, FAQ).
- Public showcase populated from approved submissions.
- WCAG audit and pen-test sign-off.

### M9 · Launch (1 week)

- Load test at 10× expected peak.
- Backup restore drill.
- DNS cutover + on-call rota engaged.
- Marketing kickoff.

---

## Dependency graph

```
M1 → M2 → M3 → M4              (Phase 1, ~4 weeks)
      ↘
M5 (infra + auth)
   ↓
M6 (payments) ───────► M7 (video + judging) ───► M8 (admin + chatbot) ───► M9 (launch)
```

Total Phase 2 elapsed time: ~15 weeks for a 4-engineer team running tracks in
parallel. Single-engineer execution is realistic at ~30 weeks.

## Team shape

- **Phase 1:** 1 frontend engineer + 1 designer.
- **Phase 2:** 2 backend, 2 frontend, 1 infra/SRE, 1 designer, 1 PM.

## Risk register (top 3)

| Risk                                   | Mitigation                                  |
| -------------------------------------- | ------------------------------------------- |
| Telebirr aggregator KYC delays         | Begin onboarding in week 1 of M5            |
| Video transcoding cost overrun         | Per-title encoding, cap resolution at 1080p |
| Amharic content moderation gaps        | Human-in-the-loop for first season          |
