"use client";

/** Thin fetch wrapper for the frontend. Throws ApiError on non-2xx. */

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

async function call<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, {
    ...init,
    headers,
    body,
    credentials: "same-origin",
  });
  let env: Envelope<T> | null = null;
  try {
    env = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !env?.ok) {
    throw new ApiError(
      res.status,
      env?.error || `Request failed (${res.status})`,
      env?.details
    );
  }
  return env.data as T;
}

export const api = {
  get: <T>(path: string) => call<T>(path),
  post: <T>(path: string, json?: unknown) =>
    call<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json?: unknown) =>
    call<T>(path, { method: "PATCH", json }),
  del: <T>(path: string) => call<T>(path, { method: "DELETE" }),
};
