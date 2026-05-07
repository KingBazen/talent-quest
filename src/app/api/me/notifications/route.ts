import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import {
  countUnread,
  listNotifications,
  markRead,
} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 7 (P7-T005): in-app notification inbox API.
 *
 * GET   ?unread=1&limit=50  → list (default 50, max 200)
 * PATCH { ids: string[] | "all" } → mark read
 */

export const GET = route(async (req: Request) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in");
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const items = await listNotifications({
    userId: session.sub,
    unreadOnly,
    limit: Number.isFinite(limit) ? limit : 50,
  });
  const unread = await countUnread(session.sub);
  return ok({ items, unread });
});

const PatchBody = z.object({
  ids: z.union([z.array(z.string().min(3)).max(500), z.literal("all")]),
});

export const PATCH = route(async (req: Request) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in");
  const { ids } = await parseJson(req, PatchBody);
  await markRead(session.sub, ids);
  const unread = await countUnread(session.sub);
  return ok({ unread });
});
