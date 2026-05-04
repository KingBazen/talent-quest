import { ok, route } from "@/lib/api";
import { ApiError, requireRole, getUserById } from "@/lib/auth";
import {
  advanceProgress,
  getContestantByUserId,
  listProgress,
} from "@/lib/contestants";
import { contestantToDTO } from "@/lib/dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Demo helper — lets the contestant tick the next progress step manually
 *  during testing. In real production you'd remove this and rely on the
 *  admin/referee flow to advance state. Locked behind contestant auth. */
export const POST = route(async () => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  await advanceProgress(c.id);
  const fresh = (await getContestantByUserId(session.sub))!;
  const user = (await getUserById(session.sub))!;
  const progress = await listProgress(fresh.id);
  return ok({ contestant: contestantToDTO(fresh, user, progress) });
});
