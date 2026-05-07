import { ok, route } from "@/lib/api";
import { readSession, getUserById } from "@/lib/auth";
import {
  getContestantByUserId,
  listProgress,
} from "@/lib/contestants";
import { contestantToDTO } from "@/lib/dto";
import { listPaymentsForContestant } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const s = await readSession();
  if (!s) return ok({ user: null, contestant: null, latestPayment: null });
  const user = await getUserById(s.sub);
  if (!user) return ok({ user: null, contestant: null, latestPayment: null });

  let contestantDTO = null;
  let latestPayment: {
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    createdAt: string;
  } | null = null;
  if (user.role === "contestant") {
    const c = await getContestantByUserId(user.id);
    if (c) {
      contestantDTO = contestantToDTO(c, user, await listProgress(c.id));
      const payments = await listPaymentsForContestant(c.id);
      const latest = payments[0];
      if (latest) {
        latestPayment = {
          id: latest.id,
          status: latest.status,
          amountCents: latest.amount_cents,
          currency: latest.currency,
          createdAt: latest.created_at,
        };
      }
    }
  }

  return ok({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      emailVerifiedAt: user.email_verified_at,
    },
    contestant: contestantDTO,
    latestPayment,
  });
});
