import { ok, route } from "@/lib/api";
import { getSetting } from "@/lib/settings";
import { tallyByCategory, tallyByContestant } from "@/lib/voting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 9 (P9-T004): public leaderboard.
 *
 *   ?round=N      → tally for a specific round (default = current voting_round)
 *   ?category=... → restrict the contestant tally to one category
 *   ?limit=...    → cap top-list (default 50, max 200)
 *
 * Returns:
 *   {
 *     round, votingOpen,
 *     items: [{ contestantId, displayName, category, city, votes }],
 *     byCategory: [{ category, votes }]
 *   }
 *
 * Public endpoint — no auth required. Anonymisation contract is preserved:
 * full_name → initials fallback when stage_name is absent.
 */

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const round = Math.max(
    1,
    Number(url.searchParams.get("round") ?? "") ||
      (await getSetting("voting_round"))
  );
  const category = url.searchParams.get("category") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const votingOpen = await getSetting("voting_open");

  const [items, byCategory] = await Promise.all([
    tallyByContestant({ roundNumber: round, category, limit }),
    tallyByCategory(round),
  ]);

  return ok({
    round,
    votingOpen,
    items,
    byCategory,
  });
});
