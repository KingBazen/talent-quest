import { api, ApiError } from "./api";
import { clearSession, saveSession, type SavedSession } from "./session";

/**
 * Mobile-side wrappers around the audience-facing auth endpoints.
 *
 * The backend treats `audience: "mobile"` as the signal to skip the cookie
 * and return the JWT in the response body. We catch that here, persist via
 * SecureStore, and return the saved-session shape so the caller can update
 * UI state in one go.
 */

interface AuthResponse {
  user: SavedSession["user"];
  token: string;
  expiresAt: string;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<SavedSession> {
  const r = await api.post<AuthResponse>("/api/auth/login", {
    email: input.email,
    password: input.password,
    audience: "mobile",
  });
  if (!r.token) {
    throw new ApiError(500, "Server didn't return a token — check API version");
  }
  const saved: SavedSession = {
    token: r.token,
    expiresAt: r.expiresAt,
    user: r.user,
  };
  await saveSession(saved);
  return saved;
}

export async function registerAudience(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<SavedSession> {
  const r = await api.post<AuthResponse>("/api/auth/register-audience", {
    ...input,
    audience: "mobile",
  });
  if (!r.token) {
    throw new ApiError(500, "Server didn't return a token — check API version");
  }
  const saved: SavedSession = {
    token: r.token,
    expiresAt: r.expiresAt,
    user: r.user,
  };
  await saveSession(saved);
  return saved;
}

export async function signOut(): Promise<void> {
  // Best-effort server logout — we don't depend on it. Local SecureStore
  // is the source of truth on mobile, so even if the network request
  // fails the user is signed out from this device.
  try {
    await api.post("/api/auth/logout");
  } catch {
    /* ignore */
  }
  await clearSession();
}
