import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import {
  ApiError,
  createSession,
  getUserByEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = route(async (req: Request) => {
  const { email, password } = await parseJson(req, Body);
  const user = await getUserByEmail(email);
  if (!user) throw new ApiError(401, "Invalid email or password");
  const okPw = await verifyPassword(password, user.password_hash);
  if (!okPw) throw new ApiError(401, "Invalid email or password");

  const session = await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  await setSessionCookie(session.token, session.expires);

  return ok({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
  });
});
