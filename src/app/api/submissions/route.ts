import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import {
  createSubmission,
  getContestantByUserId,
  listSubmissionsForContestant,
} from "@/lib/contestants";
import { submissionToDTO } from "@/lib/dto";
import { createUploadIntent } from "@/lib/uploads";

export const runtime = "nodejs";

const PostBody = z.object({
  title: z.string().min(2).max(120),
  category: z.enum([
    "singing",
    "dancing",
    "acting",
    "comedy",
    "instruments",
    "other",
  ]),
  videoUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  durationSec: z.number().int().min(1).max(7200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  const data = await parseJson(req, PostBody);
  const sub = await createSubmission({
    contestantId: c.id,
    title: data.title,
    category: data.category,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl,
    durationSec: data.durationSec,
    notes: data.notes,
  });
  return ok({ submission: submissionToDTO(sub) }, { status: 201 });
});

export const GET = route(async () => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  const items = (await listSubmissionsForContestant(c.id)).map(submissionToDTO);
  const intent = createUploadIntent({ contestantId: c.id });
  return ok({ items, uploadIntent: intent });
});
