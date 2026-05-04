import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";

// Neon's driver opens a WebSocket to the database. Vercel's Node runtime
// (and tsx in scripts) doesn't ship a global WebSocket, so we wire `ws`.
neonConfig.webSocketConstructor = ws;

declare global {
  // Reuse one pool across hot reloads in dev.
  // eslint-disable-next-line no-var
  var __tq_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __tq_migrated: Promise<void> | undefined;
}

/**
 * Lazy pool. We don't construct it (or read DATABASE_URL) at module-load
 * time, because Next.js evaluates route modules during `next build`'s
 * "Collect page data" phase — sometimes without runtime env vars. Throwing
 * there breaks the build even though the code only needs the DB at request
 * time.
 */
export function getPool(): Pool {
  if (global.__tq_pool) return global.__tq_pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Set it in the host's env (Vercel: Project → Settings → Environment Variables) or copy .env.example to .env.local."
    );
  }
  const p = new Pool({ connectionString });
  global.__tq_pool = p;
  return p;
}

// ─── Query helpers ───────────────────────────────────────────────────────────
//
// To minimize churn vs. the SQLite codebase, callers continue to write `?`
// placeholders. We translate them to `$1, $2, ...` here. Don't put a literal
// `?` inside a string in any SQL we issue — none of the existing queries do.

function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureMigrated();
  const res = await getPool().query(toPg(sql), params);
  return res.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function exec(sql: string, params: unknown[] = []): Promise<void> {
  await ensureMigrated();
  await getPool().query(toPg(sql), params);
}

/** Run `fn` inside a single Postgres transaction. Caller can use `q` / `qOne`
 *  exactly like the top-level helpers; everything routes through one client. */
export async function tx<T>(
  fn: (h: {
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>;
    qOne: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R | undefined>;
  }) => Promise<T>
): Promise<T> {
  await ensureMigrated();
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn({
      q: async <R>(sql: string, params: unknown[] = []) => {
        const r = await client.query<R extends Record<string, unknown> ? R : never>(
          toPg(sql),
          params
        );
        return r.rows as R[];
      },
      qOne: async <R>(sql: string, params: unknown[] = []) => {
        const r = await client.query<R extends Record<string, unknown> ? R : never>(
          toPg(sql),
          params
        );
        return (r.rows[0] as R) ?? undefined;
      },
    });
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

// ─── Schema (idempotent, lazy) ───────────────────────────────────────────────

async function doMigrate(): Promise<void> {
  // Postgres equivalents of the original SQLite schema. We keep TEXT and
  // INTEGER (incl. 0/1 for booleans) so the existing row types stay valid.
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('contestant','referee','admin')),
      full_name     TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );

    CREATE TABLE IF NOT EXISTS contestants (
      id              TEXT PRIMARY KEY,
      user_id         TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stage_name      TEXT,
      phone           TEXT NOT NULL,
      age             INTEGER NOT NULL,
      city            TEXT NOT NULL,
      category        TEXT NOT NULL,
      experience      TEXT NOT NULL,
      bio             TEXT NOT NULL,
      agreed_to_terms INTEGER NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'registered'
                      CHECK (status IN ('registered','submitted','shortlisted','advanced','eliminated')),
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_contestants_category ON contestants(category);
    CREATE INDEX IF NOT EXISTS idx_contestants_city     ON contestants(city);
    CREATE INDEX IF NOT EXISTS idx_contestants_status   ON contestants(status);

    CREATE TABLE IF NOT EXISTS progress_steps (
      contestant_id TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      step_key      TEXT NOT NULL,
      label         TEXT NOT NULL,
      done          INTEGER NOT NULL DEFAULT 0,
      done_at       TEXT,
      ord           INTEGER NOT NULL,
      PRIMARY KEY (contestant_id, step_key)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id            TEXT PRIMARY KEY,
      contestant_id TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      category      TEXT NOT NULL,
      video_url     TEXT,
      thumbnail_url TEXT,
      duration_sec  INTEGER,
      status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','flagged')),
      notes         TEXT,
      created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_contestant ON submissions(contestant_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_status     ON submissions(status);

    CREATE TABLE IF NOT EXISTS scores (
      id              TEXT PRIMARY KEY,
      submission_id   TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      referee_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      criterion       TEXT NOT NULL,
      points          INTEGER NOT NULL,
      max_points      INTEGER NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      UNIQUE (submission_id, referee_user_id, criterion)
    );

    CREATE TABLE IF NOT EXISTS score_notes (
      submission_id   TEXT NOT NULL,
      referee_user_id TEXT NOT NULL,
      notes           TEXT NOT NULL,
      updated_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      PRIMARY KEY (submission_id, referee_user_id),
      FOREIGN KEY (submission_id)   REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (referee_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      topic      TEXT NOT NULL,
      message    TEXT NOT NULL,
      handled    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id              TEXT PRIMARY KEY,
      contestant_id   TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      amount_cents    INTEGER NOT NULL,
      currency        TEXT NOT NULL DEFAULT 'ETB',
      provider        TEXT NOT NULL DEFAULT 'telebirr',
      provider_ref    TEXT,
      status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','succeeded','failed','refunded')),
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      updated_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_payments_contestant ON payments(contestant_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments(status);
  `);
}

export function ensureMigrated(): Promise<void> {
  if (!global.__tq_migrated) {
    global.__tq_migrated = doMigrate().catch((e) => {
      // Reset so the next request can retry instead of being stuck.
      global.__tq_migrated = undefined;
      throw e;
    });
  }
  return global.__tq_migrated;
}

// ─── Row types (unchanged from the SQLite version) ───────────────────────────

export type UserRole = "contestant" | "referee" | "admin";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface ContestantRow {
  id: string;
  user_id: string;
  stage_name: string | null;
  phone: string;
  age: number;
  city: string;
  category: string;
  experience: string;
  bio: string;
  agreed_to_terms: number;
  status:
    | "registered"
    | "submitted"
    | "shortlisted"
    | "advanced"
    | "eliminated";
  created_at: string;
}

export interface ProgressStepRow {
  contestant_id: string;
  step_key: string;
  label: string;
  done: number;
  done_at: string | null;
  ord: number;
}

export interface SubmissionRow {
  id: string;
  contestant_id: string;
  title: string;
  category: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_sec: number | null;
  status: "pending" | "approved" | "rejected" | "flagged";
  notes: string | null;
  created_at: string;
}

export interface ScoreRow {
  id: string;
  submission_id: string;
  referee_user_id: string;
  criterion: string;
  points: number;
  max_points: number;
  created_at: string;
}

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  handled: number;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  contestant_id: string;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_ref: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  created_at: string;
  updated_at: string;
}
