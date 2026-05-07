# TalentQuest *(rebrand to Bling Records Show in Phase 1 — see [docs/full-development-roadmap.md](docs/full-development-roadmap.md))*

> Ethiopia's stage for the next generation of singers, dancers, comedians,
> actors, instrumentalists, and one-of-a-kind talents.

**Production-mode** Next.js 14 application with a real backend, persisted
data, secure auth, role-based dashboards, payment scaffolding, and a
Codespaces-ready dev environment.

---

## ⚠️ Security — read before contributing

> **Never commit `.env`, `.env.local`, or any file with real credentials.**
> Real secrets live only in the host's environment-variable UI
> (Vercel → Project → Settings → Environment Variables, scoped per
> environment). `.env.example` is a placeholder template.
>
> If you ever paste a real secret into a tracked file: **rotate it with the
> provider first**, then remove it. See
> [docs/agent-execution-rules.md](docs/agent-execution-rules.md) §2 and
> [docs/bling-records-show-mvp-ux-technical-scope.md](docs/bling-records-show-mvp-ux-technical-scope.md) §0.

---

## What's in the box

| Layer            | Implementation                                                      |
| ---------------- | ------------------------------------------------------------------- |
| Frontend         | Next.js 14 App Router · Tailwind · shadcn/ui · Framer Motion        |
| API              | Next.js Route Handlers (Node runtime) under `/api/*`                |
| Database         | **Postgres on Neon serverless** (`@neondatabase/serverless` + `ws`) |
| Auth             | bcrypt password hashing · HS256 JWT in HTTP-only cookie · `jose`    |
| RBAC             | `contestant`, `referee`, `admin` roles · edge middleware on `/admin` and `/referee` |
| Rate-limiting    | In-memory limiter on `/api/auth/login` (10/15min/IP) and `/api/contestants/[id]` (30/5min/IP) — production needs Upstash (P0-T009b) |
| Payments         | Telebirr / AdmasPay HMAC-signed init + webhook (stub mode without creds) |
| Uploads          | Cloudinary signed direct-upload intent (client wiring lands in Phase 3) |
| Chatbot          | Bilingual EN/AM static FAQ matcher · LLM fallthrough when `ANTHROPIC_API_KEY` is set |

The full product / UX / roadmap docs live in [`docs/`](docs/) — start with
[docs/full-ux-ecosystem-documentation.md](docs/full-ux-ecosystem-documentation.md)
and [docs/task-tracker.md](docs/task-tracker.md).

---

## Quick start

You need:

