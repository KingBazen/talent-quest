import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { ApiError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function err(status: number, message: string, extras?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, details: extras ?? undefined },
    { status }
  );
}

export async function parseJson<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.errors[0];
      throw new ApiError(
        422,
        `${first.path.join(".") || "body"}: ${first.message}`
      );
    }
    throw e;
  }
}

export function handleApiError(e: unknown) {
  if (e instanceof ApiError) return err(e.status, e.message);
  console.error("[api] unhandled error:", e);
  return err(500, "Internal server error");
}

/** Wrap a route handler so thrown ApiError / ZodError become JSON responses. */
export function route<T extends (req: Request, ctx?: any) => Promise<Response>>(
  handler: T
): T {
  return (async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      return handleApiError(e);
    }
  }) as T;
}
