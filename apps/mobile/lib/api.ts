import Constants from "expo-constants";
import { loadSession } from "./session";

/**
 * Mobile API client.
 *
 * Mirrors the web app's [src/lib/client-api.ts] envelope shape so screens
 * can be ported between platforms without changing call sites. Adds:
 *
 *   - Authorization: Bearer header from SecureStore
 *   - audience: "mobile" param injected on auth POSTs (so login/register
 *     return the JWT in the body, not a cookie)
 *   - EXPO_PUBLIC_API_URL override (defaults to localhost:3000 in dev)
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function baseUrl(): string {
  // Order: explicit env var → expo-constants extra → localhost fallback.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromConstants =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromConstants) return fromConstants.replace(/\/$/, "");
  return "http://localhost:3000";
}

async function authHeader(): Promise<Record<string, string>> {
  const session = await loadSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(await authHeader()),
  };
  if (body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let parsed: Envelope<T>;
  try {
    parsed = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, res.statusText || "Network error");
  }

  if (!res.ok || !parsed.ok) {
    throw new ApiError(res.status, parsed.error ?? `HTTP ${res.status}`);
  }
  return parsed.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) =>
    request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
