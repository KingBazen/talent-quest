import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { exec, queryOne, type UserRole, type UserRow } from "./db";

const COOKIE = "tq_session";
const TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 24) {
    throw new Error(
      "JWT_SECRET must be set to a string of at least 24 characters. See .env.example."
    );
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  sub: string;        // user id
  role: UserRole;
  email: string;
}

export async function createSession(
  payload: SessionPayload
): Promise<{ token: string; expires: Date }> {
  const expires = new Date(Date.now() + TTL_SECONDS * 1000);
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret());
  return { token, expires };
}

export async function setSessionCookie(token: string, expires: Date) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const c = cookies().get(COOKIE);
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c.value, secret());
    return {
      sub: String(payload.sub),
      role: payload.role as UserRole,
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export async function requireRole(
  ...allowed: UserRole[]
): Promise<SessionPayload> {
  const s = await readSession();
  if (!s) {
    throw new ApiError(401, "Authentication required");
  }
  if (allowed.length && !allowed.includes(s.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }
  return s;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── Password helpers ────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── User lookup ─────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<UserRow | undefined> {
  return queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}

export async function getUserByEmail(
  email: string
): Promise<UserRow | undefined> {
  return queryOne<UserRow>("SELECT * FROM users WHERE email = ?", [
    email.toLowerCase().trim(),
  ]);
}

export async function createUser(input: {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
}): Promise<UserRow> {
  await exec(
    `INSERT INTO users (id, email, password_hash, role, full_name)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.id,
      input.email.toLowerCase().trim(),
      input.passwordHash,
      input.role,
      input.fullName,
    ]
  );
  return (await getUserById(input.id))!;
}
