import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { exec, queryOne, type ContactMessageRow } from "@/lib/db";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";

/**
 * Mark a contact message handled (or un-handled), with optional admin notes.
 * Audit-logged so the inbox shows a change history.
 */
const Body = z.object({
  handled: z.boolean(),
  adminNotes: z.string().max(2000).optional().or(z.literal("")),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("admin");
  const id = ctx.params.id;
  const data = await parseJson(req, Body);

  const before = await queryOne<ContactMessageRow>(
    "SELECT * FROM contact_messages WHERE id = ?",
    [id]
  );
  if (!before) throw new ApiError(404, "Message not found");

  const handledInt = data.handled ? 1 : 0;
  const handledAt = data.handled ? new Date().toISOString() : null;
  const handledBy = data.handled ? session.sub : null;

  await exec(
    `UPDATE contact_messages
        SET handled = ?, handled_by_user_id = ?, handled_at = ?, admin_notes = COALESCE(NULLIF(?, ''), admin_notes)
      WHERE id = ?`,
    [handledInt, handledBy, handledAt, data.adminNotes ?? "", id]
  );

  await recordAudit({
    actorUserId: session.sub,
    targetType: "contact_message",
    targetId: id,
    action: data.handled ? "message.handled" : "message.unhandled",
    payload: { previously_handled: before.handled === 1 },
  });

  return ok({ ok: true });
});
