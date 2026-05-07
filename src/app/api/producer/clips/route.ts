import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createClip, listClips } from "@/lib/media-clips";
import { recordAudit } from "@/lib/audit-logs";
import type { ClipKind, ClipProvider, ClipStatus } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 11 (P11-T003): producer/admin clip publish.
 *
 *   GET  → list every clip (drafts included)
 *   POST → create a clip; defaults to status='published' so producers can
 *          publish and link in one step. Pass status='draft' to stage.
 */

export const GET = route(async () => {
  await requireRole("producer", "admin");
  const items = await listClips({ limit: 200 });
  return ok({ items });
});

const PostBody = z.object({
  title: z.string().min(2).max(200),
  summary: z.string().max(2000).optional().or(z.literal("")),
  contestantId: z.string().optional().or(z.literal("")),
  episodeId: z.string().optional().or(z.literal("")),
  performanceId: z.string().optional().or(z.literal("")),
  kind: z.enum(["highlight", "reel", "full"]).optional(),
  category: z.string().max(60).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]).optional(),
  provider: z.enum(["cloudinary", "mux", "bunny", "external"]).optional(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  durationSec: z.number().int().min(1).max(60 * 60 * 4).optional(),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("producer", "admin");
  const data = await parseJson(req, PostBody);

  const clip = await createClip({
    title: data.title,
    summary: data.summary || null,
    contestantId: data.contestantId || null,
    episodeId: data.episodeId || null,
    performanceId: data.performanceId || null,
    kind: (data.kind ?? "highlight") as ClipKind,
    category: data.category || null,
    status: (data.status ?? "published") as ClipStatus,
    provider: (data.provider ?? "cloudinary") as ClipProvider,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl || null,
    durationSec: data.durationSec ?? null,
    createdByUserId: session.sub,
  });

  await recordAudit({
    actorUserId: session.sub,
    targetType: "submission",
    targetId: clip.id,
    action: `clip.${clip.status === "published" ? "publish" : "create"}`,
    payload: {
      kind: clip.kind,
      provider: clip.provider,
      contestant_id: clip.contestant_id,
      episode_id: clip.episode_id,
    },
  });

  return ok({ clip }, { status: 201 });
});
