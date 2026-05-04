# TalentQuest

> Ethiopia's stage for the next generation of singers, dancers, comedians,
> actors, instrumentalists, and one-of-a-kind talents.

**Production-mode** Next.js 14 application with a real backend, persisted
data, secure auth, role-based dashboards, payment scaffolding, and a
Codespaces-ready dev environment.

---

## What's in the box

| Layer            | Implementation                                                      |
| ---------------- | ------------------------------------------------------------------- |
| Frontend         | Next.js 14 App Router · Tailwind · shadcn/ui · Framer Motion        |
| API              | Next.js Route Handlers (Node runtime) under `/api/*`                |
| Database         | SQLite (via `better-sqlite3`) — file at `data/talentquest.db`       |
| Auth             | bcrypt password hashing · HS256 JWT in HTTP-only cookie · `jose`    |
| RBAC             | `contestant`, `referee`, `admin` roles · edge middleware on `/admin` and `/referee` |
| Payments         | Telebirr / AdmasPay HMAC-signed init + webhook (stub mode without creds) |
| Uploads          | Cloudinary signed direct-upload (dev fallback to local `/public/uploads`) |
| Chatbot          | Bilingual EN/AM static FAQ matcher · LLM fallthrough when `ANTHROPIC_API_KEY` is set |

The full Phase-2 product spec, judging rubric, and pipeline plans still
live in [`docs/`](docs/).

---

## Quick start (GitHub Codespaces)

The `.devcontainer/devcontainer.json` does the work for you — open the repo
in a Codespace and the container will:

1. `npm install`
2. `npm run db:init` (apply migrations)
3. `npm run db:seed` (default admin/referee + four demo contestants)

Then start the app:

```bash
npm run dev      # http://localhost:3000  (auto-forwarded)
```

Seeded test accounts (override via env vars before seeding):

| Role      | Email                          | Password     |
| --------- | ------------------------------ | ------------ |
| Admin     | `admin@talentquest.local`      | `Admin1234!` |
| Referee   | `referee@talentquest.local`    | `Referee1234!` |
| Contestant| `hanna@example.com`            | `Demo1234!`  |
| Contestant| `selam@example.com`            | `Demo1234!`  |
| Contestant| `yonas@example.com`            | `Demo1234!`  |
| Contestant| `mikiyas@example.com`          | `Demo1234!`  |

---

## Quick start (local, outside Codespaces)

```bash
cp .env.example .env.local
# Edit .env.local — at minimum, set JWT_SECRET to a long random string.
npm install
npm run db:init
npm run db:seed
npm run dev
```

Node.js 20.6+ is required (uses `process.loadEnvFile`).

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
npm run db:reset     # delete data/talentquest.db, re-init, re-seed
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
│   ├── db.ts                 # better-sqlite3 + schema migrations
│   ├── auth.ts               # bcrypt, JWT (jose), session cookie helpers
│   ├── api.ts                # Zod parse + error envelope
│   ├── contestants.ts        # contestant + submission repos
│   ├── scores.ts             # per-criterion upsert + aggregation
│   ├── payments.ts           # Telebirr/AdmasPay signed init + webhook verify
│   ├── uploads.ts            # Cloudinary signed direct-upload intent
│   ├── dto.ts (server)       # row → public DTO
│   └── dto-types.ts (client) # client-safe DTO type mirrors
├── middleware.ts             # /admin and /referee role enforcement
└── types/                    # Shared TS types

scripts/
├── db-init.ts                # apply migrations
└── db-seed.ts                # seed admin/referee/contestants

data/                         # gitignored — SQLite file lives here
```

---

## Configuration

All env vars are documented in `.env.example`. The minimum required is:

```env
JWT_SECRET=<32+ random chars>
```

Optional — leave blank and the system runs in graceful stub mode:

| Var                          | Effect                                                  |
| ---------------------------- | ------------------------------------------------------- |
| `TELEBIRR_*`                 | Real Telebirr/AdmasPay init + HMAC-signed webhook       |
| `CLOUDINARY_*`               | Signed direct-upload for videos                         |
| `ANTHROPIC_API_KEY`          | Replaces static chatbot with Claude (`-haiku-4-5`)      |
| `SEED_ADMIN_*` / `SEED_REFEREE_*` | Custom seed credentials                            |
| `DATABASE_PATH`              | Override SQLite file location                           |
| `NEXT_PUBLIC_SITE_URL`       | Used in sitemap and email/payment return URLs           |

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full guide. Headlines:

- **Codespaces / Render / Fly / a VPS**: SQLite works out of the box. Mount
  a persistent volume at `/app/data` and point `DATABASE_PATH` at it.
- **Vercel**: serverless filesystems are read-only and cold-start, so
  switch to a managed Postgres. The codebase isolates SQL in `src/lib/db.ts`
  and the small set of repo modules — replacing `better-sqlite3` with `pg`
  or `@vercel/postgres` is a contained change.
- Always set `JWT_SECRET` to a 32+ char random value in production.
- Cloudinary and Telebirr live mode require the relevant env vars; without
  them the API responds in stub mode (recorded locally, useful for QA).

---

## Security highlights

- Passwords hashed with bcrypt (cost 10) — never stored or logged in plain text
- JWT sessions signed HS256, HTTP-only cookies, `Secure` flag in production, 14-day TTL
- `/admin` and `/referee` enforced at the **edge** by Next.js middleware so
  unauthenticated users never reach the page handler
- Contestant ID generation uses `crypto.randomInt` and collision-checks the DB
- Telebirr webhook signature is verified with `crypto.timingSafeEqual` —
  unsigned or mismatched callbacks are rejected with 401 so the provider retries

---

## License

© TalentQuest. All rights reserved.
