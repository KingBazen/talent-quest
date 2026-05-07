import * as SecureStore from "expo-secure-store";

/**
 * Session storage for the mobile client.
 *
 * The JWT lives in expo-secure-store (Keychain on iOS, EncryptedSharedPrefs
 * on Android — better than AsyncStorage for any token that grants access).
 * The raw token is never logged. We track expiry separately so the client
 * can pre-emptively redirect to sign-in instead of letting a stale request
 * 401.
 */

const TOKEN_KEY = "tq.session.token";
const EXPIRES_KEY = "tq.session.expires_at";
const USER_KEY = "tq.session.user";

export interface SavedSession {
  token: string;
  expiresAt: string;
  user: { id: string; email: string; fullName: string; role: string };
}

export async function saveSession(s: SavedSession): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, s.token);
  await SecureStore.setItemAsync(EXPIRES_KEY, s.expiresAt);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(s.user));
}

export async function loadSession(): Promise<SavedSession | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const expiresAt = await SecureStore.getItemAsync(EXPIRES_KEY);
  const userStr = await SecureStore.getItemAsync(USER_KEY);
  if (!token || !expiresAt || !userStr) return null;
  if (Date.parse(expiresAt) < Date.now()) {
    // Expired — clear the slot rather than ship a doomed Authorization header.
    await clearSession();
    return null;
  }
  try {
    return { token, expiresAt, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(EXPIRES_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
