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
  // All schema changes are additive — destructive changes ship in a later
  // deploy after the additive shape has been live.
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

    -- Phase 2 (P2-T001): extend contestants with DOB, country, social links,
    -- and per-consent timestamps (replaces the binary agreed_to_terms flag).
    -- Existing rows keep agreed_to_terms = 1 for audit; new rows populate
    -- the timestamp columns at registration time.
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS dob TEXT;
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'ET';
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS social_ig TEXT;
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS social_tt TEXT;
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS social_yt TEXT;
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS agreed_to_rules_at   TEXT;
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS agreed_to_rights_at  TEXT;
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS agreed_to_age_at     TEXT;
    ALTER TABLE contestants ADD COLUMN IF NOT EXISTS withdrawn_at         TEXT;

    -- Phase 2 (folded P1-T008): music-first taxonomy. Idempotent: rows that
    -- already use the new values are unaffected. Old categories remap as:
    --   dancing → performance · acting → other · comedy → other.
    UPDATE contestants SET category = 'performance' WHERE category = 'dancing';
    UPDATE contestants SET category = 'other'       WHERE category IN ('acting', 'comedy');

    -- Phase 2 (P2-T001): backfill the per-consent timestamps for legacy rows
    -- that pre-date the three explicit consents. We use created_at as the
    -- best-available approximation of when consent was given, since the
    -- single legacy agreed_to_terms = 1 flag means all three were collected
    -- under the prior single-checkbox UI.
    UPDATE contestants
       SET agreed_to_rules_at  = COALESCE(agreed_to_rules_at,  created_at),
           agreed_to_rights_at = COALESCE(agreed_to_rights_at, created_at),
           agreed_to_age_at    = COALESCE(agreed_to_age_at,    created_at)
     WHERE agreed_to_terms = 1
       AND (agreed_to_rules_at IS NULL OR agreed_to_rights_at IS NULL OR agreed_to_age_at IS NULL);

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

    -- Phase 3 (P3-T001): Cloudinary direct-upload fields + supersede support.
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS format        TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS size_bytes    BIGINT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS width         INTEGER;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS height        INTEGER;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS supersedes_id TEXT REFERENCES submissions(id) ON DELETE SET NULL;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS superseded_at TEXT;
    -- Phase 13: per-contestant submission slots. The 'main' slot is the
    -- competition entry; 'extra_1' and 'extra_2' are optional supplementary
    -- videos referees can preview when they want more context. Existing rows
    -- are treated as 'main' so historical data keeps working unchanged.
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS slot TEXT NOT NULL DEFAULT 'main';
    ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_slot_check;
    ALTER TABLE submissions ADD CONSTRAINT submissions_slot_check
      CHECK (slot IN ('main','extra_1','extra_2'));
    CREATE INDEX IF NOT EXISTS idx_submissions_slot ON submissions(contestant_id, slot);
    -- Widen the status CHECK to include the new "superseded" terminal state.
    -- Idempotent: drop-if-exists first, then re-create with the new set.
    ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
    ALTER TABLE submissions ADD CONSTRAINT submissions_status_check
      CHECK (status IN ('pending','approved','rejected','flagged','superseded'));
    CREATE INDEX IF NOT EXISTS idx_submissions_supersedes ON submissions(supersedes_id);

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
    -- Phase 5 (P5-T006): public-facing notes referees can leave for the
    -- contestant. Distinct from the existing private notes column which
    -- stays internal to the panel.
    ALTER TABLE score_notes ADD COLUMN IF NOT EXISTS public_notes TEXT;

    -- Phase 5 (P5-T001): submission_assignments routes the referee queue.
    -- Composite PK so re-assigning the same referee is a no-op upsert.
    -- Indexed on referee_user_id because the queue endpoint filters that way.
    CREATE TABLE IF NOT EXISTS submission_assignments (
      submission_id      TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      referee_user_id    TEXT NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
      assigned_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      assigned_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      PRIMARY KEY (submission_id, referee_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_assignments_referee ON submission_assignments(referee_user_id);

    -- Phase 6 (P6-T001): unified audit log. Append-only. Captures admin /
    -- producer mutations across the platform — payments stay in the more
    -- detailed payment_events table; this is the cross-cutting view.
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      target_type   TEXT NOT NULL,
      target_id     TEXT NOT NULL,
      action        TEXT NOT NULL,
      reason        TEXT,
      payload       JSONB,
      created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs(actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_target  ON audit_logs(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS contact_messages (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      topic      TEXT NOT NULL,
      message    TEXT NOT NULL,
      handled    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    -- Phase 6 (P6-T001): track who handled each message + when + any notes.
    ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS handled_by_user_id TEXT
      REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS handled_at  TEXT;
    ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT;
    CREATE INDEX IF NOT EXISTS idx_contact_messages_handled ON contact_messages(handled);

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

    -- Payment-method extension: contestants can pay via the AdmasPay hosted
    -- wallet checkout (Telebirr / M-Pesa / CBE Birr) or by uploading a bank
    -- transfer receipt screenshot. Bank-transfer rows stay 'pending' until an
    -- admin reviews the receipt via the existing override flow.
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS method
      TEXT NOT NULL DEFAULT 'wallet';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_uploaded_at TEXT;
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
    ALTER TABLE payments ADD CONSTRAINT payments_method_check
      CHECK (method IN ('wallet','bank_transfer'));

    -- Phase 2 (P2-T003): password-reset tokens. The token itself is stored
    -- hashed (sha256) so a leaked DB row can't be replayed. The plaintext
    -- token is sent by email; consume-once is enforced by setting used_at.
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash  TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  TEXT NOT NULL,
      used_at     TEXT,
      created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);

    -- Phase 4 (P4-T001): payment-event audit log. One row per init / webhook
    -- / admin-override / refund event. Payload is the raw provider payload
    -- (with credentials redacted by the writer) plus our reason/notes fields.
    -- This is what the admin reads when reconciling stuck payments.
    CREATE TABLE IF NOT EXISTS payment_events (
      id              TEXT PRIMARY KEY,
      payment_id      TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      actor_user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      kind            TEXT NOT NULL CHECK (kind IN ('init','webhook','override','refund_request','refund_complete','reconcile')),
      payload         JSONB,
      status_before   TEXT,
      status_after    TEXT,
      reason          TEXT,
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
    CREATE INDEX IF NOT EXISTS idx_payment_events_kind    ON payment_events(kind);

    -- Phase 4 (P4-T002): runtime settings. Used by the payment flow to read
    -- fee_required_at (apply | shortlist), and by Phase 6 admin tools to
    -- expose toggles for registration_open, submissions_open, fee_cents,
    -- current_round, etc.
    CREATE TABLE IF NOT EXISTS settings (
      key                TEXT PRIMARY KEY,
      value              JSONB NOT NULL,
      updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_at         TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    -- Seed defaults idempotently. ON CONFLICT DO NOTHING preserves any
    -- admin-set values across redeploys.
    INSERT INTO settings (key, value)
    VALUES ('fee_required_at', '"apply"'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    -- Phase 7 (P7-T005 / P7-T012): email verification + per-user notification
    -- preferences land on the users table. email_verified_at gates the
    -- registered -> submitted status transition (P7-T012); notification_prefs
    -- is a small JSONB blob the contestant edits on /contestant/preferences
    -- and is read by the email sender (P7-T011).
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at  TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB
      NOT NULL DEFAULT '{}'::jsonb;

    -- Phase 7 (P7-T005 / P7-T012): email-verification tokens. Same hash-only
    -- storage as password_reset_tokens — plaintext goes out by email; the row
    -- only ever holds sha256(token). One-shot via UPDATE...RETURNING used_at.
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      used_at    TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_evt_user ON email_verification_tokens(user_id);

    -- Phase 7 (P7-T005): in-app notifications. Mirror of every transactional
    -- email so a user who missed the inbox still sees the event in /notifications.
    -- Append-only from the writer's perspective; read_at is the only mutable
    -- column.
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      link       TEXT,
      read_at    TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
      ON notifications(user_id, read_at);

    -- Phase 8 (P8-T001): widen the user-role enum to admit fan accounts.
    -- Audience users live in the same users table — auth is shared, the role
    -- is the gate. DROP-and-ADD because Postgres CHECK constraints can't be
    -- altered in place.
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD  CONSTRAINT users_role_check
      CHECK (role IN ('contestant','referee','admin','audience'));

    -- Phase 8 (P8-T001): public-facing engagement primitives. Each one is
    -- composite-PK on the natural unique key so a duplicate insert is a
    -- no-op rather than an error.
    CREATE TABLE IF NOT EXISTS engagement_likes (
      audience_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contestant_id    TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      created_at       TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      PRIMARY KEY (audience_user_id, contestant_id)
    );
    CREATE INDEX IF NOT EXISTS idx_engagement_likes_contestant
      ON engagement_likes(contestant_id);

    CREATE TABLE IF NOT EXISTS engagement_follows (
      audience_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contestant_id    TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      created_at       TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      PRIMARY KEY (audience_user_id, contestant_id)
    );
    CREATE INDEX IF NOT EXISTS idx_engagement_follows_contestant
      ON engagement_follows(contestant_id);

    -- Phase 8 (P8-T007): public comments. The status column lets a moderator
    -- hide without deleting (preserves the audit trail) and flag_count is
    -- maintained by the report flow so the moderation queue can sort by
    -- most-reported without a join.
    CREATE TABLE IF NOT EXISTS comments (
      id              TEXT PRIMARY KEY,
      contestant_id   TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      author_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body            TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'visible'
                      CHECK (status IN ('visible','hidden','removed')),
      flag_count      INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_comments_contestant
      ON comments(contestant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_status_flags
      ON comments(status, flag_count DESC);

    -- Phase 8 (P8-T008 / P8-T009): moderation queue. One row per moderator
    -- action (hide / unhide / remove) AND per user-submitted report. Reading
    -- "give me everything that needs review" is a query against this table.
    CREATE TABLE IF NOT EXISTS moderation_actions (
      id              TEXT PRIMARY KEY,
      target_type     TEXT NOT NULL CHECK (target_type IN ('comment','submission')),
      target_id       TEXT NOT NULL,
      action          TEXT NOT NULL CHECK (action IN ('report','hide','unhide','remove')),
      actor_user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      reason          TEXT,
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_moderation_actions_target
      ON moderation_actions(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_moderation_actions_action
      ON moderation_actions(action, created_at DESC);

    -- Phase 9 (P9-T001): public fan votes.
    -- The composite UNIQUE on (voter_user_id, contestant_id, round_number)
    -- enforces "one vote per contestant per round per voter" — the most
    -- abuse-resistant default. Round-number lives on the row so historic
    -- rounds can be re-tallied without depending on a separate window table.
    -- ip_hash is sha256(ip + JWT_SECRET) so we can detect IP-clustered abuse
    -- without storing raw IPs.
    CREATE TABLE IF NOT EXISTS votes (
      id              TEXT PRIMARY KEY,
      voter_user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contestant_id   TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      round_number    INTEGER NOT NULL,
      ip_hash         TEXT,
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique_per_round
      ON votes(voter_user_id, contestant_id, round_number);
    CREATE INDEX IF NOT EXISTS idx_votes_contestant_round
      ON votes(contestant_id, round_number);
    CREATE INDEX IF NOT EXISTS idx_votes_round_iphash
      ON votes(round_number, ip_hash);

    -- Voting setting defaults. ON CONFLICT DO NOTHING preserves admin-set
    -- values across redeploys.
    INSERT INTO settings (key, value)
    VALUES ('voting_open', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING;
    INSERT INTO settings (key, value)
    VALUES ('voting_round', '1'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    -- Phase 10 (P10-T001): producer role for the team that owns the
    -- on-screen show. Drop-and-add the CHECK constraint because Postgres
    -- does not support altering a CHECK in place.
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD  CONSTRAINT users_role_check
      CHECK (role IN ('contestant','referee','admin','audience','producer'));

    -- Phase 10 (P10-T001): season + episode + challenge + performance +
    -- elimination model. Producers build a season as a draft, publish
    -- episode-by-episode. The status column on each table is the gate that
    -- decides what is visible to the public.
    CREATE TABLE IF NOT EXISTS seasons (
      id          TEXT PRIMARY KEY,
      number      INTEGER NOT NULL,
      title       TEXT NOT NULL,
      summary     TEXT,
      status      TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','closed')),
      starts_at   TEXT,
      ends_at     TEXT,
      created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_number ON seasons(number);

    CREATE TABLE IF NOT EXISTS episodes (
      id            TEXT PRIMARY KEY,
      season_id     TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      number        INTEGER NOT NULL,
      title         TEXT NOT NULL,
      summary       TEXT,
      thumbnail_url TEXT,
      scheduled_for TEXT,
      status        TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','aired','archived')),
      aired_at      TEXT,
      created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_episodes_season_number
      ON episodes(season_id, number);
    CREATE INDEX IF NOT EXISTS idx_episodes_status
      ON episodes(status, scheduled_for);

    CREATE TABLE IF NOT EXISTS challenges (
      id          TEXT PRIMARY KEY,
      episode_id  TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      points_max  INTEGER NOT NULL DEFAULT 100,
      created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_challenges_episode ON challenges(episode_id);

    CREATE TABLE IF NOT EXISTS performances (
      id            TEXT PRIMARY KEY,
      episode_id    TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      contestant_id TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      challenge_id  TEXT REFERENCES challenges(id) ON DELETE SET NULL,
      video_url     TEXT,
      score         INTEGER,
      notes         TEXT,
      created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    );
    CREATE INDEX IF NOT EXISTS idx_performances_episode ON performances(episode_id);
    CREATE INDEX IF NOT EXISTS idx_performances_contestant
      ON performances(contestant_id);

    -- Eliminations are append-only: one row per "eliminated" event per
    -- (episode, contestant). The cascade-to-contestant.status happens in
    -- the writer (src/lib/seasons.ts), not via a trigger, so it stays
    -- visible in the audit log.
    CREATE TABLE IF NOT EXISTS eliminations (
      id            TEXT PRIMARY KEY,
      episode_id    TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      contestant_id TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
      reason        TEXT,
      eliminated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_eliminations_unique
      ON eliminations(episode_id, contestant_id);
    CREATE INDEX IF NOT EXISTS idx_eliminations_contestant
      ON eliminations(contestant_id);

    -- Phase 11 (P11-T001): media clips. A "clip" is a published, browsable
    -- video unit. Three flavours via the kind column:
    --   highlight = curated moment from an episode (producer-published)
    --   reel      = short-form vertical clip (audience-friendly format)
    --   full      = full-length performance recording
    -- The provider field carries the current backend (cloudinary | mux |
    -- bunny | external) so we can migrate one clip at a time without a
    -- schema change. status is the publication gate: only published clips
    -- are visible to the public.
    CREATE TABLE IF NOT EXISTS media_clips (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      summary         TEXT,
      contestant_id   TEXT REFERENCES contestants(id) ON DELETE SET NULL,
      episode_id      TEXT REFERENCES episodes(id) ON DELETE SET NULL,
      performance_id  TEXT REFERENCES performances(id) ON DELETE SET NULL,
      kind            TEXT NOT NULL DEFAULT 'highlight'
                      CHECK (kind IN ('highlight','reel','full')),
      category        TEXT,
      status          TEXT NOT NULL DEFAULT 'published'
                      CHECK (status IN ('draft','published','archived')),
      provider        TEXT NOT NULL DEFAULT 'cloudinary'
                      CHECK (provider IN ('cloudinary','mux','bunny','external')),
      video_url       TEXT NOT NULL,
      thumbnail_url   TEXT,
      duration_sec    INTEGER,
      published_at    TEXT,
      created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_media_clips_status_kind
      ON media_clips(status, kind, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_media_clips_episode
      ON media_clips(episode_id);
    CREATE INDEX IF NOT EXISTS idx_media_clips_contestant
      ON media_clips(contestant_id);

    -- Like is a single-tap engagement for clips. Composite-PK so a dup-tap
    -- is a no-op rather than an error (matches the engagement_likes pattern
    -- on the contestant level).
    CREATE TABLE IF NOT EXISTS clip_likes (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      clip_id    TEXT NOT NULL REFERENCES media_clips(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      PRIMARY KEY (user_id, clip_id)
    );
    CREATE INDEX IF NOT EXISTS idx_clip_likes_clip ON clip_likes(clip_id);

    -- Watchlist: per-user "save for later" on a clip. Same composite-PK
    -- shape. Distinct from a like (you can save without liking, and vice
    -- versa) because a watchlist is a return-to-this-later signal, not an
    -- approval signal.
    CREATE TABLE IF NOT EXISTS watchlist (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      clip_id    TEXT NOT NULL REFERENCES media_clips(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
      PRIMARY KEY (user_id, clip_id)
    );
    CREATE INDEX IF NOT EXISTS idx_watchlist_user_created
      ON watchlist(user_id, created_at DESC);
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

export type UserRole =
  | "contestant"
  | "referee"
  | "admin"
  | "audience"
  | "producer";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  email_verified_at: string | null;
  notification_prefs: NotificationPrefs;
  created_at: string;
}

/**
 * Per-user opt-out flags. Defaults to {} (everything on) — the email sender
 * treats `undefined` as opt-in. See `src/lib/notification-prefs.ts`.
 */
export interface NotificationPrefs {
  email_status_changes?: boolean;
  email_payment_updates?: boolean;
  email_referee_assignments?: boolean;
}

export interface EmailVerificationTokenRow {
  token_hash: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

// Phase 8 — engagement primitives.

export interface EngagementLikeRow {
  audience_user_id: string;
  contestant_id: string;
  created_at: string;
}

export interface EngagementFollowRow {
  audience_user_id: string;
  contestant_id: string;
  created_at: string;
}

export interface CommentRow {
  id: string;
  contestant_id: string;
  author_user_id: string;
  body: string;
  status: "visible" | "hidden" | "removed";
  flag_count: number;
  created_at: string;
}

export interface ModerationActionRow {
  id: string;
  target_type: "comment" | "submission";
  target_id: string;
  action: "report" | "hide" | "unhide" | "remove";
  actor_user_id: string | null;
  reason: string | null;
  created_at: string;
}

// Phase 9 — votes.

export interface VoteRow {
  id: string;
  voter_user_id: string;
  contestant_id: string;
  round_number: number;
  ip_hash: string | null;
  created_at: string;
}

// Phase 10 — seasons + episodes + performances.

export type SeasonStatus = "draft" | "active" | "closed";
export type EpisodeStatus = "draft" | "scheduled" | "aired" | "archived";

export interface SeasonRow {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  status: SeasonStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  created_by_user_id: string | null;
}

export interface EpisodeRow {
  id: string;
  season_id: string;
  number: number;
  title: string;
  summary: string | null;
  thumbnail_url: string | null;
  scheduled_for: string | null;
  status: EpisodeStatus;
  aired_at: string | null;
  created_at: string;
}

export interface ChallengeRow {
  id: string;
  episode_id: string;
  title: string;
  description: string | null;
  points_max: number;
  created_at: string;
}

export interface PerformanceRow {
  id: string;
  episode_id: string;
  contestant_id: string;
  challenge_id: string | null;
  video_url: string | null;
  score: number | null;
  notes: string | null;
  created_at: string;
}

export interface EliminationRow {
  id: string;
  episode_id: string;
  contestant_id: string;
  reason: string | null;
  eliminated_at: string;
  created_by_user_id: string | null;
}

// Phase 11 — media clips.

export type ClipKind = "highlight" | "reel" | "full";
export type ClipStatus = "draft" | "published" | "archived";
export type ClipProvider = "cloudinary" | "mux" | "bunny" | "external";

export interface MediaClipRow {
  id: string;
  title: string;
  summary: string | null;
  contestant_id: string | null;
  episode_id: string | null;
  performance_id: string | null;
  kind: ClipKind;
  category: string | null;
  status: ClipStatus;
  provider: ClipProvider;
  video_url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  published_at: string | null;
  created_at: string;
  created_by_user_id: string | null;
}

export interface ClipLikeRow {
  user_id: string;
  clip_id: string;
  created_at: string;
}

export interface WatchlistRow {
  user_id: string;
  clip_id: string;
  created_at: string;
}

export interface ContestantRow {
  id: string;
  user_id: string;
  stage_name: string | null;
  phone: string;
  age: number;
  city: string;
  country: string;
  category: string;
  experience: string;
  bio: string;
  dob: string | null;
  social_ig: string | null;
  social_tt: string | null;
  social_yt: string | null;
  agreed_to_terms: number;
  agreed_to_rules_at: string | null;
  agreed_to_rights_at: string | null;
  agreed_to_age_at: string | null;
  withdrawn_at: string | null;
  status:
    | "registered"
    | "submitted"
    | "shortlisted"
    | "advanced"
    | "eliminated";
  created_at: string;
}

export interface PasswordResetTokenRow {
  token_hash: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export type PaymentEventKind =
  | "init"
  | "webhook"
  | "override"
  | "refund_request"
  | "refund_complete"
  | "reconcile";

export interface PaymentEventRow {
  id: string;
  payment_id: string;
  actor_user_id: string | null;
  kind: PaymentEventKind;
  payload: unknown | null;
  status_before: string | null;
  status_after: string | null;
  reason: string | null;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updated_by_user_id: string | null;
  updated_at: string;
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
  cloudinary_public_id: string | null;
  format: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  supersedes_id: string | null;
  superseded_at: string | null;
  status: "pending" | "approved" | "rejected" | "flagged" | "superseded";
  notes: string | null;
  /** Phase 13: 'main' = competition entry, 'extra_1' / 'extra_2' = supplementary. */
  slot: "main" | "extra_1" | "extra_2";
  created_at: string;
}

export type SubmissionSlot = SubmissionRow["slot"];

export interface ScoreRow {
  id: string;
  submission_id: string;
  referee_user_id: string;
  criterion: string;
  points: number;
  max_points: number;
  created_at: string;
}

export interface ScoreNoteRow {
  submission_id: string;
  referee_user_id: string;
  notes: string;
  public_notes: string | null;
  updated_at: string;
}

export interface SubmissionAssignmentRow {
  submission_id: string;
  referee_user_id: string;
  assigned_at: string;
  assigned_by_user_id: string | null;
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  target_type: string;
  target_id: string;
  action: string;
  reason: string | null;
  payload: unknown | null;
  created_at: string;
}

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  handled: number;
  handled_by_user_id: string | null;
  handled_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

export type PaymentMethod = "wallet" | "bank_transfer";

export interface PaymentRow {
  id: string;
  contestant_id: string;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_ref: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  method: PaymentMethod;
  bank_name: string | null;
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}
