# TalentQuest

> Ethiopia's stage for the next generation of singers, dancers, comedians,
> actors, instrumentalists, and one-of-a-kind talents.

This repository ships in **two phases**:

- **Phase 1 (this app)** — a frontend-only, Vercel-ready Next.js promo MVP with
  a registration demo, contestant ID generator, profile, result checker, video
  showcase, upload guide, FAQ + bilingual (EN / አማርኛ) chatbot, and admin /
  referee preview dashboards.
- **Phase 2** — a full production system with real authentication, PostgreSQL,
  Node.js (Express/NestJS) backend, Telebirr payments via AdmasPay/Paylib,
  video upload + processing (Cloudinary / Mux / S3), an LLM-powered chatbot,
  and role-based admin / referee dashboards. **Full plan in [`docs/`](docs/).**

---

## Tech stack (Phase 1)

| Concern        | Tooling                                |
| -------------- | -------------------------------------- |
| Framework      | Next.js 14 (App Router) + TypeScript   |
| Styling        | Tailwind CSS + shadcn/ui (new-york)    |
| Animation      | Framer Motion                          |
| Icons          | Lucide React                           |
| Forms          | React Hook Form + Zod                  |
| Theming        | next-themes (dark default)             |
| State (demo)   | localStorage                           |
| Deployment     | Vercel                                 |

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
npm run type-check
```

Node.js 18.18+ is required (Next.js 14).

---

## Deploy to Vercel

1. Push this repository to GitHub / GitLab / Bitbucket.
2. Import the project on [vercel.com/new](https://vercel.com/new).
3. Vercel will auto-detect Next.js. No environment variables are required for
   Phase 1.
4. Click **Deploy**. The site is live at the assigned `*.vercel.app` URL.
5. Configure a custom domain in Vercel → Project → Settings → Domains.

The repository contains a `vercel.json` for explicit framework hints.

---

## Project structure

```
src/
├── app/                       # App Router pages
│   ├── page.tsx               # Homepage
│   ├── register/              # 3-step demo registration
│   ├── how-it-works/          # Flow + judging rubric + schedule
│   ├── categories/            # Six talent categories
│   ├── upload-guide/          # Recording best practices
│   ├── showcase/              # Reels + YouTube-grid views
│   ├── profile/               # Demo contestant control panel
│   ├── result-checker/        # Look up by 6-digit ID
│   ├── faq/                   # FAQ + bilingual lookup
│   ├── contact/               # Demo contact form
│   ├── admin-demo/            # Mock admin dashboard
│   ├── referee-demo/          # Mock referee scoring console
│   ├── layout.tsx             # Shell, theme, chatbot widget
│   ├── globals.css            # Tailwind + design tokens
│   └── not-found.tsx
├── components/
│   ├── ui/                    # shadcn primitives (button, card, ...)
│   ├── layout/                # Navbar, footer, theme toggle, banner
│   ├── home/                  # Hero, categories, showcase, CTA
│   └── chatbot/               # Floating Stage Bot widget
├── data/                      # Static JSON-style demo data
├── lib/                       # utils + localStorage helpers
└── types/                     # Shared TS types
```

---

## What's clearly labelled as "demo / future-production"

Phase 1 visibly marks these areas wherever they appear:

| Area                  | Phase 1 (this MVP)                         | Phase 2 production |
| --------------------- | ------------------------------------------ | ------------------ |
| Authentication        | None — localStorage only                   | JWT + RBAC + 2FA   |
| Payments              | UI mock                                    | Telebirr (AdmasPay/Paylib) + webhook verification |
| Video upload          | UI mock + showcase data only               | Cloudinary / Mux / Supabase Storage / S3 with chunked upload |
| Judge scoring         | Visual rubric, scores not persisted        | Authenticated referee dashboard + persisted scores |
| Chatbot               | Static EN/AM keyword matcher               | LLM-backed RAG over rules / contestants / schedule |
| Contestant ID         | Random 6-digit, browser-local              | Globally unique with collision check + audit |

Everything is still functional from a UX perspective — stakeholders can walk
through the entire journey without a backend.

---

## Phase 2 documentation

The `docs/` folder contains the complete Phase 2 plan:

- `PRODUCT_SPEC.md`
- `USER_STORIES.md`
- `REQUIREMENTS.md`
- `ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `API_PLAN.md`
- `SECURITY.md`
- `PAYMENTS_TELEBIRR.md`
- `VIDEO_PIPELINE.md`
- `DEPLOYMENT.md`
- `ROADMAP.md`
- `ACCEPTANCE_CRITERIA.md`

---

## License

© TalentQuest. Phase 1 is a promotional demo.