- Node.js 20.6+ (uses `process.loadEnvFile`).
- A Postgres connection string. Easiest: a free [Neon](https://neon.tech)
  project. Use the **pooled** URL (host ends with
  `-pooler.<region>.aws.neon.tech`).

```bash
# 1. Clone, then create your local env file from the template:
cp .env.example .env.local

# 2. Edit .env.local — at minimum:
#    - JWT_SECRET   (generate with the command in .env.example)
#    - DATABASE_URL (your Neon pooled connection string)
#    - SEED_*_PASSWORD env vars (set strong dev passwords)

npm install
npm run db:init   # idempotent migrations
npm run db:seed   # admin + referee + 4 demo contestants
npm run dev       # http://localhost:3000
```

Seed accounts (passwords come from the `SEED_*_PASSWORD` env vars you set):

| Role        | Email                         |
| ----------- | ----------------------------- |
| Admin       | `$SEED_ADMIN_EMAIL`           |
| Referee     | `$SEED_REFEREE_EMAIL`         |
| Contestant  | `hanna@example.com`           |
| Contestant  | `selam@example.com`           |
| Contestant  | `yonas@example.com`           |
| Contestant  | `mikiyas@example.com`         |

In **dev only**, the `/login` page renders a hint listing these emails (the
block is hidden in production builds via `process.env.NODE_ENV` check).

---

## Scripts

```bash
npm run dev          # Next.js dev server (HMR)
npm run build        # production build
npm run start        # serve the production build
npm run lint
npm run type-check
npm run db:init      # apply schema migrations (idempotent)
npm run db:seed      # insert default admin/referee + demo contestants
npm run db:reset     # drop + recreate the schema, then re-seed
```

---

## Project structure

```
src/
├── app/                      # App Router pages + API routes
│   ├── api/
│   │   ├── auth/{register,login,logout,me}
│   │   ├── contestants/[id]
│   │   ├── contestants/me/advance
│   │   ├── submissions
│   │   ├── scores
│   │   ├── contact
│   │   ├── chatbot
│   │   ├── showcase
│   │   ├── admin/{stats,contestants}
│   │   ├── referee/queue
│   │   └── payments/{init,webhook}
│   ├── admin/                # Auth-gated admin console
│   ├── referee/              # Auth-gated referee scoring dashboard
│   ├── login/                # Email + password login
│   ├── register/             # 3-step registration with password
│   ├── profile/              # Contestant control panel (live data)
│   ├── result-checker/       # 6-digit ID public lookup
│   ├── showcase/             # Reels / grid video gallery
│   ├── upload-guide/, faq/, contact/, categories/, how-it-works/
│   └── layout.tsx            # SessionProvider + nav + footer + chatbot
├── components/
│   ├── auth/SessionProvider.tsx   # /api/auth/me hook + logout
│   ├── chatbot/ChatbotWidget.tsx  # POSTs /api/chatbot
│   ├── home/, layout/, ui/
├── data/                     # Static lookups (categories, FAQ, judging, schedule)
├── lib/
│   ├── db.ts                 # Neon Postgres pool + idempotent migrations
│   ├── auth.ts               # bcrypt, JWT (jose), session cookie helpers
│   ├── api.ts                # Zod parse + error envelope
│   ├── rate-limit.ts         # in-memory rate limiter (Upstash-ready)
│   ├── contestants.ts        # contestant + submission repos
│   ├── scores.ts             # per-criterion upsert + aggregation
│   ├── payments.ts           # Telebirr/AdmasPay signed init + webhook verify
│   ├── uploads.ts            # Cloudinary signed direct-upload intent
│   ├── dto.ts (server)       # row → public DTO (anonymized)
│   └── dto-types.ts (client) # client-safe DTO type mirrors
├── middleware.ts             # /admin and /referee role enforcement
└── types/                    # Shared TS types

scripts/
├── db-init.ts                # apply migrations
├── db-reset.ts               # drop + recreate schema
└── db-seed.ts                # seed admin/referee/contestants
```

---

## Configuration

All env vars are documented in [`.env.example`](.env.example). Minimum
required for a working dev environment:

```env
JWT_SECRET=<48+ random bytes, base64url>
DATABASE_URL=postgresql://...neon...?sslmode=require
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Optional — leave blank and the corresponding feature falls back to stub /
static mode:

| Var                                  | Effect                                                       |
| ------------------------------------ | ------------------------------------------------------------ |
| `ADMASPAY_CHECKOUT_URL`              | Hosted-checkout flow for the audition fee                    |
| `TELEBIRR_*`                         | Full Telebirr / AdmasPay API + HMAC-signed webhook           |
| `CLOUDINARY_*`                       | Signed direct upload for audition videos                     |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Replaces static chatbot with Claude                       |
| `SEED_ADMIN_*` / `SEED_REFEREE_*`    | Local seed credentials (used by `npm run db:seed`)           |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN`  | Production-grade rate limiter (otherwise in-memory only)     |

---

## Deployment

Recommended target: **Vercel + Neon Postgres**. Headlines:

- Set every required env var in Vercel → Settings → Environment Variables.
  Never commit real values.
- Neon's pooled connection string works for serverless. The lazy pool in
  [`src/lib/db.ts`](src/lib/db.ts) avoids cold-start at module load.
- Cloudinary and Telebirr live mode require the relevant env vars; without
  them the API responds in stub mode (recorded locally, useful for QA).
- `JWT_SECRET` must be ≥ 24 characters (the auth module enforces this).
  Generate with the `node -e "..."` command in `.env.example`.
- Before launch, swap the in-memory rate limiter for Upstash Redis (see
  `UPSTASH_*` env vars and `src/lib/rate-limit.ts`).

The full deployment + ops guide lives in
[`docs/DEPLOY_VERCEL_NEON.md`](docs/DEPLOY_VERCEL_NEON.md) and
[`docs/admin-and-operations-plan.md`](docs/admin-and-operations-plan.md).

---

## Security highlights

- Passwords hashed with bcrypt (cost 10) — never stored or logged in plain text
- JWT sessions signed HS256, HTTP-only cookies, `Secure` in production, 14-day TTL
- `/admin` and `/referee` enforced at the **edge** by Next.js middleware so
  unauthenticated users never reach the page handler
- `/api/auth/login` rate-limited to 10 failures / 15 min / IP
- `/api/contestants/[id]` rate-limited to 30 lookups / 5 min / IP
- Public 6-digit lookup never returns full name, email, phone, or DOB —
  only stage name (or initials) + city + status + progress
- Contestant ID generation uses `crypto.randomInt` and collision-checks the DB
- Telebirr webhook signature is verified with `crypto.timingSafeEqual` —
  unsigned or mismatched callbacks are rejected with 401 so the provider retries
- Seed-account hint on `/login` is hidden in production builds (`NODE_ENV` gated)

---

## License

© TalentQuest. All rights reserved.
