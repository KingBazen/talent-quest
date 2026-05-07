import crypto from "node:crypto";
import { exec, queryOne, type PasswordResetTokenRow } from "./db";

/**
 * Password-reset token helpers.
 *
 * Tokens are stored hashed (sha256) so a leaked DB row can't be replayed.
 * The plaintext token goes only in the email link (or, until Phase 7 wires
 * a real email provider, in a `console.log` line that the founder/dev sees).
 *
 * Constants:
 *   - TOKEN_BYTES = 32 → ~256-bit entropy → un-guessable without the email.
 *   - TTL_MINUTES = 30 → tight enough that a stolen token is short-lived.
 */

export const TOKEN_BYTES = 32;
export const TTL_MINUTES = 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface IssueResult {
  /** Plaintext token to put in the email link. Never store this. */
  token: string;
  expiresAt: Date;
}

export async function issueResetToken(userId: string): Promise<IssueResult> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  // Invalidate any prior un-used tokens for this user — only one outstanding
  // reset link at a time. Mark them used rather than deleting so the audit
  // trail of issued-and-superseded tokens survives.
  const now = new Date().toISOString();
  await exec(
    `UPDATE password_reset_tokens
        SET used_at = ?
      WHERE user_id = ? AND used_at IS NULL`,
    [now, userId]
  );

  await exec(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES (?, ?, ?)`,
    [tokenHash, userId, expiresAt.toISOString()]
  );

  return { token, expiresAt };
}

/**
 * Look up a token row, validating that it exists, hasn't been used, and
 * hasn't expired. Returns the row or null. Does NOT mark used — the caller
 * (`consumeResetToken`) does that atomically alongside the password update.
 */
export async function findValidToken(
  token: string
): Promise<PasswordResetTokenRow | null> {
  const tokenHash = hashToken(token);
  const row = await queryOne<PasswordResetTokenRow>(
    `SELECT * FROM password_reset_tokens WHERE token_hash = ?`,
    [tokenHash]
  );
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return row;
}

/**
 * Mark a token used. Idempotent — calling twice is a no-op the second time.
 * Returns the number of rows actually updated (1 = success, 0 = already used).
 */
export async function markTokenUsed(tokenHash: string): Promise<number> {
  const now = new Date().toISOString();
  const result = await queryOne<{ updated: number }>(
    `UPDATE password_reset_tokens
        SET used_at = ?
      WHERE token_hash = ? AND used_at IS NULL
      RETURNING 1::int AS updated`,
    [now, tokenHash]
  );
  return result?.updated ?? 0;
}

export { hashToken };
