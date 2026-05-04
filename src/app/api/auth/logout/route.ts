import { ok, route } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async () => {
  clearSessionCookie();
  return ok({ ok: true });
});
