# Deploying TalentQuest to Vercel + Neon (test deployment)

The code change to support this is already done — SQLite is gone, the app
talks to Postgres via `@neondatabase/serverless`. Everything below is what
**you** need to do in the browser, since I can't sign in to your accounts.

Total time: ~20 minutes. Total cost: $0.

---

## Step 1 — Create a Neon Postgres database (~5 min)

1. Go to <https://neon.tech> and sign up (GitHub login is fastest).
2. Click **Create Project**.
   - Project name: `talentquest`
   - Postgres version: latest (default is fine)
   - Region: pick the one closest to your users. For Ethiopia, **Frankfurt
     (eu-central-1)** is the lowest-latency Neon region.
3. Once the project is created, you land on the dashboard. Click
   **Connection Details** in the sidebar.
4. In the connection-string box:
   - Make sure **Pooled connection** is selected (the toggle near the top).
     The hostname must contain `-pooler` — that's the one Vercel needs.
   - Copy the full string. It looks like:
     ```
     postgresql://USER:PASSWORD@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
     ```
5. Save that string somewhere safe — you'll paste it into Vercel in step 3.

> Don't run any SQL in Neon's UI. The app creates its own tables on the
> first request (`ensureMigrated()` in [src/lib/db.ts](../src/lib/db.ts)).

---

## Step 2 — Push the code to GitHub (~2 min)

If the repo isn't on GitHub yet:

```bash
# Create the repo on GitHub (web UI), then:
git remote add origin git@github.com:<your-username>/talent-quest.git
git add -A
git commit -m "Switch to Postgres for Vercel deployment"
git push -u origin main
```

If it's already pushed, just commit and push the migration changes:

```bash
git add -A
git commit -m "Switch to Postgres for Vercel deployment"
git push
```

---

## Step 3 — Deploy to Vercel (~10 min)

1. Go to <https://vercel.com> and sign in with GitHub.
2. Click **Add New → Project**.
3. Find `talent-quest` in the repo list → **Import**.
4. On the configure screen:
   - **Framework Preset**: Next.js (auto-detected, leave alone).
   - **Build Command**: leave default (`next build`).
   - **Install Command**: leave default.
   - **Root Directory**: leave as `./`.
5. Expand **Environment Variables** and add these two:

   | Name           | Value                                                                   |
   | -------------- | ----------------------------------------------------------------------- |
   | `DATABASE_URL` | the pooled connection string you copied from Neon in step 1             |
   | `JWT_SECRET`   | run `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` locally and paste the output |

   Both are **Required**. Apply them to all three environments
   (Production / Preview / Development).

6. Click **Deploy**. First build takes ~90 seconds.
7. When it finishes you get a URL like `talent-quest-xyz.vercel.app`. Open
   it — the schema migration runs on the first request, so it may take
   ~3 seconds the very first time.

That's the test URL. Share it with stakeholders.

---

## Step 4 — Seed the test admin / referee accounts (one-time, ~1 min)

The seed script needs to run against your Neon DB. Easiest way is from
your local machine:

```bash
# In your local checkout, paste the same DATABASE_URL into .env.local
echo 'DATABASE_URL="<paste-the-pooled-connection-string>"' >> .env.local
echo 'JWT_SECRET="<the-same-secret-you-used-on-vercel>"' >> .env.local

npm run db:seed
```

This creates:
- `admin@talentquest.local` / `Admin1234!`
- `referee@talentquest.local` / `Referee1234!`
- four demo contestants

Change those defaults in `.env.local` before running if you want different
credentials (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, etc.).

> If you'd rather not seed from your laptop, just register a contestant
> normally on the live site — that flow doesn't depend on the seed script.

---

## Step 5 — Optional: add the rest of the integrations

These all stay blank unless you opt in. Add them in **Vercel → Project →
Settings → Environment Variables**, then click **Redeploy**.

| Variable                  | What it does                                            |
| ------------------------- | ------------------------------------------------------- |
| `CLOUDINARY_*` (4 vars)   | Real video uploads (otherwise local fallback)           |
| `ADMASPAY_CHECKOUT_URL`   | Sends users to AdmasPay's hosted checkout for payments  |
| `TELEBIRR_*` (5 vars)     | Full Telebirr API mode (for production payments)        |
| `ANTHROPIC_API_KEY`       | Live LLM chatbot (otherwise static keyword matcher)     |
| `NEXT_PUBLIC_SITE_URL`    | Your Vercel URL or, later, your real domain             |

See [.env.example](../.env.example) for the complete list with comments.

---

## Step 6 — When your real domain arrives

1. **Vercel → Project → Settings → Domains → Add**.
2. Type `talentquest.et` (or whatever you bought).
3. Vercel shows the DNS records to add at your registrar (one A record
   for the apex, one CNAME for `www`).
4. Add them at the registrar; Vercel auto-issues TLS within minutes.
5. Update `NEXT_PUBLIC_SITE_URL` in Vercel to the real domain and redeploy.

---

## When you switch from Vercel to your own server later

Nothing in the code needs to change. The same app runs anywhere Node 20+
runs. Either:

- **Keep using Neon** from the new server — just copy `DATABASE_URL` to
  the new host's env. Cheapest path; no data migration.
- **Run Postgres on the new server** — `pg_dump` from Neon, restore on
  the server, swap `DATABASE_URL` to point at `localhost`. Slightly more
  work but zero recurring DB cost.

The video pipeline, payments, and auth all keep working unchanged.

---

## Troubleshooting

**500 errors on every API call after deploy.** Check Vercel's Function
logs — the most common cause is `DATABASE_URL` not being set on the
right environment, or the connection string pointing to the
non-pooled hostname (must contain `-pooler`).

**Login works but session vanishes on refresh.** `JWT_SECRET` differs
between the env where the cookie was issued and where it's being
verified. Set it once and keep it stable.

**Seed script complains about `process.loadEnvFile`.** You're on Node
< 20.6. Upgrade Node (Vercel doesn't care; this is only for the local
seed script).

**Build fails with "DATABASE_URL is not set".** Vercel needs the env
var set at build time too, not just runtime. The variable scope must
include "Production" (and "Preview" if you want preview deploys to
work).
