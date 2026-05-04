import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "tq_session";

const PROTECTED: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/referee", roles: ["referee", "admin"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const match = PROTECTED.find((p) => pathname.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) {
    return redirectToLogin(req);
  }
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    const role = String(payload.role || "");
    if (!match.roles.includes(role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/referee/:path*"],
};
