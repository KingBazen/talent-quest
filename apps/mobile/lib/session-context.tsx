import * as React from "react";
import { loadSession, type SavedSession } from "./session";

/**
 * Mobile session context — same shape as the web app's SessionProvider
 * (id / email / fullName / role / emailVerifiedAt) so screens can port
 * between platforms with minimal change.
 *
 * Refresh hits SecureStore (cheap, no network) so calling refresh() in
 * focus events is fine.
 */

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setSavedSession: (s: SavedSession) => void;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const s = await loadSession();
    setUser(s?.user ?? null);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSavedSession = React.useCallback((s: SavedSession) => {
    setUser(s.user);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, setSavedSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
