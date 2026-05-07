import crypto from "node:crypto";
import { exec, query, type AuditLogRow } from "./db";

/**
 * Append-only audit log. Captures admin / producer mutations across every
 * surface — payments stay in `payment_events` (which has more domain-specific
 * fields); this is the unified read-side for the admin audit-log viewer.
 *
 * Target conventions:
 *   • contestant       → target_id is the 6-digit contestant ID
 *   • submission       → target_id is sub_xxx
 *   • payment          → target_id is pay_xxx
 *   • assignment       → target_id is `${submissionId}:${refereeUserId}`
 *   • setting          → target_id is the setting key
 *   • contact_message  → target_id is msg_xxx
 *
 * Action conventions: dot-namespaced verbs, e.g. `contestant.status_change`,
 * `submission.status_override`, `assignment.create`, `settings.update`.
 */
export interface RecordAuditInput {
  actorUserId: string | null;
  targetType:
    | "contestant"
    | "submission"
    | "payment"
    | "assignment"
    | "setting"
    | "contact_message"
    | "round"
    | "comment";
  targetId: string;
  action: string;
  reason?: string | null;
  payload?: unknown;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  const id = "al_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO audit_logs
       (id, actor_user_id, target_type, target_id, action, reason, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?::jsonb)`,
    [
      id,
      input.actorUserId,
      input.targetType,
      input.targetId,
      input.action,
      input.reason ?? null,
      input.payload === undefined ? null : JSON.stringify(input.payload),
    ]
  );
}

export interface ListAuditsOpts {
  actorUserId?: string;
  targetType?: RecordAuditInput["targetType"];
  targetId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export async function listAudits(
  opts: ListAuditsOpts = {}
): Promise<{ items: AuditLogRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.actorUserId) {
    where.push("actor_user_id = ?");
    params.push(opts.actorUserId);
  }
  if (opts.targetType) {
    where.push("target_type = ?");
    params.push(opts.targetType);
  }
  if (opts.targetId) {
    where.push("target_id = ?");
    params.push(opts.targetId);
  }
  if (opts.action) {
    where.push("action ILIKE ?");
    params.push(`%${opts.action}%`);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";

  const totalRow = await (await import("./db")).queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM audit_logs ${w}`,
    params
  );
  const items = await query<AuditLogRow>(
    `SELECT * FROM audit_logs ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, opts.limit ?? 100, opts.offset ?? 0]
  );
  return { items, total: totalRow?.n ?? 0 };
}
