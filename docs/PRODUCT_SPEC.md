# TalentQuest — Product Specification

## 1. Product summary

TalentQuest is a multi-round, AGT/Idol-style talent competition platform built
for Ethiopia's emerging performers. Contestants register online, submit a
performance video, are judged by industry referees, and rise through city
qualifiers to a televised national grand final.

The platform must work on every device a contestant might own — feature-phone-
era Androids up to flagship phones, laptops, and desktops — and in two
languages (English and Amharic).

## 2. Core value proposition

- **For contestants:** a transparent, mobile-first audition process without
  travel costs, gatekeepers, or production minimums. Register in 60 seconds,
  submit a phone-recorded video, and track your result.
- **For judges:** a calibrated scoring console with the same 100-point rubric
  every round, shared notes, and reviewer-level history.
- **For organizers:** a single dashboard for the season — registrations,
  payments, video pipeline status, scoring, and live event coordination.
- **For audiences / sponsors:** a polished, video-first showcase that makes
  the season feel premium even outside the live broadcast.

## 3. Goals (Year-1 success metrics)

| Goal                                  | Target |
| ------------------------------------- | ------ |
| Contestant registrations (national)   | 25,000 |
| Submission completion rate            | ≥ 70 % |
| Reviewed submissions within SLA       | ≥ 95 % within 7 days |
| Page-1 mobile Lighthouse performance  | ≥ 90  |
| Telebirr payment success rate         | ≥ 98 % |
| Showcase clip total views             | 5 M cumulative |
| Bilingual chatbot deflection          | ≥ 60 % of inbound questions |

## 4. Out of scope (v1)

- Multi-country competition (Ethiopia only).
- Live-streaming the grand final from this platform (handled by broadcast
  partner; we embed/link).
- In-app paid subscriptions; only the entry fee and optional sponsor offers.
- Native mobile apps. Web is mobile-first and PWA-installable instead.

## 5. Roles and primary jobs-to-be-done

| Role             | Top jobs                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| Visitor          | Discover the competition, watch showcase clips, share with friends.     |
| Contestant       | Register, pay (where required), submit video, track result, edit profile. |
| Referee / Judge  | Watch assigned clips, score on a 100-point rubric, leave private notes. |
| Admin            | Run the season — categories, rounds, payments, video pipeline, comms.   |

## 6. Two-phase delivery plan

- **Phase 1 (this MVP):** Frontend-only Vercel deploy. No backend; no payment;
  no real upload; no real auth. Stakeholders can walk through every screen,
  including admin and referee, with realistic mock data and bilingual chatbot.
- **Phase 2:** Production system — see [`ARCHITECTURE.md`](./ARCHITECTURE.md)
  and [`ROADMAP.md`](./ROADMAP.md). All "demo / future-production" labels in
  Phase 1 indicate features that flip to real implementations in Phase 2.

## 7. Brand and tone

- **Voice:** confident, hype, cinematic — the way a great host opens a show.
- **Visual:** stage-glow gradients (brand-pink → fuchsia → cyan), bold display
  type, video-forward layouts, dark default theme with light-mode parity.
- **Motion:** purposeful animations on entry/hover; never gratuitous.
- **Inclusive copy:** Amharic alongside English on every primary surface.

## 8. Accessibility commitments

- WCAG 2.1 AA targets (contrast, focus rings, keyboard nav).
- All interactive elements have accessible names and roles (Radix primitives).
- Captions for showcase video pipeline (Phase 2; auto-caption on ingest).
- Reduced motion respected via `prefers-reduced-motion` (Phase 2).
- Touch targets ≥ 44 px on mobile.
