import crypto from "node:crypto";
import { exec, queryOne, type EmailVerificationTokenRow } from "./db";

/**
 * Phase 7 (P7-T012): email-verification tokens.
 *
 * Mirrors the password-reset token contract: same hash-only storage, same
 * one-shot consume-via-UPDATE-RETURNING. Different table so the two flows
 * stay independently rate-limitable and the rotation policies don't bleed
 * into each other.
 */

export const TOKEN_BYTES = 32;
export const TTL_MINUTES = 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface IssueVerificationResult {
  /** Plaintext token — ships in the email link. Never store. */
  token: string;
  expiresAt: Date;
}

export async function issueVerificationToken(
  userId: string
): Promise<IssueVerificationResult> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  const now = new Date().toISOString();
  await exec(
    `UPDATE email_verification_tokens
        SET used_at = ?
      WHERE user_id = ? AND used_at IS NULL`,
    [now, userId]
  );

  await exec(
    `INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
     VALUES (?, ?, ?)`,
    [tokenHash, userId, expiresAt.toISOString()]
  );

  return { token, expiresAt };
}

/**
 * Atomically consume a verification token. Returns the user_id if the token
 * is valid AND hasn't been used AND hasn't expired; null otherwise. Marking
 * users.email_verified_at is the caller's job (it lives in auth.ts so we
 * don't import the user table here).
 */
export async function consumeVerificationToken(
  token: string
): Promise<string | null> {
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  // UPDATE...RETURNING with the freshness check inline. If the token is
  // already used or expired, the WHERE clause filters it out and we get
  // zero rows back.
  const row = await queryOne<EmailVerificationTokenRow>(
    `UPDATE email_verification_tokens
        SET used_at = ?
      WHERE token_hash = ?
        AND used_at IS NULL
        AND expires_at > ?
      RETURNING *`,
    [now, tokenHash, now]
  );

  return row ? row.user_id : null;
}
